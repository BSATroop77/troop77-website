(() => {
  const hero = document.querySelector('.hero');
  const tiltBtn = document.querySelector('.tilt-btn');
  const toTop = document.querySelector('.to-top');
  const yr = document.getElementById('yr'); if (yr) yr.textContent = new Date().getFullYear();

  // ---- active nav state + "back to menu" button ----
  const links = [...document.querySelectorAll('.nav-btn')];
  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => { const on = a.getAttribute('href') === '#' + e.target.id; a.classList.toggle('is-active', on); on ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current'); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => io.observe(s));
  new IntersectionObserver(([e]) => toTop.classList.toggle('show', !e.isIntersecting), { threshold: 0.15 }).observe(hero);

  // ---- parallax ----
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  let tx = 0, ty = 0;      // target (-1..1)
  let cx = 0, cy = 0;      // current (lerped)
  let heroVisible = true, raf = null;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const setShift = () => hero.style.setProperty('--shift', Math.round(clamp(innerWidth * 0.03, 14, 42)) + 'px');
  setShift(); addEventListener('resize', setShift);

  function frame() {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    hero.style.setProperty('--px', cx.toFixed(4));
    hero.style.setProperty('--py', cy.toFixed(4));
    raf = (Math.abs(tx - cx) > 0.0005 || Math.abs(ty - cy) > 0.0005) && heroVisible ? requestAnimationFrame(frame) : null;
  }
  const kick = () => { if (!raf && heroVisible) raf = requestAnimationFrame(frame); };
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; kick(); }).observe(hero);

  // Mouse fallback (desktop / fine pointers). Layers move opposite the cursor for depth.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer) {
    addEventListener('pointermove', e => {
      tx = -((e.clientX / innerWidth) * 2 - 1);
      ty = -((e.clientY / innerHeight) * 2 - 1);
      kick();
    }, { passive: true });
    document.addEventListener('pointerleave', () => { tx = ty = 0; kick(); });
  }

  // Device tilt
  let base = null; // neutral pose, recalibrated slowly so it re-centres to however the phone is held
  const RANGE = 18; // degrees of tilt for full shift
  function onOrient(e) {
    if (e.gamma == null || e.beta == null) return;
    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    let x = e.gamma, y = e.beta; // portrait
    if (angle === 90)  { x = e.beta;  y = -e.gamma; }
    if (angle === -90 || angle === 270) { x = -e.beta; y = e.gamma; }
    if (!base) base = { x, y };
    base.x += (x - base.x) * 0.004; base.y += (y - base.y) * 0.004;
    tx = clamp((x - base.x) / RANGE, -1, 1);
    ty = clamp((y - base.y) / RANGE, -1, 1);
    kick();
  }
  function startTilt() { addEventListener('deviceorientation', onOrient, { passive: true }); }

  const DOE = window.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function' && !finePointer) {
    // iOS 13+: needs a user tap, and HTTPS
    tiltBtn.hidden = false;
    tiltBtn.addEventListener('click', async () => {
      try {
        const res = await DOE.requestPermission();
        if (res === 'granted') { startTilt(); tiltBtn.hidden = true; }
        else { tiltBtn.querySelector('span').textContent = 'Tilt blocked in Settings'; setTimeout(() => tiltBtn.hidden = true, 2500); }
      } catch (err) { tiltBtn.hidden = true; }
    });
  } else if (DOE && !finePointer) {
    startTilt(); // Android Chrome etc.
  }
})();
