// Portfolio interactions. Progressive enhancement: everything works without this file;
// GSAP + ScrollTrigger, VanillaTilt and canvas-confetti are optional (vendored, loaded with defer).
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const motion = !!(gsap && ST) && !reduce;
  if (gsap && ST) gsap.registerPlugin(ST);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------------- UI sound (Web Audio, opt-in, off by default) ---------------- */
  const sound = (() => {
    const btn = $('.sound-btn');
    let ctx = null;
    let on = false;
    try { on = localStorage.getItem('sfx') === 'on'; } catch { /* storage blocked */ }
    const sync = () => btn?.setAttribute('aria-pressed', String(on));
    sync();
    const audio = () => {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    const tone = (f1, f2, dur, vol, type = 'sine') => {
      if (!on) return;
      const c = audio();
      const t = c.currentTime;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f1, t);
      o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    };
    const swish = (up) => {
      if (!on) return;
      const c = audio();
      const t = c.currentTime;
      const dur = 0.3;
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.1;
      f.frequency.setValueAtTime(up ? 500 : 2600, t);
      f.frequency.exponentialRampToValueAtTime(up ? 2600 : 500, t + dur);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(c.destination);
      src.start(t);
    };
    btn?.addEventListener('click', () => {
      on = !on;
      try { localStorage.setItem('sfx', on ? 'on' : 'off'); } catch { /* storage blocked */ }
      sync();
      tone(660, 990, 0.14, 0.05);
    });
    return {
      click: () => tone(1250, 720, 0.05, 0.03, 'triangle'),
      pop: () => tone(520, 880, 0.09, 0.045),
      swish,
    };
  })();
  document.addEventListener('pointerdown', (e) => { if (e.target.closest('a, button')) sound.click(); });

  /* ---------------- toast + confetti ---------------- */
  const toast = $('.toast');
  let toastTimer = 0;
  const showToast = (msg) => {
    if (!toast) return;
    toast.querySelector('span').textContent = msg;
    clearTimeout(toastTimer);
    if (gsap && !reduce) {
      gsap.fromTo(toast, { autoAlpha: 0, y: 24, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: 'elastic.out(1, .65)' });
      toastTimer = setTimeout(() => gsap.to(toast, { autoAlpha: 0, y: 12, duration: 0.3, ease: 'power2.in' }), 2200);
    } else {
      toast.style.opacity = '1';
      toast.style.visibility = 'visible';
      toastTimer = setTimeout(() => { toast.style.opacity = '0'; toast.style.visibility = 'hidden'; }, 2200);
    }
  };
  const burst = (el) => {
    if (reduce || !window.confetti) return;
    const r = el.getBoundingClientRect();
    window.confetti({
      particleCount: 110, spread: 75, startVelocity: 40, ticks: 240, scalar: 0.95, gravity: 1.05,
      origin: { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight },
      colors: ['#2440ff', '#ff5a36', '#0f0f13', '#c7ceff', '#ffc9b8'],
      disableForReducedMotion: true,
    });
  };
  $$('[data-confetti]').forEach((a) => a.addEventListener('click', () => { burst(a); showToast('Résumé downloading'); }));
  $$('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
    } catch {
      location.href = `mailto:${b.dataset.copy}`;
      return;
    }
    burst(b);
    sound.pop();
    showToast('Email copied to clipboard');
  }));

  /* ---------------- nav: active link, mobile menu, progress, back to top ---------------- */
  const links = $$('.nav-links a');
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.map((a) => $(a.getAttribute('href'))).filter(Boolean).forEach((s) => io.observe(s));

  const menuBtn = $('.menu-btn');
  const menu = $('#mobile-menu');
  const setMenu = (open) => {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open && gsap && !reduce) gsap.from(menu.children, { y: -10, autoAlpha: 0, stagger: 0.04, duration: 0.45, ease: 'expo.out' });
  };
  menuBtn?.addEventListener('click', () => setMenu(menu.hidden));
  menu?.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu && !menu.hidden) { setMenu(false); menuBtn.focus(); }
  });

  const progress = $('.progress');
  const topBtn = $('.top-btn');
  const onScroll = () => {
    const max = root.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    topBtn.classList.toggle('show', scrollY > 900);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  topBtn.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------------- live IST clock ---------------- */
  const clock = $('[data-clock]');
  if (clock) {
    const fmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
    const tick = () => { clock.textContent = `IST ${fmt.format(new Date())}`; };
    tick();
    setInterval(tick, 15000);
  }

  /* ---------------- rotating role words ---------------- */
  const rot = $('.rot');
  if (rot && !reduce) {
    const words = rot.dataset.words.split('|');
    let i = 0;
    setInterval(() => {
      i = (i + 1) % words.length;
      if (!gsap) { rot.textContent = words[i]; return; }
      gsap.to(rot, {
        yPercent: -120, autoAlpha: 0, filter: 'blur(6px)', duration: 0.35, ease: 'power2.in',
        onComplete: () => {
          rot.textContent = words[i];
          gsap.fromTo(rot, { yPercent: 120, autoAlpha: 0, filter: 'blur(6px)' }, { yPercent: 0, autoAlpha: 1, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out' });
        },
      });
    }, 2600);
  }

  /* ---------------- spotlight borders ---------------- */
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest?.('.spot');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  /* ---------------- custom cursor + magnetic buttons ---------------- */
  if (fine && !reduce && gsap) {
    root.classList.add('has-cursor');
    const cur = $('.cursor');
    const ring = $('.cursor-ring');
    const dot = $('.cursor-dot');
    const label = $('.cursor-label');
    const rx = gsap.quickTo(ring, 'x', { duration: 0.55, ease: 'power3' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.55, ease: 'power3' });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power2' });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power2' });
    let shown = false;
    addEventListener('pointermove', (e) => {
      if (!shown) {
        shown = true;
        gsap.set([ring, dot], { x: e.clientX, y: e.clientY });
        gsap.to([ring, dot], { autoAlpha: 1, duration: 0.3 });
      }
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const named = e.target.closest('[data-cursor]');
      const interactive = e.target.closest('a, button, [role="tab"], .zoom');
      cur.classList.toggle('is-label', !!named);
      cur.classList.toggle('is-hover', !named && !!interactive);
      label.textContent = named ? named.dataset.cursor : '';
    });
    addEventListener('pointerdown', () => gsap.to(ring, { scale: 0.82, duration: 0.2 }));
    addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: 0.5, ease: 'elastic.out(1, .4)' }));
    document.addEventListener('pointerleave', () => gsap.to([ring, dot], { autoAlpha: 0, duration: 0.2 }));
    document.addEventListener('pointerenter', () => gsap.to([ring, dot], { autoAlpha: 1, duration: 0.2 }));

    $$('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.8, ease: 'elastic.out(1, .4)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.8, ease: 'elastic.out(1, .4)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* ---------------- 3D tilt ---------------- */
  const canTilt = fine && !reduce && !!window.VanillaTilt;
  if (canTilt) {
    window.VanillaTilt.init($$('[data-tilt]'), { max: 7, speed: 900, perspective: 1100, glare: true, 'max-glare': 0.16, scale: 1.015, gyroscope: false });
    window.VanillaTilt.init($$('[data-tilt-soft]'), { max: 4, speed: 1000, perspective: 1200, scale: 1.01, gyroscope: false });
  }

  /* ---------------- radar sweep that lights up the stack ---------------- */
  const radar = $('.radar');
  if (radar) {
    const sweep = $('.sweep', radar);
    const blips = $$('.blip', radar);
    const rings = $$('.blip-ring', radar);
    const pills = $$('.sp');
    const angles = blips.map((b) => {
      const x = Number(b.getAttribute('cx')) - 80;
      const y = Number(b.getAttribute('cy')) - 80;
      return (Math.atan2(x, -y) * 180 / Math.PI + 360) % 360;
    });
    const ping = (i) => {
      const k = blips[i].dataset.k;
      rings[i].classList.remove('ping');
      void rings[i].getBoundingClientRect();
      rings[i].classList.add('ping');
      blips[i].classList.add('hot');
      const pill = pills.find((p) => p.dataset.k === k);
      pill?.classList.add('hot');
      setTimeout(() => { blips[i].classList.remove('hot'); pill?.classList.remove('hot'); }, 700);
    };
    pills.forEach((p) => p.addEventListener('pointerenter', () => {
      const i = blips.findIndex((b) => b.dataset.k === p.dataset.k);
      if (i >= 0) ping(i);
    }));
    if (!reduce) {
      sweep.style.animation = 'none';
      let visible = true;
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(radar);
      const period = 4200;
      const start = performance.now();
      let last = 45;
      const loop = (now) => {
        if (visible) {
          const a = ((now - start) % period) / period * 360;
          sweep.setAttribute('transform', `rotate(${a.toFixed(2)} 80 80)`);
          const lead = (a + 45) % 360; // leading edge of the wedge
          angles.forEach((ang, i) => {
            const crossed = last <= lead ? ang > last && ang <= lead : ang > last || ang <= lead;
            if (crossed) ping(i);
          });
          last = lead;
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  /* ---------------- IDE widget: typed code, auto-switching tabs ---------------- */
  const ideTabs = $$('.ide-tab');
  const panes = ideTabs.map((t) => document.getElementById(t.getAttribute('aria-controls')));
  let ideTimer = 0;
  let ideTl = null;
  let ideUser = false;
  const showPane = (i, focus) => {
    ideTabs.forEach((t, j) => {
      t.setAttribute('aria-selected', String(j === i));
      t.tabIndex = j === i ? 0 : -1;
      panes[j].hidden = j !== i;
    });
    if (focus) ideTabs[i].focus();
    if (!gsap || reduce) return;
    ideTl?.kill();
    clearTimeout(ideTimer);
    const lines = $$('.tx', panes[i]);
    gsap.set(lines, { clipPath: 'inset(0% 100% 0% 0%)' });
    ideTl = gsap.timeline({
      delay: 0.15,
      onComplete: () => { if (!ideUser) ideTimer = setTimeout(() => showPane((i + 1) % panes.length), 4200); },
    });
    lines.forEach((l) => {
      const n = Math.max(1, l.textContent.length);
      ideTl.to(l, { clipPath: 'inset(0% 0% 0% 0%)', duration: Math.min(1.05, n * 0.026), ease: `steps(${n})` }, '+=0.05');
    });
  };
  ideTabs.forEach((t, i) => {
    t.addEventListener('click', () => { ideUser = true; showPane(i); });
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      ideUser = true;
      showPane((i + (e.key === 'ArrowRight' ? 1 : -1) + panes.length) % panes.length, true);
    });
  });
  if (panes.length) showPane(0);

  /* ---------------- experience tabs ---------------- */
  const tablist = $('.tabs');
  if (tablist) {
    const tabs = $$('.tab', tablist);
    const ind = $('.tab-ind', tablist);
    const place = (tab, animate) => {
      const r = tab.getBoundingClientRect();
      const p = tablist.getBoundingClientRect();
      const props = { x: r.left - p.left, y: r.top - p.top, width: r.width, height: r.height };
      if (gsap && animate && !reduce) gsap.to(ind, { ...props, duration: 0.6, ease: 'expo.out' });
      else if (gsap) gsap.set(ind, props);
      else Object.assign(ind.style, { transform: `translate(${props.x}px, ${props.y}px)`, width: `${props.width}px`, height: `${props.height}px` });
    };
    const current = () => tabs.find((t) => t.getAttribute('aria-selected') === 'true');
    const select = (tab, focus) => {
      if (tab === current()) { if (focus) tab.focus(); return; }
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      place(tab, true);
      if (focus) tab.focus();
      sound.pop();
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (gsap && !reduce) {
        gsap.fromTo($$('.panel-head, .ctx, .hl', panel), { autoAlpha: 0, y: 26, filter: 'blur(8px)' },
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.75, stagger: 0.06, ease: 'expo.out', clearProps: 'filter' });
      }
    };
    tabs.forEach((t) => t.addEventListener('click', () => select(t)));
    tablist.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const next = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(tabs[next], true);
    });
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => {
      select(document.getElementById(b.dataset.goto));
      tablist.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }));
    const settle = () => place(current(), false);
    settle();
    document.fonts?.ready.then(settle);
    addEventListener('resize', settle);
  }

  /* ---------------- certificate popups: morph from card, zoom, tilt ---------------- */
  let lastTrigger = null;
  const openModal = (dialog, trigger) => {
    lastTrigger = trigger;
    dialog.classList.remove('closing');
    dialog.showModal();
    sound.swish(true);
    const panel = $('.panel', dialog);
    if (gsap && !reduce) {
      const from = trigger.getBoundingClientRect();
      const to = panel.getBoundingClientRect();
      gsap.fromTo(panel,
        {
          x: from.left + from.width / 2 - (to.left + to.width / 2),
          y: from.top + from.height / 2 - (to.top + to.height / 2),
          scaleX: from.width / to.width, scaleY: from.height / to.height,
          rotationX: 10, transformPerspective: 1200, autoAlpha: 0.2,
        },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, rotationX: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', clearProps: 'transform' });
      gsap.fromTo($$('[data-stagger] > *', dialog), { autoAlpha: 0, y: 18, filter: 'blur(8px)' },
        { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.75, delay: 0.2, stagger: 0.07, ease: 'expo.out', clearProps: 'filter,transform' });
    }
    const fig = $('.zoom', dialog);
    if (canTilt && fig && !fig.vanillaTilt) window.VanillaTilt.init(fig, { max: 6, speed: 800, perspective: 1000, glare: true, 'max-glare': 0.22, scale: 1 });
  };
  const closeModal = async (dialog) => {
    if (!dialog.open) return;
    sound.swish(false);
    const panel = $('.panel', dialog);
    const fig = $('.zoom', dialog);
    fig?.classList.remove('on');
    if (gsap && !reduce) {
      dialog.classList.add('closing');
      await gsap.to(panel, { y: 26, scale: 0.94, autoAlpha: 0, duration: 0.32, ease: 'power2.in' });
      gsap.set(panel, { clearProps: 'all' });
    }
    dialog.close();
    lastTrigger?.focus();
  };
  $$('[data-open]').forEach((b) => b.addEventListener('click', () => openModal(document.getElementById(b.dataset.open), b)));
  $$('dialog.modal').forEach((d) => {
    d.addEventListener('cancel', (e) => { e.preventDefault(); closeModal(d); });
    d.addEventListener('click', (e) => { if (e.target === d) closeModal(d); });
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => closeModal(d)));
  });
  $$('.zoom').forEach((fig) => {
    const hint = $('.zoom-hint', fig);
    const setOrigin = (x, y) => { fig.style.setProperty('--zx', `${x}%`); fig.style.setProperty('--zy', `${y}%`); };
    const toggle = () => {
      const on = fig.classList.toggle('on');
      if (hint) hint.lastChild.textContent = on ? 'Click to zoom out' : 'Click to zoom';
      if (fig.vanillaTilt) {
        if (on) fig.vanillaTilt.destroy();
      } else if (!on && canTilt) {
        window.VanillaTilt.init(fig, { max: 6, speed: 800, perspective: 1000, glare: true, 'max-glare': 0.22, scale: 1 });
      }
      sound.pop();
    };
    fig.addEventListener('click', (e) => {
      const r = fig.getBoundingClientRect();
      setOrigin((e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100);
      toggle();
    });
    fig.addEventListener('pointermove', (e) => {
      if (!fig.classList.contains('on')) return;
      const r = fig.getBoundingClientRect();
      setOrigin((e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100);
    });
    fig.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      setOrigin(50, 50);
      toggle();
    });
  });

  /* ---------------- scroll choreography (GSAP + ScrollTrigger) ---------------- */
  if (motion) {
    root.classList.add('motion');
    gsap.set('.rv', { autoAlpha: 0, y: 48, filter: 'blur(10px)' });
    ST.batch('.rv', {
      start: 'top 88%',
      once: true,
      onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.15, ease: 'expo.out', stagger: 0.09, overwrite: true, clearProps: 'filter' }),
    });
    $$('.h2').forEach((h) => gsap.from(h, { letterSpacing: '0.03em', autoAlpha: 0, y: 34, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } }));
    $$('.block > .kicker, .block > .lede').forEach((el) => gsap.from(el, { autoAlpha: 0, y: 18, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } }));
    gsap.to('.dash', { yPercent: -7, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-copy', { yPercent: 6, autoAlpha: 0.3, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'center top', end: 'bottom top', scrub: true } });
    $$('.ambient i').forEach((el, i) => gsap.to(el, { yPercent: [22, -16, 12][i], ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.2 } }));
    $$('.proj-art svg').forEach((svg) => gsap.fromTo(svg, { yPercent: -7, scale: 1.1 }, { yPercent: 7, scale: 1.1, ease: 'none', scrollTrigger: { trigger: svg.closest('.proj'), start: 'top bottom', end: 'bottom top', scrub: true } }));
    gsap.to('.career-fill', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.career', start: 'top 85%', end: 'bottom 50%', scrub: 0.6 } });
    gsap.fromTo('.contact', { scale: 0.93 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'top 55%', scrub: true } });
    $$('[data-count]').forEach((el) => {
      const end = Number(el.dataset.count);
      const o = { v: 0 };
      el.textContent = '0';
      ST.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: end, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = String(Math.round(o.v)); } }) });
    });
    document.fonts?.ready.then(() => ST.refresh());
  } else {
    const fill = $('.career-fill');
    if (fill) fill.style.transform = 'scaleX(1)';
  }
})();
