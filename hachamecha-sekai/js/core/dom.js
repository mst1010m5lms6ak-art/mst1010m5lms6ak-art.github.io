(function () {
  'use strict';

  const HS = window.HS;

  function el(tag, opts, ...children) {
    const node = document.createElement(tag);
    if (opts && typeof opts === 'object') {
      if (opts.className) node.className = opts.className;
      if (opts.id) node.id = opts.id;
      if (opts.text !== undefined && opts.text !== null) node.textContent = String(opts.text);
      if (opts.type) node.type = opts.type;
      if (opts.value !== undefined) node.value = String(opts.value);
      if (opts.placeholder) node.placeholder = opts.placeholder;
      if (opts.disabled !== undefined) node.disabled = Boolean(opts.disabled);
      if (opts.readOnly !== undefined) node.readOnly = Boolean(opts.readOnly);
      if (opts.title) node.title = opts.title;
      if (opts.ariaLabel) node.setAttribute('aria-label', opts.ariaLabel);
      if (opts.dataset) {
        for (const [k, v] of Object.entries(opts.dataset)) {
          node.dataset[k] = String(v);
        }
      }
      if (opts.style) {
        for (const [k, v] of Object.entries(opts.style)) {
          if (k.startsWith('--')) node.style.setProperty(k, String(v));
          else node.style[k] = String(v);
        }
      }
      if (opts.on) {
        for (const [ev, fn] of Object.entries(opts.on)) {
          if (typeof fn === 'function') node.addEventListener(ev, fn);
        }
      }
    }
    for (const child of children) {
      if (child === null || child === undefined || child === false) continue;
      if (Array.isArray(child)) {
        for (const c of child) {
          if (c !== null && c !== undefined && c !== false) {
            node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
          }
        }
      } else if (typeof child === 'string' || typeof child === 'number') {
        node.appendChild(document.createTextNode(String(child)));
      } else {
        node.appendChild(child);
      }
    }
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  function formatNum(val) {
    const n = Math.round(Number(val) || 0);
    if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(2) + '億';
    if (Math.abs(n) >= 100000) return (n / 10000).toFixed(1) + '万';
    return n.toLocaleString('ja-JP');
  }

  function formatTime(ms) {
    const totalSec = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (v) => String(v).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  function makeElBadge(elId) {
    const m = HS.CONST.EL_MAP[elId] || HS.CONST.EL_MAP.none;
    return el('span', { className: `chip el-badge ${m.cls}`, text: `${m.icon}${m.name}` });
  }

  function makeRoleBadge(roleId) {
    const m = HS.CONST.ROLE_MAP[roleId] || HS.CONST.ROLE_MAP.dealer;
    return el('span', { className: `chip role-badge ${m.cls}`, text: `${m.icon}${m.name}` });
  }

  function makeTargetBadge(targetId) {
    const m = HS.CONST.TARGET_META[targetId] || HS.CONST.TARGET_META.single;
    return el('span', { className: `chip ${m.cls}`, text: m.label });
  }

  function showToast(message, variant) {
    const layer = document.getElementById('toast-layer');
    if (!layer) return;
    const item = el('div', {
      className: `toast-item${variant ? ' ' + variant : ''}`,
      text: message
    });
    layer.appendChild(item);
    while (layer.children.length > 3) {
      layer.removeChild(layer.firstChild);
    }
    window.setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 2200);
  }

  // Bulletproof iOS Safari Standalone PWA safe-area synchronization
  function syncSafeArea() {
    const root = document.documentElement;
    const probeTop = document.getElementById('safe-probe-top');
    const probeBottom = document.getElementById('safe-probe-bottom');

    // Force WebKit layout commit so env(safe-area-inset-*) resolves cleanly
    void document.body.offsetHeight;

    const envTop = probeTop ? Math.round(probeTop.getBoundingClientRect().height) : 0;
    const envBottom = probeBottom ? Math.round(probeBottom.getBoundingClientRect().height) : 0;

    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = Boolean(window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
    const maxDim = Math.max(window.screen.width || 0, window.screen.height || 0);
    const isNotchIPhone = isIOS && !/iPad/i.test(ua) && maxDim >= 812;

    let fallbackTop = 0;
    let fallbackBottom = 0;

    // Cold-start standalone iOS sometimes reports env(safe-area-inset-top)=0 for 1-3 frames,
    // causing the top of the game to clip under the Dynamic Island / notch.
    if (isStandalone && isNotchIPhone && envTop < 20) {
      fallbackTop = maxDim >= 852 ? 54 : 47;
    }
    if (isStandalone && isNotchIPhone && envBottom < 12) {
      fallbackBottom = 24;
    }

    root.style.setProperty('--safe-top-js', `${fallbackTop}px`);
    root.style.setProperty('--safe-bottom-js', `${fallbackBottom}px`);
  }

  function initSafeAreaWatchers() {
    syncSafeArea();
    requestAnimationFrame(() => {
      syncSafeArea();
      setTimeout(syncSafeArea, 180);
      setTimeout(syncSafeArea, 650);
    });
    window.addEventListener('resize', syncSafeArea, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(syncSafeArea, 120), { passive: true });
    window.addEventListener('pageshow', () => setTimeout(syncSafeArea, 60), { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncSafeArea, { passive: true });
    }
  }

  HS.DOM = {
    el,
    clear,
    formatNum,
    formatTime,
    makeElBadge,
    makeRoleBadge,
    makeTargetBadge,
    showToast,
    syncSafeArea,
    initSafeAreaWatchers
  };
})();
