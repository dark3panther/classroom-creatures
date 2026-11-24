/*
 * Starts the Godot stage (index.js / index.wasm / index.pck, exported from godot/) inside the app's iframe.
 * No inline script, so it runs under the desktop app's content policy. config.json is written by
 * scripts/godot/export.mjs from the export (file sizes for the progress bar).
 */
(function () {
  const post = (type, data) => { try { parent.postMessage(JSON.stringify(Object.assign({ fromGodot: true, type }, data || {})), '*'); } catch (e) { /* no parent */ } };
  const canvas = document.getElementById('canvas');
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) { post('error', { message: 'webgl2' }); return; }
  fetch('config.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((cfg) => {
    const engine = new Engine(Object.assign({ executable: 'index', canvasResizePolicy: 2, ensureCrossOriginIsolationHeaders: false, focusCanvas: false, args: [] }, cfg, { canvas }));
    engine.startGame({
      onProgress: (current, total) => post('progress', { current, total }),
      onPrintError: function () { console.warn.apply(console, ['[stage]'].concat([].slice.call(arguments))); },
    }).catch((e) => post('error', { message: String(e && e.message || e) }));
  });
})();
