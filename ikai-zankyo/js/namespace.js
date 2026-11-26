(function (root) {
  'use strict';

  const IkaiApp = root.IkaiApp = root.IkaiApp || {};

  function getLocation() {
    return typeof root.location !== 'undefined' ? root.location : undefined;
  }

  function isFile() {
    const loc = getLocation();
    return Boolean(loc && loc.protocol === 'file:');
  }

  function isHttp() {
    const loc = getLocation();
    return Boolean(loc && (loc.protocol === 'http:' || loc.protocol === 'https:'));
  }

  function isCapacitor() {
    const cap = root.Capacitor;
    const capNative = Boolean(cap && (typeof cap.isNativePlatform !== 'function' || cap.isNativePlatform()));
    const loc = getLocation();
    const capProto = Boolean(loc && loc.protocol === 'capacitor:');
    return capNative || capProto;
  }

  function isStandalone() {
    const mm = typeof root.matchMedia === 'function'
      ? root.matchMedia('(display-mode: standalone)').matches
      : false;
    const navStandalone = typeof root.navigator !== 'undefined' && root.navigator.standalone === true;
    return Boolean(mm || navStandalone);
  }

  function canUseServiceWorker() {
    const loc = getLocation();
    const nav = root.navigator;
    if (!nav || !('serviceWorker' in nav) || isFile() || isCapacitor() || !loc) {
      return false;
    }
    return Boolean(
      loc.protocol === 'https:' ||
      loc.hostname === 'localhost' ||
      loc.hostname === '127.0.0.1'
    );
  }

  function injectManifestIfHttp() {
    if (typeof root.document === 'undefined') {
      return false;
    }
    if (!isHttp() || isCapacitor()) {
      return false;
    }
    const existing = root.document.querySelector('link[rel="manifest"]');
    if (existing) {
      return false;
    }
    const link = root.document.createElement('link');
    link.rel = 'manifest';
    link.href = './manifest.webmanifest';
    root.document.head.appendChild(link);
    return true;
  }

  function deepFreeze(obj, seen) {
    if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
      return obj;
    }
    const visited = seen || new WeakSet();
    if (visited.has(obj)) {
      return obj;
    }
    visited.add(obj);

    const keys = Object.getOwnPropertyNames(obj);
    for (let i = 0; i < keys.length; i += 1) {
      const val = obj[keys[i]];
      if (val !== null && (typeof val === 'object' || typeof val === 'function')) {
        deepFreeze(val, visited);
      }
    }
    return Object.freeze(obj);
  }

  function clamp(v, min, max) {
    if (!Number.isFinite(v)) {
      return min;
    }
    return Math.min(max, Math.max(min, v));
  }

  function escapeText(v) {
    return v == null ? '' : String(v);
  }

  function createEl(tag, options, children) {
    if (typeof root.document === 'undefined') {
      throw new Error('Document is unavailable');
    }
    const el = root.document.createElement(tag);
    const opts = options || {};

    if (opts.className) {
      el.className = String(opts.className);
    }
    if (opts.text !== undefined && opts.text !== null) {
      el.textContent = String(opts.text);
    }
    if (opts.attrs && typeof opts.attrs === 'object') {
      const attrNames = Object.keys(opts.attrs);
      for (let i = 0; i < attrNames.length; i += 1) {
        const key = attrNames[i];
        const lower = key.toLowerCase();
        if (lower === 'style' || lower.startsWith('on')) {
          throw new Error('Disallowed attribute in createEl: ' + key);
        }
        const val = opts.attrs[key];
        if (val !== undefined && val !== null) {
          el.setAttribute(key, String(val));
        }
      }
    }
    if (opts.dataset && typeof opts.dataset === 'object') {
      const dataKeys = Object.keys(opts.dataset);
      for (let i = 0; i < dataKeys.length; i += 1) {
        const dk = dataKeys[i];
        if (opts.dataset[dk] !== undefined && opts.dataset[dk] !== null) {
          el.dataset[dk] = String(opts.dataset[dk]);
        }
      }
    }
    if (opts.value !== undefined) {
      el.value = String(opts.value);
    }
    if (opts.disabled !== undefined) {
      el.disabled = Boolean(opts.disabled);
    }

    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        if (child == null) {
          continue;
        }
        if (typeof child === 'string' || typeof child === 'number') {
          el.appendChild(root.document.createTextNode(String(child)));
        } else {
          el.appendChild(child);
        }
      }
    }
    return el;
  }

  IkaiApp.Env = Object.freeze({
    isFile,
    isHttp,
    isCapacitor,
    isStandalone,
    canUseServiceWorker,
    injectManifestIfHttp,
    deepFreeze,
    clamp,
    escapeText,
    createEl
  });
})(typeof window !== 'undefined' ? window : globalThis);
