// Codexa for Windows: a desktop window around https://codexa.creditvault.tech.
// The app runs no generated code locally; everything happens on Codexa's servers, exactly as in a
// browser. Links to other sites open in the default browser, and an offline page offers a retry.
const { app, BrowserWindow, Menu, shell, nativeTheme, session, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const APP_URL = process.env.CODEXA_URL || "https://codexa.creditvault.tech";
const APP_ORIGIN = new URL(APP_URL).origin;
const STATE_FILE = path.join(app.getPath("userData"), "window-state.json");

/** Pages on Codexa itself stay in the app; everything else (GitHub, Stripe, previews…) opens in the browser. */
function isAppUrl(url) {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { width: 1440, height: 900, maximized: false };
  }
}

function saveState(win) {
  try {
    const bounds = win.getNormalBounds();
    fs.writeFileSync(STATE_FILE, JSON.stringify({ ...bounds, maximized: win.isMaximized() }));
  } catch {
    // Window state is a convenience; never fail on it.
  }
}

let mainWindow = null;
let splash = null;

/** A small branded window that appears instantly while Codexa loads behind it. */
function createSplash(dark) {
  splash = new BrowserWindow({
    width: 360,
    height: 300,
    frame: false,
    resizable: false,
    movable: true,
    center: true,
    skipTaskbar: true,
    show: false,
    backgroundColor: dark ? "#0a0a0a" : "#fbfaf7",
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  splash.once("ready-to-show", () => splash?.show());
  splash.on("closed", () => (splash = null));
  splash.loadFile(path.join(__dirname, "splash.html"));
}

function revealMain() {
  if (!mainWindow || mainWindow.isVisible()) return;
  mainWindow.show();
  if (splash) splash.close();
}

function createWindow() {
  const state = loadState();
  const dark = nativeTheme.shouldUseDarkColors;
  createSplash(dark);
  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 960,
    minHeight: 640,
    title: "Codexa",
    icon: path.join(__dirname, "build", "icon.png"),
    backgroundColor: dark ? "#0a0a0a" : "#fbfaf7",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true,
    },
  });
  if (state.maximized) mainWindow.maximize();

  // Show the real window once the first page has painted (never keep the splash longer than 12s).
  mainWindow.webContents.once("did-finish-load", revealMain);
  setTimeout(revealMain, 12000);
  mainWindow.on("close", () => saveState(mainWindow));

  const wc = mainWindow.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    if (isAppUrl(url)) return { action: "allow" };
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  wc.on("will-navigate", (event, url) => {
    if (isAppUrl(url) || url.startsWith("file:")) return;
    event.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });
  // No connection (or the site is unreachable): show the offline page, which retries.
  wc.on("did-fail-load", (_event, code, _desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 /* aborted by a redirect or a new navigation */) return;
    mainWindow.loadFile(path.join(__dirname, "offline.html"), { query: { url: url || APP_URL } });
  });

  mainWindow.loadURL(APP_URL);
}

/** Checks GitHub releases for a newer version in the background and installs it on the next restart. */
function setupAutoUpdates() {
  if (!app.isPackaged) return;
  let autoUpdater;
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch {
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("error", () => {
    // Offline or GitHub unreachable: try again on the next launch.
  });
  autoUpdater.on("update-downloaded", async (info) => {
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
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 6 * 60 * 60 * 1000);
}

function buildMenu() {
  const template = [
    {
      label: "Codexa",
      submenu: [
        { label: "Home", accelerator: "Alt+Home", click: () => mainWindow?.loadURL(APP_URL) },
        { label: "Dashboard", click: () => mainWindow?.loadURL(`${APP_URL}/dashboard`) },
        { type: "separator" },
        { label: "Open in browser", click: () => shell.openExternal(mainWindow?.webContents.getURL() || APP_URL) },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { label: "Back", accelerator: "Alt+Left", click: () => mainWindow?.webContents.navigationHistory.goBack() },
        { label: "Forward", accelerator: "Alt+Right", click: () => mainWindow?.webContents.navigationHistory.goForward() },
        { role: "reload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        { label: "Documentation", click: () => shell.openExternal(`${APP_URL}/docs`) },
        { label: "Status", click: () => shell.openExternal(`${APP_URL}/status`) },
        { label: "Contact support", click: () => shell.openExternal(`${APP_URL}/contact`) },
        { label: "Release notes", click: () => shell.openExternal("https://github.com/sangralrahul/codexa/releases") },
        { type: "separator" },
        { label: `Version ${app.getVersion()}`, enabled: false },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// One window only: opening Codexa again focuses the running app.
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
    // The site never needs the camera, microphone, location or notifications from the desktop app.
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(permission === "clipboard-sanitized-write" || permission === "fullscreen");
    });
    // Open the connection to Codexa while the window is still being created (faster first paint).
    session.defaultSession.preconnect({ url: APP_URL, numSockets: 4 });
    buildMenu();
    createWindow();
    setupAutoUpdates();
  });

  app.on("window-all-closed", () => app.quit());
}
