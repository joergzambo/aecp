/* NWT · Routing-Schleifen: Distanzvektor-Simulation mit Split Horizon, Route Poisoning, Poison Reverse; Aufgaben-Generator.
   Browser: window.RL · Node: globalThis.RL */
(function (G) {
'use strict';
var LVNAME = {L: 'Leicht', M: 'Mittel', S: 'Schwer'};
var LVCODE = {L: 3, M: 4, S: 5};
var INF = 16;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ri(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
function pick(r, a) { return a[Math.floor(r() * a.length)]; }

/* Kette R1 – R2 – … – Rn, das Netz hängt an R1. Zustand: tb[i] = {m, via} (via: -1 = direkt, sonst Index) */
function initial(n) { var tb = []; for (var i = 0; i < n; i++) tb.push({m: i, via: i === 0 ? -1 : i - 1}); return tb; }
function clone(tb) { return tb.map(function (x) { return {m: x.m, via: x.via, hd: x.hd}; }); }

/* Was kündigt Router s an Nachbar t an? null = nichts (Split Horizon) */
function advert(T, tb, s, t) {
  var e = tb[s];
  if (T.sh && e.via === t && e.m < INF) return T.pr ? INF : null;
  if (T.sh && e.via === t && e.m >= INF) return T.pr ? INF : null;
  return e.m;
}
/* Ereignisse: {k:'fail'} | {k:'upd', s, t} | {k:'trig', s, t} (Triggered Update mit aktuellem Wert) */
function apply(T, tb, ev) {
  var out = {ev: ev, adv: null, changed: [], note: ''};
  if (ev.k === 'fail') { tb[0] = {m: INF, via: -1, hd: T.hd}; out.changed.push(0); return out; }
  var a = advert(T, tb, ev.s, ev.t); out.adv = a;
  if (a === null) { out.note = 'sh'; return out; }
  var nm = Math.min(INF, a + 1), cur = tb[ev.t];
  if (ev.t === 0 && cur.via === -1 && cur.m === 0) { out.note = 'direct'; return out; }
  if (cur.hd && cur.m >= INF) { out.note = 'holddown'; return out; }
  if (cur.via === ev.s) {
    if (cur.m !== nm) { tb[ev.t] = {m: nm, via: nm >= INF ? cur.via : ev.s, hd: nm >= INF && T.hd}; out.changed.push(ev.t); out.note = nm > cur.m ? 'worse-from-nexthop' : 'better'; }
    else out.note = 'same';
  } else if (nm < cur.m) { tb[ev.t] = {m: nm, via: ev.s}; out.changed.push(ev.t); out.note = cur.m >= INF ? 'revive' : 'better'; }
  else out.note = 'ignore';
  return out;
}
function run(T) {
  var tb = initial(T.n), log = [];
  T.events.forEach(function (ev) { var r = apply(T, tb, ev); r.tb = clone(tb); log.push(r); });
  return {tb: tb, log: log, loop: hasLoop(T, tb)};
}
/* Schleife: folgt man den Next Hops, kommt man nie bei R1 (direkt) an und landet wieder bei einem Router */
function hasLoop(T, tb) {
  for (var i = 0; i < T.n; i++) {
    var seen = {}, c = i, steps = 0;
    while (tb[c].m < INF && tb[c].via >= 0 && steps < 20) { if (seen[c]) return true; seen[c] = 1; c = tb[c].via; steps++; }
  }
  return false;
}

var CFG = {
  L: {n: [3, 3], ev: [2, 2], modes: ['none', 'none', 'sh']},
  M: {n: [3, 4], ev: [2, 4], modes: ['none', 'sh', 'poison']},
  S: {n: [4, 5], ev: [3, 5], modes: ['none', 'sh', 'poison', 'pr']}
};
function makeTask(seed, lvl) {
  lvl = String(lvl).toUpperCase();
  if (!LVCODE[lvl] || !(seed >= 1)) return null;
  var c = CFG[lvl];
  for (var att = 0; att < 400; att++) {
    var r = mulberry32((seed * 7919 + att * 104729 + LVCODE[lvl] * 1000003 + 777) >>> 0);
    var n = ri(r, c.n[0], c.n[1]), mode = pick(r, c.modes);
    var T = {n: n, mode: mode, sh: mode !== 'none', poison: mode === 'poison' || mode === 'pr', pr: mode === 'pr', events: [{k: 'fail'}]};
    T.hd = T.poison;
    var k = ri(r, c.ev[0], c.ev[1]);
    if (T.poison) T.events.push({k: 'trig', s: 0, t: 1});
    while (T.events.length < k + 1) {
      var s = ri(r, 0, n - 1), dir = r() < 0.5 ? -1 : 1, t = s + dir;
      if (t < 0 || t >= n) t = s - dir;
      if (t < 0 || t >= n) continue;
      /* in Leicht: die klassische Falle zuerst */
      if (lvl === 'L' && T.events.length === 1) { s = 1; t = 0; }
      var last = T.events[T.events.length - 1];
      if (last.s === s && last.t === t) continue;
      T.events.push({k: 'upd', s: s, t: t});
    }
    var R = run(T);
    /* interessant: mindestens zwei Tabellen ändern sich, und nicht jedes Update ist wirkungslos */
    var changes = R.log.reduce(function (a, x) { return a + x.changed.length; }, 0);
    if (changes < (lvl === 'L' ? 2 : 3)) continue;
    if (lvl !== 'L' && T.mode === 'none' && !R.loop && r() < 0.5) continue;
    if (lvl === 'L' && !R.loop) continue;
    T.code = lvl + '-' + seed; T.level = lvl; T.res = R;
    return T;
  }
  return null;
}
function name(i) { return 'R' + (i + 1); }
function evText(T, ev) {
  if (ev.k === 'fail') return 'Das Netz an R1 fällt aus. R1 setzt die Route auf 16.';
  if (ev.k === 'trig') return name(ev.s) + ' schickt sofort ein Triggered Update an ' + name(ev.t) + '.';
  return name(ev.s) + ' schickt sein reguläres Update an ' + name(ev.t) + '.';
}
function explain(T, r) {
  var ev = r.ev, S = name(ev.s), Tn = name(ev.t);
  if (ev.k === 'fail') return 'R1 bemerkt den Ausfall: 16 = unerreichbar.';
  if (r.note === 'sh') return 'Split Horizon: ' + S + ' hat das Netz über ' + Tn + ' gelernt und erwähnt es gegenüber ' + Tn + ' nicht. Nichts ändert sich.';
  var adv = r.adv >= INF ? '16 (unerreichbar)' : r.adv + ' Hop' + (r.adv === 1 ? '' : 's');
  var pre = S + ' meldet „' + adv + '“' + (T.pr && r.adv >= INF && r.tb[ev.s].via === ev.t ? ' (Poison Reverse)' : '') + '. ';
  var t = r.tb[ev.t];
  switch (r.note) {
    case 'direct': return pre + 'R1 ist direkt verbunden und hat 0 Hops – das Update ändert nichts.';
    case 'worse-from-nexthop': return pre + Tn + ' nutzt ' + S + ' als Next Hop und muss die schlechtere Info glauben: jetzt ' + (t.m >= INF ? '16 (unerreichbar)' : t.m + ' Hops über ' + S) + '.';
    case 'better': return pre + 'Für ' + Tn + ' ist das besser als bisher: ' + t.m + ' Hops über ' + S + '.';
    case 'revive': return pre + Tn + ' hatte das Netz als unerreichbar und nimmt das Angebot an: ' + t.m + ' Hops über ' + S + '.' + (T.mode === 'none' ? ' Ohne Hold-Down wird die tote Route so wiederbelebt.' : '');
    case 'holddown': return pre + Tn + ' hat die Route gerade als unerreichbar gelernt und hält sie im Hold-Down: Angebote von anderen Routern werden ignoriert.';
    case 'same': return pre + 'Für ' + Tn + ' ändert sich nichts.';
    default: return pre + 'Für ' + Tn + ' ist das nicht besser als der bisherige Weg – ignoriert.';
  }
}

G.RL = {LVNAME: LVNAME, INF: INF, makeTask: makeTask, run: run, initial: initial, hasLoop: hasLoop, evText: evText, explain: explain, name: name};
})(typeof window !== 'undefined' ? window : globalThis);
