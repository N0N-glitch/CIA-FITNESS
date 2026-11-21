/* Cia Fitness - script.js */
(function () {
  'use strict';

  /* ---------- Header: sombra ao rolar e menu mobile ---------- */
  var header = document.getElementById('header');
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    nav.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () {
    setMenu(!nav.classList.contains('open'));
  });
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  /* ---------- Ano no rodapé ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Revelação ao rolar ---------- */
  var revealEls = document.querySelectorAll('.card, .mod, .info li');
  revealEls.forEach(function (el) { el.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Carrossel de equipamentos ---------- */
  var viewport = document.getElementById('carViewport');
  var track = document.getElementById('carTrack');
  var bar = document.getElementById('carProgress');
  var thumbsBox = document.getElementById('thumbs');
  if (!viewport || !track) return;

  var slides = Array.prototype.slice.call(track.children);
  var N = slides.length;
  var DURATION = 5000;         // tempo de cada slide (ms)
  var SNAP_TIME = 600;         // duração da animação (ms)

  // Clones nas pontas para o loop infinito
  track.insertBefore(slides[N - 1].cloneNode(true), slides[0]);
  track.appendChild(slides[0].cloneNode(true));

  var pos = 1;                 // posição no track (1 = primeiro slide real)
  var width = viewport.clientWidth;
  var dx = 0;
  var dragging = false;
  var startX = 0;
  var locked = false;
  var elapsed = 0;
  var lastTime = performance.now();
  var hovering = false;

  // Miniaturas
  var thumbs = slides.map(function (s, i) {
    var b = document.createElement('button');
    b.className = 'thumb';
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', 'Ir para ' + s.dataset.title);
    b.innerHTML = '<svg><use href="#i-photo"/></svg><span>' + s.dataset.title + '</span>';
    b.addEventListener('click', function () { go(i + 1); });
    thumbsBox.appendChild(b);
    return b;
  });

  function realIndex() { return (pos - 1 + N) % N; }

  function render(animate) {
    track.style.transition = animate
      ? 'transform ' + SNAP_TIME + 'ms cubic-bezier(.22,.61,.36,1)'
      : 'none';
    track.style.transform = 'translate3d(' + (-pos * width + dx) + 'px,0,0)';
  }

  function updateThumbs() {
    var idx = realIndex();
    thumbs.forEach(function (t, i) {
      var on = i === idx;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
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
      // Salto invisível quando chega em um clone
      if (pos === 0) pos = N;
      else if (pos === N + 1) pos = 1;
      render(false);
      locked = false;
    }, SNAP_TIME + 30);
  }

  function next() { go(pos + 1); }
  function prev() { go(pos - 1); }

  // Barra de progresso + avanço automático
  function tick(now) {
    var dt = Math.min(now - lastTime, 100);
    lastTime = now;
    if (!dragging && !locked && !hovering && !document.hidden) {
      elapsed += dt;
      bar.style.width = Math.min(elapsed / DURATION, 1) * 100 + '%';
      if (elapsed >= DURATION) next();
    }
    requestAnimationFrame(tick);
  }

  // Arraste (mouse e toque)
  viewport.addEventListener('pointerdown', function (e) {
    if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragging = true;
    startX = e.clientX;
    dx = 0;
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
    if (Math.abs(moved) > width * 0.15) {
      go(moved < 0 ? pos + 1 : pos - 1);
    } else {
      render(true);
    }
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // Teclado (setas) quando o carrossel está em foco
  viewport.setAttribute('tabindex', '0');
  viewport.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });

  // Pausa quando o mouse está sobre o carrossel (apenas desktop)
  viewport.addEventListener('mouseenter', function () { hovering = true; });
  viewport.addEventListener('mouseleave', function () { hovering = false; });

  // Redimensionamento
  window.addEventListener('resize', function () {
    width = viewport.clientWidth;
    render(false);
  });

  render(false);
  updateThumbs();
  requestAnimationFrame(function (t) { lastTime = t; tick(t); });
})();
