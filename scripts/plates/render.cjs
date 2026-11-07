const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [,, outDir] = process.argv;
const WASH = {
  fire: ['#ffe2cc', '#ffab7c', '#e0622a'], water: ['#d6efff', '#84c7f2', '#2b8fd6'], nature: ['#ddf2cb', '#9cd681', '#3e9d3a'],
  electric: ['#fff3bb', '#ffd75a', '#d39a00'], ice: ['#e7f8ff', '#a6def3', '#3fa7c9'], earth: ['#f3e4cb', '#d8ae80', '#9a6431'],
  shadow: ['#e6defa', '#ab96e4', '#5b3fa8'], light: ['#fff6da', '#ffe197', '#d9a01a'], cosmic: ['#e3ddff', '#a493ff', '#6a4cff'], air: ['#ebf7ff', '#b4dcf1', '#56a9c9'],
};
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, "paint.html"));
  fs.mkdirSync(outDir, { recursive: true });
  for (const [el, [pale, pooled, edge]] of Object.entries(WASH)) for (const v of [1, 2, 3]) {
    const url = await p.evaluate(([s, a, b2, c]) => window.paint(s, a, b2, c), [`${el}-${v}`, pale, pooled, edge]);
    fs.writeFileSync(path.join(outDir, `${el}-${v}.webp`), Buffer.from(url.split(',')[1], 'base64'));
  }
  await b.close();
})();
