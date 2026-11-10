(() => {
  if (!document.querySelector(".join-fab")) {
    const prefix = /\/leaders\//.test(location.pathname) ? "../" : "";
    const link = document.createElement("a");
    link.className = "join-fab";
    link.href = prefix + "join.html";
    link.setAttribute("aria-label", "Join Troop 77");
    link.innerHTML = '<i class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12.2a3.6 3.6 0 1 0-3.6-3.6 3.6 3.6 0 0 0 3.6 3.6z"/><path fill="currentColor" d="M5.2 19.2a6.8 6.8 0 0 1 13.6 0v.6H5.2z"/></svg></i><span>Join</span>';
    document.body.appendChild(link);
  }

  const railBar = document.querySelector('.rail-bar');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const onScroll = () => {
    if (railBar) railBar.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  const hero = document.querySelector('.hero');
  if (!hero || reduce.matches) return;

  const tiltBtn = document.querySelector('.tilt-btn');
  let tx = 0, ty = 0;
  let cx = 0, cy = 0;
  let heroVisible = true, raf = null;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const setShift = () => hero.style.setProperty('--shift', Math.round(clamp(innerWidth * 0.03, 14, 42)) + 'px');
  setShift();
  addEventListener('resize', setShift);

  function frame() {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    hero.style.setProperty('--px', cx.toFixed(4));
    hero.style.setProperty('--py', cy.toFixed(4));
    raf = (Math.abs(tx - cx) > 0.0005 || Math.abs(ty - cy) > 0.0005) && heroVisible ? requestAnimationFrame(frame) : null;
  }
  const kick = () => { if (!raf && heroVisible) raf = requestAnimationFrame(frame); };
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; kick(); }).observe(hero);

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (finePointer) {
    addEventListener('pointermove', (e) => {
      tx = -((e.clientX / innerWidth) * 2 - 1);
      ty = -((e.clientY / innerHeight) * 2 - 1);
      kick();
    }, { passive: true });
    document.addEventListener('pointerleave', () => { tx = ty = 0; kick(); });
  }

  let base = null;
  const RANGE = 18;
  function onOrient(e) {
    if (e.gamma == null || e.beta == null) return;
    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    let x = e.gamma, y = e.beta;
    if (angle === 90) { x = e.beta; y = -e.gamma; }
    if (angle === -90 || angle === 270) { x = -e.beta; y = e.gamma; }
    if (!base) base = { x, y };
    base.x += (x - base.x) * 0.004;
    base.y += (y - base.y) * 0.004;
    tx = clamp((x - base.x) / RANGE, -1, 1);
    ty = clamp((y - base.y) / RANGE, -1, 1);
    kick();
  }
  function startTilt() { addEventListener('deviceorientation', onOrient, { passive: true }); }

  const DOE = window.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function' && !finePointer && tiltBtn) {
    tiltBtn.hidden = false;
    tiltBtn.addEventListener('click', async () => {
      try {
        const res = await DOE.requestPermission();
        if (res === 'granted') { startTilt(); tiltBtn.hidden = true; }
        else {
          tiltBtn.querySelector('span').textContent = 'Tilt blocked in Settings';
          setTimeout(() => { tiltBtn.hidden = true; }, 2500);
        }
      } catch (err) { tiltBtn.hidden = true; }
    });
  } else if (DOE && !finePointer) {
    startTilt();
  }
})();
