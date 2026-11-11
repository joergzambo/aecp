// Exportiert Aufgaben + JS-Ergebnisse als JSON für check.py.  node export.js [anzahl_pro_stufe]
require('./vlan.js');
const V = globalThis.VLAN, N = +(process.argv[2] || 2000), out = [];
for (const lv of ['L', 'M', 'S']) {
  for (let s = 1; s <= N; s++) {
    const t = V.makeTask(s, lv);
    if (!t) { console.error('keine Aufgabe', lv, s); process.exit(1); }
    out.push({task: t, recv: V.trace(t, t.sender).recv, ping: V.ping(t, t.pair[0], t.pair[1]).ok});
  }
}
process.stdout.write(JSON.stringify(out));
