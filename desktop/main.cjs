// Version Windows portable : affiche la version web (copiée dans app/) dans une fenêtre Electron.
const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

// Exécutable portable : les données (scénarios, paramètres) sont rangées à côté de l'exe,
// dans « Simupret-données », pour pouvoir emporter l'application sur une clé USB.
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'Simupret-données'));
}

function createWindow() {
  const win = new BrowserWindow({
    show: !process.env.SIMUPRET_SMOKE_TEST,
    width: 1200,
    height: 850,
    minWidth: 360,
    minHeight: 500,
    title: 'Simulateur de crédit hypothécaire',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win.setMenu(null);

  // Les liens externes s'ouvrent dans le navigateur ; la fenêtre ne quitte jamais l'application.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file:')) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });

  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  if (process.env.SIMUPRET_SMOKE_TEST) smokeTest(win);
}

/**
 * Test de fumée pour la CI (SIMUPRET_SMOKE_TEST=1) : vérifie que l'interface s'affiche et
 * qu'un écran chargé à la demande (graphiques) fonctionne en file://, puis quitte avec 0 ou 1.
 */
function smokeTest(win) {
  const fail = (reason) => {
    console.error(`Test de fumée : échec — ${reason}`);
    app.exit(1);
  };
  const timer = setTimeout(() => fail('délai dépassé'), 60_000);
  win.webContents.on('console-message', (details) => {
    if (details.level === 'error') console.error(`[page] ${details.message}`);
  });
  win.webContents.once('did-finish-load', async () => {
    try {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      await wait(1500);
      const title = await win.webContents.executeJavaScript(
        "document.querySelector('h1') ? document.querySelector('h1').textContent : ''",
      );
      if (!title.includes('Simulateur')) return fail(`titre introuvable (${JSON.stringify(title)})`);
      await win.webContents.executeJavaScript("location.hash = '#/graphiques'");
      await wait(4000);
      const charts = await win.webContents.executeJavaScript("document.querySelectorAll('figure svg').length");
      if (charts < 1) return fail('aucun graphique affiché');
      clearTimeout(timer);
      console.log(`Test de fumée : OK (${charts} graphiques)`);
      app.exit(0);
    } catch (e) {
      fail(String(e));
    }
  });
}

// Une seule instance : relancer l'exe remet la fenêtre existante au premier plan.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
