/* AECP · Subnetting, VLSM und Supernetting: Aufgaben-Generator, Lösungen, Prüfen, Erklärtexte.
   Browser: window.SN · Node: globalThis.SN */
(function (G) {
'use strict';

var LVNAME = {L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {L: 3, M: 4, S: 5};
var TYPES = {calc: 'Subnetz berechnen', equal: 'Gleich große Subnetze', vlsm: 'VLSM', sup: 'Supernetting'};
var TCODE = {calc: 11, equal: 13, vlsm: 17, sup: 19};

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }
function shuffle(r, a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

/* ---------- IP-Rechnen (mit Zahlen statt Bit-Operatoren über 2^31 hinaus) ---------- */
function ip2n(ip) { return ip.split('.').reduce(function (a, b) { return a * 256 + (+b); }, 0); }
function n2ip(n) { n = Math.round(n); return [Math.floor(n / 16777216) % 256, Math.floor(n / 65536) % 256, Math.floor(n / 256) % 256, n % 256].join('.'); }
function size(p) { return Math.pow(2, 32 - p); }
function maskTxt(p) { return n2ip(4294967296 - size(p)); }
function netN(n, p) { var s = size(p); return Math.floor(n / s) * s; }
function isIp(s) { return /^\d{1,3}(\.\d{1,3}){3}$/.test(s) && s.split('.').every(function (x) { return +x <= 255; }); }
function mask2p(s) { if (!isIp(s)) return -1; var n = ip2n(s); for (var p = 0; p <= 32; p++) if (4294967296 - size(p) === n || (p === 0 && n === 0)) return p; return -1; }
function hostBits(clients) { var h = 2; while (Math.pow(2, h) - 2 < clients) h++; return h; }
function bin8(x) { var s = (+x).toString(2); while (s.length < 8) s = '0' + s; return s; }
function binIp(ip) { return ip.split('.').map(bin8).join('.'); }

/* Erklärung: in welchem Oktett „passiert“ es, welche Blockgröße, welcher Block */
function block(ip, p) {
  var oct = Math.min(3, Math.floor(p / 8)), bitsIn = p - oct * 8;
  if (p % 8 === 0 && p > 0) { oct = p / 8 - 1; bitsIn = 8; }
  var bs = Math.pow(2, 8 - bitsIn), v = +ip.split('.')[oct], lo = Math.floor(v / bs) * bs;
  return {oct: oct + 1, bitsIn: bitsIn, bs: bs, v: v, lo: lo, hi: lo + bs - 1};
}

/* ---------- Aufgabentypen ---------- */
function genCalc(r, lvl) {
  var p = lvl === 'L' ? pick(r, [24, 25, 26, 27, 28]) : lvl === 'M' ? pick(r, [26, 27, 28, 29, 30, 23, 22]) : pick(r, [17, 18, 19, 20, 21, 22, 13, 14, 29, 30]);
  var first = lvl === 'L' ? 192 : pick(r, [10, 172, 192, 130, 85]);
  var ip = first === 192 ? '192.168.' + ri(r, 0, 255) + '.' + ri(r, 1, 254) : first === 172 ? '172.' + ri(r, 16, 31) + '.' + ri(r, 0, 255) + '.' + ri(r, 1, 254) : first + '.' + ri(r, 0, 255) + '.' + ri(r, 0, 255) + '.' + ri(r, 1, 254);
  var n = ip2n(ip), net = netN(n, p), bc = net + size(p) - 1;
  if (n === net || n === bc) return null;   /* gegeben ist immer ein Host */
  return {type: 'calc', ip: ip, p: p, ans: {net: n2ip(net), bc: n2ip(bc), first: n2ip(net + 1), last: n2ip(bc - 1), hosts: size(p) - 2, mask: maskTxt(p)}};
}

function genEqual(r, lvl) {
  var bp = lvl === 'L' ? 24 : lvl === 'M' ? pick(r, [24, 23, 22]) : pick(r, [16, 20, 21, 18]);
  var base = bp >= 24 ? '192.168.' + ri(r, 0, 255) + '.0' : bp >= 20 ? n2ip(netN(ip2n('172.' + ri(r, 16, 31) + '.' + ri(r, 0, 255) + '.0'), bp)) : n2ip(netN(ip2n('10.' + ri(r, 0, 255) + '.0.0'), bp));
  var want = lvl === 'L' ? pick(r, [2, 4, 8, 3]) : pick(r, [3, 5, 6, 7, 10, 12, 14, 20]);
  var k = Math.ceil(Math.log(want) / Math.LN2), p = bp + k;
  if (p > 30) return null;
  var cnt = Math.pow(2, k), idx = ri(r, 2, Math.min(cnt, 9)), bn = ip2n(base) + (idx - 1) * size(p);
  return {type: 'equal', base: base, bp: bp, want: want, idx: idx, ans: {p: p, mask: maskTxt(p), count: cnt, hosts: size(p) - 2, net: n2ip(bn), bc: n2ip(bn + size(p) - 1)}};
}

var NAMES = ['Angestellte', 'Telefone', 'Gäste', 'Server', 'Drucker', 'Kameras', 'WLAN', 'Verwaltung', 'Labor', 'Technik', 'Buchhaltung', 'Lager', 'Schüler', 'Lehrer'];
function genVlsm(r, lvl) {
  var cfg = {L: {bp: [24], n: [2, 3], max: 120}, M: {bp: [24, 23, 22], n: [3, 4], max: 400}, S: {bp: [16, 18, 20, 21], n: [4, 5], max: 4000}}[lvl];
  var bp = pick(r, cfg.bp), n = ri(r, cfg.n[0], cfg.n[1]), names = shuffle(r, NAMES.slice()).slice(0, n), groups = [];
  var cap = size(bp), tricky = lvl === 'L' ? [] : [14, 30, 31, 62, 63, 126, 127, 254, 255, 510, 511];
  for (var i = 0; i < n; i++) {
    var h;
    if (lvl === 'M' && i === n - 1 && r() < 0.6) h = 2;   /* Punkt-zu-Punkt-Verbindung */
    else if (tricky.length && r() < 0.35) { h = pick(r, tricky.filter(function (x) { return x <= cfg.max; })); }
    else h = ri(r, lvl === 'S' ? 10 : 3, cfg.max);
    groups.push({name: names[i], hosts: h});
  }
  if (lvl === 'M' && groups[n - 1].hosts === 2) groups[n - 1].name = 'Router-Verbindung';
  var need = groups.reduce(function (a, g) { return a + Math.pow(2, hostBits(g.hosts)); }, 0);
  if (need > cap || need < cap * (lvl === 'L' ? 0.25 : 0.12)) return null;
  var first = bp >= 22 ? '192.168.' + ri(r, 0, 252) + '.0' : bp >= 20 ? '172.' + ri(r, 16, 31) + '.' + ri(r, 0, 255) + '.0' : pick(r, ['189.212.0.0', '150.' + ri(r, 0, 255) + '.0.0', '10.' + ri(r, 0, 255) + '.0.0']);
  var base = n2ip(netN(ip2n(first), bp));
  /* größte zuerst, bei gleicher Größe in der gegebenen Reihenfolge */
  var order = groups.map(function (g, i) { return i; }).sort(function (a, b) { return hostBits(groups[b].hosts) - hostBits(groups[a].hosts) || a - b; });
  var cur = ip2n(base), alloc = {};
  order.forEach(function (i) { var hb = hostBits(groups[i].hosts), p = 32 - hb; alloc[i] = {p: p, mask: maskTxt(p), net: n2ip(cur), bc: n2ip(cur + size(p) - 1), size: size(p)}; cur += size(p); });
  return {type: 'vlsm', base: base, bp: bp, groups: groups, order: order, ans: alloc, used: need, free: cap - need};
}

function summary(nets) {
  var lo = Math.min.apply(null, nets.map(function (x) { return ip2n(x.net); })), hi = Math.max.apply(null, nets.map(function (x) { return ip2n(x.net) + size(x.p) - 1; }));
  var p = 32; while (p > 0 && netN(lo, p) !== netN(hi, p)) p--;
  return {net: n2ip(netN(lo, p)), p: p, lo: lo, hi: hi};
}
function genSup(r, lvl) {
  var nets = [];
  if (lvl === 'L') {
    var cnt = pick(r, [2, 4, 4, 8]), third = Math.floor(ri(r, 0, 255 - cnt) / cnt) * cnt;
    for (var i = 0; i < cnt; i++) nets.push({net: '192.168.' + (third + i) + '.0', p: 24});
  } else if (lvl === 'M') {
    var c2 = ri(r, 2, 6), t2 = ri(r, 0, 250 - c2), b2 = pick(r, ['192.168.', '172.' + ri(r, 16, 31) + '.', '10.' + ri(r, 0, 255) + '.']);
    for (i = 0; i < c2; i++) nets.push({net: b2 + (t2 + i) + '.0', p: 24});
  } else {
    /* gemischte Präfixe, zusammenhängend oder mit Lücke */
    var start = netN(ip2n(pick(r, ['10.' + ri(r, 0, 255), '172.' + ri(r, 16, 31), '192.168']) + '.' + ri(r, 0, 240) + '.0'), 22), cur = start, parts = ri(r, 3, 5);
    for (i = 0; i < parts; i++) {
      var p = pick(r, [23, 24, 24, 25, 26, 27]);
      cur = Math.ceil(cur / size(p)) * size(p);
      if (r() < 0.2) cur += size(p);   /* eine Lücke */
      nets.push({net: n2ip(cur), p: p}); cur += size(p);
    }
  }
  var s = summary(nets), covered = size(s.p), listed = nets.reduce(function (a, x) { return a + size(x.p); }, 0);
  if (s.p < 8) return null;
  return {type: 'sup', nets: nets, ans: {net: s.net, p: s.p, mask: maskTxt(s.p)}, extra: covered - listed, covered: covered};
}

var GEN = {calc: genCalc, equal: genEqual, vlsm: genVlsm, sup: genSup};
function makeTask(seed, lvl, type) {
  lvl = String(lvl).toUpperCase();
  if (!LVCODE[lvl] || !GEN[type] || !(seed >= 1)) return null;
  for (var att = 0; att < 300; att++) {
    var r = mulberry32((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003 + TCODE[type] * 7777777) >>> 0);
    var T = GEN[type](r, lvl);
    if (!T) continue;
    if (type === 'sup' && lvl !== 'L' && T.nets.length < 2) continue;
    T.level = lvl; T.code = lvl + '-' + seed; return T;
  }
  return null;
}

/* ---------- Prüfen einzelner Felder ---------- */
/* kind: 'ip' (Adresse, optional mit /Präfix), 'mask' (ausgeschrieben), 'num', 'prefix' (/26 oder 26) */
function checkField(kind, input, want, wantP) {
  var v = String(input || '').trim().replace(/\s+/g, '');
  if (!v) return {ok: false, empty: true, msg: 'leer'};
  if (kind === 'num') { var n = +v.replace(/\./g, ''); return {ok: n === want, msg: n === want ? '' : 'stimmt nicht'}; }
  if (kind === 'prefix') { var q = +v.replace(/^\//, ''); return {ok: q === want, msg: q === want ? '' : 'stimmt nicht'}; }
  if (kind === 'mask') {
    if (/^\/?\d{1,2}$/.test(v)) { var pp = +v.replace('/', ''); return {ok: false, msg: pp === mask2p(want) ? 'Richtig gedacht – aber bitte ausgeschrieben: ' + want : 'Bitte ausgeschrieben, z. B. 255.255.255.0'}; }
    if (!isIp(v)) return {ok: false, msg: 'keine gültige Maske'};
    if (mask2p(v) < 0) return {ok: false, msg: 'keine gültige Maske (Einsen müssen links zusammenhängen)'};
    return {ok: v === want, msg: v === want ? '' : 'stimmt nicht'};
  }
  var m = /^([\d.]+)(\/(\d{1,2}))?$/.exec(v);
  if (!m || !isIp(m[1])) return {ok: false, msg: 'keine gültige Adresse'};
  if (m[3] && wantP !== undefined && +m[3] !== wantP) return {ok: false, msg: 'Adresse ' + (m[1] === want ? 'stimmt, ' : '') + 'aber das Präfix nicht'};
  return {ok: m[1] === want, msg: m[1] === want ? '' : 'stimmt nicht'};
}

G.SN = {LVNAME: LVNAME, TYPES: TYPES, makeTask: makeTask, checkField: checkField, ip2n: ip2n, n2ip: n2ip, size: size, maskTxt: maskTxt, netN: netN,
  hostBits: hostBits, bin8: bin8, binIp: binIp, block: block, summary: summary, mask2p: mask2p, isIp: isIp, NAMES: NAMES};
})(typeof window !== 'undefined' ? window : globalThis);
