(() => {
  'use strict';

  // Einstellungen kommen aus status.js (dort kannst du sie ändern)
  const ST = Object.assign({
    nachtschlitteln: 'offen', datum: '', hinweis: '', stand: '',
    betrieb: 'Betrieb bei guten Schneeverhältnissen',
    saisonStart: '2026-11-21', saisonEnde: '2027-03-28'
  }, window.SPL_STATUS || {});
  const CONFIG = {
    // true: Schneebericht zeigt die Loipe als komplett beleuchtet (2 von 2, 100 %).
    // false: Zahlen von infosnow.ch unverändert.
    loipeKomplettBeleuchtet: true,
    mail: 'schlittelpisten.leutwil@gmail.com'
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // Menü auf dem Handy
  const menuBtn = $('.menu-btn'), nav = $('#site-nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
  }

  // Betriebsstatus
  $$('[data-status]').forEach(el => { el.textContent = ST.betrieb; });

  // Nachtschlitteln: angesagt / abgesagt / offen
  $$('[data-nacht]').forEach(el => {
    const state = ['angesagt', 'abgesagt', 'offen'].includes(ST.nachtschlitteln) ? ST.nachtschlitteln : 'offen';
    const head = { angesagt: 'Nachtschlitteln findet statt', abgesagt: 'Nachtschlitteln abgesagt', offen: 'Nachtschlitteln: noch nicht entschieden' }[state];
    let sub = '';
    if (state === 'angesagt') sub = (ST.datum || 'Samstag') + ', 19 bis 22 Uhr';
    else if (state === 'abgesagt') sub = ST.datum;
    else sub = 'Weitere Entscheidungen werden hier aufgeschaltet.';
    el.dataset.state = state;
    el.innerHTML = '<span class="dot" aria-hidden="true" style="flex:none"></span><div><b>' + esc(head) + '</b>' +
      (sub ? '<span>' + esc(sub) + '</span>' : '') +
      (ST.hinweis ? '<span>' + esc(ST.hinweis) + '</span>' : '') +
      (ST.stand ? '<span class="stand-t">Stand: ' + esc(ST.stand) + '</span>' : '') + '</div>';
  });

  // Saison
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear();
  const day = s => new Date(s + 'T00:00:00');
  const start = day(ST.saisonStart), end = day(ST.saisonEnde);
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

  // Startbild: Taschenlampe (immer) und Pistenbeleuchtung (Schalter)
  const hero = $('[data-lights]');
  if (hero) {
    const photo = $('.hero-photo', hero), sw = $('[data-switch="lights"]', hero);
    let w = 0, h = 0, x = 0, y = 0, tx = 0, ty = 0, lastPtr = -1e9, visible = true, raf = 0, userTouched = false;
    const t0 = performance.now();
    const measure = () => {
      const r = photo.getBoundingClientRect();
      const first = !w;
      w = r.width; h = r.height;
      if (first) { x = tx = w * 0.6; y = ty = h * 0.62; }
    };
    const radius = () => Math.max(170, Math.min(340, Math.min(w, h) * 0.42));
    const frame = now => {
      raf = 0;
      const t = (now - t0) / 1000;
      if (!reduce && now - lastPtr > 2500) {
        tx = w * (0.5 + 0.34 * Math.sin(t * 0.32));
        ty = h * (0.62 + 0.08 * Math.sin(t * 0.55));
      }
      x += (tx - x) * 0.09; y += (ty - y) * 0.09;
      photo.style.setProperty('--x', x.toFixed(1) + 'px');
      photo.style.setProperty('--y', y.toFixed(1) + 'px');
      photo.style.setProperty('--r', radius().toFixed(0) + 'px');
      if (visible) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && visible) raf = requestAnimationFrame(frame); };
    const move = e => {
      const r = photo.getBoundingClientRect();
      tx = e.clientX - r.left; ty = e.clientY - r.top; lastPtr = performance.now(); kick();
    };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerdown', move);
    const setLights = on => {
      hero.dataset.lights = on ? 'on' : 'off';
      sw.setAttribute('aria-checked', String(on));
    };
    sw.addEventListener('click', () => { userTouched = true; setLights(hero.dataset.lights !== 'on'); });
    // Beim Laden: dunkel, nach kurzem Moment gehen die Fackeln an
    if (reduce) setLights(true);
    else setTimeout(() => { if (!userTouched) setLights(true); }, 1300);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }, { threshold: 0 }).observe(hero);
    }
    window.addEventListener('resize', measure);
    measure(); kick();
  }

  // Schneebericht: Loipe (klassisch und Skating) als komplett beleuchtet anzeigen
  const snowBox = $('#infosnowContainer');
  if (snowBox && CONFIG.loipeKomplettBeleuchtet) {
    const RE = /(\d+)\s*von\s*(\d+)(\s*Langlaufloipen?\s*\()\s*\d+\s*%\s*\)/;
    const fix = () => {
      const walker = document.createTreeWalker(snowBox, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const m = node.nodeValue.match(RE);
        if (!m || m[1] === m[2]) continue;
        const scope = node.parentElement.closest('.isRemarks, .isRec, tr') || node.parentElement.parentElement || node.parentElement;
        if (!/beleuchtet/i.test(scope.textContent)) continue;
        node.nodeValue = node.nodeValue.replace(RE, m[2] + ' von ' + m[2] + m[3] + '100 %)');
      }
    };
    new MutationObserver(fix).observe(snowBox, { childList: true, subtree: true, characterData: true });
    fix();
  }

  // Kontaktformular: öffnet das E-Mail-Programm mit fertiger Nachricht
  const form = $('#kontaktform');
  if (form) {
    const msg = $('.form-msg', form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.elements.name.value.trim();
      const mail = form.elements.email.value.trim();
      const text = form.elements.message.value.trim();
      const subject = 'Anfrage über die Website Schlittelpisten Leutwil';
      const body = text + '\n\nVon: ' + name + ' (' + mail + ')';
      window.location.href = 'mailto:' + CONFIG.mail + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      msg.hidden = false;
      msg.className = 'form-msg ok';
      msg.innerHTML = 'Dein E-Mail-Programm sollte sich jetzt öffnen. Tippe dort auf «Senden». Falls nichts passiert, schreib direkt an <a href="mailto:' + CONFIG.mail + '">' + CONFIG.mail + '</a>.';
    });
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
