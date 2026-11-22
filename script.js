/* Cia Fitness - script.js */
(function () {
  'use strict';

  /* ---------- Menu mobile ---------- */
  var root = document.documentElement;
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function setMenu(open) {
    nav.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  burger.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1040) setMenu(false); });

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Horários: seletor deslizante ---------- */
  var seg = document.getElementById('seg');
  var btns = seg.querySelectorAll('.seg__btn');
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var i = Number(b.dataset.i);
      seg.dataset.active = i;                       // o CSS desliza o indicador
      btns.forEach(function (x) {
        var on = x === b;
        x.classList.toggle('active', on);
        x.setAttribute('aria-selected', String(on));
      });
      document.getElementById('view0').classList.toggle('active', i === 0);
      document.getElementById('view1').classList.toggle('active', i === 1);
    });
  });

  /* ---------- Horários: dia atual e aberto/fechado (horário de Rondônia) ---------- */
  (function () {
    var status = document.getElementById('status');
    var items = document.querySelectorAll('[data-days]');
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Porto_Velho', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(new Date());
      var get = function (t) { return parts.filter(function (p) { return p.type === t; })[0].value; };
      var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      var mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
      var open = false;
      items.forEach(function (el) {
        if (el.dataset.days.split(',').map(Number).indexOf(day) === -1) return;
        el.classList.add('today');
        if (mins >= Number(el.dataset.open) && mins < Number(el.dataset.close)) open = true;
      });
      status.textContent = open ? 'Aberto agora' : 'Fechado agora';
      status.classList.add(open ? 'open' : 'closed');
    } catch (e) {
      status.style.display = 'none';
    }
  })();

  /* ---------- Carrossel ---------- */
  var viewport = document.getElementById('carViewport');
  var track = document.getElementById('carTrack');
  var bar = document.getElementById('carProgress');
  var strip = document.getElementById('thumbs');
  if (!viewport || !track) return;

  var slides = Array.prototype.slice.call(track.children);
  var N = slides.length;
  var DURATION = 5000;   // tempo de cada slide (ms)
  var SNAP = 600;        // duração da animação (ms)

  // Clones nas pontas do slide para o loop infinito
  track.insertBefore(slides[N - 1].cloneNode(true), slides[0]);
  track.appendChild(slides[0].cloneNode(true));

  var pos = 1, width = viewport.clientWidth, dx = 0, startX = 0;
  var dragging = false, locked = false, hovering = false;
  var elapsed = 0, last = performance.now();
  var tp = 0;                       // posição do "ponteiro" nas miniaturas
  var stripAnim = false, stripRaf = 0;
  var down = false, moved = false, sx = 0, sl = 0;

  // Miniaturas: 3 cópias em anel (estilo relógio), a ativa fica na cópia do meio
  var allThumbs = [];
  for (var c = 0; c < 3; c++) {
    slides.forEach(function (s, i) {
      var b = document.createElement('button');
      b.className = 'thumb';
      b.type = 'button';
      b.setAttribute('aria-label', 'Ir para ' + s.dataset.title);
      if (c !== 1) { b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
      var im = s.querySelector('img');
      b.innerHTML = '<img src="' + (im ? im.getAttribute('src') : '') + '" alt="" draggable="false" decoding="async"><span>' + s.dataset.title + '</span>';
      b.addEventListener('click', function () { go(i + 1); });
      strip.appendChild(b);
      allThumbs.push(b);
    });
  }

  function realIndex() { return (pos - 1 + N) % N; }

  function render(animate) {
    track.style.transition = animate ? 'transform ' + SNAP + 'ms cubic-bezier(.22,.61,.36,1)' : 'none';
    track.style.transform = 'translate3d(' + (-pos * width + dx) + 'px,0,0)';
  }

  function setActiveThumb() {
    allThumbs.forEach(function (t) { t.classList.remove('active'); });
    allThumbs[N + tp].classList.add('active');
  }

  // Centraliza a miniatura ativa; sempre gira para frente, sem voltar
  function centerStrip(animate) {
    var el = allThumbs[N + tp];
    var x = el.offsetLeft + el.offsetWidth / 2 - strip.clientWidth / 2;
    cancelAnimationFrame(stripRaf);
    if (!animate) { strip.scrollLeft = x; return; }
    var from = strip.scrollLeft, t0 = performance.now();
    (function step(t) {
      var k = Math.min((t - t0) / SNAP, 1);
      k = 1 - Math.pow(1 - k, 3);
      strip.scrollLeft = from + (x - from) * k;
      if (k < 1) stripRaf = requestAnimationFrame(step);
    })(t0);
  }

  // Quando o usuário arrasta a fileira, reposiciona o anel sem salto visível
  function wrap() {
    if (stripAnim) return;
    var w = allThumbs[N].offsetLeft - allThumbs[0].offsetLeft, shift = 0;
    if (strip.scrollLeft < w * 0.5) shift = w;
    else if (strip.scrollLeft > w * 1.5) shift = -w;
    if (shift) { strip.scrollLeft += shift; if (down) sl += shift; }
  }
  strip.addEventListener('scroll', wrap, { passive: true });

  function go(target) {
    if (locked) return;
    locked = true; stripAnim = true;
    var prev = pos, cur = realIndex();
    var instant = Math.abs(target - prev) > 1;   // clique numa miniatura distante: troca direta
    var delta;
    pos = target;
    if (instant) {
      delta = (((realIndex() - cur) % N) + N) % N;
      if (delta > N / 2) delta -= N;             // caminho mais curto no anel
    } else {
      delta = target - prev;                     // +1 vira o ponteiro para frente, mesmo da última para a primeira
    }
    tp += delta;
    dx = 0;
    render(!instant);
    setActiveThumb();
    centerStrip(true);
    elapsed = 0;
    bar.style.width = '0%';
    setTimeout(function () {
      if (pos === 0) pos = N;                    // salto invisível entre clone e slide real
      else if (pos === N + 1) pos = 1;
      render(false);
      tp = ((tp % N) + N) % N;                   // volta para a cópia do meio (visual idêntico)
      setActiveThumb();
      centerStrip(false);
      stripAnim = false;
      locked = false;
    }, SNAP + 30);
  }

  // Barra de progresso e avanço automático
  function tick(now) {
    var dt = Math.min(now - last, 100);
    last = now;
    if (!dragging && !locked && !hovering && !document.hidden) {
      elapsed += dt;
      bar.style.width = Math.min(elapsed / DURATION, 1) * 100 + '%';
      if (elapsed >= DURATION) go(pos + 1);
    }
    requestAnimationFrame(tick);
  }

  // Arraste do slide (mouse e toque)
  viewport.addEventListener('pointerdown', function (e) {
    if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragging = true; startX = e.clientX; dx = 0;
    viewport.classList.add('dragging');
    viewport.setPointerCapture(e.pointerId);
    render(false);
  });
  viewport.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    dx = e.clientX - startX;
    render(false);
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove('dragging');
    var m = dx;
    dx = 0;
    if (Math.abs(m) > width * 0.15) go(m < 0 ? pos + 1 : pos - 1);
    else render(true);
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });
  viewport.setAttribute('tabindex', '0');
  viewport.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') go(pos + 1);
    if (e.key === 'ArrowLeft') go(pos - 1);
  });
  viewport.addEventListener('mouseenter', function () { hovering = true; });
  viewport.addEventListener('mouseleave', function () { hovering = false; });

  // Arraste da fileira de miniaturas com mouse (no toque a rolagem é nativa)
  strip.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false; sx = e.clientX; sl = strip.scrollLeft;
    cancelAnimationFrame(stripRaf);
  });
  window.addEventListener('pointermove', function (e) {
    if (!down) return;
    var d = e.clientX - sx;
    if (Math.abs(d) > 5) { moved = true; strip.classList.add('dragging'); }
    if (moved) strip.scrollLeft = sl - d;
  });
  window.addEventListener('pointerup', function () { down = false; strip.classList.remove('dragging'); });
  strip.addEventListener('click', function (e) {
    if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
  }, true);

  window.addEventListener('resize', function () { width = viewport.clientWidth; render(false); centerStrip(false); });
  window.addEventListener('load', function () { centerStrip(false); });

  render(false);
  setActiveThumb();
  centerStrip(false);
  requestAnimationFrame(function (t) { last = t; tick(t); });
})();
