(function () {
  /* page switching */
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.menu a[href^="#"]'));
  function route() {
    var id = (location.hash || '#home').slice(1);
    if (!pages.some(function (p) { return p.dataset.page === id; })) id = 'home';
    pages.forEach(function (p) { p.hidden = p.dataset.page !== id; });
    navLinks.forEach(function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();

  /* filter the selected work grid by tag */
  var items = Array.prototype.slice.call(document.querySelectorAll('#covers li'));
  var bar = document.getElementById('filterbar');
  var name = document.getElementById('filtername');
  function filter(tag) {
    items.forEach(function (li) { li.hidden = tag && li.dataset.tags.split(' ').indexOf(tag) === -1; });
    bar.hidden = !tag;
    name.textContent = tag || '';
  }
  document.querySelectorAll('[data-tag]').forEach(function (b) {
    b.addEventListener('click', function () { filter(b.dataset.tag); });
  });
  document.getElementById('clearfilter').addEventListener('click', function () { filter(null); });

  /* circuit that turns into an interlocking pattern */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.getElementById('tess'), ctx = cv.getContext('2d');
  var mx = 0.45, target = 0.45, auto = true, inv = false, dpr = 1, now = 0;
  var orient = [], seed = 20261017;
  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  for (var q = 0; q < 1600; q++) orient.push(rnd() < 0.5 ? 0 : 1);
  function size() {
    var w = cv.clientWidth || 400;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(w * 1.2 * dpr);
  }
  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(v) { v = clamp(v); return v * v * (3 - 2 * v); }
  function hex(h) { return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)]; }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')'; }
  /* one connector between two edge midpoints, curling round a corner: right angle (a=0) to quarter circle (a=1) */
  function connector(s, corner, a, N) {
    var pts = [], r = s / 2;
    /* circuit route: straight, a 45 degree bend, straight, like a board trace */
    var P = [[r, 0], [r, r * 0.45], [r * 0.45, r], [0, r]];
    var L = [], tot = 0;
    for (var m = 0; m < 3; m++) { var d = Math.hypot(P[m + 1][0] - P[m][0], P[m + 1][1] - P[m][1]); L.push(d); tot += d; }
    for (var k = 0; k <= N; k++) {
      var u = k / N, th = u * Math.PI / 2;
      var ax = r * Math.cos(th), ay = r * Math.sin(th);
      var dist = u * tot, seg = 0;
      while (seg < 2 && dist > L[seg]) { dist -= L[seg]; seg++; }
      var f = L[seg] ? dist / L[seg] : 0;
      var lx = P[seg][0] + (P[seg + 1][0] - P[seg][0]) * f, ly = P[seg][1] + (P[seg + 1][1] - P[seg][1]) * f;
      var x = lx + (ax - lx) * a, y = ly + (ay - ly) * a;
      if (corner === 1 || corner === 3) x = s - x;
      if (corner === 2 || corner === 3) y = s - y;
      pts.push([x, y]);
    }
    return pts;
  }
  var CORNERS = [[0, 0], [1, 0], [0, 1], [1, 1]];
  function draw() {
    var W = cv.width, H = cv.height, cols = 7, s = Math.ceil(W / cols), rows = Math.ceil(H / s) + 1, N = 16;
    var INK = inv ? '#F1EFE8' : '#1B1B1D', PAPER = inv ? '#1B1B1D' : '#F1EFE8', BOARD = '#26272B';
    ctx.clearRect(0, 0, W, H);
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var x0 = i * s, y0 = j * s;
        var a = smooth(((x0 + s / 2) / W - mx) * 2.6 + 0.5);
        var o = orient[(j * 40 + i) % orient.length];
        var corners = o === 0 ? [0, 3] : [1, 2];
        var cornerPar = (i + j + (o === 0 ? 0 : 1)) % 2, bandPar = 1 - cornerPar;
        var colOf = function (p) { return mix(BOARD, p === 0 ? INK : PAPER, a); };
        ctx.save(); ctx.translate(x0, y0);
        ctx.fillStyle = colOf(bandPar); ctx.fillRect(0, 0, s, s);
        var paths = corners.map(function (c) { return { c: c, p: connector(s, c, a, N) }; });
        paths.forEach(function (P) {
          var cx = CORNERS[P.c][0] * s, cy = CORNERS[P.c][1] * s;
          ctx.beginPath(); ctx.moveTo(cx, cy);
          P.p.forEach(function (pt) { ctx.lineTo(pt[0], pt[1]); });
          ctx.closePath(); ctx.fillStyle = colOf(cornerPar); ctx.fill();
        });
        /* traces */
        ctx.lineWidth = (1.5 + a * 0.6) * dpr; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.strokeStyle = mix('#CFC9BB', '#7F7B72', a);
        paths.forEach(function (P) { ctx.beginPath(); P.p.forEach(function (pt, k) { k ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]); }); ctx.stroke(); });
        /* circuit details fade out as the pattern takes over */
        var c = clamp((0.6 - a) / 0.6);
        if (c > 0) {
          ctx.globalAlpha = c; ctx.fillStyle = '#CFC9BB';
          var pd = s * 0.06;
          [[s / 2, 0], [s, s / 2], [s / 2, s], [0, s / 2]].forEach(function (m) { ctx.fillRect(m[0] - pd / 2, m[1] - pd / 2, pd, pd); });
          if ((i * 31 + j * 17) % 5 === 0) {
            var cw = s * 0.26, chh = s * 0.18;
            ctx.fillStyle = '#0F0F11'; ctx.fillRect(s / 2 - cw / 2, s / 2 - chh / 2, cw, chh);
            ctx.strokeStyle = '#CFC9BB'; ctx.lineWidth = 1 * dpr; ctx.strokeRect(s / 2 - cw / 2, s / 2 - chh / 2, cw, chh);
            ctx.fillStyle = '#CFC9BB';
            for (var pn = 0; pn < 4; pn++) { var px = s / 2 - cw / 2 + cw * (pn + 0.5) / 4 - 1.5 * dpr; ctx.fillRect(px, s / 2 - chh / 2 - 4 * dpr, 3 * dpr, 4 * dpr); ctx.fillRect(px, s / 2 + chh / 2, 3 * dpr, 4 * dpr); }
          }
          /* signal pulses along the traces */
          paths.forEach(function (P, idx) {
            var ph = ((now / 1700) + ((i * 7 + j * 13 + idx * 5) % 10) / 10) % 1;
            var pt = P.p[Math.round(ph * N)];
            ctx.fillStyle = '#FFF4D6'; ctx.beginPath(); ctx.arc(pt[0], pt[1], s * 0.045, 0, Math.PI * 2); ctx.fill();
          });
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }
    }
  }
  function loop(t) {
    now = t;
    if (auto) target = 0.45 + 0.3 * Math.sin(t / 2800);
    mx += (target - mx) * 0.08;
    draw();
    requestAnimationFrame(loop);
  }
  size();
  window.addEventListener('resize', function () { size(); if (reduce) draw(); });
  cv.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect(); auto = false; target = (e.clientX - r.left) / r.width;
    if (reduce) { mx = target; draw(); }
  });
  cv.addEventListener('pointerleave', function () { auto = true; });
  document.getElementById('invert').addEventListener('click', function () { inv = !inv; draw(); });
  if (reduce) draw(); else requestAnimationFrame(loop);

  /* copy email */
  var copy = document.getElementById('copy'), note = document.getElementById('copynote'), email = document.getElementById('email');
  copy.addEventListener('click', function () {
    var done = function () { note.textContent = 'Copied'; setTimeout(function () { note.textContent = ''; }, 2000); };
    var fallback = function () {
      var r = document.createRange(); r.selectNodeContents(email);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      note.textContent = 'Selected. Press Ctrl+C or Cmd+C to copy.';
    };
    try { navigator.clipboard.writeText(email.textContent.trim()).then(done, fallback); } catch (e) { fallback(); }
  });
})();

(function () {
  var btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  var root = document.documentElement;
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function current() { return root.getAttribute('data-theme') || (mq && mq.matches ? 'dark' : 'light'); }
  function label() { var next = current() === 'dark' ? 'light' : 'dark'; btn.setAttribute('aria-label', 'Switch to ' + next + ' mode'); btn.title = 'Switch to ' + next + ' mode'; }
  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    label();
  });
  if (mq && mq.addEventListener) mq.addEventListener('change', label);
  label();
})();
