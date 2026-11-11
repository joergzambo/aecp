/* Schreibt Aufgaben als JSON für check.py: node export.js N > tasks.json */
require('./domains.js');
var D = globalThis.DOM, N = +process.argv[2] || 3000, out = [];
out.push(D.makeTask(1, 'B'));
['L', 'M', 'S'].forEach(function (l) { for (var s = 1; s <= N; s++) { var T = D.makeTask(s, l); if (T) out.push(T); } });
process.stdout.write(JSON.stringify(out.map(function (T) { return {code: T.code, W: T.W, H: T.H, devs: T.devs, links: T.links, sol: T.sol}; })));
