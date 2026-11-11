/* node export.js N > tasks.json */
require('./eth.js');
var E = globalThis.ETH, N = +process.argv[2] || 2000, out = [];
['L', 'M', 'S'].forEach(function (l) { for (var s = 1; s <= N; s++) { var T = E.makeTask(s, l); if (!T) continue;
  out.push({code: T.code, dev: T.dev.map(function (d) { return {t: d.t, mac: d.mac || null, name: d.name, x: d.x, y: d.y}; }), links: T.links, frames: T.frames, ask: T.ask,
    steps: T.sim.steps.map(function (s) { return {reached: s.reached, acts: s.acts.map(function (a) { return [a.sw, a.act, a.out.slice().sort()]; })}; }), tables: T.sim.tables}); } });
process.stdout.write(JSON.stringify(out));
