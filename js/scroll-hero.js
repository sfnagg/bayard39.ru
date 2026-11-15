/* Изометрическая сцена «объекты под охраной».
   Главная: #sh — камера едет по объектам при скролле.
   Внутренние: .sh-mini[data-scene] — статичный кадр (0 — панорама, 1–5 — объект).
   Сцена рисуется в SVG кодом, без библиотек и картинок. */
(function () {
  'use strict';
  var U = 20, C = Math.cos(Math.PI / 6), S = 0.5, NS = 'http://www.w3.org/2000/svg';
  var OBJ = [{ c: 10, h: 12 }, { c: 34, h: 4 }, { c: 58, h: 5 }, { c: 82, h: 10 }, { c: 106, h: 6.5 }];
  var GREY = ['#313b47', '#232b35', '#171d25'], DARK = ['#1c232c', '#141a21', '#0f141a'],
      GOLD = ['#FFC72C', '#F5B301', '#b98700'], STEEL = ['#c9d2db', '#9AA7B5', '#727e8b'],
      WOOD = ['#a07c1a', '#7d6012', '#5a450d'], LIT = 'rgba(245,179,1,.85)', DIM = 'rgba(154,167,181,.16)';
  var g; // текущий родитель для рисования
  var VB = [-360, -460, 2900, 1880]; // границы мира в пикселях холста

  // Изометрия: x уходит вправо-вниз, y влево-вниз, z вверх
  function P(x, y, z) { return [(x - y) * C * U, (x + y) * S * U - (z || 0) * U]; }
  function el(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    g.appendChild(e);
    return e;
  }
  function quad(a, fill, cls) {
    var attrs = { points: a.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') };
    if (fill) attrs.fill = fill;
    if (cls) attrs['class'] = cls;
    return el('polygon', attrs);
  }
  function line(a, b, stroke, width, dash) {
    var attrs = { x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: b[0].toFixed(1), y2: b[1].toFixed(1), stroke: stroke, 'stroke-width': width };
    if (dash) attrs['stroke-dasharray'] = dash;
    return el('line', attrs);
  }
  // Короб: верх, грань к зрителю слева (y), грань справа (x). Рисовать от дальних к ближним.
  function box(x, y, z, w, d, h, c) {
    c = c || GREY;
    quad([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], c[1]);
    quad([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], c[2]);
    quad([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], c[0]);
  }
  function faceY(x, y, z, w, h, fill, cls) { return quad([P(x, y, z), P(x + w, y, z), P(x + w, y, z + h), P(x, y, z + h)], fill, cls); }
  function faceX(x, y, z, d, h, fill) { return quad([P(x, y, z), P(x, y + d, z), P(x, y + d, z + h), P(x, y, z + h)], fill); }

  // Рисует мир в <g>, возвращает группу патрульной машины
  function build(world) {
    var X0 = -12, X1 = 128, i, j, c, d = '', seed = 7;
    function rnd() { seed = seed * 16807 % 2147483647; return seed / 2147483647; }
    function M(p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }
    g = world;

    // Земля, дорога
    for (i = X0; i <= X1; i += 2) d += 'M' + M(P(i, -16)) + 'L' + M(P(i, 8));
    for (i = -16; i <= 8; i += 2) d += 'M' + M(P(X0, i)) + 'L' + M(P(X1, i));
    el('path', { d: d, 'class': 'sh-grid' });
    quad([P(X0, 0), P(X1, 0), P(X1, 3.4), P(X0, 3.4)], '#161B22');
    line(P(X0, 1.7), P(X1, 1.7), 'rgba(245,179,1,.45)', 2, '18 16');

    // Периметры под охраной и радар
    OBJ.forEach(function (o) {
      quad([P(o.c - 8.5, -13.5), P(o.c + 8.5, -13.5), P(o.c + 8.5, -0.8), P(o.c - 8.5, -0.8)], '', 'sh-perim');
      var p = P(o.c, -7);
      [0, 1.6].forEach(function (delay) {
        el('ellipse', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), rx: (11 * 1.2247 * U).toFixed(1), ry: (11 * 0.7071 * U).toFixed(1), 'class': 'sh-pulse', style: 'animation-delay:-' + delay + 's' });
      });
    });

    // 1. Офис
    c = OBJ[0].c;
    box(c - 4, -11, 0, 8, 7, 12);
    for (i = 0; i < 4; i++) for (j = 0; j < 7; j++) faceY(c - 3.4 + i * 1.9, -4, 1.3 + j * 1.5, 1.3, 0.9, (i * 7 + j * 3) % 5 < 2 ? LIT : DIM);
    for (i = 0; i < 3; i++) for (j = 0; j < 7; j++) faceX(c + 4, -10.4 + i * 2.2, 1.3 + j * 1.5, 1.6, 0.9, (i * 5 + j * 2) % 7 < 2 ? LIT : DIM);
    box(c + 4, -10, 0, 3, 5, 6, DARK);
    for (i = 0; i < 2; i++) for (j = 0; j < 3; j++) faceY(c + 4.4 + i * 1.3, -5, 1.2 + j * 1.5, 0.9, 0.9, (i + j) % 3 ? DIM : LIT);
    box(c - 2, -4, 0, 4, 1.4, 1.5, DARK);
    faceY(c - 1.6, -2.6, 0.2, 3.2, 1, 'rgba(245,179,1,.35)');
    box(c - 2.2, -4, 1.5, 4.4, 1.6, 0.15, GOLD);

    // 2. Магазин
    c = OBJ[1].c;
    box(c - 6, -10, 0, 12, 6, 3.6);
    faceY(c - 5.2, -4, 0.3, 10.4, 2, 'rgba(245,179,1,.3)');
    for (i = 1; i < 4; i++) faceY(c - 5.2 + i * 2.6, -4, 0.3, 0.12, 2, '#232b35');
    faceY(c - 3.5, -4, 2.75, 7, 0.55, GOLD[1]);
    box(c - 5.6, -4, 2.3, 11.2, 1.1, 0.18, GOLD);
    for (i = 0; i < 3; i++) box(c - 5 + i * 3.4, -2.6, 0.15, 2, 1, 0.7, i === 1 ? STEEL : DARK);

    // 3. Склад
    c = OBJ[2].c;
    box(c - 7, -12, 0, 14, 8, 5);
    for (i = 0; i < 6; i++) line(P(c - 5.8 + i * 2.33, -12, 5), P(c - 5.8 + i * 2.33, -4, 5), '#3d4855', 2);
    for (i = 0; i < 3; i++) {
      faceY(c - 6 + i * 4.4, -4, 0, 3.2, 3.4, '#0f141a');
      for (j = 1; j < 6; j++) faceY(c - 6 + i * 4.4, -4, j * 0.56, 3.2, 0.05, '#2A323C');
    }
    faceY(c - 6.4, -4, 4, 12.8, 0.3, GOLD[1]);
    box(c - 6.5, -3.2, 0, 1.2, 1.2, 1.2, WOOD);
    box(c - 5.1, -3.2, 0, 1.2, 1.2, 1.2, WOOD);
    box(c - 5.8, -3.2, 1.2, 1.2, 1.2, 1.2, WOOD);
    box(c + 1, -3, 0.35, 4, 1.7, 2.1, STEEL);
    box(c + 5, -3, 0.35, 1.3, 1.7, 1.5, GOLD);

    // 4. Стройка
    c = OBJ[3].c;
    for (j = 0; j < 4; j++) {
      [[c - 5, -10], [c + 3.7, -10], [c - 0.7, -10], [c - 5, -4.3], [c - 0.7, -4.3], [c + 3.7, -4.3]].forEach(function (q) { box(q[0], q[1], j * 2.3, 0.3, 0.3, 2.3, DARK); });
      if (j < 3) box(c - 5, -10, j * 2.3 + 2, 9, 6, 0.3);
    }
    faceY(c - 5, -4, 0, 9, 1.1, 'rgba(245,179,1,.22)');
    box(c + 5.6, -11, 0, 0.6, 0.6, 16, GOLD);
    box(c - 5, -11, 16, 13, 0.6, 0.5, GOLD);
    box(c + 6.6, -11.3, 15.4, 1.6, 1.2, 1.2, DARK);
    line(P(c + 2, -10.7, 16), P(c + 2, -10.7, 13), '#9AA7B5', 1);
    box(c + 1.2, -11.4, 12, 1.6, 1.4, 1, STEEL);
    box(c - 7.5, -3.4, 0, 2.2, 1.6, 1.5, STEEL);

    // 5. Мероприятие
    c = OBJ[4].c;
    box(c - 5, -11.4, 1.2, 10, 0.4, 5, DARK);
    faceY(c - 4, -11, 2, 8, 3.6, 'rgba(245,179,1,.38)', 'sh-beam');
    box(c - 5, -11, 0, 10, 3, 1.2);
    box(c - 5.5, -8.3, 1.2, 0.4, 0.4, 5, DARK);
    box(c + 5.1, -8.3, 1.2, 0.4, 0.4, 5, DARK);
    box(c - 5.6, -11.5, 6.2, 11.2, 3.8, 0.3);
    [-3, 0, 3].forEach(function (dx, n) {
      quad([P(c + dx - 0.3, -8.2, 6.2), P(c + dx + 0.3, -8.2, 6.2), P(c + dx + 2, -3.5, 0), P(c + dx - 2, -3.5, 0)], 'rgba(245,179,1,.13)', 'sh-beam').style.animationDelay = -n * 0.9 + 's';
    });
    var crowd = [];
    for (i = 0; i < 46; i++) crowd.push([c - 5.5 + rnd() * 11, -6.8 + rnd() * 4.6]);
    crowd.sort(function (m, n) { return m[0] + m[1] - n[0] - n[1]; }).forEach(function (q) {
      var a = P(q[0], q[1], 0), col = rnd() < 0.18 ? GOLD[1] : (rnd() < 0.5 ? '#9AA7B5' : '#5c6773');
      el('line', { x1: a[0].toFixed(1), y1: a[1].toFixed(1), x2: a[0].toFixed(1), y2: (a[1] - 9).toFixed(1), stroke: col, 'stroke-width': 4, 'stroke-linecap': 'round' });
      el('circle', { cx: a[0].toFixed(1), cy: (a[1] - 14).toFixed(1), r: 2.8, fill: col });
    });
    for (i = 0; i < 6; i++) box(c - 6 + i * 2.1, -1.7, 0, 1.6, 0.12, 0.8, STEEL);

    // Метки «под охраной» над объектами
    OBJ.forEach(function (o) {
      var p = P(o.c, -7, o.h + 3.2);
      g = el('g', { transform: 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')' });
      g = el('g', { 'class': 'sh-pin' });
      line([0, 22], [0, 2.6 * U], 'rgba(245,179,1,.5)', 1.5, '3 4');
      el('circle', { r: 22, fill: '#0D1117', stroke: '#F5B301', 'stroke-width': 2 });
      el('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', fill: '#F5B301', transform: 'translate(-14.4 -14.4) scale(1.2)' });
      el('path', { d: 'm9 12 2 2 4-4', fill: 'none', stroke: '#0D1117', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', transform: 'translate(-14.4 -14.4) scale(1.2)' });
      g = world;
    });

    // Фонари вдоль дороги
    for (i = X0 + 4; i < X1; i += 12) {
      box(i, 3.9, 0, 0.15, 0.15, 3.2, DARK);
      var l = P(i, 3.7, 3.2);
      el('circle', { cx: l[0].toFixed(1), cy: l[1].toFixed(1), r: 12, fill: 'rgba(245,179,1,.12)' });
      el('circle', { cx: l[0].toFixed(1), cy: l[1].toFixed(1), r: 3, fill: '#FFC72C' });
    }

    // Патрульная машина
    var car = g = el('g', {});
    quad([P(2.5, 0.1, 0.4), P(8, -0.7, 0), P(8, 1.9, 0), P(2.5, 1.1, 0.4)], 'rgba(255,199,44,.16)');
    box(0, 0, 0.2, 2.6, 1.2, 0.55, ['#e7ecf1', '#c9d2db', '#9AA7B5']);
    box(0.5, 0.1, 0.75, 1.4, 1, 0.5, DARK);
    box(1, 0.3, 1.25, 0.4, 0.6, 0.15, GOLD);
    car.lastChild.setAttribute('class', 'sh-blink');
    g = world;
    return car;
  }

  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  // Возвращает render(p): p = 0 — панорама, 1–5 — объекты, дробное — переезд между ними
  function mount(view, mini) {
    var svg = view.appendChild(document.createElementNS(NS, 'svg'));
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    // Холст размером со весь мир рисуется один раз, а камера — это CSS-трансформация
    // всего холста: её считает видеокарта, без перерисовки сцены на каждый кадр скролла.
    svg.setAttribute('viewBox', VB.join(' '));
    svg.setAttribute('width', VB[2]);
    svg.setAttribute('height', VB[3]);
    var world = svg.appendChild(document.createElementNS(NS, 'g')), car = build(world);
    return function (p) {
      var W = view.clientWidth, H = view.clientHeight, wide = W >= 900;
      if (!W || !H) return;
      function cam(n) {
        var o = OBJ[n - 1];
        // панорама: на главной — весь квартал, в шапке внутренних страниц — крупный фрагмент
        if (!n) return mini ? { x: 46, y: -5, z: 2, k: Math.min(1, H / 520), cx: 0.5, cy: 0.55, car: 50 }
                            : { x: 58, y: -5, z: 0, k: Math.max(W / 3000, 0.17), cx: wide ? 0.56 : 0.5, cy: wide ? 0.6 : 0.17, car: -8 };
        return {
          x: o.c, y: -6, z: o.h / 2, car: o.c + 6,
          k: mini ? Math.min(W / 680, H / (o.h * U + 250), 1) : Math.max(0.5, Math.min(W / 1150, H / 780, 1)),
          cx: mini || !wide ? 0.5 : 0.68, cy: mini ? 0.56 : wide ? 0.56 : 0.34
        };
      }
      var n = Math.min(Math.floor(p), 4), f = ease((p - n - 0.2) / 0.6), a = cam(n), b = cam(n + 1);
      function L(m) { return a[m] + (b[m] - a[m]) * f; }
      var k = a.k * Math.pow(b.k / a.k, f), s = P(L('x'), L('y'), L('z')), cp = P(L('car'), 1.1);
      svg.style.transform = 'translate3d(' + (W * L('cx') - k * (s[0] - VB[0])).toFixed(1) + 'px,' + (H * L('cy') - k * (s[1] - VB[1])).toFixed(1) + 'px,0) scale(' + k.toFixed(4) + ')';
      car.setAttribute('transform', 'translate(' + cp[0].toFixed(1) + ' ' + cp[1].toFixed(1) + ')');
    };
  }

  // Внутренние страницы: статичный кадр
  document.querySelectorAll('.sh-mini').forEach(function (view) {
    var render = mount(view, true), n = +view.getAttribute('data-scene') || 0;
    function draw() { render(n); }
    draw();
    addEventListener('resize', draw);
  });

  // Главная: камера по скроллу
  var sec = document.getElementById('sh');
  if (!sec) return;
  var caps = sec.querySelectorAll('.sh-cap'), dots = [];
  // Точки-переходы работают только со скриптом, поэтому и создаются здесь
  var nav = sec.querySelector('.sh-stage').appendChild(document.createElement('div'));
  nav.className = 'sh-dots';
  nav.setAttribute('role', 'group');
  nav.setAttribute('aria-label', 'Объекты охраны');
  caps.forEach(function (c, n) {
    var b = nav.appendChild(document.createElement('button'));
    b.type = 'button';
    b.setAttribute('aria-label', n ? c.querySelector('h2').textContent : 'Начало');
    dots.push(b);
  });
  var render = mount(sec.querySelector('.sh-view'), false);
  // Без движения (prefers-reduced-motion) остаётся панорама и обычный список ссылок
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    render(0);
    addEventListener('resize', function () { render(0); });
    return;
  }
  function span() { return sec.offsetHeight - innerHeight; }
  function frame() {
    var p = Math.max(0, Math.min(1, -sec.getBoundingClientRect().top / span())) * 5, act = Math.round(p);
    render(p);
    for (var q = 0; q < caps.length; q++) {
      caps[q].classList.toggle('on', q === act);
      if (q === act) dots[q].setAttribute('aria-current', 'true'); else dots[q].removeAttribute('aria-current');
    }
  }
  var busy = false;
  var stage = sec.querySelector('.sh-view'), idle;
  function tick() {
    // пока страница едет, мелкие анимации сцены стоят: иначе браузер перерисовывает холст на каждом кадре
    stage.classList.add('sh-moving');
    clearTimeout(idle);
    idle = setTimeout(function () { stage.classList.remove('sh-moving'); }, 160);
    if (busy) return;
    busy = true;
    requestAnimationFrame(function () { busy = false; frame(); });
  }
  addEventListener('scroll', tick, { passive: true });
  addEventListener('resize', tick);
  function go(n) { scrollTo({ top: sec.getBoundingClientRect().top + scrollY + span() * n / 5, behavior: 'smooth' }); }
  dots.forEach(function (b, n) { b.addEventListener('click', function () { go(n); }); });
  // Tab по ссылкам скрытых подписей подводит камеру к их объекту
  caps.forEach(function (c, n) { c.addEventListener('focusin', function () { if (!c.classList.contains('on')) go(n); }); });
  frame();
})();
