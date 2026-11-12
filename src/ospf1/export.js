// node export.js [anzahl_pro_stufe] > aufgaben.json
require('./dijk.js');
const D = globalThis.DJ, N = +(process.argv[2] || 2000), out = [];
for (const bw of [false, true]) for (const lv of ['L', 'M', 'S']) for (let s = 1; s <= N; s++) {
  const T = D.makeTask(s, lv, bw);
  if (!T) { console.error('keine Aufgabe', lv, s); process.exit(1); }
  out.push({code: T.code, n: T.nodes.length, xy: T.nodes.map(n => [n.x, n.y]), edges: T.edges.map(e => [e.a, e.b, e.w, e.bw || null]), src: T.src,
    d: T.res.d, p: T.res.p, nh: T.res.nh, order: T.res.order});
}
process.stdout.write(JSON.stringify(out));
