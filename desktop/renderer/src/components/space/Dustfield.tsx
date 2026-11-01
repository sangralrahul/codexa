import { useEffect, useRef } from "react";

type Speck = { x: number; y: number; z: number; r: number; a: number; ph: number; wob: number; soft: boolean };
type Glint = { x: number; y: number; born: number; life: number; size: number; rot: number };

const TAU = Math.PI * 2;

/**
 * Ported from the web dashboard (src/components/app/space-hero/dustfield.tsx).
 *
 * The light theme's counterpart to the starfield, on a transparent canvas: fine dark-grey specks drifting
 * slowly in three depth layers (with a few large, out-of-focus motes in front), leaning towards the
 * pointer, and now and then a slow glint. `glint="light"` is a soft white flare with four thin rays
 * (it reads on the mid-tones of a daylight scene); `glint="ink"` is a small dark four-point star that
 * fades in and out, like a star being plotted on a chart; null turns glints off.
 *
 * Renders only while `running` (the parent pauses it off screen and in hidden tabs); calm/reduced motion
 * should not mount it. Pixel ratio capped at 2, speck count scales with the area. Decorative only.
 */
export function Dustfield({ running, density = 1, glint = "light", className }: { running: boolean; density?: number; glint?: "light" | "ink" | null; className?: string }) {
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

    // Two sprites: a crisp dark-grey speck and a soft pale mote (out-of-focus dust catching the light).
    const sprite = (stops: [number, number][], rgb = "34,38,46") => {
      const c = document.createElement("canvas");
      c.width = c.height = 32;
      const g2 = c.getContext("2d");
      if (g2) {
        const g = g2.createRadialGradient(16, 16, 0, 16, 16, 16);
        for (const [at, a] of stops) g.addColorStop(at, `rgba(${rgb},${a})`);
        g2.fillStyle = g;
        g2.fillRect(0, 0, 32, 32);
      }
      return c;
    };
    const speckSprite = sprite([
      [0, 1],
      [0.3, 0.85],
      [0.55, 0.18],
      [1, 0],
    ]);
    const moteSprite = sprite(
      [
        [0, 0.9],
        [0.55, 0.6],
        [0.8, 0.15],
        [1, 0],
      ],
      "255,255,255",
    );

    let w = 0;
    let h = 0;
    let specks: Speck[] = [];
    let raf = 0;
    let last = 0;
    let glints: Glint[] = [];
    let nextGlint = 0;
    const tgt = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };

    const seed = () => {
      const count = Math.min(320, Math.round(((w * h) / 4200) * density));
      specks = Array.from({ length: count }, () => {
        const z = Math.random() < 0.55 ? 0.3 : Math.random() < 0.75 ? 0.6 : 1;
        const soft = Math.random() < 0.03;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          soft,
          r: soft ? 6 + Math.random() * 9 : 0.55 + z * 0.75 + Math.random() * 0.5,
          a: soft ? 0.25 + Math.random() * 0.25 : 0.1 + z * 0.16 + Math.random() * 0.12,
          ph: Math.random() * TAU,
          wob: 0.00045 + Math.random() * 0.0005,
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
      const reseed = !specks.length || Math.abs(nw - w) > 40 || Math.abs(nh - h) > 40;
      w = nw;
      h = nh;
      if (reseed) seed();
      draw(performance.now(), 0);
    };

    const spawnGlint = (t: number) => {
      // Keep clear of the centre column, where the copy sits.
      const side = Math.random() < 0.5;
      const x = side ? w * (0.04 + Math.random() * 0.26) : w * (0.7 + Math.random() * 0.26);
      glints.push({ x, y: h * (0.08 + Math.random() * 0.7), born: t, life: 2600 + Math.random() * 1600, size: glint === "ink" ? 7 + Math.random() * 5 : 26 + Math.random() * 30, rot: (Math.random() - 0.5) * 0.5 });
    };

    const drawGlint = (g: Glint, t: number) => {
      const p = (t - g.born) / g.life;
      const k = Math.sin(Math.PI * p) ** 2;
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot + p * 0.25);
      if (glint === "ink") {
        ctx.strokeStyle = `rgba(10,10,10,${0.6 * k})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-g.size, 0);
        ctx.lineTo(g.size, 0);
        ctx.moveTo(0, -g.size);
        ctx.lineTo(0, g.size);
        ctx.stroke();
        ctx.fillStyle = `rgba(10,10,10,${0.85 * k})`;
        ctx.beginPath();
        ctx.arc(0, 0, 1.8, 0, TAU);
        ctx.fill();
      } else {
        const s = g.size;
        const bloom = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.55);
        bloom.addColorStop(0, `rgba(255,255,255,${0.95 * k})`);
        bloom.addColorStop(0.2, `rgba(255,255,255,${0.5 * k})`);
        bloom.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = bloom;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.55, 0, TAU);
        ctx.fill();
        // Four thin rays, the horizontal pair longer.
        for (const [len, ang] of [
          [s * 1.5, 0],
          [s * 0.9, Math.PI / 2],
        ] as const) {
          for (const dir of [1, -1]) {
            const ex = Math.cos(ang) * len * dir;
            const ey = Math.sin(ang) * len * dir;
            const ray = ctx.createLinearGradient(0, 0, ex, ey);
            ray.addColorStop(0, `rgba(255,255,255,${0.9 * k})`);
            ray.addColorStop(1, "rgba(255,255,255,0)");
            ctx.strokeStyle = ray;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(ex, ey);
            ctx.stroke();
          }
        }
      }
      ctx.restore();
    };

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      cur.x += (tgt.x - cur.x) * Math.min(1, dt * 0.003);
      cur.y += (tgt.y - cur.y) * Math.min(1, dt * 0.003);
      for (const s of specks) {
        // A slow sideways drift with a little lift, nearer specks faster; wrap around.
        s.x -= (0.0022 + s.z * 0.0052) * dt;
        s.y -= s.z * 0.0009 * dt;
        if (s.x < -20) s.x += w + 40;
        if (s.y < -20) s.y += h + 40;
        const px = s.x + cur.x * s.z * 22 + Math.sin(t * s.wob + s.ph) * 5 * s.z;
        const py = s.y + cur.y * s.z * 14 + Math.cos(t * s.wob * 0.8 + s.ph) * 4 * s.z;
        const size = s.r * (s.soft ? 2 : 3);
        ctx.globalAlpha = s.a * (0.8 + 0.2 * Math.sin(t * 0.0011 + s.ph));
        ctx.drawImage(s.soft ? moteSprite : speckSprite, px - size / 2, py - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
      glints = glints.filter((g) => t - g.born < g.life);
      for (const g of glints) drawGlint(g, t);
    };

    const frame = (t: number) => {
      raf = 0;
      if (!runningRef.current) return;
      const dt = last ? Math.min(64, t - last) : 16;
      last = t;
      if (glint) {
        if (!nextGlint) nextGlint = t + 1800 + Math.random() * 2500;
        if (t >= nextGlint && glints.length < 2) {
          spawnGlint(t);
          nextGlint = t + 3500 + Math.random() * 5000;
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

    const host = canvas.closest<HTMLElement>("[data-space-host]") ?? canvas.parentElement;
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
  }, [density, glint]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
