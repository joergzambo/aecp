/* Schreibt Aufgaben samt Engine-Lösung als JSON für check.py: node export.js N > tasks.json */
require('./routing.js');
var R = globalThis.RT, N = +process.argv[2] || 2000, out = [];
var list = [R.makeTask(1, 'B')];
['L', 'M', 'S'].forEach(function (l) { for (var s = 1; s <= N; s++) { var T = R.makeTask(s, l); if (T) list.push(T); } });
list.forEach(function (T) {
  out.push({code: T.code, routers: T.routers.map(function (r) { return {name: r.name, lans: r.lans, lanIf: r.lanIf}; }), links: T.links, ask: T.ask,
    routes: R.routes(T, T.ask.st).map(function (x) { return {net: x.net, p: x.p, hops: x.hops.map(function (h) { return h.ip; }).sort()}; }),
    rip: R.ripNets(T, T.ask.rip).map(function (x) { return x.net; }).sort(),
    solSt: R.gradeStatic(T, R.solStatic(T).join('\n')).solved, solRip: R.gradeRip(T, R.solRip(T).join('\n')).solved});
});
process.stdout.write(JSON.stringify(out));
