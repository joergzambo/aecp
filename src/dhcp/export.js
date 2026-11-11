/* node export.js N > tasks.json */
require('../routing/routing.js'); require('./dhcp.js');
var H = globalThis.DH, N = +process.argv[2] || 500, out = [];
['L', 'M', 'S'].forEach(function (l) { for (var s = 1; s <= N; s++) { var D = H.makeTask(s, l); if (!D) continue; var T = D.T;
  out.push({code: D.code, mode: D.mode, srv: D.srv, srvIp: D.srvIp, targets: D.targets, need: Object.keys(D.need).sort(), poolR: D.poolR, pool: D.pool,
    routers: T.routers.map(function (r) { return {name: r.name, lans: r.lans, lanIf: r.lanIf}; }), links: T.links,
    solvedIf: H.gradeIf(D, D.need).solved, tgtOk: H.checkTarget(D, D.targets[0]).ok}); } });
process.stdout.write(JSON.stringify(out));
