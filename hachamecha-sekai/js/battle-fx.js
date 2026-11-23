(function (global) {
  "use strict";
  const HS = (global.HS = global.HS || {});

  let canvas = null;
  let ctx = null;
  let rafId = null;
  let particles = [];
  let slashes = [];
  let floats = [];
  let flashes = [];
  let lastTs = 0;

  function attach(el) {
    canvas = el;
    if (!canvas) {
      ctx = null;
      return;
    }
    ctx = canvas.getContext("2d");
    resize();
    if (!rafId) {
      lastTs = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  function detach() {
    canvas = null;
    ctx = null;
    particles = [];
    slashes = [];
    floats = [];
    flashes = [];
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function getUnitCenter(unitDomId) {
    if (!canvas) return { x: 160, y: 80 };
    const crect = canvas.getBoundingClientRect();
    const uel = document.getElementById(unitDomId);
    if (!uel) return { x: crect.width * 0.5, y: crect.height * 0.5 };
    const urect = uel.getBoundingClientRect();
    return {
      x: urect.left - crect.left + urect.width * 0.5,
      y: urect.top - crect.top + urect.height * 0.5
    };
  }

  function pickNonOverlappingPos(baseX, baseY) {
    let x = baseX + (Math.random() - 0.5) * 20;
    let y = baseY - 10;
    for (let k = 0; k < 4; k++) {
      const clash = floats.some((f) => Math.abs(f.x - x) < 36 && Math.abs(f.y - y) < 15);
      if (!clash) break;
      y -= 15;
    }
    return { x, y };
  }

  function spawnHit(fromDomId, toDomId, color, valText, isCrit, tag) {
    if (!canvas) return;
    const a = getUnitCenter(fromDomId);
    const b = getUnitCenter(toDomId);
    slashes.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, color, life: 0.24, maxLife: 0.24, width: isCrit ? 4.5 : 2.8 });
    const count = isCrit ? 14 : 8;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = (isCrit ? 90 : 60) + Math.random() * 90;
      particles.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: isCrit ? 3.4 : 2.3,
        color: i % 3 === 0 ? "#ffffff" : color,
        life: 0.32 + Math.random() * 0.16,
        maxLife: 0.48
      });
    }
    const pos = pickNonOverlappingPos(b.x, b.y);
    floats.push({
      x: pos.x,
      y: pos.y,
      vy: isCrit ? -38 : -28,
      text: valText,
      sub: tag || "",
      color: isCrit ? "#ffdf4d" : color,
      size: isCrit ? 15 : 12,
      life: 0.65,
      maxLife: 0.65
    });
  }

  function spawnHeal(toDomId, valText) {
    if (!canvas) return;
    const b = getUnitCenter(toDomId);
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: b.x + (Math.random() - 0.5) * 26,
        y: b.y + 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -45 - Math.random() * 45,
        r: 2.5,
        color: "#6eff5c",
        life: 0.45,
        maxLife: 0.45
      });
    }
    const pos = pickNonOverlappingPos(b.x, b.y);
    floats.push({
      x: pos.x,
      y: pos.y,
      vy: -26,
      text: "+" + valText,
      sub: "",
      color: "#6eff5c",
      size: 12,
      life: 0.6,
      maxLife: 0.6
    });
  }

  function spawnChaosFlash(color, bannerText) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    flashes.push({ color: color || "#ff3d9a", life: 0.42, maxLife: 0.42 });
    if (bannerText) {
      // Remove previous banner float to prevent overlapping text in center
      floats = floats.filter((f) => !f.isBanner);
      floats.push({
        x: rect.width * 0.5,
        y: rect.height * 0.52,
        vy: -8,
        text: bannerText,
        sub: "",
        color: color || "#ffd54a",
        size: 15,
        life: 0.9,
        maxLife: 0.9,
        isBanner: true
      });
    }
  }

  function loop(ts) {
    if (!canvas || !ctx) {
      rafId = null;
      return;
    }
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    resize();

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Flashes
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i];
      f.life -= dt;
      if (f.life <= 0) {
        flashes.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = (f.life / f.maxLife) * 0.34;
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.restore();
    }

    // Slashes / beams
    for (let i = slashes.length - 1; i >= 0; i--) {
      const s = slashes[i];
      s.life -= dt;
      if (s.life <= 0) {
        slashes.splice(i, 1);
        continue;
      }
      const p = s.life / s.maxLife;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * p;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Floating numbers
    for (let i = floats.length - 1; i >= 0; i--) {
      const fl = floats[i];
      fl.life -= dt;
      if (fl.life <= 0) {
        floats.splice(i, 1);
        continue;
      }
      fl.y += fl.vy * dt;
      fl.vy *= 0.96;
      const alpha = Math.min(1, (fl.life / fl.maxLife) * 1.6);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `900 ${fl.size}px -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "rgba(8,5,18,0.92)";
      ctx.strokeText(fl.text, fl.x, fl.y);
      ctx.fillStyle = fl.color;
      ctx.fillText(fl.text, fl.x, fl.y);
      if (fl.sub) {
        ctx.font = "900 9px -apple-system, sans-serif";
        ctx.strokeText(fl.sub, fl.x, fl.y - fl.size + 1);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(fl.sub, fl.x, fl.y - fl.size + 1);
      }
      ctx.restore();
    }

    rafId = requestAnimationFrame(loop);
  }

  HS.FX = { attach, detach, spawnHit, spawnHeal, spawnChaosFlash };
})(window);
