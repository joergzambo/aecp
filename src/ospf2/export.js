// node export.js [anzahl_pro_stufe] > aufgaben.json
require('./ospf2.js');
const O = globalThis.O2, N = +(process.argv[2] || 2000), out = [];
for (const lv of ['L', 'M', 'S']) for (let s = 1; s <= N; s++) {
  const T = O.makeTask(s, lv);
  if (!T) { console.error('keine Aufgabe', lv, s); process.exit(1); }
  out.push({code: T.code, ref: T.ref, x: T.x, rs: T.rs, cfg: T.rs.map(R => O.config(T, R)), ans: T.ans});
}
process.stdout.write(JSON.stringify(out));
