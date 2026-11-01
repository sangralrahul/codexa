"use client";

import { useEffect, useRef } from "react";

type Star = { x: number; y: number; z: number; r: number; a: number; tw: number; ph: number };
type Meteor = { x: number; y: number; vx: number; vy: number; born: number; life: number; len: number };

const TAU = Math.PI * 2;

/**
 * A live starfield on a transparent canvas: three depth layers that drift at different speeds and lean
 * towards the pointer (parallax), a slow twinkle, and an occasional shooting star.
 *
 * It renders only while `running` is true (the parent turns it off when the hero is off screen or the
 * tab is hidden); calm/reduced motion should not mount it at all. The pixel ratio is capped at 2 and
 * the star count scales with the canvas area. Decorative: aria-hidden, no pointer events of its own.
 */
export function Starfield({ running, density = 1, meteors = true, className }: { running: boolean; density?: number; meteors?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(running);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    runningRef.current = running;
    kick.current();
  }, [running]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // One soft round sprite, tinted per star by globalAlpha.
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const sctx = sprite.getContext("2d");
    if (sctx) {
      const g = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.18, "rgba(240,246,255,0.85)");
      g.addColorStop(0.45, "rgba(220,232,255,0.18)");
      g.addColorStop(1, "rgba(220,232,255,0)");
      sctx.fillStyle = g;
      sctx.fillRect(0, 0, 32, 32);
    }

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let raf = 0;
    let last = 0;
    let meteor: Meteor | null = null;
    let nextMeteor = 0;
    // Pointer parallax target and eased value, in -1..1.
    const tgt = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };

    const seed = () => {
      const count = Math.min(900, Math.round(((w * h) / 2300) * density));
      stars = Array.from({ length: count }, () => {
        const z = Math.random() < 0.6 ? 0.25 : Math.random() < 0.75 ? 0.55 : 1;
        const bright = Math.random() ** 3;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          r: 0.35 + z * 0.55 + bright * 0.9,
          a: 0.25 + 0.55 * bright + z * 0.2,
          tw: 0.6 + Math.random() * 2.2,
          ph: Math.random() * TAU,
        };
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const nw = Math.max(1, Math.round(rect.width));
      const nh = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(nw * dpr);
      canvas.height = Math.round(nh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const reseed = !stars.length || Math.abs(nw - w) > 40 || Math.abs(nh - h) > 40;
      w = nw;
      h = nh;
      if (reseed) seed();
      draw(performance.now(), 0);
    };

    const spawnMeteor = (t: number) => {
      // From the upper part, heading down and sideways at a shallow angle.
      const left = Math.random() < 0.5;
      const ang = (left ? 0.18 : Math.PI - 0.18) + (Math.random() - 0.5) * 0.35;
      const speed = 0.9 + Math.random() * 0.5; // px per ms
      meteor = {
        x: left ? Math.random() * w * 0.6 : w * 0.4 + Math.random() * w * 0.6,
        y: Math.random() * h * 0.45,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed * 0.6 + 0.12,
        born: t,
        life: 700 + Math.random() * 500,
        len: 90 + Math.random() * 110,
      };
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      cur.x += (tgt.x - cur.x) * Math.min(1, dt * 0.004);
      cur.y += (tgt.y - cur.y) * Math.min(1, dt * 0.004);
      for (const s of stars) {
        // Slow drift to the left, faster for nearer stars; wrap around.
        s.x -= s.z * dt * 0.0045;
        if (s.x < -4) s.x += w + 8;
        const px = s.x + cur.x * s.z * 16;
        const py = s.y + cur.y * s.z * 10;
        const tw = 0.72 + 0.28 * Math.sin(t * 0.001 * s.tw + s.ph);
        const size = s.r * 4;
        ctx.globalAlpha = Math.min(1, s.a * tw);
        ctx.drawImage(sprite, px - size / 2, py - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      if (meteor) {
        const m = meteor;
        const age = t - m.born;
        if (age > m.life) meteor = null;
        else {
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          const p = age / m.life;
          const fade = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
          const n = Math.hypot(m.vx, m.vy);
          const tx = m.x - (m.vx / n) * m.len;
          const ty = m.y - (m.vy / n) * m.len;
          const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
          g.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
          g.addColorStop(0.25, `rgba(225,235,255,${0.35 * fade})`);
          g.addColorStop(1, "rgba(225,235,255,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.2;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();
          ctx.globalAlpha = fade;
          ctx.drawImage(sprite, m.x - 4, m.y - 4, 8, 8);
          ctx.globalAlpha = 1;
        }
      }
    };

    const frame = (t: number) => {
      raf = 0;
      if (!runningRef.current) return;
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      if (meteors) {
        if (!nextMeteor) nextMeteor = t + 2500 + Math.random() * 5000;
        if (!meteor && t >= nextMeteor) {
          spawnMeteor(t);
          nextMeteor = t + 6000 + Math.random() * 9000;
        }
      }
      draw(t, dt);
      raf = requestAnimationFrame(frame);
    };

    kick.current = () => {
      if (runningRef.current && !raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const host = canvas.parentElement;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !host) return;
      const rect = host.getBoundingClientRect();
      tgt.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      tgt.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onLeave = () => {
      tgt.x = 0;
      tgt.y = 0;
    };
    host?.addEventListener("pointermove", onMove, { passive: true });
    host?.addEventListener("pointerleave", onLeave);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    kick.current();
    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      kick.current = () => {};
      ro.disconnect();
      host?.removeEventListener("pointermove", onMove);
      host?.removeEventListener("pointerleave", onLeave);
    };
  }, [density, meteors]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
