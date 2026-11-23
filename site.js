(() => {
  'use strict';

  /* ─── Hier änderst du Inhalte ─────────────────────────────── */
  const CONFIG = {
    season: { start: '2026-11-21', end: '2027-03-28' },
    status: { headline: 'Betrieb bei guten Schneeverhältnissen' }
  };
  /* ─────────────────────────────────────────────────────────── */

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Menü auf dem Handy
  const menuBtn = $('.menu-btn'), nav = $('#site-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
  }

  // Status und Saison
  $$('[data-status]').forEach(el => { el.textContent = CONFIG.status.headline; });
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
  const day = s => new Date(s + 'T00:00:00');
  const start = day(CONFIG.season.start), end = day(CONFIG.season.end);
  $$('[data-season-range]').forEach(el => { el.textContent = fmt(start) + ' bis ' + fmt(end); });
  const seasonInfo = $('[data-season-info]'), seasonBar = $('[data-season-bar]');
  if (seasonInfo && seasonBar) {
    const DAY = 864e5, now = new Date();
    const total = Math.round((end - start) / DAY) + 1;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const n = Math.round((today - start) / DAY) + 1;
    if (today < start) {
      const left = Math.round((start - today) / DAY);
      seasonInfo.textContent = 'Startet in ' + left + (left === 1 ? ' Tag' : ' Tagen');
      seasonBar.style.width = '0%';
    } else if (today > end) {
      seasonInfo.textContent = 'Saison beendet';
      seasonBar.style.width = '100%';
    } else {
      seasonInfo.textContent = 'Tag ' + n + ' von ' + total;
      seasonBar.style.width = Math.max(2, Math.min(100, (n / total) * 100)).toFixed(1) + '%';
    }
  }

  // Flutlicht über dem Foto
  const hero = $('[data-flood]');
  if (hero) {
    const photo = $('.hero-photo', hero), toggle = $('.flood-toggle', hero);
    let w = 0, h = 0, x = 0, y = 0, tx = 0, ty = 0, lastPtr = -1e9, visible = true, on = true, raf = 0;
    const t0 = performance.now();
    const measure = () => {
      const r = photo.getBoundingClientRect();
      const first = !w;
      w = r.width; h = r.height;
      if (first) { x = tx = w * 0.62; y = ty = h * 0.6; }
    };
    const radius = () => Math.max(220, Math.min(480, Math.min(w, h) * 0.62));
    const frame = now => {
      raf = 0;
      if (on) {
        const t = (now - t0) / 1000;
        if (!reduce && now - lastPtr > 2500) {
          tx = w * (0.5 + 0.34 * Math.sin(t * 0.32));
          ty = h * (0.6 + 0.07 * Math.sin(t * 0.55));
        }
        x += (tx - x) * 0.08; y += (ty - y) * 0.08;
        photo.style.setProperty('--x', x.toFixed(1) + 'px');
        photo.style.setProperty('--y', y.toFixed(1) + 'px');
        photo.style.setProperty('--r', radius().toFixed(0) + 'px');
      }
      if (visible && on) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && visible && on) raf = requestAnimationFrame(frame); };
    const move = e => {
      const r = photo.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top; lastPtr = performance.now(); kick();
    };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerdown', move);
    toggle.addEventListener('click', () => {
      on = !on;
      toggle.setAttribute('aria-checked', String(on));
      hero.dataset.flood = on ? 'on' : 'off';
      kick();
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }, { threshold: 0 }).observe(hero);
    }
    window.addEventListener('resize', measure);
    measure(); kick();
  }

  // Galerie: Grossansicht
  const lb = $('#lightbox');
  if (lb) {
    const items = $$('[data-lb]');
    const img = $('img', lb), cap = $('figcaption', lb);
    let i = 0, opener = null;
    const show = k => {
      i = (k + items.length) % items.length;
      img.src = items[i].dataset.full;
      img.alt = items[i].dataset.alt || '';
      cap.textContent = items[i].dataset.cap || '';
    };
    const open = k => { opener = document.activeElement; show(k); lb.hidden = false; document.body.style.overflow = 'hidden'; $('.lb-close', lb).focus(); };
    const close = () => { lb.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); };
    items.forEach((el, k) => el.addEventListener('click', () => open(k)));
    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', () => show(i - 1));
    $('.lb-next', lb).addEventListener('click', () => show(i + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(i - 1);
      if (e.key === 'ArrowRight') show(i + 1);
    });
  }
})();
