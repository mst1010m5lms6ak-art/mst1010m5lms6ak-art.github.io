(function (root) {
  'use strict';

  const IkaiApp = root.IkaiApp = root.IkaiApp || {};

  let boundEl = null;
  let currentHandlers = null;

  function onClick(event) {
    if (!currentHandlers || !event || !event.target) {
      return;
    }
    const target = event.target;
    const actionEl = typeof target.closest === 'function' ? target.closest('[data-action]') : null;
    if (!actionEl || (boundEl && !boundEl.contains(actionEl))) {
      return;
    }
    const isTrusted = Boolean(event.isTrusted);
    if (isTrusted && IkaiApp.AudioSE && typeof IkaiApp.AudioSE.unlock === 'function') {
      IkaiApp.AudioSE.unlock();
    }
    if (typeof currentHandlers.onAction === 'function') {
      currentHandlers.onAction(actionEl, isTrusted, event);
    }
  }

  function onInput(event) {
    if (!currentHandlers || !event || !event.target) {
      return;
    }
    if (event.isTrusted && IkaiApp.AudioSE && typeof IkaiApp.AudioSE.unlock === 'function') {
      IkaiApp.AudioSE.unlock();
    }
    if (typeof currentHandlers.onInput === 'function') {
      currentHandlers.onInput(event);
    }
  }

  function onChange(event) {
    if (!currentHandlers || !event || !event.target) {
      return;
    }
    if (event.isTrusted && IkaiApp.AudioSE && typeof IkaiApp.AudioSE.unlock === 'function') {
      IkaiApp.AudioSE.unlock();
    }
    if (typeof currentHandlers.onChange === 'function') {
      currentHandlers.onChange(event);
    }
  }

  function init(lowerEl, handlers) {
    if (!lowerEl) {
      return false;
    }
    currentHandlers = handlers || {};
    if (boundEl === lowerEl) {
      return true;
    }
    if (boundEl) {
      boundEl.removeEventListener('click', onClick);
      boundEl.removeEventListener('input', onInput);
      boundEl.removeEventListener('change', onChange);
    }
    boundEl = lowerEl;
    boundEl.addEventListener('click', onClick);
    boundEl.addEventListener('input', onInput);
    boundEl.addEventListener('change', onChange);
    return true;
  }

  IkaiApp.RouterInput = Object.freeze({
    init
  });
})(typeof window !== 'undefined' ? window : globalThis);
