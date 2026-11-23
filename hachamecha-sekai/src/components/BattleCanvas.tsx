import { useEffect, useRef } from 'preact/hooks';
import { ELEMENT_META } from '../data/constants';
import type { BattleFxEvent } from '../types/game';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  shape: 'dot' | 'ring' | 'line';
  angle: number;
}

interface BattleCanvasProps {
  fxEvents: BattleFxEvent[];
}

export function BattleCanvas({ fxEvents }: BattleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const seenRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);

    for (const ev of fxEvents) {
      if (seenRef.current.has(ev.id)) continue;
      seenRef.current.add(ev.id);
      if (seenRef.current.size > 60) {
        const first = seenRef.current.values().next().value;
        if (first !== undefined) seenRef.current.delete(first);
      }

      const color = ev.kind === 'heal' ? '#38f29b' : ev.kind === 'chaos' ? '#ffd94a' : ELEMENT_META[ev.element].color;
      const cx =
        ev.targetSlot !== undefined
          ? w * (0.2 + ((ev.targetSlot % 4) / 3) * 0.6)
          : w * 0.5;
      const cy = ev.targetSide === 'enemy' ? h * 0.26 : ev.targetSide === 'ally' ? h * 0.74 : h * 0.5;

      const count = ev.kind === 'chaos' || ev.kind === 'orb' ? 24 : ev.kind === 'burst' ? 18 : 10;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: ev.kind === 'chaos' ? 0.45 : 0.3,
        size: ev.kind === 'chaos' ? 120 : 54,
        color,
        shape: 'ring',
        angle: 0
      });

      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * (ev.kind === 'chaos' ? 220 : 140);
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 16,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          maxLife: 0.25 + Math.random() * 0.28,
          size: 3 + Math.random() * 4.5,
          color: i % 3 === 0 ? '#ffd94a' : color,
          shape: ev.kind === 'slash' && i < 4 ? 'line' : 'dot',
          angle: a
        });
      }
    }
  }, [fxEvents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      const list = particlesRef.current;
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          list.splice(i, 1);
          continue;
        }
        const t = p.life / p.maxLife;
        const alpha = 1 - t;
        ctx.save();
        ctx.globalAlpha = alpha;
        if (p.shape === 'ring') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1, (1 - t) * 4);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 10 + p.size * t, 0, Math.PI * 2);
          ctx.stroke();
        } else if (p.shape === 'line') {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(p.x - Math.cos(p.angle) * 18, p.y - Math.sin(p.angle) * 18);
          ctx.lineTo(p.x + Math.cos(p.angle) * 18, p.y + Math.sin(p.angle) * 18);
          ctx.stroke();
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.94;
          p.vy *= 0.94;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} class="battle-canvas-overlay" />;
}
