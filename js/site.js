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

    /* Заявки. Один обработчик на обе формы — клиента и соискателя:
       различаются они только скрытым полем kind и парой полей.
       Тело шлём как URLSearchParams, то есть обычной формой: такой
       межсайтовый запрос браузер считает «простым» и preflight не делает.
       ponytail: без JS форма всё равно отправится по action, но покажет
       голый JSON — заявка при этом не теряется, поэтому и оставили. */
    Array.prototype.forEach.call(
      document.querySelectorAll('form[data-zayavka]'),
      function (form) {
        var msg = form.querySelector('.lead-msg');
        var button = form.querySelector('button[type="submit"]');

        form.addEventListener('submit', function (e) {
          e.preventDefault();          // сюда доходим только после нативной проверки полей
          button.disabled = true;
          msg.className = 'lead-msg';
          msg.textContent = 'Отправляем…';

          fetch(form.action, {
            method: 'POST',
            body: new URLSearchParams(new FormData(form))
          }).then(function (r) {
            return r.json().catch(function () {
              return null;
            }).then(function (data) {
              if (!r.ok || !data || data.ok !== true) {
                var error = new Error(data && data.error || '');
                error.isUserMessage = Boolean(data && data.error);
                throw error;
              }
              form.innerHTML = '<p class="lead-done">Заявка принята. ' +
                'Перезвоним в рабочее время.</p>';
            });
          }).catch(function (err) {
            button.disabled = false;
            msg.className = 'lead-msg is-error';
            msg.textContent = err && err.isUserMessage ? err.message :
              'Не отправилось. Позвоните: +7 (4012) 92-66-93';
          });
        });
      }
    );

    var top = document.querySelector('.to-top');
    if (top) {
      var onScroll = function () {
        top.classList.toggle('show', window.scrollY > 400);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  });
})();
