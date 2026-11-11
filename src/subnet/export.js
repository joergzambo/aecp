/* Schreibt Aufgaben als JSON für check.py: node export.js N > tasks.json */
require('./sub.js');
var S = globalThis.SN, N = +process.argv[2] || 2000, out = [];
['calc', 'equal', 'vlsm', 'sup'].forEach(function (t) { ['L', 'M', 'S'].forEach(function (l) { for (var s = 1; s <= N; s++) { var T = S.makeTask(s, l, t); if (T) out.push(T); } }); });
process.stdout.write(JSON.stringify(out));
