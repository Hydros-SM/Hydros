// Главный сайт Hydros: появление блоков при прокрутке, форма заявки (письмо), год в подвале.
(function () {
  'use strict';

  document.getElementById('year').textContent = new Date().getFullYear();

  // ── Параллакс ───────────────────────────────────────────────────────────────
  // Элементы с data-speed (по вертикали) и data-speed-x (по горизонтали) смещаются относительно
  // прокрутки: положительное число — «дальний» слой (отстаёт от прокрутки), отрицательное — «ближний»
  // (обгоняет). Смещение считается от центра экрана и задаётся свойством translate, поэтому не
  // конфликтует с transform. data-max — предел смещения как доля высоты слоя (чтобы слой не уехал
  // за пределы своего блока). Видимость слоя определяется по его ИСХОДНОМУ положению (без смещения),
  // иначе сильно сдвинутый слой «зависал» бы вне экрана. Учитывает prefers-reduced-motion.
  (function parallax() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-speed], [data-speed-x]'));
    if (reduce || !nodes.length || !('translate' in document.documentElement.style)) return;

    var items = nodes.map(function (el) {
      return {
        el: el, sy: parseFloat(el.getAttribute('data-speed')) || 0, sx: parseFloat(el.getAttribute('data-speed-x')) || 0,
        max: parseFloat(el.getAttribute('data-max')) || 0, y: null, x: null, base: 0, h: 0,
      };
    });
    var vh = window.innerHeight, ticking = false, strength = 1;

    function measure() {
      vh = window.innerHeight;
      strength = window.innerWidth < 720 ? 0.55 : 1;
      items.forEach(function (it) {
        var saved = it.el.style.translate;          // измеряем без смещения — положение точное
        it.el.style.translate = '';
        var r = it.el.getBoundingClientRect();
        it.base = r.top + window.scrollY + r.height / 2;
        it.h = r.height;
        it.el.style.translate = saved;
      });
    }

    function frame() {
      ticking = false;
      var sy = window.scrollY;
      items.forEach(function (it) {
        var center = it.base - sy - vh / 2;         // расстояние центра слоя от центра экрана
        if (Math.abs(center) > vh / 2 + it.h / 2 + vh * 0.6) return; // далеко от экрана — не считаем
        var y = Math.round(-center * it.sy * strength * 10) / 10;
        var x = Math.round(-center * it.sx * strength * 10) / 10;
        if (it.max) { var lim = it.h * it.max; y = Math.max(-lim, Math.min(lim, y)); }
        if (y !== it.y || x !== it.x) {
          it.y = y; it.x = x;
          it.el.style.translate = (it.sx ? x + 'px ' : '0px ') + y + 'px';
        }
      });
    }
    function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(frame); } }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { measure(); onScroll(); });
    window.addEventListener('load', function () { measure(); frame(); });
    measure(); frame();
  })();

  // Плавное появление блоков (без скриптов контент виден — класс .reveal добавляет прозрачность только при наличии JS).
  var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 70 + 'ms'; io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // Форма: адрес получателя задаётся в data-contact-email формы (index.html).
  // Пока нет собственного сервера приёма заявок, форма открывает письмо в почтовой программе.
  var EN = document.documentElement.lang === 'en';
  var T = EN
    ? { required: 'Please fill in this field', name: 'Name', company: 'Company', email: 'Email', phone: 'Phone', hosting: 'Hosting', subject: 'Hydros demo request' }
    : { required: 'Заполните поле', name: 'Имя', company: 'Предприятие', email: 'Почта', phone: 'Телефон', hosting: 'Размещение', subject: 'Заявка на демонстрацию Hydros' };
  var form = document.getElementById('lead');
  var ok = document.getElementById('lead-ok');
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var f = form.elements;
    var bad = ['name', 'company', 'email'].filter(function (k) { return !f[k].value.trim(); });
    if (f.email.value && !/^\S+@\S+\.\S+$/.test(f.email.value)) bad.push('email');
    if (bad.length) { f[bad[0]].focus(); f[bad[0]].setCustomValidity(T.required); f[bad[0]].reportValidity(); f[bad[0]].setCustomValidity(''); return; }
    var to = form.getAttribute('data-contact-email');
    var body = [
      T.name + ': ' + f.name.value, T.company + ': ' + f.company.value, T.email + ': ' + f.email.value,
      T.phone + ': ' + (f.phone.value || '—'), T.hosting + ': ' + f.hosting.value, '', f.message.value,
    ].join('\n');
    var url = 'mailto:' + to + '?subject=' + encodeURIComponent(T.subject + ' — ' + f.company.value) + '&body=' + encodeURIComponent(body);
    document.getElementById('lead-mail').textContent = to;
    ok.classList.add('show');
    window.location.href = url;
  });

  // Ссылка на политику обработки данных скрыта, пока файла privacy.html нет рядом со страницей
  // (для английской версии — en/privacy.html). Положите файл — ссылка появится сама.
  var legal = document.querySelectorAll('.legal-link[hidden]');
  if (legal.length && window.location.protocol !== 'file:') {
    fetch('privacy.html', { method: 'HEAD' }).then(function (r) {
      if (r.ok) legal.forEach(function (a) { a.hidden = false; });
    }).catch(function () { /* файла нет — ссылка остаётся скрытой */ });
  }
})();
