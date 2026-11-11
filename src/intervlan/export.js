// node export.js [anzahl_pro_stufe] > aufgaben.json
require('./ivr.js');
const I = globalThis.IVR, N = +(process.argv[2] || 2000), out = [];
for (const lv of ['L', 'M', 'S']) for (let s = 1; s <= N; s++) {
  const t = I.makeTask(s, lv);
  if (!t) { console.error('keine Aufgabe', lv, s); process.exit(1); }
  const opts = I.options(t).map(o => o[0]);
  if (opts.indexOf(t.fault ? t.fault.loc : 'none') < 0) { console.error('Antwort nicht in Auswahl', t.code); process.exit(1); }
  out.push({task: t, ping: I.ping(t, t.pair[0], t.pair[1]).ok});
}
process.stdout.write(JSON.stringify(out));
