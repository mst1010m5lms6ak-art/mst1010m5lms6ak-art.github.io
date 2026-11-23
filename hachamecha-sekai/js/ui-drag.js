(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  let active = null;
  let holdTimer = null;
  let onDropCallback = null;
  let suppressClickUntil = 0;

  function ghostEl() {
    return document.getElementById("drag-ghost");
  }

  function clearHighlights() {
    document.querySelectorAll(".drop-over").forEach((el) => el.classList.remove("drop-over"));
  }

  function beginDragVisual(x, y) {
    if (!active || active.started) return;
    active.started = true;
    const g = ghostEl();
    g.innerHTML = active.ghostHtml;
    g.style.left = x + "px";
    g.style.top = y + "px";
    g.classList.remove("hidden");
    if (HS.AUDIO) HS.AUDIO.tap();
  }

  function updateDropHover(x, y) {
    clearHighlights();
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const zone = el.closest("[data-drop-zone]");
    if (!zone) return null;
    if (zone.dataset.dropAccept && zone.dataset.dropAccept !== active.dragType) return null;
    zone.classList.add("drop-over");
    return zone;
  }

  function cleanup() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    clearHighlights();
    const g = ghostEl();
    if (g) {
      g.classList.add("hidden");
      g.innerHTML = "";
    }
    active = null;
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const src = e.target.closest("[data-drag-type]");
    if (!src) return;

    const inScroll = !!src.closest(".scroll-y");
    const dragType = src.dataset.dragType;
    const dragId = src.dataset.dragId;
    const dragFrom = src.dataset.dragFrom || "";
    const label = src.dataset.dragLabel || "";

    let ghostHtml = "";
    if (dragType === "char") {
      const ch = HS.CHARS.get(dragId);
      ghostHtml = ch
        ? `<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:12px;background:rgba(20,15,42,0.95);border:2px solid #00e5ff;color:#fff;font-size:12px;font-weight:900;">${HS.SVG.emblem(ch, 34)}<span>${HS.CONST.esc(ch.name)}</span></div>`
        : "";
    } else if (dragType === "equip") {
      ghostHtml = `<div style="padding:6px 12px;border-radius:10px;background:rgba(24,18,48,0.96);border:2px solid #ffc933;color:#ffe999;font-size:12px;font-weight:900;">${HS.CONST.esc(label)}</div>`;
    } else if (dragType === "skill") {
      ghostHtml = `<div style="padding:7px 14px;border-radius:12px;background:rgba(255,61,127,0.92);border:2px solid #fff;color:#fff;font-size:12px;font-weight:900;">${HS.CONST.esc(label)}</div>`;
    }

    active = {
      pointerId: e.pointerId,
      dragType,
      dragId,
      dragFrom,
      startX: e.clientX,
      startY: e.clientY,
      curX: e.clientX,
      curY: e.clientY,
      inScroll,
      started: false,
      ghostHtml
    };

    if (inScroll) {
      // Allow vertical scrolling unless user holds briefly or drags horizontally
      holdTimer = setTimeout(() => {
        if (active && !active.started) {
          beginDragVisual(active.curX, active.curY);
          updateDropHover(active.curX, active.curY);
        }
      }, 170);
    }
  }

  function onPointerMove(e) {
    if (!active || e.pointerId !== active.pointerId) return;
    active.curX = e.clientX;
    active.curY = e.clientY;
    const dx = e.clientX - active.startX;
    const dy = e.clientY - active.startY;
    const dist = Math.hypot(dx, dy);

    if (!active.started) {
      if (active.inScroll) {
        if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx) * 1.1) {
          // User intends to scroll list vertically
          cleanup();
          return;
        }
        if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) {
          beginDragVisual(e.clientX, e.clientY);
        }
      } else if (dist > 8) {
        beginDragVisual(e.clientX, e.clientY);
      }
    }

    if (active && active.started) {
      e.preventDefault();
      const g = ghostEl();
      g.style.left = e.clientX + "px";
      g.style.top = e.clientY + "px";
      updateDropHover(e.clientX, e.clientY);
    }
  }

  function onPointerUp(e) {
    if (!active || e.pointerId !== active.pointerId) return;
    if (active.started) {
      suppressClickUntil = Date.now() + 260;
      const zone = updateDropHover(e.clientX, e.clientY);
      if (zone && typeof onDropCallback === "function") {
        onDropCallback({
          dragType: active.dragType,
          dragId: active.dragId,
          dragFrom: active.dragFrom,
          dropZone: zone.dataset.dropZone,
          dropId: zone.dataset.dropId || ""
        });
      }
    }
    cleanup();
  }

  function init(callback) {
    onDropCallback = callback;
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("pointercancel", cleanup, { passive: true });
    document.addEventListener("dragstart", (e) => e.preventDefault());
    document.addEventListener(
      "click",
      (e) => {
        if (Date.now() < suppressClickUntil) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      true
    );
  }

  HS.DRAG = { init };
})(window);
