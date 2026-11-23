/* ==========================================================================
   renderer.js - Canvas2D はちゃめちゃ戦闘描画（キャライラスト不使用・軽量高DPI）
   ========================================================================== */
(function (global) {
  'use strict';

  const HS = (global.HS = global.HS || {});
  let bgTime = 0;

  function drawPolygon(ctx, x, y, r, sides, rot) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + (i * Math.PI * 2) / sides;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawUnitToken(ctx, u, isFocused, isSelected, canvasH) {
    const attrCol = HS.CONST.ATTR_MAP[u.attr]?.color || '#ffffff';
    const roleIcon = HS.CONST.ROLE_MAP[u.role]?.short || '★';
    const scaleH = HS.UTIL.clamp((canvasH || 200) / 215, 0.72, 1.08);
    const r = Math.round((u.isBoss ? 22 : 16) * scaleH);

    const lunge = u.actAnim * (u.side === 'ally' ? 14 : -14);
    const jitter = u.hitAnim > 0 ? Math.sin(u.hitAnim * 28) * 4.5 : 0;
    const x = u.x + lunge + jitter;
    const y = u.y;

    ctx.save();
    if (!u.alive) ctx.globalAlpha = 0.22;

    // ターゲット・選択リング
    if (u.alive && (isFocused || isSelected)) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = isFocused ? '#ff3898' : '#2ee6ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 挑発オーラ
    if (u.alive && u.buffs?.taunt) {
      ctx.beginPath();
      ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffd633';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 幾何学エンブレム本体（ロール別に多角形を変化）
    const sides = u.role === 'tank' ? 6 : u.role === 'dealer' ? 4 : u.role === 'supporter' ? 5 : 8;
    const rot = bgTime * (u.side === 'ally' ? 0.5 : -0.6) + u.slotIdx;
    drawPolygon(ctx, x, y, r, sides, rot);
    ctx.fillStyle = u.hitAnim > 0.45 ? '#ffffff' : 'rgba(20, 14, 42, 0.92)';
    ctx.fill();
    ctx.lineWidth = u.isBoss ? 2.5 : 2;
    ctx.strokeStyle = attrCol;
    ctx.stroke();

    // 内側コア
    drawPolygon(ctx, x, y, r * 0.54, sides, -rot * 1.4);
    ctx.fillStyle = attrCol;
    ctx.globalAlpha = u.alive ? 0.28 : 0.08;
    ctx.fill();
    ctx.globalAlpha = u.alive ? 1 : 0.25;

    // 記号テキスト
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(10, Math.round((u.isBoss ? 13 : 11) * scaleH))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(roleIcon, x, y + 0.5);

    // 名前ラベル（長めの敵名も極力省略せず表示）
    const shortName = u.name.length > 8 ? u.name.slice(0, 8) + '…' : u.name;
    ctx.font = shortName.length > 6 ? '700 8.5px sans-serif' : '700 9.5px sans-serif';
    ctx.fillStyle = u.side === 'ally' ? '#e8e4ff' : '#ffd1e0';
    ctx.fillText(shortName, x, y - r - 6);

    // HPバー・障壁バー・ATBバー
    const bw = Math.round((u.isBoss ? 54 : 40) * scaleH);
    const bx = x - bw / 2;
    const by = y + r + 4;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(bx, by, bw, 4.5);
    const hpRate = HS.UTIL.clamp(u.hp / u.maxHp, 0, 1);
    ctx.fillStyle = u.side === 'ally' ? '#52f29b' : '#ff4d6d';
    ctx.fillRect(bx, by, bw * hpRate, 4.5);

    if (u.shield > 0) {
      const shRate = HS.UTIL.clamp(u.shield / u.maxHp, 0, 1);
      ctx.fillStyle = '#2ee6ff';
      ctx.fillRect(bx, by, bw * shRate, 2.2);
    }

    // 行動ゲージ
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(bx, by + 5.5, bw, 2.2);
    ctx.fillStyle = '#ffd633';
    ctx.fillRect(bx, by + 5.5, bw * HS.UTIL.clamp((u.gauge || 0) / 100, 0, 1), 2.2);

    ctx.restore();
  }

  function render(canvas, dt) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;

    const dpr = Math.min(2, global.devicePixelRatio || 1);
    const tw = Math.floor(rect.width * dpr);
    const th = Math.floor(rect.height * dpr);
    if (canvas.width !== tw || canvas.height !== th) {
      canvas.width = tw;
      canvas.height = th;
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const eng = HS.COMBAT.engine;
    bgTime += (dt || 0.016) * (eng.anomaly ? 2.8 : 1.0);

    // 画面揺れ
    if (eng.shake > 0) {
      ctx.translate(HS.UTIL.rand(-eng.shake, eng.shake), HS.UTIL.rand(-eng.shake, eng.shake));
    }

    // カオス背景グラデーション
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (eng.anomaly) {
      grad.addColorStop(0, '#2a0d3d');
      grad.addColorStop(0.5, '#12082b');
      grad.addColorStop(1, '#3b0b2d');
    } else {
      grad.addColorStop(0, '#130d2b');
      grad.addColorStop(1, '#090714');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 回転カオス渦巻き＆遠近グリッド
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.strokeStyle = eng.anomaly ? 'rgba(255, 56, 152, 0.25)' : 'rgba(139, 92, 246, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      ctx.save();
      ctx.rotate(bgTime * (i % 2 === 0 ? 0.35 : -0.25));
      drawPolygon(ctx, 0, 0, i * (Math.min(w, h) * 0.17), 5 + i, 0);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 遠近カオスフロア線
    ctx.strokeStyle = 'rgba(46, 230, 255, 0.10)';
    ctx.lineWidth = 1;
    const horizon = h * 0.28;
    for (let i = 0; i < 6; i++) {
      const y = horizon + ((h - horizon) * ((i + (bgTime * 0.4) % 1) / 6));
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // ユニット座標配置（狭い端末でも上下ラベルとバーが重ならない間隔を確保）
    const allyCount = eng.allies.length;
    const hasRepeatBar = !!eng.repeatSession;
    const topSafeY = 0.35;
    const botSafeY = hasRepeatBar ? 0.72 : 0.77;
    eng.allies.forEach((a, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      a.x = w * (col === 0 ? 0.30 : 0.14);
      a.y = h * (allyCount <= 2 ? 0.56 : row === 0 ? topSafeY : botSafeY);
    });

    const enCount = eng.enemies.length;
    eng.enemies.forEach((e, i) => {
      if (enCount === 1) {
        e.x = w * 0.76; e.y = h * 0.56;
      } else if (enCount === 2) {
        e.x = w * (i === 0 ? 0.69 : 0.83);
        e.y = h * (i === 0 ? topSafeY : botSafeY);
      } else {
        const xs = [0.65, 0.84, 0.70];
        const ys = [topSafeY, 0.56, botSafeY];
        e.x = w * (xs[i] || 0.78);
        e.y = h * (ys[i] || 0.56);
      }
    });

    // ユニット描画
    for (const a of eng.allies) {
      drawUnitToken(ctx, a, false, a.cid === eng.selectedAllyId, h);
    }
    for (const e of eng.enemies) {
      drawUnitToken(ctx, e, e.cid === eng.focusedEnemyId, false, h);
    }

    // 戦闘エフェクト描画
    for (const fx of eng.vfx) {
      const p = 1 - fx.life / fx.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.strokeStyle = fx.color;
      ctx.fillStyle = fx.color;
      if (fx.type === 'beam') {
        ctx.lineWidth = 6 * (1 - p) + 1;
        ctx.beginPath();
        ctx.moveTo(fx.x1, fx.y1);
        ctx.lineTo(fx.x2, fx.y2);
        ctx.stroke();
      } else if (fx.type === 'meteor') {
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(fx.x2 - 40 * (1 - p), fx.y2 - 70 * (1 - p));
        ctx.lineTo(fx.x2, fx.y2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(fx.x2, fx.y2, 26 * p, 0, Math.PI * 2);
        ctx.stroke();
      } else if (fx.type === 'heal' || fx.type === 'buff') {
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(fx.x2, fx.y2, 12 + 24 * p, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // カオス斬撃クロス
        ctx.lineWidth = 3;
        const s = 18 * p + 6;
        ctx.beginPath();
        ctx.moveTo(fx.x2 - s, fx.y2 - s);
        ctx.lineTo(fx.x2 + s, fx.y2 + s);
        ctx.moveTo(fx.x2 + s, fx.y2 - s);
        ctx.lineTo(fx.x2 - s, fx.y2 + s);
        ctx.stroke();
      }
      ctx.restore();
    }

    // フローティング数値
    for (const pop of eng.popups) {
      ctx.save();
      ctx.globalAlpha = HS.UTIL.clamp(pop.life / pop.maxLife, 0, 1);
      ctx.font = pop.big ? '900 14px sans-serif' : '800 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    }

    // フラッシュ
    if (eng.flash) {
      ctx.fillStyle = eng.flash.color;
      ctx.globalAlpha = eng.flash.alpha;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  HS.RENDERER = { render };
})(window);
