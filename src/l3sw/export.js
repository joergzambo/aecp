// node export.js [anzahl_pro_stufe] > aufgaben.json
require('./l3.js');
const L = globalThis.L3, N = +(process.argv[2] || 2000), out = [];
for (const lv of ['L', 'M', 'S']) for (let s = 1; s <= N; s++) {
  const T = L.makeTask(s, lv);
  if (!T) { console.error('keine Aufgabe', lv, s); process.exit(1); }
  const names = T.pcs.map(p => p.name), pairs = {};
  for (const a of names) for (const b of names.concat(['INET'])) if (a !== b) pairs[a + '>' + b] = L.reach(T, a, b).ok;
  out.push({task: T, ans: L.answers(T), pairs});
}
process.stdout.write(JSON.stringify(out));
