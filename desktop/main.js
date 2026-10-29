// Codexa for Windows: a native desktop app. Its screens are bundled in the app (dist-renderer,
// built from renderer/ with Vite) and served from the app:// scheme; nothing of the website is
// loaded into the main window. The app talks to the Codexa API at APP_URL through this process
// (IPC below), so the session cookie stays in Electron's cookie store and never reaches page
// script. AI runs, previews and publishing happen on Codexa's servers, as on the web.
const { app, BrowserWindow, Menu, shell, nativeTheme, session, dialog, Notification, ipcMain, net, protocol } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");

const APP_URL = (process.env.CODEXA_URL || "https://codexa.creditvault.tech").replace(/\/+$/, "");
const APP_ORIGIN = new URL(APP_URL).origin;
const RENDERER_DIR = path.join(__dirname, "dist-renderer");
const STATE_FILE = path.join(app.getPath("userData"), "window-state.json");
const PALETTE = { dark: { bg: "#0b0b0c", fg: "#e8e8ea" }, light: { bg: "#f7f6f3", fg: "#1a1a1c" } };

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: false } }]);

let mainWindow = null;

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { width: 1440, height: 900, maximized: false };
  }
}

function saveState(win) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() }));
  } catch {
    // Window state is a convenience; never fail on it.
  }
}

/** Serves the bundled screens: app://codexa/<path> → dist-renderer/<path> (index.html for routes). */
function registerAppProtocol() {
  protocol.handle("app", (request) => {
    const url = new URL(request.url);
    let rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    if (!rel || !path.extname(rel)) rel = "index.html";
    const file = path.normalize(path.join(RENDERER_DIR, rel));
    if (!file.startsWith(RENDERER_DIR)) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

const isAppUrl = (url) => {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
};
const openExternal = (url) => {
  if (/^https?:\/\//i.test(String(url))) void shell.openExternal(String(url));
};

/** Keeps every window on its own content: links elsewhere open in the default browser. */
function guardNavigation(wc, allowOrigin) {
  wc.setWindowOpenHandler(({ url }) => {
    openExternal(url);
    return { action: "deny" };
  });
  wc.on("will-navigate", (event, url) => {
    if (allowOrigin && allowOrigin(url)) return;
    event.preventDefault();
    openExternal(url);
  });
}

function createWindow() {
  const state = loadState();
  const theme = nativeTheme.shouldUseDarkColors ? PALETTE.dark : PALETTE.light;
  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 1024,
    minHeight: 680,
    title: "Codexa",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: theme.bg,
    show: false,
    // Native window buttons drawn by Windows over our own title bar.
    titleBarStyle: "hidden",
    titleBarOverlay: { color: theme.bg, symbolColor: theme.fg, height: 44 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });
  if (state.maximized) mainWindow.maximize();
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("close", () => saveState(mainWindow));
  guardNavigation(mainWindow.webContents, (url) => url.startsWith("app://"));
  mainWindow.loadURL("app://codexa/index.html");
}

// ---------------------------------------------------------------------------------------------
// Codexa API (the renderer never sees the session cookie)
// ---------------------------------------------------------------------------------------------

function apiInit(method, body) {
  const headers = { accept: "application/json", "x-codexa-client": `desktop/${app.getVersion()}` };
  if (body !== undefined) headers["content-type"] = "application/json";
  return { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: "include" };
}

function checkPath(p) {
  if (typeof p !== "string" || !/^\/api\/[A-Za-z0-9/_\-.?=&%:,@+~]*$/.test(p)) throw new Error("Invalid API path");
  return p;
}

async function apiRequest({ method = "GET", path: p, body }) {
  try {
    const res = await net.fetch(APP_URL + checkPath(p), apiInit(String(method).toUpperCase(), body));
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: { code: "network", message: `Can't reach Codexa (${err instanceof Error ? err.message : String(err)}). Check your connection.` } } };
  }
}

const streams = new Map();

/** Server-sent events (AI runs): chunks go to the renderer as they arrive. */
async function apiStream(sender, { id, method = "POST", path: p, body }) {
  const controller = new AbortController();
  streams.set(id, controller);
  const send = (msg) => {
    if (!sender.isDestroyed()) sender.send("api:stream", { id, ...msg });
  };
  try {
    const init = apiInit(String(method).toUpperCase(), body);
    init.headers.accept = "text/event-stream";
    const res = await net.fetch(APP_URL + checkPath(p), { ...init, signal: controller.signal });
    if (!res.ok || !res.body) {
      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }
      send({ done: true, ok: false, status: res.status, data });
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      send({ chunk: decoder.decode(value, { stream: true }) });
    }
    send({ done: true, ok: true, status: res.status });
  } catch (err) {
    const aborted = controller.signal.aborted;
    send({ done: true, ok: aborted, status: 0, aborted, data: aborted ? null : { error: { code: "network", message: err instanceof Error ? err.message : String(err) } } });
  } finally {
    streams.delete(id);
  }
}

async function signedIn() {
  const res = await apiRequest({ path: "/api/auth/me" });
  return res.ok && res.data && res.data.user ? res.data.user : null;
}

/**
 * Sign in or sign up in a small window on the Codexa site (needed for Google/GitHub sign-in and
 * for creating an account). It shares the app's cookie store, so once the site lands on the
 * dashboard or onboarding the app is signed in and the window closes.
 */
function browserAuth(page) {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      parent: mainWindow ?? undefined,
      modal: Boolean(mainWindow),
      width: 520,
      height: 760,
      title: page === "signup" ? "Create your Codexa account" : "Sign in to Codexa",
      autoHideMenuBar: true,
      backgroundColor: nativeTheme.shouldUseDarkColors ? PALETTE.dark.bg : PALETTE.light.bg,
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
    });
    let finished = false;
    const check = (url) => {
      try {
        const u = new URL(url);
        if (u.origin === APP_ORIGIN && /^\/(dashboard|onboarding|projects)(\/|$)/.test(u.pathname)) {
          finished = true;
          resolve(true);
          win.close();
        }
      } catch {
        // ignore
      }
    };
    // OAuth providers (GitHub, Google) are allowed inside this window; other links open outside.
    guardNavigation(win.webContents, (url) => /^https:\/\//i.test(url) || isAppUrl(url));
    win.webContents.on("did-navigate", (_e, url) => check(url));
    win.webContents.on("did-redirect-navigation", (_e, url) => check(url));
    win.on("closed", () => {
      if (!finished) resolve(false);
    });
    win.loadURL(`${APP_URL}/${page === "signup" ? "signup" : "login"}`);
  });
}

function registerIpc() {
  ipcMain.handle("api:request", (_e, req) => apiRequest(req ?? {}));
  ipcMain.on("api:stream-start", (e, req) => void apiStream(e.sender, req ?? {}));
  ipcMain.on("api:stream-cancel", (_e, id) => streams.get(id)?.abort());
  ipcMain.handle("auth:login", async (_e, { email, password }) => apiRequest({ method: "POST", path: "/api/auth/login", body: { email, password } }));
  ipcMain.handle("auth:browser", async (_e, page) => ((await browserAuth(page)) ? signedIn() : null));
  ipcMain.handle("auth:me", () => signedIn());
  ipcMain.handle("auth:logout", async () => {
    await apiRequest({ method: "POST", path: "/api/auth/logout" });
    await session.defaultSession.clearStorageData({ origin: APP_ORIGIN, storages: ["cookies"] });
    return true;
  });
  ipcMain.handle("shell:open", (_e, url) => openExternal(url));
  ipcMain.handle("shell:openWeb", (_e, p) => openExternal(APP_URL + (typeof p === "string" && p.startsWith("/") ? p : "/")));
  ipcMain.handle("app:info", () => ({ version: app.getVersion(), appUrl: APP_URL, platform: process.platform, packaged: app.isPackaged }));
  ipcMain.handle("app:theme", (_e, mode) => {
    if (mode === "dark" || mode === "light" || mode === "system") nativeTheme.themeSource = mode;
    const t = nativeTheme.shouldUseDarkColors ? PALETTE.dark : PALETTE.light;
    if (mainWindow && process.platform !== "darwin") {
      try {
        mainWindow.setTitleBarOverlay({ color: t.bg, symbolColor: t.fg, height: 44 });
      } catch {
        // Not supported on this platform.
      }
      mainWindow.setBackgroundColor(t.bg);
    }
    return nativeTheme.shouldUseDarkColors ? "dark" : "light";
  });
  ipcMain.handle("app:checkUpdates", () => checkForUpdates(true));
}

// ---------------------------------------------------------------------------------------------
// Updates, downloads, menu
// ---------------------------------------------------------------------------------------------

let autoUpdater = null;

function setupAutoUpdates() {
  if (!app.isPackaged) return;
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch {
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("error", () => {
    // Offline or GitHub unreachable: try again later.
  });
  autoUpdater.on("update-downloaded", async (info) => {
    mainWindow?.webContents.send("app:update", { version: info.version });
    const { response } = await dialog.showMessageBox(mainWindow ?? undefined, {
      type: "info",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update ready",
      message: `Codexa ${info.version} is ready to install.`,
      detail: "Restart Codexa to finish updating. If you choose Later, it installs the next time you quit.",
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });
  void checkForUpdates(false);
  setInterval(() => void checkForUpdates(false), 6 * 60 * 60 * 1000);
}

async function checkForUpdates(manual) {
  if (!autoUpdater) return { status: "unavailable", message: "Updates are checked in the installed app." };
  try {
    const r = await autoUpdater.checkForUpdates();
    const latest = r?.updateInfo?.version;
    if (latest && latest !== app.getVersion()) return { status: "downloading", message: `Downloading Codexa ${latest}…` };
    return { status: "current", message: "You're on the latest version." };
  } catch (err) {
    return { status: "error", message: manual ? `Couldn't check for updates (${err instanceof Error ? err.message : String(err)}).` : "" };
  }
}

/** Unused name in the Downloads folder: "app.zip", then "app (1).zip", "app (2).zip"… */
function downloadPath(filename) {
  const dir = app.getPath("downloads");
  const ext = path.extname(filename);
  const base = path.basename(filename, ext) || "download";
  let target = path.join(dir, base + ext);
  for (let i = 1; fs.existsSync(target); i++) target = path.join(dir, `${base} (${i})${ext}`);
  return target;
}

function setupDownloads() {
  session.defaultSession.on("will-download", (_event, item) => {
    const target = downloadPath(item.getFilename());
    item.setSavePath(target);
    item.on("updated", () => {
      const total = item.getTotalBytes();
      mainWindow?.setProgressBar(total > 0 ? item.getReceivedBytes() / total : 2);
    });
    item.once("done", (_e, state) => {
      mainWindow?.setProgressBar(-1);
      if (state !== "completed") return;
      const reveal = () => shell.showItemInFolder(target);
      if (Notification.isSupported()) {
        const note = new Notification({ title: "Download complete", body: `${path.basename(target)} is in your Downloads folder. Click to show it.` });
        note.on("click", reveal);
        note.show();
      } else reveal();
    });
  });
}

function buildMenu() {
  // Hidden (the app draws its own title bar); kept for keyboard shortcuts.
  const template = [
    { role: "editMenu" },
    {
      label: "View",
      submenu: [{ role: "reload" }, { role: "toggleDevTools" }, { type: "separator" }, { role: "resetZoom" }, { role: "zoomIn" }, { role: "zoomOut" }, { type: "separator" }, { role: "togglefullscreen" }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId("tech.creditvault.codexa");
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(permission === "clipboard-sanitized-write" || permission === "fullscreen");
    });
    session.defaultSession.preconnect({ url: APP_URL, numSockets: 4 });
    registerAppProtocol();
    registerIpc();
    buildMenu();
    setupDownloads();
    createWindow();
    setupAutoUpdates();
  });

  app.on("window-all-closed", () => app.quit());
}
