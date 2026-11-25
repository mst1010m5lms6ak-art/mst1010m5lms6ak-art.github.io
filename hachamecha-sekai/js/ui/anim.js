(function (global) {
  'use strict';

  var HS = global.HS = global.HS || {};

  var POPUP_POOL_SIZE = 28;
  var MAX_DT_MS = 50;

  var VALID_KINDS = {
    dmg: 'fx-dmg',
    crit: 'fx-crit',
    weak: 'fx-weak',
    resist: 'fx-resist',
    heal: 'fx-heal',
    shield: 'fx-shield',
    status: 'fx-status',
    miss: 'fx-miss'
  };

  var rafId = null;
  var running = false;
  var pausedByVisibility = false;
  var lastTimestamp = 0;
  var currentWorld = 'frontier';

  var frameListeners = [];
  var fxLayerEl = null;
  var fxInitialized = false;

  var popupPool = [];
  var popupCursor = 0;
  var activePopupCount = 0;

  var flashEl = null;
  var flashTimer = 0;

  var cutinEl = null;
  var cutinActorEl = null;
  var cutinSkillEl = null;
  var cutinScopeEl = null;
  var cutinTimer = 0;

  var intruderEl = null;
  var intruderTimer = 0;

  // Active temporary card classes managed inside rAF (zero setTimeout churn)
  var cardTimers = [];

  // Stagger counter to avoid overlapping rapid multi-hit popups
  var jitterSeq = 0;

  function getSettings() {
    if (HS.State && typeof HS.State.get === 'function') {
      var st = HS.State.get();
      if (st && st.settings) return st.settings;
    }
    return { speed: 1, showCutin: true, compactFx: false };
  }

  function clamp01(v) {
    var n = Number(v);
    if (!isFinite(n) || n <= 0) return 0;
    if (n >= 1) return 1;
    return n;
  }

  function clampRange(v, lo, hi) {
    if (hi < lo) return lo;
    return v < lo ? lo : (v > hi ? hi : v);
  }

  /**
   * World-Sync Theme Switching:
   * Updates #app[data-world] and #divider-world-tag cleanly with zero redundant DOM writes.
   */
  function setWorldTheme(worldId) {
    var worldsMeta = (HS.Data && HS.Data.WORLDS_META) || {};
    var nextId = (worldId && worldsMeta[worldId]) ? worldId : 'frontier';
    var appEl = typeof document !== 'undefined' ? document.getElementById('app') : null;
    var tagEl = typeof document !== 'undefined' ? document.getElementById('divider-world-tag') : null;

    if (appEl && appEl.getAttribute('data-world') !== nextId) {
      appEl.setAttribute('data-world', nextId);
    }
    if (tagEl) {
      var meta = worldsMeta[nextId];
      var label = meta ? meta.name : '境界平原';
      if (tagEl.textContent !== label) {
        tagEl.textContent = label;
      }
    }
    currentWorld = nextId;
    return nextId;
  }

  function getWorldTheme() {
    return currentWorld;
  }

  /**
   * Computes the exact vertical seam between enemy-row and ally-row inside #fx-layer
   * so slim cut-in ribbons & intruder banners sit cleanly in the gap without covering unit names.
   */
  function computeSeamTopPx() {
    if (!fxLayerEl || typeof document === 'undefined' || typeof fxLayerEl.getBoundingClientRect !== 'function') {
      return null;
    }
    var layerRect = fxLayerEl.getBoundingClientRect();
    if (!layerRect || layerRect.height <= 0) return null;
    var stage = document.getElementById('upper-stage');
    if (!stage || typeof stage.querySelector !== 'function') return null;
    var enemyRow = stage.querySelector('.enemy-row');
    var allyRow = stage.querySelector('.ally-row');
    if (!enemyRow || !allyRow) return null;
    var eRect = enemyRow.getBoundingClientRect();
    var aRect = allyRow.getBoundingClientRect();
    if (!eRect || !aRect || eRect.height <= 0 || aRect.height <= 0) return null;
    var enemyBottom = eRect.bottom - layerRect.top;
    var allyTop = aRect.top - layerRect.top;
    // Keep 20px banner's bottom edge strictly above ally cards (zero overlap with ally icons!)
    var seamY = Math.min((enemyBottom + allyTop) * 0.5, allyTop - 11);
    return clampRange(seamY, 68, Math.max(68, allyTop - 11));
  }

  /**
   * Pre-allocates the 28-node popup pool + flash + cut-in ribbon + intruder banner inside #fx-layer.
   * Zero createElement/remove churn during rapid 3x combat!
   */
  function initFxLayer(layerEl) {
    if (typeof document === 'undefined') return false;
    var el = layerEl || document.getElementById('fx-layer');
    if (!el) return false;
    if (fxInitialized && fxLayerEl === el) return true;

    fxLayerEl = el;
    fxLayerEl.textContent = '';

    // 1. Flash overlay
    flashEl = document.createElement('div');
    flashEl.className = 'fx-flash';
    fxLayerEl.appendChild(flashEl);

    // 2. Slim Skill Cut-in Ribbon (Enemy/Ally Seam)
    cutinEl = document.createElement('div');
    cutinEl.className = 'cutin-ribbon skill-cutin';
    cutinActorEl = document.createElement('span');
    cutinActorEl.className = 'cutin-actor';
    cutinSkillEl = document.createElement('span');
    cutinSkillEl.className = 'cutin-skill';
    cutinScopeEl = document.createElement('span');
    cutinScopeEl.className = 'cutin-scope';
    cutinEl.appendChild(cutinActorEl);
    cutinEl.appendChild(cutinSkillEl);
    cutinEl.appendChild(cutinScopeEl);
    fxLayerEl.appendChild(cutinEl);

    // 3. Intruder Warning Banner
    intruderEl = document.createElement('div');
    intruderEl.className = 'intruder-banner';
    fxLayerEl.appendChild(intruderEl);

    // 4. Pre-allocated 28 popup nodes
    popupPool = new Array(POPUP_POOL_SIZE);
    for (var i = 0; i < POPUP_POOL_SIZE; i++) {
      var node = document.createElement('div');
      node.className = 'fx-popup fx-dmg';
      node.style.opacity = '0';
      node.style.transform = 'translate3d(-999px, -999px, 0)';
      fxLayerEl.appendChild(node);
      popupPool[i] = {
        el: node,
        active: false,
        elapsed: 0,
        duration: 600,
        startX: 0,
        startY: 0,
        minY: 72,
        driftX: 0,
        riseY: 20,
        baseScale: 1,
        popScale: 1.15
      };
    }

    popupCursor = 0;
    activePopupCount = 0;
    flashTimer = 0;
    cutinTimer = 0;
    intruderTimer = 0;
    cardTimers.length = 0;
    fxInitialized = true;
    return true;
  }

  function ensureFxReady() {
    if (!fxInitialized) {
      initFxLayer();
    }
    return fxInitialized;
  }

  /**
   * GPU-only gauge update: strictly uses transform: scaleX(...) to avoid layout reflow.
   * Skips DOM writes when value hasn't meaningfully changed.
   */
  function setGauge(el, ratio) {
    if (!el) return;
    var v = clamp01(ratio);
    var prev = el._hsGaugeVal;
    if (prev !== undefined && Math.abs(v - prev) < 0.0005) {
      return;
    }
    el._hsGaugeVal = v;
    el.style.transform = 'scaleX(' + v.toFixed(4) + ')';
  }

  /**
   * Updates both instant HP fill and delayed trail bar (plus low-HP color state).
   */
  function setHpGauge(fillEl, delayEl, ratio) {
    var v = clamp01(ratio);
    setGauge(fillEl, v);
    if (fillEl) {
      var isLow = v > 0 && v <= 0.25;
      if (fillEl._hsIsLow !== isLow) {
        fillEl._hsIsLow = isLow;
        fillEl.classList.toggle('is-low', isLow);
      }
    }
    if (delayEl) {
      setGauge(delayEl, v);
    }
  }

  /**
   * Spawns a floating damage / heal / crit / weakness / status popup from the 28-node pool.
   * Coordinates & rise arc are strictly clamped inside the target .unit-card box
   * so popups NEVER bleed over .battle-meta-bar or .turn-order-bar!
   */
  function spawnPopup(opts) {
    if (!opts || !ensureFxReady()) return;
    var settings = getSettings();
    var kind = VALID_KINDS[opts.kind] ? opts.kind : 'dmg';

    if (settings.compactFx && (kind === 'resist' || kind === 'status')) {
      return;
    }

    var slot = null;
    for (var n = 0; n < POPUP_POOL_SIZE; n++) {
      var idx = (popupCursor + n) % POPUP_POOL_SIZE;
      if (!popupPool[idx].active) {
        slot = popupPool[idx];
        popupCursor = (idx + 1) % POPUP_POOL_SIZE;
        break;
      }
    }
    if (!slot) {
      slot = popupPool[popupCursor];
      popupCursor = (popupCursor + 1) % POPUP_POOL_SIZE;
    } else {
      activePopupCount += 1;
    }

    // Deterministic lightweight horizontal/vertical stagger inside card bounds
    jitterSeq = (jitterSeq + 1) % 7;
    var jOffsets = [-10, 10, -4, 12, -8, 6, 0];
    var yOffsets = [4, -2, 8, 0, -4, 6, 2];

    var x = typeof opts.x === 'number' ? opts.x : 120;
    var y = typeof opts.y === 'number' ? opts.y : 140;
    var minY = 74;
    var maxRise = 22;

    if (opts.targetEl && fxLayerEl && typeof opts.targetEl.getBoundingClientRect === 'function') {
      var layerRect = fxLayerEl.getBoundingClientRect();
      var cardRect = opts.targetEl.getBoundingClientRect();
      if (layerRect.width > 0 && cardRect.width > 0 && cardRect.height > 0) {
        var cLeft = cardRect.left - layerRect.left;
        var cTop = cardRect.top - layerRect.top;
        var cRight = cLeft + cardRect.width;
        var cBottom = cTop + cardRect.height;

        // Strictly stay inside the unit card (below its header strip, above its buff bar)
        minY = Math.max(cTop + 18, 72);
        var centerX = cLeft + (cardRect.width * 0.5) + jOffsets[jitterSeq];
        var centerY = cTop + (cardRect.height * 0.52) + yOffsets[jitterSeq];

        x = clampRange(centerX, cLeft + 16, cRight - 16);
        y = clampRange(centerY, minY + 10, cBottom - 16);
        maxRise = Math.max(10, Math.min(24, y - minY));
      }
    }

    var speed = Math.max(1, Number(opts.speed || settings.speed || 1));
    var speedFactor = speed >= 3 ? 0.66 : (speed >= 2 ? 0.80 : 1.0);
    var compactFactor = settings.compactFx ? 0.78 : 1.0;

    slot.active = true;
    slot.elapsed = 0;
    slot.duration = Math.round((kind === 'crit' ? 680 : 560) * speedFactor * compactFactor);
    slot.startX = x;
    slot.startY = y;
    slot.minY = minY;
    slot.driftX = (jitterSeq % 2 === 0 ? -1 : 1) * (kind === 'crit' ? 5 : 3);
    slot.riseY = Math.min(maxRise, kind === 'crit' ? 24 : (kind === 'heal' ? 20 : 18));
    slot.baseScale = kind === 'crit' ? 1.04 : 1.0;
    slot.popScale = kind === 'crit' ? 1.28 : (kind === 'weak' ? 1.18 : 1.10);

    var text = opts.text != null ? String(opts.text) : '';
    var node = slot.el;
    node.className = 'fx-popup ' + VALID_KINDS[kind];
    node.textContent = text;
    node.style.opacity = '1';
    node.style.transform =
      'translate3d(' + slot.startX.toFixed(1) + 'px,' + slot.startY.toFixed(1) + 'px,0) translate(-50%,-50%) scale(' + slot.popScale.toFixed(2) + ')';
  }

  /**
   * Slim Skill Cut-in Ribbon placed precisely on the Enemy/Ally seam gap.
   */
  function showCutin(opts) {
    if (!opts || !ensureFxReady() || !cutinEl) return;
    var settings = getSettings();
    if (settings.showCutin === false) return;

    var targetNames = (HS.CONST && HS.CONST.TARGET_NAMES) || {};
    var scopeLabel = opts.scopeLabel || targetNames[opts.targetType] || '単体';

    cutinActorEl.textContent = opts.actorName || '';
    cutinSkillEl.textContent = opts.skillName || '';
    cutinScopeEl.textContent = scopeLabel;

    var seamTop = computeSeamTopPx();
    if (seamTop !== null) {
      cutinEl.style.top = seamTop.toFixed(1) + 'px';
    }

    if (opts.accentColor) {
      cutinEl.style.borderLeftColor = opts.accentColor;
    } else {
      cutinEl.style.borderLeftColor = '';
    }

    var speed = Math.max(1, Number(opts.speed || settings.speed || 1));
    var baseMs = settings.compactFx ? 380 : 580;
    cutinTimer = Math.round(baseMs / (speed >= 3 ? 1.9 : (speed >= 2 ? 1.4 : 1)));
    cutinEl.classList.add('is-show');
  }

  /**
   * Dramatic Intruder Warning Banner (`⚠ 乱入敵が出現！`) on battlefront seam.
   */
  function showIntruderBanner(enemyName, extraText) {
    if (!ensureFxReady() || !intruderEl) return;
    var label = '⚠ 乱入敵が出現！';
    if (enemyName) label += ' ' + enemyName;
    if (extraText) label += ' ' + extraText;

    var seamTop = computeSeamTopPx();
    if (seamTop !== null) {
      intruderEl.style.top = seamTop.toFixed(1) + 'px';
    }

    intruderEl.textContent = label;
    intruderEl.classList.add('is-show');
    intruderTimer = 1450;
    triggerFlash('#ff4791');
  }

  /**
   * Subtle full-stage flash overlay (pure opacity animation).
   */
  function triggerFlash(color) {
    if (!ensureFxReady() || !flashEl) return;
    var settings = getSettings();
    if (settings.compactFx) return;
    flashEl.style.background = color || '';
    flashEl.classList.remove('is-active');
    flashTimer = 220;
    if (typeof global.requestAnimationFrame === 'function') {
      global.requestAnimationFrame(function () {
        if (flashEl && flashTimer > 0) {
          flashEl.classList.add('is-active');
        }
      });
    } else {
      flashEl.classList.add('is-active');
    }
  }

  /**
   * Schedules a temporary visual class on a unit card (e.g. .is-hit shake / .is-heal border pulse).
   */
  function pulseCardClass(cardEl, className, durationMs) {
    if (!cardEl || !className) return;
    var dur = Math.max(80, durationMs || 220);

    for (var i = 0; i < cardTimers.length; i++) {
      var entry = cardTimers[i];
      if (entry.el === cardEl && entry.cls === className) {
        entry.remaining = dur;
        cardEl.classList.remove(className);
        entry.pendingAdd = true;
        return;
      }
    }

    cardEl.classList.add(className);
    cardTimers.push({
      el: cardEl,
      cls: className,
      remaining: dur,
      pendingAdd: false
    });
  }

  function triggerHitShake(cardEl) {
    var settings = getSettings();
    pulseCardClass(cardEl, 'is-hit', settings.compactFx ? 150 : 220);
  }

  function triggerHealPulse(cardEl) {
    pulseCardClass(cardEl, 'is-heal', 260);
  }

  /**
   * Immediately hides all FX overlays and returns all popup nodes to idle state.
   */
  function clearFx() {
    if (cutinEl) cutinEl.classList.remove('is-show');
    if (intruderEl) intruderEl.classList.remove('is-show');
    if (flashEl) flashEl.classList.remove('is-active');
    cutinTimer = 0;
    intruderTimer = 0;
    flashTimer = 0;

    for (var i = 0; i < popupPool.length; i++) {
      var p = popupPool[i];
      if (p.active) {
        p.active = false;
        p.el.style.opacity = '0';
        p.el.style.transform = 'translate3d(-999px, -999px, 0)';
      }
    }
    activePopupCount = 0;

    for (var j = 0; j < cardTimers.length; j++) {
      var ct = cardTimers[j];
      if (ct.el) ct.el.classList.remove(ct.cls);
    }
    cardTimers.length = 0;
  }

  function updateFx(dt) {
    if (activePopupCount > 0) {
      for (var i = 0; i < POPUP_POOL_SIZE; i++) {
        var p = popupPool[i];
        if (!p.active) continue;
        p.elapsed += dt;
        var t = p.elapsed / p.duration;
        if (t >= 1) {
          p.active = false;
          activePopupCount = Math.max(0, activePopupCount - 1);
          p.el.style.opacity = '0';
          p.el.style.transform = 'translate3d(-999px, -999px, 0)';
          continue;
        }
        var easeOut = 1 - Math.pow(1 - t, 3);
        var px = p.startX + p.driftX * t;
        var py = Math.max(p.minY, p.startY - p.riseY * easeOut);
        var scale = t < 0.18
          ? p.popScale - ((p.popScale - p.baseScale) * (t / 0.18))
          : p.baseScale;
        var opacity = t > 0.68 ? Math.max(0, 1 - ((t - 0.68) / 0.32)) : 1;
        p.el.style.transform =
          'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0) translate(-50%,-50%) scale(' + scale.toFixed(2) + ')';
        p.el.style.opacity = opacity.toFixed(3);
      }
    }

    if (cutinTimer > 0) {
      cutinTimer -= dt;
      if (cutinTimer <= 0) {
        cutinTimer = 0;
        if (cutinEl) cutinEl.classList.remove('is-show');
      }
    }

    if (intruderTimer > 0) {
      intruderTimer -= dt;
      if (intruderTimer <= 0) {
        intruderTimer = 0;
        if (intruderEl) intruderEl.classList.remove('is-show');
      }
    }

    if (flashTimer > 0) {
      flashTimer -= dt;
      if (flashTimer <= 0) {
        flashTimer = 0;
        if (flashEl) flashEl.classList.remove('is-active');
      }
    }

    if (cardTimers.length > 0) {
      for (var c = cardTimers.length - 1; c >= 0; c--) {
        var ct = cardTimers[c];
        if (ct.pendingAdd) {
          ct.pendingAdd = false;
          if (ct.el) ct.el.classList.add(ct.cls);
          continue;
        }
        ct.remaining -= dt;
        if (ct.remaining <= 0) {
          if (ct.el) ct.el.classList.remove(ct.cls);
          cardTimers.splice(c, 1);
        }
      }
    }
  }

  function addFrameListener(fn) {
    if (typeof fn !== 'function') return;
    if (frameListeners.indexOf(fn) === -1) {
      frameListeners.push(fn);
    }
  }

  function removeFrameListener(fn) {
    var idx = frameListeners.indexOf(fn);
    if (idx !== -1) {
      frameListeners.splice(idx, 1);
    }
  }

  function tickFrame(timestamp) {
    if (!running || pausedByVisibility) {
      rafId = null;
      return;
    }

    if (lastTimestamp === 0) {
      lastTimestamp = timestamp;
    }
    var rawDt = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    var dt = rawDt < 0 ? 0 : (rawDt > MAX_DT_MS ? MAX_DT_MS : rawDt);

    // 1. Advance battle simulation inside the single unified rAF loop
    if (HS.Battle && typeof HS.Battle.tick === 'function') {
      var battleActive = typeof HS.Battle.isLocked === 'function'
        ? HS.Battle.isLocked()
        : (typeof HS.Battle.getState === 'function' ? !!HS.Battle.getState().active : false);
      if (battleActive) {
        HS.Battle.tick(dt);
      }
    }

    // 2. Update GPU FX overlays only if any FX is active (zero work when idle!)
    if (activePopupCount > 0 || cutinTimer > 0 || intruderTimer > 0 || flashTimer > 0 || cardTimers.length > 0) {
      updateFx(dt);
    }

    // 3. Notify UI frame listeners (e.g. BattleView silky ATB/HP scaleX sync)
    for (var i = 0; i < frameListeners.length; i++) {
      try {
        frameListeners[i](dt, timestamp);
      } catch (err) {
        if (typeof console !== 'undefined' && console.error) {
          console.error('[HS.Anim] frame listener error:', err);
        }
      }
    }

    rafId = global.requestAnimationFrame(tickFrame);
  }

  function handleVisibilityChange() {
    if (typeof document === 'undefined') return;
    if (document.hidden) {
      pausedByVisibility = true;
      if (rafId !== null && typeof global.cancelAnimationFrame === 'function') {
        global.cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTimestamp = 0;
    } else {
      pausedByVisibility = false;
      lastTimestamp = 0;
      if (running && rafId === null && typeof global.requestAnimationFrame === 'function') {
        rafId = global.requestAnimationFrame(tickFrame);
      }
    }
  }

  var visibilityBound = false;

  function startLoop() {
    if (typeof document !== 'undefined' && !visibilityBound) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      visibilityBound = true;
    }
    ensureFxReady();
    if (running) return;
    running = true;
    pausedByVisibility = (typeof document !== 'undefined' && !!document.hidden);
    lastTimestamp = 0;
    if (!pausedByVisibility && typeof global.requestAnimationFrame === 'function') {
      rafId = global.requestAnimationFrame(tickFrame);
    }
  }

  function stopLoop() {
    running = false;
    if (rafId !== null && typeof global.cancelAnimationFrame === 'function') {
      global.cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastTimestamp = 0;
  }

  function isRunning() {
    return running && !pausedByVisibility;
  }

  HS.Anim = {
    POPUP_POOL_SIZE: POPUP_POOL_SIZE,
    setWorldTheme: setWorldTheme,
    getWorldTheme: getWorldTheme,
    initFxLayer: initFxLayer,
    setGauge: setGauge,
    setHpGauge: setHpGauge,
    spawnPopup: spawnPopup,
    showCutin: showCutin,
    showIntruderBanner: showIntruderBanner,
    triggerFlash: triggerFlash,
    triggerHitShake: triggerHitShake,
    triggerHealPulse: triggerHealPulse,
    pulseCardClass: pulseCardClass,
    clearFx: clearFx,
    addFrameListener: addFrameListener,
    removeFrameListener: removeFrameListener,
    startLoop: startLoop,
    stopLoop: stopLoop,
    isRunning: isRunning
  };
})(typeof window !== 'undefined' ? window : globalThis);
