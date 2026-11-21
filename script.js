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
  window.addEventListener('resize', function () { if (window.innerWidth > 820) setMenu(false); });

  /* ---------- Ano ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Horários: destaca o dia e mostra aberto/fechado (horário de Rondônia) ---------- */
  (function () {
    var status = document.getElementById('status');
    var rows = document.querySelectorAll('#hours tr');
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Porto_Velho', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(new Date());
      var get = function (t) { return parts.filter(function (p) { return p.type === t; })[0].value; };
      var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      var mins = (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10);
      var open = false;
      rows.forEach(function (tr) {
        if (tr.dataset.days.split(',').map(Number).indexOf(day) === -1) return;
        tr.classList.add('today');
        open = mins >= +tr.dataset.open && mins < +tr.dataset.close;
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

  // Clones nas pontas para o loop infinito
  track.insertBefore(slides[N - 1].cloneNode(true), slides[0]);
  track.appendChild(slides[0].cloneNode(true));

  var pos = 1, width = viewport.clientWidth, dx = 0, startX = 0;
  var dragging = false, locked = false, hovering = false;
  var elapsed = 0, last = performance.now();

  // Miniaturas
  var thumbs = slides.map(function (s, i) {
    var b = document.createElement('button');
    b.className = 'thumb';
    b.type = 'button';
    b.setAttribute('aria-label', 'Ir para ' + s.dataset.title);
    b.innerHTML = '<svg><use href="#i-photo"/></svg><span>' + s.dataset.title + '</span>';
    b.addEventListener('click', function () { go(i + 1); });
    strip.appendChild(b);
    return b;
  });

  function realIndex() { return (pos - 1 + N) % N; }

  function render(animate) {
    track.style.transition = animate ? 'transform ' + SNAP + 'ms cubic-bezier(.22,.61,.36,1)' : 'none';
    track.style.transform = 'translate3d(' + (-pos * width + dx) + 'px,0,0)';
  }

  function updateThumbs() {
    var idx = realIndex();
    thumbs.forEach(function (t, i) { t.classList.toggle('active', i === idx); });
    var a = thumbs[idx];
    strip.scrollTo({ left: a.offsetLeft - (strip.clientWidth - a.offsetWidth) / 2, behavior: 'smooth' });
  }

  function go(target) {
    if (locked) return;
    locked = true;
    pos = target;
    dx = 0;
    render(true);
    updateThumbs();
    elapsed = 0;
    bar.style.width = '0%';
    setTimeout(function () {
      if (pos === 0) pos = N;            // salto invisível entre clone e slide real
      else if (pos === N + 1) pos = 1;
      render(false);
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
    var moved = dx;
    dx = 0;
    if (Math.abs(moved) > width * 0.15) go(moved < 0 ? pos + 1 : pos - 1);
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

  // Arraste contínuo da fileira de miniaturas (mouse; no toque a rolagem é nativa)
  var down = false, moved = false, sx = 0, sl = 0;
  strip.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    down = true; moved = false; sx = e.clientX; sl = strip.scrollLeft;
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

  window.addEventListener('resize', function () { width = viewport.clientWidth; render(false); });

  render(false);
  updateThumbs();
  requestAnimationFrame(function (t) { last = t; tick(t); });
})();
