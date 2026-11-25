(function () {
  'use strict';

  const HS = window.HS;

  function init() {
    HS.DOM.initSafeAreaWatchers();

    // Prevent pinch-zoom & double-tap zoom on iOS Safari / WebView
    ['gesturestart', 'gesturechange', 'gestureend'].forEach((ev) => {
      document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
    });

    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 280) {
        const target = e.target;
        if (!target || !target.closest('button, input, textarea')) {
          e.preventDefault();
        }
      }
      lastTouchEnd = now;
    }, { passive: false });

    // Prevent context menu on long-press except selectable backup fields
    document.addEventListener('contextmenu', (e) => {
      if (e.target && e.target.closest('.selectable-text')) return;
      e.preventDefault();
    });

    // Register Service Worker only on HTTP(S) origins (cleanly skipped on file://)
    const proto = window.location.protocol;
    if ('serviceWorker' in navigator && (proto === 'https:' || (proto === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)))) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  HS.PWA = { init };
})();
