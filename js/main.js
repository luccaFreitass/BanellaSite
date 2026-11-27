/* =========================================================
   BANELLA BAKERY — interações & animações
   ========================================================= */
(() => {
  const WA = '5511988202006';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  // ?motion na URL força as animações (útil pra demonstrar em PCs com "reduzir movimento" ligado)
  const forceMotion = new URLSearchParams(location.search).has('motion');
  if (forceMotion) document.documentElement.classList.add('force-motion');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches && !forceMotion;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  let lenis = null;

  /* ---------------------------------------------------------
     1. HORÁRIO AO VIVO (fuso de São Paulo)
     --------------------------------------------------------- */
  function spNow() {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: days[get('weekday')], min: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10) };
  }
  const closeHour = d => (d === 0 || d === 1 ? 18 : 20);

  function updateStatus() {
    const { day, min } = spNow();
    const open = 9 * 60, close = closeHour(day) * 60;
    let text, isOpen = false;
    if (min >= open && min < close) {
      isOpen = true;
      const left = close - min;
      text = left <= 60 ? `Aberto agora · fecha em ${left} min, corre!` : `Aberto agora · fecha às ${closeHour(day)}h`;
    } else if (min < open) {
      text = 'Fechado agora · abre hoje às 9h';
    } else {
      text = 'Fechado agora · abre amanhã às 9h';
    }
    $$('[data-status]').forEach(el => {
      el.classList.toggle('is-open', isOpen);
      el.classList.toggle('is-closed', !isOpen);
      const t = $('[data-status-text]', el);
      if (t) t.textContent = text;
    });
    const dockStatus = $('[data-dock-status]');
    if (dockStatus) dockStatus.textContent = isOpen ? 'aberto agora · entrega ou retirada' : 'fechado agora · abre às 9h';
    $$('[data-hours] li').forEach(li => {
      li.classList.toggle('is-today', li.dataset.days.split(',').map(Number).includes(day));
    });
  }
  updateStatus();
  setInterval(updateStatus, 60_000);

  /* ---------------------------------------------------------
     2. PEDIDOS PELO iFOOD
     Todos os links [data-ifood] levam pra loja da Banella no iFood.
     Ao tocar, um aviso confirma o destino e diz o que procurar lá.
     --------------------------------------------------------- */
  const toastEl = $('[data-toast]');
  let toastTimer;
  function toast(msg, ms = 2600) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), ms);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-ifood]');
    if (!a) return;
    const item = (a.dataset.ifood || '').trim();
    toast(item ? `Abrindo o iFood… procure por “${item}” 😉` : 'Abrindo a Banella no iFood…', item ? 3800 : 2400);
  });

  /* ---------------------------------------------------------
     3. CARDÁPIO — abas
     --------------------------------------------------------- */
  const tabs = $$('.menu__tabs [role="tab"]');
  const ink = $('.menu__tabs-ink');
  const tagEl = $('[data-visual-tag]');
  const tags = { paes: 'saindo do forno', doces: 'feito com carinho', cafe: 'bem tirado', bistro: 'muda todo dia' };

  function moveInk(btn) {
    if (!ink) return;
    ink.style.width = btn.offsetWidth + 'px';
    ink.style.transform = `translateX(${btn.offsetLeft}px)`;
  }
  function selectTab(btn, focus = false) {
    const key = btn.dataset.tab;
    tabs.forEach(t => { const on = t === btn; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    moveInk(btn);
    btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
    $$('.menu__list').forEach(p => {
      const on = p.dataset.panel === key;
      p.hidden = !on; p.classList.toggle('is-active', on);
      if (on && hasGsap && !reduced) gsap.fromTo($$('.item', p), { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: .6, stagger: .05, ease: 'power3.out' });
    });
    $$('[data-visual]').forEach(img => img.classList.toggle('is-active', img.dataset.visual === key));
    if (tagEl) tagEl.textContent = tags[key];
    if (focus) btn.focus();
    if (hasGsap) ScrollTrigger.refresh();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') selectTab(tabs[(i + 1) % tabs.length], true);
      if (e.key === 'ArrowLeft') selectTab(tabs[(i - 1 + tabs.length) % tabs.length], true);
    });
  });
  const initInk = () => { const s = tabs.find(t => t.getAttribute('aria-selected') === 'true'); s && moveInk(s); };
  window.addEventListener('resize', initInk);
  document.fonts && document.fonts.ready.then(initInk);
  initInk();

  /* ---------------------------------------------------------
     4. NAV / DOCK (esconde ao descer, mostra ao subir)
     --------------------------------------------------------- */
  const nav = $('[data-nav]');
  const dock = $('[data-dock]');
  let lastY = window.scrollY;
  function onScroll() {
    const y = window.scrollY;
    const down = y > lastY;
    // no celular a barra fica sempre fixa (evita o "vão" com conteúdo passando atrás da barra do Safari)
    const desktop = window.innerWidth >= 900;
    nav.classList.toggle('is-hidden', desktop && down && y > 400);
    const footer = $('.footer').getBoundingClientRect().top < window.innerHeight * .7;
    dock.classList.toggle('is-visible', y > window.innerHeight * .55 && !footer);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------
     5. MAPA preguiçoso
     --------------------------------------------------------- */
  const iframe = $('.where__map iframe');
  if (iframe && 'IntersectionObserver' in window) {
    new IntersectionObserver((es, o) => {
      if (es[0].isIntersecting) { iframe.src = iframe.dataset.src; o.disconnect(); }
    }, { rootMargin: '600px' }).observe(iframe);
  } else if (iframe) iframe.src = iframe.dataset.src;

  /* ---------------------------------------------------------
     6. NEVE de açúcar (seção de Natal)
     --------------------------------------------------------- */
  (function snow() {
    const c = $('.natal__snow');
    if (!c || reduced) return;
    const ctx = c.getContext('2d');
    let w, h, flakes = [], running = false, raf;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() {
      w = c.offsetWidth; h = c.offsetHeight;
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(110, w / 9));
      flakes = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2.2 + .6,
        s: Math.random() * .5 + .2, d: Math.random() * Math.PI * 2, o: Math.random() * .5 + .25
      }));
    }
    function tick() {
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.s; f.d += .01; f.x += Math.sin(f.d) * .35;
        if (f.y > h + 5) { f.y = -5; f.x = Math.random() * w; }
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251,241,227,${f.o})`; ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    }
    size();
    window.addEventListener('resize', size);
    new IntersectionObserver(es => {
      const vis = es[0].isIntersecting;
      if (vis && !running) { running = true; tick(); }
      if (!vis && running) { running = false; cancelAnimationFrame(raf); }
    }).observe(c);
  })();

  /* ---------------------------------------------------------
     7. ANIMAÇÕES (GSAP)
     --------------------------------------------------------- */
  const loader = $('.loader');

  if (!hasGsap || reduced) {
    document.documentElement.classList.remove('js');
    loader && loader.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const hasSplit = !!window.SplitText;
  if (hasSplit) gsap.registerPlugin(SplitText);

  // Smooth scroll (só desktop: no celular o scroll nativo é melhor)
  if (finePointer && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Âncoras suaves com compensação do menu
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = $(id);
    if (!t) return;
    e.preventDefault();
    const offset = -($('[data-nav]').offsetHeight + 10);
    if (lenis) lenis.scrollTo(t, { offset, duration: 1.4 });
    else window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY + offset, behavior: 'smooth' });
  });

  // sempre começa do topo: a abertura é a primeira impressão
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);
  window.__lenis = lenis;

  document.body.classList.add('is-loading');
  lenis && lenis.stop();

  const fontsReady = Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(r => setTimeout(r, 2000))
  ]);
  const heroImg = $('.arch img');
  const imgReady = new Promise(r => (heroImg.complete ? r() : (heroImg.onload = heroImg.onerror = r)));
  const visited = sessionStorage.getItem('banella-visited');
  sessionStorage.setItem('banella-visited', '1');

  // ---- LOADER ----
  const pct = { v: 0 };
  const loadTl = gsap.timeline();
  loadTl.from('.loader__logo', { scale: .6, rotate: -20, opacity: 0, duration: .6, ease: 'back.out(1.8)' })
    .to(pct, {
      v: 180, duration: visited ? .5 : 1.3, ease: 'power2.inOut',
      onUpdate: () => ($('.loader__pct').textContent = Math.round(pct.v))
    }, '<.1')
    .to('.loader__bar i', { scaleX: 1, duration: visited ? .5 : 1.3, ease: 'power2.inOut' }, '<');

  // trava de segurança: a abertura nunca segura o cliente mais que ~3s
  // (iPhone em economia de energia ou aba aberta em segundo plano desaceleram as animações)
  let started = false;
  const go = () => { if (started) return; started = true; start(); };
  Promise.all([fontsReady, imgReady, new Promise(r => loadTl.eventCallback('onComplete', r))]).then(go);
  setTimeout(() => { if (!started) { loadTl.progress(1); go(); } }, 3000);
  let introTl = null;
  // se mesmo assim estiver lento, pula direto pro fim da abertura (tudo visível e rolável)
  setTimeout(() => { if (introTl && document.body.contains(loader)) introTl.progress(1); }, 5000);

  function start() {
    introTl = gsap.timeline({
      onComplete: () => {
        loader.remove();
        document.body.classList.remove('is-loading');
        // sincroniza o smooth scroll com a posição real (topo ou âncora do link)
        const target = location.hash && document.querySelector(location.hash);
        const off = -($('[data-nav]').offsetHeight + 10);
        if (lenis) lenis.scrollTo(target || 0, { immediate: true, force: true, offset: target ? off : 0 });
        else if (!target) window.scrollTo(0, 0);
        lenis && lenis.start();
      }
    })
      .to('.loader__inner', { y: -30, opacity: 0, duration: .4, ease: 'power2.in' })
      .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'expo.inOut' }, '-=.05')
      .add(heroIntro(), '-=.55');
    buildScroll();
  }

  // ---- HERO intro ----
  function heroIntro() {
    const tl = gsap.timeline();
    const title = $('[data-split-hero]');
    gsap.set(title, { visibility: 'visible' });
    if (hasSplit) {
      const split = SplitText.create($$('.line', title), { type: 'chars', mask: 'lines' });
      tl.from(split.chars, { yPercent: 115, rotate: 6, duration: 1.1, ease: 'expo.out', stagger: .022 });
    } else {
      tl.from($$('.line', title), { y: 60, opacity: 0, stagger: .1, duration: 1, ease: 'expo.out' });
    }
    tl.to('.hero .reveal-up', { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'power3.out' }, .35)
      .from('.arch', { clipPath: 'inset(100% 0 0 0 round 999px 999px 28px 28px)', duration: 1.4, ease: 'expo.inOut' }, 0)
      .from('.arch img', { scale: 1.6, duration: 1.8, ease: 'expo.out' }, .2)
      .from('.sticker', { scale: 0, rotate: -180, duration: 1.1, ease: 'back.out(1.6)' }, .8)
      .from('.float', { scale: 0, opacity: 0, duration: .9, stagger: .12, ease: 'back.out(2)' }, 1)
      .from('.scroll-hint', { opacity: 0, y: 10, duration: .6 }, 1.4)
      .from('.spoon--bg', { opacity: 0, scale: .6, duration: 1.6, stagger: .2, ease: 'expo.out' }, .3);
    return tl;
  }

  // ---- SCROLL ----
  function buildScroll() {
    const mm = gsap.matchMedia();

    /* HERO parallax de saída */
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.arch img', { yPercent: 12, scale: 1.3, ease: 'none' }, 0)
      .to('.arch', { borderRadius: '40px 40px 28px 28px', ease: 'none' }, 0)
      .to('.hero__copy', { yPercent: -18, opacity: .2, ease: 'none' }, 0)
      .to('.sticker', { rotate: 160, ease: 'none' }, 0)
      .to('.spoon--l', { rotate: -10, y: 120, ease: 'none' }, 0)
      .to('.spoon--r', { rotate: 60, y: -80, ease: 'none' }, 0);
    $$('.float').forEach(f => {
      const s = parseFloat(f.dataset.speed) || 1;
      gsap.to(f, { y: -140 * s, rotate: (s - 1) * 40, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    });

    /* MARQUEE infinito que reage à velocidade do scroll */
    const track = $('[data-marquee]');
    track.innerHTML += track.innerHTML;
    const loop = gsap.to(track, { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
    let dir = 1;
    ScrollTrigger.create({
      onUpdate(self) {
        const v = self.getVelocity();
        if (self.direction !== dir) dir = self.direction;
        gsap.to(loop, { timeScale: dir * Math.min(1 + Math.abs(v) / 300, 6), duration: .2, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.2, delay: .2, ease: 'power2.out' });
      }
    });

    /* TÍTULOS: linhas sobem por trás de uma máscara */
    if (hasSplit) {
      $$('[data-split]').forEach(el => {
        const s = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' });
        gsap.from(s.lines, {
          yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: .1,
          scrollTrigger: { trigger: el, start: 'top 85%' }
        });
      });

      /* HISTÓRIA: palavras acendem conforme você lê */
      const big = $('[data-words]');
      const ws = SplitText.create(big, { type: 'words', wordsClass: 'word' });
      gsap.to(ws.words, {
        opacity: 1, stagger: .1, ease: 'none',
        scrollTrigger: { trigger: big, start: 'top 78%', end: 'bottom 45%', scrub: true }
      });

      /* QUOTE e rodapé */
      const fw = SplitText.create('[data-footer-word]', { type: 'chars', charsClass: 'char' });
      gsap.from(fw.chars, {
        yPercent: 100, opacity: 0, rotate: 8, stagger: .05, duration: 1, ease: 'expo.out',
        scrollTrigger: { trigger: '.footer__word', start: 'top 95%' }
      });
    }

    /* 1568: número fixo (é o endereço), só entra com um leve "carimbo" */
    gsap.from('.move__counter', {
      y: 40, scale: .92, opacity: 0, rotate: -3, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: '.move', start: 'top 80%' }
    });

    /* Fotos com revelação em cortina */
    $$('.clip-reveal').forEach(fig => {
      gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 85%' } })
        .from(fig, { clipPath: 'inset(100% 0 0 0)', duration: 1.3, ease: 'expo.inOut' })
        .from($('img', fig), { scale: 1.4, duration: 1.6, ease: 'expo.out' }, .2)
        .from($('figcaption', fig), { y: 20, opacity: 0, duration: .6 }, .9);
    });

    /* Números que contam */
    $$('[data-count-to]').forEach(el => {
      const o = { v: 0 }, to = +el.dataset.countTo;
      gsap.to(o, {
        v: to, duration: 1.4, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)),
        scrollTrigger: { trigger: el, start: 'top 90%' }
      });
    });
    gsap.from('.fact', { y: 60, opacity: 0, rotate: 2, stagger: .12, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.facts', start: 'top 85%' } });

    /* FAVORITOS: cards empilham e o de trás recua */
    const cards = $$('.card-fav');
    cards.forEach((card, i) => {
      gsap.fromTo($('img', card), { scale: 1.25 }, {
        scale: 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 20%', scrub: true }
      });
      const next = cards[i + 1];
      if (!next) return;
      gsap.to(card, {
        scale: .9 + i * 0.015, '--dim': .22, ease: 'none',
        scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 25%', scrub: true }
      });
    });

    /* CARDÁPIO: itens entram em cascata */
    gsap.from('.menu__list.is-active .item', { x: 30, opacity: 0, stagger: .07, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.menu__panels', start: 'top 80%' } });
    gsap.from('.menu__visual', { clipPath: 'inset(0 0 100% 0 round 26px)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.menu__visual', start: 'top 85%' } });

    /* NATAL */
    gsap.fromTo('.natal__photo img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.natal__photo', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.natal__photo', { clipPath: 'inset(15% 15% 15% 15% round 30px)', ease: 'none', scrollTrigger: { trigger: '.natal__photo', start: 'top 95%', end: 'top 35%', scrub: true } });
    gsap.from('.flavors li', { y: 20, opacity: 0, stagger: .08, duration: .7, ease: 'back.out(2)', scrollTrigger: { trigger: '.flavors', start: 'top 90%' } });
    // cards de Natal: revelação em cortina (sem mexer na posição do card, nada sobrepõe)
    gsap.set('.xm', { clipPath: 'inset(100% 0% 0% 0% round 24px)' });
    ScrollTrigger.batch('.xm', {
      start: 'top 92%', once: true,
      onEnter: b => {
        gsap.to(b, { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.1, stagger: .09, ease: 'expo.inOut' });
        gsap.from(b.map(el => el.querySelector('img')), { scale: 1.35, duration: 1.6, stagger: .09, ease: 'expo.out' });
      }
    });
    gsap.from('.chip', { y: 16, opacity: 0, stagger: .07, duration: .6, ease: 'back.out(2)', scrollTrigger: { trigger: '.xm__flavors', start: 'top 92%' } });
    gsap.from('.natal__info li', { y: 30, opacity: 0, stagger: .1, duration: .8, ease: 'expo.out', scrollTrigger: { trigger: '.natal__info', start: 'top 95%' } });
    // fundo da natal "sobe" como uma cortina sobre a página
    gsap.from('.natal', { borderRadius: '120px 120px 0 0', ease: 'none', scrollTrigger: { trigger: '.natal', start: 'top bottom', end: 'top 30%', scrub: true } });

    /* GALERIA: horizontal com pin no desktop, swipe nativo no celular */
    mm.add('(min-width: 900px)', () => {
      const tr = $('[data-gallery]');
      const dist = () => tr.scrollWidth - window.innerWidth;
      gsap.to(tr, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '.gallery__pin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
      });
    });
    mm.add('(max-width: 899px)', () => {
      gsap.from('.g', { x: 80, opacity: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.gallery__track', start: 'top 85%' } });
    });

    /* COMO PEDIR: caminho se desenha + passos */
    const path = $('.how__path path');
    if (path && path.getTotalLength) {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.how__steps', start: 'top 75%', end: 'bottom 55%', scrub: true } });
    }
    gsap.from('.step', { y: 80, opacity: 0, stagger: .15, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.how__steps', start: 'top 80%' } });
    gsap.from('.step__n', { scale: 0, rotate: -90, stagger: .15, duration: .8, delay: .3, ease: 'back.out(2.5)', scrollTrigger: { trigger: '.how__steps', start: 'top 80%' } });

    /* ONDE FICA */
    gsap.from('.where__card, .where__map', { y: 70, opacity: 0, stagger: .15, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.where', start: 'top 85%' } });

    /* INSTAGRAM: celulares sobem em leque */
    gsap.from('.ph', {
      yPercent: 70, rotate: 0, stagger: .1, ease: 'none',
      scrollTrigger: { trigger: '.insta', start: 'top 90%', end: 'center 60%', scrub: true }
    });

    /* Botões magnéticos (só com mouse) */
    if (finePointer) {
      $$('.magnetic').forEach(btn => {
        const xTo = gsap.quickTo(btn, 'x', { duration: .5, ease: 'power3' });
        const yTo = gsap.quickTo(btn, 'y', { duration: .5, ease: 'power3' });
        btn.addEventListener('mousemove', e => {
          const r = btn.getBoundingClientRect();
          xTo((e.clientX - r.left - r.width / 2) * .3);
          yTo((e.clientY - r.top - r.height / 2) * .4);
        });
        btn.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
      });
    }

    window.addEventListener('load', () => ScrollTrigger.refresh());
    ScrollTrigger.refresh();
  }
})();
