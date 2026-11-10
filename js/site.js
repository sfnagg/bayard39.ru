/* Мобильное меню и кнопка «наверх».
   Раньше это тянуло jQuery + Bootstrap 3 + mCustomScrollbar (~500 КБ)
   ради одного тоггла. Здесь то же самое без зависимостей. */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var trigger = document.querySelector('.cd-bouncy-nav-trigger');
    var modal = document.querySelector('.cd-bouncy-nav-modal');

    if (trigger && modal) {
      var busy = false;

      var toggle = function (open) {
        if (busy) return;
        busy = true;

        trigger.setAttribute('aria-expanded', String(open));
        modal.classList.toggle('fade-in', open);
        modal.classList.toggle('fade-out', !open);

        var settled = false;
        var done = function () {
          if (settled) return;
          settled = true;
          modal.classList.toggle('is-visible', open);
          if (!open) modal.classList.remove('fade-out');
          busy = false;
          if (open) {
            var first = modal.querySelector('a');
            if (first) first.focus();
          } else {
            trigger.focus();
          }
        };

        var last = modal.querySelector('li:last-child');
        if (last) last.addEventListener('animationend', done, { once: true });
        // страховка: если анимация не сработала, меню всё равно не залипнет
        setTimeout(done, 700);
      };

      trigger.addEventListener('click', function () { toggle(true); });

      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.closest('.cd-close') || e.target.closest('a[href]')) {
          toggle(false);
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('is-visible')) toggle(false);
      });
    }

    var top = document.querySelector('.to-top');
    if (top) {
      var onScroll = function () {
        top.classList.toggle('show', window.scrollY > 400);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // 3D Tilt эффект герба в hero-секции (кинематографичный ракурс)
    var heroVisual = document.querySelector('.hero-visual');
    var artCard = document.querySelector('.hero-art-card');
    if (heroVisual && artCard && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var rafId = null;
      var curX = 0, curY = 0, targetX = 0, targetY = 0;

      var updateTilt = function () {
        curX += (targetX - curX) * 0.12;
        curY += (targetY - curY) * 0.12;
        artCard.style.transform = 'rotateX(' + (-curY * 13).toFixed(2) + 'deg) rotateY(' + (curX * 15).toFixed(2) + 'deg) translateZ(8px)';
        if (Math.abs(targetX - curX) > 0.001 || Math.abs(targetY - curY) > 0.001) {
          rafId = requestAnimationFrame(updateTilt);
        } else {
          rafId = null;
        }
      };

      heroVisual.addEventListener('mousemove', function (e) {
        var rect = heroVisual.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        targetX = Math.max(-1, Math.min(1, x * 2));
        targetY = Math.max(-1, Math.min(1, y * 2));
        if (!rafId) rafId = requestAnimationFrame(updateTilt);
      });

      heroVisual.addEventListener('mouseleave', function () {
        targetX = 0;
        targetY = 0;
        if (!rafId) rafId = requestAnimationFrame(updateTilt);
      });
    }
  });
})();
