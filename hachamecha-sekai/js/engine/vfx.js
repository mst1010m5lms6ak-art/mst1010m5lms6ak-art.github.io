'use strict';

(function (global) {
  const Kairo = global.Kairo || (global.Kairo = {});
  const Data = Kairo.data;

  // High-impact, zero-illustration 2D Canvas VFX & Tactical Plate Renderer
  class BattleVFX {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.width = 390;
      this.height = 280;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.particles = [];
      this.slashes = [];
      this.beams = [];
      this.rings = [];
      this.floaters = [];
      this.cutin = null;

      this.hitstopMs = 0;
      this.trauma = 0;
      this.shakeDirX = 0;
      this.shakeDirY = 0;
      this.flashAlpha = 0;
      this.flashColor = '#ffffff';
      this.bgPhase = 0;
      this.reducedMotion = false;
    }

    setReducedMotion(val) {
      this.reducedMotion = Boolean(val);
    }

    resize() {
      if (!this.canvas || !this.canvas.parentElement) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      this.width = Math.round(rect.width);
      this.height = Math.round(rect.height);
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    clearAll() {
      this.particles.length = 0;
      this.slashes.length = 0;
      this.beams.length = 0;
      this.rings.length = 0;
      this.floaters.length = 0;
      this.cutin = null;
      this.trauma = 0;
      this.hitstopMs = 0;
    }

    addTrauma(amount, dirX, dirY) {
      if (this.reducedMotion) return;
      this.trauma = Math.min(1.0, this.trauma + amount);
      this.shakeDirX = dirX || 0;
      this.shakeDirY = dirY || 0;
    }

    triggerHitstop(ms) {
      if (this.reducedMotion) return;
      this.hitstopMs = Math.max(this.hitstopMs, ms);
    }

    triggerScreenFlash(color, alpha) {
      if (this.reducedMotion) return;
      this.flashColor = color || '#ffffff';
      this.flashAlpha = Math.max(this.flashAlpha, alpha || 0.25);
    }

    spawnCutin(actorName, skillName, realmId, isEnemy) {
      const realm = Data.REALMS[realmId] || Data.REALMS.astral;
      this.cutin = {
        actorName,
        skillName,
        color: realm.color,
        kanji: realm.kanji,
        isEnemy: Boolean(isEnemy),
        life: 0,
        maxLife: 0.78
      };
      this.triggerScreenFlash(realm.color, 0.26);
    }

    spawnAttackVFX(realmId, fromPos, toPos, isCrit, isUlt) {
      const realm = Data.REALMS[realmId] || Data.REALMS.arcadia;
      const color = realm.color;
      const dx = toPos.x - fromPos.x;
      const dy = toPos.y - fromPos.y;
      const len = Math.hypot(dx, dy) || 1;

      if (isUlt) {
        this.triggerHitstop(72);
        this.addTrauma(0.68, dx / len, dy / len);
      } else if (isCrit) {
        this.triggerHitstop(48);
        this.addTrauma(0.42, dx / len, dy / len);
      } else {
        this.addTrauma(0.18, dx / len, dy / len);
      }

      // Realm-themed pure geometric VFX (no illustrations)
      if (realmId === 'arcadia') {
        const count = isUlt ? 3 : isCrit ? 2 : 1;
        for (let i = 0; i < count; i++) {
          this.slashes.push({
            x: toPos.x + (Math.random() - 0.5) * 18,
            y: toPos.y + (Math.random() - 0.5) * 14,
            angle: -0.75 + i * 0.95 + (Math.random() - 0.5) * 0.3,
            radius: isUlt ? 54 : 36,
            color,
            life: 0,
            maxLife: 0.28
          });
        }
      } else if (realmId === 'cyber') {
        this.beams.push({
          x1: fromPos.x, y1: fromPos.y,
          x2: toPos.x, y2: toPos.y,
          color,
          width: isUlt ? 7 : isCrit ? 4.5 : 2.8,
          life: 0,
          maxLife: 0.22
        });
        this.rings.push({ x: toPos.x, y: toPos.y, r: 8, maxR: isUlt ? 56 : 34, color, sides: 4, life: 0, maxLife: 0.28 });
      } else if (realmId === 'yokai') {
        this.rings.push({ x: toPos.x, y: toPos.y, r: 6, maxR: isUlt ? 64 : 38, color, sides: 6, life: 0, maxLife: 0.34 });
        this.slashes.push({ x: toPos.x, y: toPos.y, angle: 0.5, radius: isUlt ? 48 : 30, color: '#fb7185', life: 0, maxLife: 0.26 });
      } else if (realmId === 'steam') {
        this.rings.push({ x: toPos.x, y: toPos.y, r: 10, maxR: isUlt ? 62 : 40, color, sides: 8, life: 0, maxLife: 0.32 });
        this.beams.push({ x1: fromPos.x, y1: fromPos.y, x2: toPos.x, y2: toPos.y, color: '#6ee7b7', width: isUlt ? 5 : 3, life: 0, maxLife: 0.18 });
      } else {
        // Astral
        this.beams.push({ x1: toPos.x, y1: 0, x2: toPos.x, y2: toPos.y, color, width: isUlt ? 12 : 6, life: 0, maxLife: 0.32 });
        this.rings.push({ x: toPos.x, y: toPos.y, r: 6, maxR: isUlt ? 70 : 42, color: '#e879f9', sides: 0, life: 0, maxLife: 0.36 });
      }

      // Impact geometric shards
      const pCount = this.reducedMotion ? 4 : (isUlt ? 22 : isCrit ? 14 : 8);
      for (let i = 0; i < pCount; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 45 + Math.random() * (isUlt ? 190 : 120);
        this.particles.push({
          x: toPos.x,
          y: toPos.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: 2.2 + Math.random() * (isCrit || isUlt ? 4.5 : 3),
          color: i % 3 === 0 ? '#f8fafc' : color,
          shape: realmId === 'cyber' ? 'sq' : realmId === 'yokai' ? 'dia' : 'tri',
          rot: Math.random() * Math.PI,
          life: 0,
          maxLife: 0.25 + Math.random() * 0.24
        });
      }
    }

    spawnHealVFX(pos) {
      this.rings.push({ x: pos.x, y: pos.y, r: 6, maxR: 34, color: '#34d399', sides: 0, life: 0, maxLife: 0.36 });
      const pCount = this.reducedMotion ? 3 : 8;
      for (let i = 0; i < pCount; i++) {
        this.particles.push({
          x: pos.x + (Math.random() - 0.5) * 38,
          y: pos.y + 12,
          vx: (Math.random() - 0.5) * 20,
          vy: -(40 + Math.random() * 50),
          size: 3 + Math.random() * 2.5,
          color: i % 2 === 0 ? '#6ee7b7' : '#fef08a',
          shape: 'dia',
          rot: 0,
          life: 0,
          maxLife: 0.45
        });
      }
    }

    spawnDefeatVFX(pos, realmId) {
      const realm = Data.REALMS[realmId] || Data.REALMS.astral;
      this.rings.push({ x: pos.x, y: pos.y, r: 10, maxR: 64, color: realm.color, sides: 6, life: 0, maxLife: 0.42 });
      const pCount = this.reducedMotion ? 5 : 18;
      for (let i = 0; i < pCount; i++) {
        const ang = (i / pCount) * Math.PI * 2 + Math.random() * 0.25;
        const spd = 55 + Math.random() * 145;
        this.particles.push({
          x: pos.x,
          y: pos.y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: 3 + Math.random() * 3.5,
          color: i % 2 === 0 ? '#f8fafc' : realm.color,
          shape: 'dia',
          rot: Math.random() * Math.PI,
          life: 0,
          maxLife: 0.36 + Math.random() * 0.2
        });
      }
    }

    spawnDamageNumber(pos, value, opts) {
      const o = opts || {};
      const txt = o.text || (o.isHeal ? `+${Math.round(value).toLocaleString()}` : Math.round(value).toLocaleString());
      // Offset cleanly above unit plate so numbers never obscure names or HP bars
      const laneIdx = this.floaters.length % 3;
      const laneOffsetX = (laneIdx - 1) * 18;
      const laneOffsetY = laneIdx * 9;
      const baseOffsetY = o.isEnemy === false ? -44 : -42;
      this.floaters.push({
        x: Math.max(36, Math.min(this.width - 36, pos.x + laneOffsetX + (Math.random() - 0.5) * 10)),
        y: Math.max(24, pos.y + baseOffsetY - laneOffsetY),
        vx: (Math.random() - 0.5) * 24,
        vy: o.isHeal ? -38 : -(54 + (o.isCrit ? 18 : 0)),
        gravity: o.isHeal ? 18 : 135,
        text: txt,
        tag: o.tag || (o.isCrit ? 'CRIT!' : o.isWeak ? 'WEAK' : ''),
        color: o.color || (o.isHeal ? '#34d399' : o.isCrit ? '#fbbf24' : o.isWeak ? '#f472b6' : '#f1f5f9'),
        scale: o.isCrit ? 1.32 : o.isUlt ? 1.2 : 1.0,
        life: 0,
        maxLife: o.isCrit ? 0.85 : 0.66
      });
    }

    computeUnitPositions(allies, enemies) {
      const w = this.width;
      const h = this.height;
      const enemyY = h * 0.31;
      const allyY = h * 0.76;

      const eCount = Math.max(1, enemies.length);
      const eSpacing = Math.min(130, (w - 20) / eCount);
      const eStart = w / 2 - ((eCount - 1) * eSpacing) / 2;
      enemies.forEach((u, idx) => {
        u.baseX = eStart + idx * eSpacing;
        u.baseY = enemyY;
      });

      const aCount = Math.max(1, allies.length);
      const aSpacing = Math.min(93, (w - 10) / aCount);
      const aStart = w / 2 - ((aCount - 1) * aSpacing) / 2;
      allies.forEach((u, idx) => {
        u.baseX = aStart + idx * aSpacing;
        u.baseY = allyY;
      });
    }

    update(dtSec, battle) {
      this.bgPhase += dtSec * 0.6;
      if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dtSec * 1.9);

      if (this.hitstopMs > 0) {
        this.hitstopMs = Math.max(0, this.hitstopMs - dtSec * 1000);
        return true; // frozen frame
      }

      if (this.trauma > 0) this.trauma = Math.max(0, this.trauma - dtSec * 2.4);

      // Update unit plate spring motion & ghost HP bars
      const allUnits = [...(battle?.allies || []), ...(battle?.enemies || [])];
      for (const u of allUnits) {
        u.animOffsetX += (0 - u.animOffsetX) * Math.min(1, dtSec * 14);
        u.animOffsetY += (0 - u.animOffsetY) * Math.min(1, dtSec * 14);
        u.hitFlash = Math.max(0, (u.hitFlash || 0) - dtSec * 5.2);
        const targetRatio = u.maxHp > 0 ? Math.max(0, u.hp / u.maxHp) : 0;
        if (u.ghostHpRatio === undefined) u.ghostHpRatio = targetRatio;
        if (u.ghostHpRatio > targetRatio) {
          u.ghostHpRatio = Math.max(targetRatio, u.ghostHpRatio - dtSec * 0.65);
        } else {
          u.ghostHpRatio = targetRatio;
        }
      }

      // Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life += dtSec;
        if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.rot += dtSec * 6;
      }

      for (let i = this.slashes.length - 1; i >= 0; i--) {
        this.slashes[i].life += dtSec;
        if (this.slashes[i].life >= this.slashes[i].maxLife) this.slashes.splice(i, 1);
      }
      for (let i = this.beams.length - 1; i >= 0; i--) {
        this.beams[i].life += dtSec;
        if (this.beams[i].life >= this.beams[i].maxLife) this.beams.splice(i, 1);
      }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        this.rings[i].life += dtSec;
        if (this.rings[i].life >= this.rings[i].maxLife) this.rings.splice(i, 1);
      }
      for (let i = this.floaters.length - 1; i >= 0; i--) {
        const f = this.floaters[i];
        f.life += dtSec;
        if (f.life >= f.maxLife) { this.floaters.splice(i, 1); continue; }
        f.x += f.vx * dtSec;
        f.y += f.vy * dtSec;
        f.vy += f.gravity * dtSec;
      }

      if (this.cutin) {
        this.cutin.life += dtSec;
        if (this.cutin.life >= this.cutin.maxLife) this.cutin = null;
      }

      return false;
    }

    drawRoundedRect(ctx, x, y, w, h, r) {
      const rad = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.lineTo(x + w - rad, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
      ctx.lineTo(x + w, y + h - rad);
      ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
      ctx.lineTo(x + rad, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
      ctx.lineTo(x, y + rad);
      ctx.quadraticCurveTo(x, y, x + rad, y);
      ctx.closePath();
    }

    render(battle) {
      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      if (!ctx || w < 10 || h < 10) return;

      const stageRealm = Data.REALMS[battle?.stage?.realm] || Data.REALMS.astral;

      ctx.save();
      // Trauma-based directional camera shake
      if (this.trauma > 0 && !this.reducedMotion) {
        const mag = this.trauma * this.trauma * 10;
        const sx = (Math.random() * 2 - 1) * mag + this.shakeDirX * mag * 0.45;
        const sy = (Math.random() * 2 - 1) * mag + this.shakeDirY * mag * 0.45;
        ctx.translate(sx, sy);
      }

      // 1. Atmospheric realm-tinted dark sci-fi fantasy battlefield grid
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#0f1421');
      bgGrad.addColorStop(0.5, '#131928');
      bgGrad.addColorStop(1, '#0d111a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle horizon perspective lines
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      const midY = h * 0.51;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      // Ambient realm energy ring at center
      ctx.save();
      ctx.translate(w / 2, midY);
      ctx.strokeStyle = stageRealm.colorSoft;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.34, h * 0.14, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating dashed inner geometric circle
      ctx.save();
      ctx.scale(1, 0.42);
      ctx.rotate(this.bgPhase * 0.35);
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(w * 0.24, 96), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      ctx.restore();

      // 2. Unit tactical plates (zero illustrations - typography + geometry + live gauges)
      if (battle) {
        this.computeUnitPositions(battle.allies, battle.enemies);
        battle.enemies.forEach((u) => this.drawUnitPlate(ctx, u, true));
        battle.allies.forEach((u) => this.drawUnitPlate(ctx, u, false));
      }

      // 3. Geometric VFX layers
      this.beams.forEach((b) => {
        const t = b.life / b.maxLife;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = b.width * (1 - t * 0.5);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.lineTo(b.x2, b.y2);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, b.width * 0.35);
        ctx.stroke();
        ctx.restore();
      });

      this.slashes.forEach((s) => {
        const t = s.life / s.maxLife;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.angle);
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = (1 - t) * 5.5 + 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, s.radius * (0.65 + t * 0.45), -0.95, 0.95);
        ctx.stroke();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = Math.max(1, (1 - t) * 2.5);
        ctx.beginPath();
        ctx.arc(0, 0, s.radius * (0.65 + t * 0.45), -0.65, 0.65);
        ctx.stroke();
        ctx.restore();
      });

      this.rings.forEach((r) => {
        const t = r.life / r.maxLife;
        const rad = r.r + (r.maxR - r.r) * (1 - Math.pow(1 - t, 3));
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2.5 * (1 - t) + 0.8;
        ctx.beginPath();
        if (r.sides >= 3) {
          for (let i = 0; i <= r.sides; i++) {
            const a = (i / r.sides) * Math.PI * 2 + t * 0.8;
            const px = Math.cos(a) * rad;
            const py = Math.sin(a) * rad;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
        } else {
          ctx.arc(0, 0, rad, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.restore();
      });

      this.particles.forEach((p) => {
        const t = p.life / p.maxLife;
        const sz = p.size * (1 - t * 0.7);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 1 - t;
        ctx.fillStyle = p.color;
        if (p.shape === 'sq') {
          ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
        } else if (p.shape === 'dia') {
          ctx.beginPath();
          ctx.moveTo(0, -sz * 1.3);
          ctx.lineTo(sz, 0);
          ctx.lineTo(0, sz * 1.3);
          ctx.lineTo(-sz, 0);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(0, -sz * 1.2);
          ctx.lineTo(sz, sz);
          ctx.lineTo(-sz, sz);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      });

      // 4. Kinetic Damage Typography
      this.floaters.forEach((f) => {
        const t = f.life / f.maxLife;
        const popScale = t < 0.14 ? 0.7 + (t / 0.14) * 0.65 : 1.35 - Math.min(0.35, (t - 0.14) * 0.6);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.scale(popScale * f.scale, popScale * f.scale);
        ctx.globalAlpha = t > 0.68 ? Math.max(0, 1 - (t - 0.68) / 0.32) : 1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (f.tag) {
          ctx.font = '800 8px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
          ctx.fillStyle = '#0d111a';
          ctx.fillText(f.tag, 1, -11);
          ctx.fillStyle = f.color;
          ctx.fillText(f.tag, 0, -12);
        }
        ctx.font = '900 13px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(11, 14, 20, 0.92)';
        ctx.strokeText(f.text, 0, 0);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, 0, 0);
        ctx.restore();
      });

      // 5. Ultimate Cinematic Typography Banner
      if (this.cutin) {
        const c = this.cutin;
        const t = c.life / c.maxLife;
        const alpha = t < 0.15 ? t / 0.15 : t > 0.78 ? (1 - t) / 0.22 : 1;
        const slide = t < 0.18 ? (1 - t / 0.18) * (c.isEnemy ? -60 : 60) : 0;
        const bandY = h * 0.49;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(10, 13, 22, 0.88)';
        ctx.fillRect(0, bandY - 22, w, 44);
        ctx.fillStyle = c.color;
        ctx.fillRect(0, bandY - 22, w, 2);
        ctx.fillRect(0, bandY + 20, w, 2);

        ctx.translate(slide, 0);
        ctx.textAlign = 'center';
        ctx.font = '700 10px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
        ctx.fillStyle = c.color;
        ctx.fillText(`[ ${c.kanji} ]  ${c.actorName}  //  ${c.isEnemy ? '敵技発動' : '奥義解放'}`, w / 2, bandY - 6);
        ctx.font = '900 15px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(c.skillName, w / 2, bandY + 11);
        ctx.restore();
      }

      // 6. Screen Flash
      if (this.flashAlpha > 0.01) {
        ctx.fillStyle = this.flashColor;
        ctx.globalAlpha = this.flashAlpha;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.restore();
    }

    fitText(ctx, text, maxWidth) {
      if (ctx.measureText(text).width <= maxWidth) return text;
      let t = text;
      while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
        t = t.slice(0, -1);
      }
      return t + '…';
    }

    drawUnitPlate(ctx, u, isEnemy) {
      const realm = Data.REALMS[u.realm] || Data.REALMS.arcadia;
      const plateW = isEnemy ? (u.isBoss ? 142 : 108) : 88;
      const plateH = isEnemy ? (u.isBoss ? 70 : 62) : 64;
      const x = (u.baseX || 0) + (u.animOffsetX || 0) - plateW / 2;
      const y = (u.baseY || 0) + (u.animOffsetY || 0) - plateH / 2;
      const alive = u.hp > 0;

      ctx.save();
      ctx.globalAlpha = alive ? 1 : 0.28;

      // Plate backdrop
      this.drawRoundedRect(ctx, x, y, plateW, plateH, 8);
      ctx.fillStyle = u.isBoss ? 'rgba(32, 20, 38, 0.94)' : 'rgba(22, 28, 42, 0.94)';
      ctx.fill();

      // Border with realm color (glows when SP full)
      ctx.lineWidth = u.sp >= 100 && !isEnemy ? 2.2 : (u.isBoss ? 2 : 1.2);
      ctx.strokeStyle = u.hitFlash > 0.2 ? '#ffffff' : (u.sp >= 100 && !isEnemy ? '#fde047' : realm.color);
      ctx.stroke();

      // Top accent strip
      ctx.fillStyle = realm.color;
      ctx.fillRect(x + 8, y + 1, plateW - 16, 2.5);

      // Pure geometric sigil box (no character illustration)
      const sigX = x + 6;
      const sigY = y + 8;
      this.drawRoundedRect(ctx, sigX, sigY, 20, 20, 4);
      ctx.fillStyle = realm.colorSoft;
      ctx.fill();
      ctx.strokeStyle = realm.color;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 11px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(u.sigil || realm.kanji, sigX + 10, sigY + 10.5);

      // Name & tag with accurate pixel width fitting (no awkward clipping)
      const textX = sigX + 24;
      const maxTextW = plateW - 34;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e6edf7';
      ctx.font = '700 9px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
      const fittedName = this.fitText(ctx, u.name, maxTextW);
      ctx.fillText(fittedName, textX, sigY + 6.5);

      ctx.fillStyle = realm.color;
      ctx.font = '700 8px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
      const hpPct = u.maxHp > 0 ? Math.ceil((u.hp / u.maxHp) * 100) : 0;
      const subTag = isEnemy ? (u.isBoss ? `BOSS ${hpPct}%` : `${realm.code} ${hpPct}%`) : `Lv.${u.level} ${hpPct}%`;
      ctx.fillText(this.fitText(ctx, subTag, maxTextW), textX, sigY + 17);

      // HP Bar + Ghost trailing bar + Shield bar
      const barX = x + 6;
      const barW = plateW - 12;
      const hpY = y + 34;
      const hpH = 6.5;
      const hpRatio = u.maxHp > 0 ? Math.max(0, Math.min(1, u.hp / u.maxHp)) : 0;
      const ghostRatio = Math.max(hpRatio, u.ghostHpRatio || 0);

      ctx.fillStyle = 'rgba(10, 14, 22, 0.9)';
      ctx.fillRect(barX, hpY, barW, hpH);
      // Ghost trailing red/orange bar
      if (ghostRatio > hpRatio) {
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(barX, hpY, barW * ghostRatio, hpH);
      }
      ctx.fillStyle = isEnemy ? '#f43f5e' : (hpRatio < 0.3 ? '#f59e0b' : '#22c55e');
      ctx.fillRect(barX, hpY, barW * hpRatio, hpH);

      // Shield overlay bar
      if (u.shield > 0) {
        const shRatio = Math.min(1, u.shield / u.maxHp);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.fillRect(barX, hpY, barW * shRatio, 2.2);
      }

      // SP Bar (for allies / bosses)
      const spY = hpY + 9;
      ctx.fillStyle = 'rgba(10, 14, 22, 0.85)';
      ctx.fillRect(barX, spY, barW, 3.5);
      ctx.fillStyle = u.sp >= 100 ? '#fde047' : '#a855f7';
      ctx.fillRect(barX, spY, barW * Math.min(1, (u.sp || 0) / 100), 3.5);

      // ATB gauge bar
      const atbY = spY + 5.5;
      ctx.fillStyle = 'rgba(10, 14, 22, 0.75)';
      ctx.fillRect(barX, atbY, barW, 2.5);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(barX, atbY, barW * Math.min(1, (u.atb || 0) / 100), 2.5);

      // Status pill tags (pure text badges anchored below plate to stay clear of floating damage)
      if (alive && u.statuses && u.statuses.length > 0) {
        let sx = x + 4;
        const sy = y + plateH + 2;
        ctx.font = '800 8px -apple-system, BlinkMacSystemFont, "Hiragino Sans", sans-serif';
        ctx.textAlign = 'left';
        for (let i = 0; i < Math.min(4, u.statuses.length); i++) {
          const st = u.statuses[i];
          const label = STATUS_LABELS[st.type];
          if (!label) continue;
          ctx.fillStyle = 'rgba(11, 14, 20, 0.92)';
          ctx.fillRect(sx, sy, 18, 10);
          ctx.fillStyle = label.color;
          ctx.fillText(label.short, sx + 2, sy + 5.5);
          sx += 20;
        }
      }

      // White hit flash overlay
      if (u.hitFlash > 0.05) {
        this.drawRoundedRect(ctx, x, y, plateW, plateH, 8);
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.75, u.hitFlash * 0.75)})`;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  const STATUS_LABELS = {
    burn: { short: '燃', color: '#fb7185' },
    shock: { short: '電', color: '#38bdf8' },
    freeze: { short: '凍', color: '#67e8f9' },
    break: { short: '破', color: '#f59e0b' },
    regen: { short: '癒', color: '#34d399' },
    atkUp: { short: '攻', color: '#fbbf24' },
    defUp: { short: '防', color: '#60a5fa' },
    haste: { short: '速', color: '#2dd4bf' },
    taunt: { short: '挑', color: '#f97316' }
  };

  Kairo.BattleVFX = BattleVFX;
})(window);
