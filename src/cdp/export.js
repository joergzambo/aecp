// node export.js [anzahl_pro_stufe] > aufgaben.json
require('./cdp.js');
const C = globalThis.CDP, N = +(process.argv[2] || 2000), out = [];
for (const lv of ['L', 'M', 'S']) for (let s = 1; s <= N; s++) {
  const T = C.makeTask(s, lv);
  if (!T) { console.error('keine Aufgabe', lv, s); process.exit(1); }
  out.push({code: T.code,
    devs: T.devs.map(d => ({host: d.host, pins: d.pins})),
    outs: T.outs.map(o => o.text),
    sol: {links: C.solutionKeys(T).map(k => k.split('~').map(x => { const [d, p] = x.split('|'); return [T.devs[+d].host, p]; })),
      models: T.ans.map(a => C.MODELS[a.model].plat), ips: T.ans.map(a => a.ips)}});
}
process.stdout.write(JSON.stringify(out));
