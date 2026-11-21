/* Big screen: one click to go full screen (browsers only allow full screen after a click on the page itself).
 * Opened with ?fs=1 (the host's "Open the big screen" button), a large "Click to go full screen" card covers the page;
 * any click or key starts full screen and turns the sound on. A small ⛶ button stays in the corner; F or double-click toggles. */
(function () {
  'use strict';
  const d = document, root = d.documentElement;
  const can = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  const isFull = () => !!(d.fullscreenElement || d.webkitFullscreenElement);
  function enter() {
    try { if (window.Craft && Craft.Sound) Craft.Sound.enable(); } catch (_) { /* */ }
    const sb = d.querySelector('.b-sound, .bd-sound'); if (sb) sb.remove();
    if (!can || isFull()) return;
    const p = root.requestFullscreen ? root.requestFullscreen({ navigationUI: 'hide' }) : root.webkitRequestFullscreen();
    if (p && p.catch) p.catch(() => {});
  }
  function exit() { if (d.exitFullscreen) d.exitFullscreen().catch(() => {}); else if (d.webkitExitFullscreen) d.webkitExitFullscreen(); }
  const toggle = () => (isFull() ? exit() : enter());
  const css = d.createElement('style');
  css.textContent = `.fs-btn{position:fixed;right:10px;bottom:10px;z-index:80;font:inherit;font-size:16px;padding:6px 12px;border:2px solid #1c1a17;border-radius:10px;background:#fffdf7;cursor:pointer;opacity:.75}
    .fs-btn:hover{opacity:1}.fs-full .fs-btn{display:none}
    .fs-cover{position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:rgba(28,26,23,.55);cursor:pointer}
    .fs-cover div{background:#fffdf7;border:4px solid #1c1a17;border-radius:18px;padding:34px 46px;text-align:center;font-size:clamp(26px,4vw,48px);box-shadow:0 10px 0 #1c1a17;transform:rotate(-1.5deg)}
    .fs-cover small{display:block;font-size:.45em;margin-top:8px;opacity:.75}`;
  d.head.appendChild(css);
  function boot() {
    if (can) {
      const b = d.createElement('button'); b.type = 'button'; b.className = 'fs-btn'; b.textContent = '⛶ Full screen'; b.onclick = toggle; d.body.appendChild(b);
    }
    d.addEventListener('fullscreenchange', () => d.body.classList.toggle('fs-full', isFull()));
    d.addEventListener('webkitfullscreenchange', () => d.body.classList.toggle('fs-full', isFull()));
    d.addEventListener('dblclick', e => { if (!e.target.closest('input,button,a')) toggle(); });
    d.addEventListener('keydown', e => { if ((e.key === 'f' || e.key === 'F') && !e.target.closest('input,textarea')) toggle(); });
    if (/[?&]fs=1\b/.test(location.search) && !isFull()) {
      const c = d.createElement('div'); c.className = 'fs-cover';
      c.innerHTML = `<div>📺 Click anywhere to go full screen<small>${can ? 'This also turns the sound on' : 'Tap to turn the sound on'}</small></div>`;
      const go = () => { enter(); c.remove(); d.removeEventListener('keydown', go, true); };
      c.addEventListener('click', go); d.addEventListener('keydown', go, true);
      d.body.appendChild(c);
    }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot); else boot();
})();
