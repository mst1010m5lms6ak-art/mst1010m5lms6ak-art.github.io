(function () {
  'use strict';

  const Hacha = window.Hacha;

  /*
   * HTML5 Canvas 2D 戦闘エフェクトエンジン
   * - 攻撃弾道・衝撃波・回復リング・ダメージ数値（名前帯に被らない位置設計）・乱入フラッシュ・共鳴チェイン光輪
   */
  function createVfxLayer() {
    let canvas = null;
    let ctx = null;
    let width = 300;
    let height = 220;
    const effects = [];
    const floats = [];

    function attach(canvasEl) {
      canvas = canvasEl;
      if (!canvas) return;
      ctx = canvas.getContext('2d');
      resize();
    }

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function getUnitPoint(side, slotIdx) {
      /* 敵(上0.03..0.44)・中央イベント帯(0.45..0.55)・味方(下0.56..0.97) */
      const col = slotIdx % 2;
      const row = Math.floor(slotIdx / 2);
      const x = width * (col === 0 ? 0.255 : 0.745);
      const y = side === 'enemy'
        ? height * (row === 0 ? 0.14 : 0.35)
        : height * (row === 0 ? 0.67 : 0.88);
      return { x, y };
    }

    function spawnBeam(fromSide, fromSlot, toSide, toSlot, color) {
      const p1 = getUnitPoint(fromSide, fromSlot);
      const p2 = getUnitPoint(toSide, toSlot);
      effects.push({
        type: 'beam',
        x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
        color: color || '#48d6ff',
        t: 0, dur: 0.26
      });
      spawnBurst(p2.x, p2.y, color || '#48d6ff', 9);
    }

    function spawnBurst(x, y, color, count) {
      const particles = [];
      for (let i = 0; i < (count || 10); i++) {
        const a = (Math.PI * 2 * i) / (count || 10) + Math.random() * 0.4;
        const sp = 28 + Math.random() * 64;
        particles.push({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 1.8 + Math.random() * 2.2 });
      }
      effects.push({ type: 'burst', x, y, color: color || '#ffd15c', particles, t: 0, dur: 0.34 });
    }

    function spawnRing(side, slotIdx, color) {
      const p = getUnitPoint(side, slotIdx);
      effects.push({ type: 'ring', x: p.x, y: p.y, color: color || '#44e69a', t: 0, dur: 0.38 });
    }

    function spawnChainNova() {
      /* テキストバナーは専用中央レーン(.battle-mid-lane)に分離し、Canvasは純粋な光輪と粒子のみ描画 */
      effects.push({ type: 'chain_nova', t: 0, dur: 0.75 });
      spawnBurst(width * 0.5, height * 0.50, '#ffd15c', 24);
      spawnBurst(width * 0.5, height * 0.50, '#48d6ff', 18);
    }

    function spawnIntrusionWave() {
      effects.push({ type: 'intrusion', t: 0, dur: 0.7 });
    }

    function spawnFloatText(side, slotIdx, text, color, isBig) {
      const p = getUnitPoint(side, slotIdx);
      /* ユニット名行(.bu-head)を避け、ゲージ〜下部帯の右寄りにスッキリ浮かせる */
      floats.push({
        x: p.x + 18 + (Math.random() - 0.5) * 18,
        y: p.y + 8,
        text,
        color: color || '#ffffff',
        big: !!isBig,
        t: 0,
        dur: 0.62
      });
    }

    function clear() {
      effects.length = 0;
      floats.length = 0;
      if (ctx) ctx.clearRect(0, 0, width, height);
    }

    function step(dt) {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = effects.length - 1; i >= 0; i--) {
        const ef = effects[i];
        ef.t += dt;
        const p = Math.min(1, ef.t / ef.dur);

        if (ef.type === 'beam') {
          ctx.save();
          ctx.globalAlpha = 1 - p;
          ctx.strokeStyle = ef.color;
          ctx.lineWidth = 4.5 * (1 - p * 0.5);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(ef.x1, ef.y1);
          ctx.lineTo(ef.x1 + (ef.x2 - ef.x1) * Math.min(1, p * 1.9), ef.y1 + (ef.y2 - ef.y1) * Math.min(1, p * 1.9));
          ctx.stroke();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          ctx.restore();
        } else if (ef.type === 'burst') {
          ctx.save();
          ctx.globalAlpha = 1 - p;
          ctx.fillStyle = ef.color;
          ef.particles.forEach((pt) => {
            const px = ef.x + pt.vx * ef.t;
            const py = ef.y + pt.vy * ef.t;
            ctx.beginPath();
            ctx.arc(px, py, pt.r * (1 - p * 0.6), 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        } else if (ef.type === 'ring') {
          ctx.save();
          ctx.globalAlpha = 1 - p;
          ctx.strokeStyle = ef.color;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(ef.x, ef.y, 8 + p * 26, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (ef.type === 'chain_nova') {
          ctx.save();
          const alpha = p < 0.65 ? 0.65 : ((1 - p) / 0.35) * 0.65;
          const grad = ctx.createRadialGradient(width * 0.5, height * 0.5, 6, width * 0.5, height * 0.5, width * 0.6 * Math.min(1, p * 1.8));
          grad.addColorStop(0, 'rgba(255, 224, 102, 0.45)');
          grad.addColorStop(0.55, 'rgba(72, 214, 255, 0.24)');
          grad.addColorStop(1, 'rgba(192, 132, 255, 0)');
          ctx.globalAlpha = alpha;
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        } else if (ef.type === 'intrusion') {
          ctx.save();
          ctx.globalAlpha = (1 - p) * 0.38;
          ctx.fillStyle = '#ff2a55';
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }

        if (ef.t >= ef.dur) effects.splice(i, 1);
      }

      for (let i = floats.length - 1; i >= 0; i--) {
        const fl = floats[i];
        fl.t += dt;
        const p = Math.min(1, fl.t / fl.dur);
        ctx.save();
        ctx.globalAlpha = p < 0.7 ? 1 : (1 - p) / 0.3;
        ctx.font = fl.big ? '900 12.5px sans-serif' : '800 10.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const yy = fl.y - p * 10;
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(6, 10, 22, 0.94)';
        ctx.strokeText(fl.text, fl.x, yy);
        ctx.fillStyle = fl.color;
        ctx.fillText(fl.text, fl.x, yy);
        ctx.restore();

        if (fl.t >= fl.dur) floats.splice(i, 1);
      }
    }

    return {
      attach,
      resize,
      spawnBeam,
      spawnBurst,
      spawnRing,
      spawnChainNova,
      spawnIntrusionWave,
      spawnFloatText,
      clear,
      step
    };
  }

  Hacha.engine.createVfxLayer = createVfxLayer;
})();
