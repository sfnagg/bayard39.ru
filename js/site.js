/* Мобильное меню и кнопка «наверх».
   Раньше это тянуло jQuery + Bootstrap 3 + mCustomScrollbar (~500 КБ)
   ради одного тоггла. Здесь то же самое без зависимостей. */
(function () {
  'use strict';

  // Сцену «объекты под охраной» грузим только там, где под неё есть место
  if (document.querySelector('.sh, .sh-mini')) {
    var scene = document.createElement('script');
    scene.src = document.currentScript.src.replace('site.js', 'scroll-hero.js');
    document.head.appendChild(scene);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var trigger = document.querySelector('.cd-bouncy-nav-trigger');
    var modal = document.querySelector('.cd-bouncy-nav-modal');

    if (trigger && modal) {
      var busy = false;

      // текущая страница — подсветкой, телефон — кнопкой под списком
      modal.querySelectorAll('.cd-bouncy-nav a').forEach(function (a) {
        if (a.pathname.replace(/index\.html$/, '') === location.pathname.replace(/index\.html$/, '')) a.setAttribute('aria-current', 'page');
      });
      var phone = document.querySelector('.site-header .header-phone');
      if (phone) modal.querySelector('nav').appendChild(phone.cloneNode(true));

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

    // Интерактивный Lightbox для благодарственных писем
    var lettersLinks = document.querySelectorAll('.letters a');
    if (lettersLinks.length > 0) {
      var modal = document.createElement('dialog');
      modal.className = 'letter-lightbox';
      modal.innerHTML = '<div class="letter-lightbox-content">' +
        '<button type="button" class="letter-lightbox-close" aria-label="Закрыть">&times;</button>' +
        '<img src="" alt="" class="letter-lightbox-img">' +
        '<p class="letter-lightbox-caption"></p>' +
        '</div>';
      document.body.appendChild(modal);

      var modalImg = modal.querySelector('.letter-lightbox-img');
      var modalCaption = modal.querySelector('.letter-lightbox-caption');
      var closeBtn = modal.querySelector('.letter-lightbox-close');

      var closeModal = function () {
        modal.classList.remove('is-open');
        setTimeout(function () {
          if (modal.open) modal.close();
        }, 200);
      };

      closeBtn.addEventListener('click', closeModal);
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal();
      });

      lettersLinks.forEach(function (link) {
        link.removeAttribute('target');
        link.addEventListener('click', function (e) {
          if (e.ctrlKey || e.metaKey || e.shiftKey) return;
          e.preventDefault();
          var href = link.getAttribute('href');
          var note = link.closest('li') ? link.closest('li').querySelector('.note') : null;
          var captionText = note ? note.textContent.trim() : '';

          modalImg.src = href;
          modalImg.alt = captionText;
          modalCaption.textContent = captionText;

          if (typeof modal.showModal === 'function') {
            modal.showModal();
            requestAnimationFrame(function () {
              modal.classList.add('is-open');
            });
          } else {
            window.open(href, '_blank');
          }
        });
      });
    }

    // Кинематографичный Scroll Reveal для ключевых блоков
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var revealTargets = document.querySelectorAll(
        '.fact, .card, .letters li, .price-strip, .section > h2, .contact-list, details'
      );
      if (revealTargets.length > 0) {
        var revealObserver = new IntersectionObserver(function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-revealed');
              observer.unobserve(entry.target);
            }
          });
        }, {
          threshold: 0.08,
          rootMargin: '0px 0px -30px 0px'
        });

        revealTargets.forEach(function (el) {
          el.classList.add('reveal-on-scroll');
          revealObserver.observe(el);
        });
      }
    }
  });
})();
