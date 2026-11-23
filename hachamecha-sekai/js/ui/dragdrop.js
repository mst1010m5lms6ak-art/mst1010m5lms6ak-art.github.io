/* ==========================================================================
   dragdrop.js - Pointer Events 統合ドラッグ＆ドロップ（iOSタッチ・PC両対応）
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});

  let dragState = null;
  let onDropHandler = null;
  let lastDragEndAt = 0;

  function setDropHandler(fn) {
    onDropHandler = fn;
  }

  function wasRecentDrag() {
    return performance.now() - lastDragEndAt < 180;
  }

  function getGhost() {
    return document.getElementById('drag-ghost');
  }

  function clearDropHighlights() {
    document.querySelectorAll('.drop-over').forEach((el) => el.classList.remove('drop-over'));
  }

  function findDropTarget(x, y, acceptKinds) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const dropEl = el.closest('[data-drop-kind]');
    if (!dropEl) return null;
    const kind = dropEl.dataset.dropKind;
    if (acceptKinds && !acceptKinds.includes(kind)) return null;
    return dropEl;
  }

  function startDragging() {
    if (!dragState || dragState.active) return;
    dragState.active = true;
    const ghost = getGhost();
    if (ghost) {
      ghost.textContent = dragState.label;
      ghost.style.left = `${dragState.curX}px`;
      ghost.style.top = `${dragState.curY}px`;
      ghost.classList.remove('hidden');
    }
    HS.AUDIO.play('tap');
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const src = e.target.closest('[data-drag-kind]');
    if (!src) return;

    const kind = src.dataset.dragKind;
    const value = src.dataset.dragValue;
    const label = src.dataset.dragLabel || value;
    const accept = (src.dataset.dragAccept || '').split(',').filter(Boolean);
    const immediate = src.dataset.dragImmediate === '1' || !!e.target.closest('[data-drag-handle]');

    dragState = {
      pointerId: e.pointerId,
      src,
      kind,
      value,
      label,
      accept,
      immediate,
      startX: e.clientX,
      startY: e.clientY,
      curX: e.clientX,
      curY: e.clientY,
      active: false,
      holdTimer: null
    };

    if (!immediate) {
      dragState.holdTimer = setTimeout(() => {
        if (dragState && !dragState.active) startDragging();
      }, 210);
    }
  }

  function onPointerMove(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    dragState.curX = e.clientX;
    dragState.curY = e.clientY;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const dist = Math.hypot(dx, dy);

    if (!dragState.active) {
      if (dragState.immediate && dist >= 8) {
        startDragging();
      } else if (!dragState.immediate && dist >= 12) {
        // 縦スクロール操作を優先してドラッグ待機を解除
        if (Math.abs(dy) > Math.abs(dx) * 1.25) {
          cancelDrag();
          return;
        }
        startDragging();
      }
    }

    if (dragState && dragState.active) {
      e.preventDefault();
      const ghost = getGhost();
      if (ghost) {
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;
      }
      clearDropHighlights();
      const hit = findDropTarget(e.clientX, e.clientY, dragState.accept);
      if (hit) hit.classList.add('drop-over');
    }
  }

  function cancelDrag() {
    if (!dragState) return;
    if (dragState.holdTimer) clearTimeout(dragState.holdTimer);
    const ghost = getGhost();
    if (ghost) ghost.classList.add('hidden');
    clearDropHighlights();
    dragState = null;
  }

  function onPointerUp(e) {
    if (!dragState || e.pointerId !== dragState.pointerId) return;
    const wasActive = dragState.active;
    const payload = { ...dragState };
    cancelDrag();

    if (wasActive) {
      lastDragEndAt = performance.now();
      const dropEl = findDropTarget(e.clientX, e.clientY, payload.accept);
      if (dropEl && onDropHandler) {
        onDropHandler({
          dragKind: payload.kind,
          dragValue: payload.value,
          dropKind: dropEl.dataset.dropKind,
          dropValue: dropEl.dataset.dropValue
        });
      }
    }
  }

  function init() {
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('pointercancel', cancelDrag, { passive: true });
  }

  HS.DND = { init, setDropHandler, wasRecentDrag };
})(window);
