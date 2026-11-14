// node export.js [anzahl_pro_stufe] > aufgaben.json
require('./o3.js');
const O = globalThis.O3, N = +(process.argv[2] || 2000), out = [];
for (const lv of ['L', 'M', 'S']) for (let s = 1; s <= N; s++) {
  const T = O.makeTask(s, lv);
  if (!T) { console.error('keine Aufgabe', lv, s); process.exit(1); }
  out.push({code: T.code, x: T.x, cfg: T.rs.map((_, i) => O.config(T, i)),
    links: T.links.map(l => [l.a, l.b]),
    ask: T.ask.map(N => ({net: N.net, p: N.p, area: N.area, type: O.route(T, T.x, N).type, cost: O.route(T, T.x, N).cost, via: O.route(T, T.x, N).via})),
    roles: T.rs.map((_, i) => O.role(T, i)), areas: T.rs.map((_, i) => O.areasOf(T, i))});
}
process.stdout.write(JSON.stringify(out));
