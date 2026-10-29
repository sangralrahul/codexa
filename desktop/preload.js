// The bridge between Codexa's screens and the main process. Only these calls are exposed.
const { contextBridge, ipcRenderer } = require("electron");

const listeners = new Map();
ipcRenderer.on("api:stream", (_e, msg) => {
  const fn = listeners.get(msg.id);
  if (fn) fn(msg);
  if (msg.done) listeners.delete(msg.id);
});

let seq = 0;

contextBridge.exposeInMainWorld("codexa", {
  request: (req) => ipcRenderer.invoke("api:request", req),
  /** Starts a server-sent-events request; returns a cancel function. */
  stream: (req, onMessage) => {
    const id = `s${Date.now().toString(36)}${(seq++).toString(36)}`;
    listeners.set(id, onMessage);
    ipcRenderer.send("api:stream-start", { ...req, id });
    return () => ipcRenderer.send("api:stream-cancel", id);
  },
  login: (email, password) => ipcRenderer.invoke("auth:login", { email, password }),
  browserAuth: (page) => ipcRenderer.invoke("auth:browser", page),
  me: () => ipcRenderer.invoke("auth:me"),
  logout: () => ipcRenderer.invoke("auth:logout"),
  openExternal: (url) => ipcRenderer.invoke("shell:open", url),
  openWeb: (path) => ipcRenderer.invoke("shell:openWeb", path),
  info: () => ipcRenderer.invoke("app:info"),
  setTheme: (mode) => ipcRenderer.invoke("app:theme", mode),
  checkUpdates: () => ipcRenderer.invoke("app:checkUpdates"),
  onUpdate: (fn) => {
    const handler = (_e, info) => fn(info);
    ipcRenderer.on("app:update", handler);
    return () => ipcRenderer.removeListener("app:update", handler);
  },
});
