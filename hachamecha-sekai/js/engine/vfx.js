(function () {
  'use strict';

  const HW = (window.HW = window.HW || {});

  /*
   * 超軽量 Canvas2D VFX エンジン（改修版）
   * ・ポップアップをアリーナ安全領域内へ完全クランプし、上端行動順バーや中央バナーへの被りを撲滅
   * ・同一ユニットへの連続表示は縦オフセットして数字同士の重なりも防止
   * ・弧線ターゲットビーム＋衝撃波で「誰が誰を攻撃したか」をスタイリッシュに表示
   */
  const MAX_PARTICLES = 56;
  const MAX_POPUPS = 14;
  let canvas = null;
  let ctx = null;
  let w = 0;
  let h = 0;
  let dpr = 1;

  const beams = [];
  const rings = [];
  const particles = [];
  const popups = [];

  function attach(el) {
    canvas = el;
    if (!canvas) {
      ctx = null;
      return;
    }
    ctx = canvas.getContext('2d', { alpha: true });
    resize();
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clear() {
    beams.length = 0;
    rings.length = 0;
    particles.length = 0;
    popups.length = 0;
    if (ctx) ctx.clearRect(0, 0, w, h);
  }

  function getUnitRect(unitDomId) {
    if (!canvas) return null;
    const el = document.getElementById(unitDomId);
    if (!el) return null;
    const cr = canvas.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    return {
      cx: er.left - cr.left + er.width * 0.5,
      cy: er.top - cr.top + er.height * 0.5,
      right: er.right - cr.left,
      top: er.top - cr.top,
      bottom: er.bottom - cr.top,
      w: er.width,
      h: er.height
    };
  }

  function spawnAttack(fromDomId, toDomId, color, isHeavy) {
    const p1 = getUnitRect(fromDomId);
    const p2 = getUnitRect(toDomId);
    if (!p1 || !p2) return;
    const mx = (p1.cx + p2.cx) * 0.5 + (p1.cx < w * 0.5 ? -18 : 18);
    const my = (p1.cy + p2.cy) * 0.5;
    beams.push({
      x1: p1.cx, y1: p1.cy, mx: mx, my: my, x2: p2.cx, y2: p2.cy,
      color: color || '#2de2e6',
      life: 0, maxLife: isHeavy ? 0.30 : 0.22,
      width: isHeavy ? 4.2 : 2.6
    });
    rings.push({
      x: p2.cx, y: p2.cy,
      color: color || '#ffd24c',
      life: 0, maxLife: isHeavy ? 0.34 : 0.25,
      maxR: isHeavy ? 34 : 22
    });
    const count = isHeavy ? 8 : 5;
    for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 55 + Math.random() * (isHeavy ? 95 : 65);
      particles.push({
        x: p2.cx, y: p2.cy,
        vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        color: color || '#ffd24c',
        size: isHeavy ? 3 : 2.2,
        life: 0, maxLife: 0.28 + Math.random() * 0.12
      });
    }
  }

  function spawnHeal(targetDomId) {
    const p = getUnitRect(targetDomId);
    if (!p) return;
    rings.push({ x: p.cx, y: p.cy, color: '#47f59a', life: 0, maxLife: 0.34, maxR: 26 });
    for (let i = 0; i < 5 && particles.length < MAX_PARTICLES; i++) {
      particles.push({
        x: p.cx + (Math.random() - 0.5) * 28,
        y: p.cy + 8,
        vx: (Math.random() - 0.5) * 16,
        vy: -42 - Math.random() * 32,
        color: '#47f59a',
        size: 2.5,
        life: 0, maxLife: 0.36
      });
    }
  }

  function spawnPopup(targetDomId, text, color, isBig) {
    const p = getUnitRect(targetDomId);
    if (!p || w <= 0 || h <= 0) return;

    // 同一ユニットに出ている既存ポップ数を数えて縦にズラし重複防止
    const sameCnt = popups.filter((x) => x.domId === targetDomId && x.life < 0.35).length;
    // カード右寄り下部を基準にし、名前やHPバー・中央バナーに極力被らない安全領域へクランプ
    const rawX = p.cx + (sameCnt % 2 === 0 ? 12 : -12);
    const rawY = p.bottom - 14 - sameCnt * 13;
    const clampedX = Math.max(40, Math.min(w - 40, rawX));
    const clampedY = Math.max(24, Math.min(h - 10, rawY));

    if (popups.length >= MAX_POPUPS) popups.shift();
    popups.push({
      domId: targetDomId,
      x: clampedX,
      y: clampedY,
      text: text,
      color: color || '#ffffff',
      size: isBig ? 14 : 11.5,
      life: 0,
      maxLife: isBig ? 0.68 : 0.52
    });
  }

  function updateAndDraw(dt) {
    if (!ctx || w <= 0 || h <= 0) return;
    ctx.clearRect(0, 0, w, h);

    // 弧線ターゲットビーム
    for (let i = beams.length - 1; i >= 0; i--) {
      const b = beams[i];
      b.life += dt;
      if (b.life >= b.maxLife) {
        beams.splice(i, 1);
        continue;
      }
      const t = b.life / b.maxLife;
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * (1 - t * 0.5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.quadraticCurveTo(b.mx, b.my, b.x2, b.y2);
      ctx.stroke();

      const u = Math.min(1, t * 2.1);
      const inv = 1 - u;
      const hx = inv * inv * b.x1 + 2 * inv * u * b.mx + u * u * b.x2;
      const hy = inv * inv * b.y1 + 2 * inv * u * b.my + u * u * b.y2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx, hy, b.width * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 衝撃波リング
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life += dt;
      if (r.life >= r.maxLife) {
        rings.splice(i, 1);
        continue;
      }
      const t = r.life / r.maxLife;
      ctx.save();
      ctx.globalAlpha = (1 - t) * 0.85;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2.2 * (1 - t);
      ctx.beginPath();
      ctx.arc(r.x, r.y, 5 + r.maxR * t, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // パーティクル
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const t = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      ctx.restore();
    }

    // ダメージ・回復・閃きポップアップ（小さく安全に浮上）
    for (let i = popups.length - 1; i >= 0; i--) {
      const pop = popups[i];
      pop.life += dt;
      if (pop.life >= pop.maxLife) {
        popups.splice(i, 1);
        continue;
      }
      const t = pop.life / pop.maxLife;
      const py = Math.max(16, pop.y - t * 14);
      ctx.save();
      ctx.globalAlpha = t > 0.65 ? (1 - t) / 0.35 : 0.96;
      ctx.font = '900 ' + pop.size + 'px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = 'rgba(7, 10, 20, 0.94)';
      ctx.strokeText(pop.text, pop.x, py);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, py);
      ctx.restore();
    }
  }

  HW.VFX = {
    attach: attach,
    resize: resize,
    clear: clear,
    spawnAttack: spawnAttack,
    spawnHeal: spawnHeal,
    spawnPopup: spawnPopup,
    updateAndDraw: updateAndDraw
  };
})();
