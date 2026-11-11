/* node export.js N > tasks.json */
require('./rloop.js');
var R = globalThis.RL, N = +process.argv[2] || 1000, out = [];
['L', 'M', 'S'].forEach(function (l) { for (var s = 1; s <= N; s++) { var T = R.makeTask(s, l); if (!T) continue;
  out.push({code: T.code, n: T.n, sh: T.sh, poison: T.poison, pr: T.pr, hd: T.hd, events: T.events, tb: T.res.tb.map(function (e) { return [e.m, e.via]; }), loop: T.res.loop}); } });
process.stdout.write(JSON.stringify(out));
