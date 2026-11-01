/**
 * Classroom Creatures — desktop shell (macOS app; also runs on Windows/Linux).
 * Serves the built web app from a private app:// origin so IndexedDB storage
 * and crypto.subtle (PIN hashing) behave exactly as in a secure browser tab.
 * The app makes no network requests.
 */
const { app, BrowserWindow, Menu, protocol, net, shell, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

app.setName('Classroom Creatures');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

const DIST = path.join(__dirname, '..', 'dist');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 620,
    title: 'Classroom Creatures',
    backgroundColor: '#1b1240',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 14, y: 14 },
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: false },
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL('app://classroom/index.html');

  // keep everything inside the app; open any external link in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) e.preventDefault();
  });
  // projector-friendly: the web app's Full screen button maps to native full screen
  win.webContents.on('enter-html-full-screen', () => win.setFullScreen(true));
  win.webContents.on('leave-html-full-screen', () => win.setFullScreen(false));
  return win;
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const go = (hash) => () => {
    const w = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    w?.webContents.executeJavaScript(`location.hash = ${JSON.stringify(hash)}`);
  };
  const template = [
    ...(isMac ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { label: 'Classroom', accelerator: 'CmdOrCtrl+1', click: go('/') },
        { label: 'Creatures', accelerator: 'CmdOrCtrl+2', click: go('/creatures') },
        { label: 'Rewards', accelerator: 'CmdOrCtrl+3', click: go('/rewards') },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: go('/settings') },
        { label: 'Presentation Mode', accelerator: 'CmdOrCtrl+P', click: go('/present') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const { pathname } = new URL(req.url);
    const rel = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(DIST, rel));
    if (!file.startsWith(DIST)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  // strict content policy: nothing is loaded from the internet
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    cb({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': ["default-src 'self' app:; img-src 'self' app: data: blob:; style-src 'self' app: 'unsafe-inline'; font-src 'self' app: data:; script-src 'self' app:; connect-src 'self' app:"] } });
  });
  buildMenu();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
