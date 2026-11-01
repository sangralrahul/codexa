#!/usr/bin/env node
/**
 * Procedural art for the dashboard hero and page banners (public/space/*.webp).
 *
 * Every pixel is computed here: no photos, no external images. Night scenes (dark theme) are rendered in
 * linear light into a float buffer, desaturated to the site's monochrome palette (a faint cool tint
 * survives), tone mapped, dithered and encoded as WebP with sharp. The daylight set (light theme,
 * light-*.webp) is composed display-referred; the star chart is SVG linework over generated paper.
 *
 *   node scripts/generate-space-art.mjs                  # all scenes
 *   node scripts/generate-space-art.mjs moon             # one scene: orbit | moon | nebula | galaxy |
 *                                                        #   light-daylight | light-clouds | light-lunar |
 *                                                        #   light-chart | light-clouds-veil
 *   node scripts/generate-space-art.mjs home-rings       # home page hero: home-rings | home-eclipse |
 *                                                        #   home-aurora | home-milkyway | home-light-rings |
 *                                                        #   home-light-orrery | home-light-dawn |
 *                                                        #   home-light-eclipse
 *
 * Scenes are 2400x1100 and kept under 350 KB. The output is committed; rerun only to change the art.
 */
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "space");
const W = 2400;
const H = 1100;
const MAX_BYTES = 350 * 1024;

/* ---------------------------------------------------------------- math */

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;
const norm3 = ([x, y, z]) => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};

/** Improved Perlin noise in 3D, roughly in [-1, 1]. */
function perlin(seed) {
  const r = rng(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h, x, y, z) => {
    const hh = h & 15;
    const u = hh < 8 ? x : y;
    const v = hh < 4 ? y : hh === 12 || hh === 14 ? x : z;
    return (hh & 1 ? -u : u) + (hh & 2 ? -v : v);
  };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y, z = 0) => {
    let X = Math.floor(x);
    let Y = Math.floor(y);
    let Z = Math.floor(z);
    x -= X;
    y -= Y;
    z -= Z;
    X &= 255;
    Y &= 255;
    Z &= 255;
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = perm[X] + Y;
    const AA = perm[A] + Z;
    const AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y;
    const BA = perm[B] + Z;
    const BB = perm[B + 1] + Z;
    return mix(
      mix(mix(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u), mix(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      mix(mix(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u), mix(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v),
      w,
    );
  };
}

function fbm(n, x, y, z, oct, lac = 2.03, gain = 0.5) {
  let s = 0;
  let a = 1;
  let f = 1;
  let t = 0;
  for (let i = 0; i < oct; i++) {
    s += a * n(x * f, y * f, z * f + i * 7.13);
    t += a;
    a *= gain;
    f *= lac;
  }
  return s / t;
}

/** Ridged multifractal: thin bright creases where the noise crosses zero. */
function ridged(n, x, y, z, oct, lac = 2.1, gain = 0.55) {
  let s = 0;
  let a = 1;
  let f = 1;
  let t = 0;
  for (let i = 0; i < oct; i++) {
    const r = 1 - Math.abs(n(x * f, y * f, z * f + i * 3.7));
    s += a * r * r;
    t += a;
    a *= gain;
    f *= lac;
  }
  return s / t;
}

/* ---------------------------------------------------------------- image */

class Img {
  constructor() {
    this.d = new Float32Array(W * H * 3);
  }
  add(i, r, g, b) {
    const k = i * 3;
    this.d[k] += r;
    this.d[k + 1] += g;
    this.d[k + 2] += b;
  }
  /** Additive gaussian splat (stars, glows). `aniso` stretches it horizontally. */
  splat(x, y, amp, sigma, col = [1, 1, 1], aniso = 1, mask = null) {
    const sx = sigma * aniso;
    const rx = Math.ceil(sx * 3.2);
    const ry = Math.ceil(sigma * 3.2);
    const x0 = Math.max(0, Math.floor(x - rx));
    const x1 = Math.min(W - 1, Math.ceil(x + rx));
    const y0 = Math.max(0, Math.floor(y - ry));
    const y1 = Math.min(H - 1, Math.ceil(y + ry));
    const ix = 1 / (2 * sx * sx);
    const iy = 1 / (2 * sigma * sigma);
    for (let yy = y0; yy <= y1; yy++) {
      const dy = yy + 0.5 - y;
      const ey = dy * dy * iy;
      if (ey > 10) continue;
      for (let xx = x0; xx <= x1; xx++) {
        const dx = xx + 0.5 - x;
        const e = dx * dx * ix + ey;
        if (e > 10) continue;
        const i = yy * W + xx;
        const w = amp * Math.exp(-e) * (mask ? mask[i] : 1);
        this.add(i, col[0] * w, col[1] * w, col[2] * w);
      }
    }
  }
}

/** Star colour by temperature, already mostly desaturated (the encoder desaturates again). */
function starColor(t) {
  const warm = [1, 0.86, 0.7];
  const cool = [0.74, 0.84, 1];
  return t < 0.5 ? warm.map((v) => mix(v, 1, t * 2)) : cool.map((v) => mix(1, v, (t - 0.5) * 2));
}

/**
 * A starfield with a power-law brightness distribution. `density(x, y)` (0..1) thins it out,
 * `mask` (per pixel transmission) dims stars behind dust or planets.
 */
function starfield(img, seed, { count, density = () => 1, mask = null, scale = 1, halos = true }) {
  const r = rng(seed);
  let placed = 0;
  let guard = 0;
  while (placed < count && guard++ < count * 20) {
    const x = r() * W;
    const y = r() * H;
    if (r() > density(x, y)) continue;
    placed++;
    // Mostly pinpricks; only a handful are bright enough to bloom.
    const b = Math.min(3.2, 0.011 * Math.pow(r(), -1.12)) * scale;
    const col = starColor(r());
    const sigma = 0.4 + 0.14 * Math.log1p(b * 3);
    img.splat(x, y, b, sigma, col, 1, mask);
    if (halos && b > 1.4) img.splat(x, y, b * 0.006, 1.6 + b * 0.5, col, 1, mask);
  }
}

/* ---------------------------------------------------------------- encode */

async function save(img, name, { exposure = 1, sat = 0.3, quality = 90, black = 0 }) {
  const out = Buffer.alloc(W * H * 3);
  const r = rng(1234);
  const d = img.d;
  for (let i = 0; i < W * H; i++) {
    const k = i * 3;
    let R = d[k];
    let G = d[k + 1];
    let B = d[k + 2];
    const l = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    R = l + (R - l) * sat;
    G = l + (G - l) * sat;
    B = l + (B - l) * sat;
    const dither = (r() + r() - 1) * 0.9;
    for (const [j, v] of [
      [0, R],
      [1, G],
      [2, B],
    ]) {
      let t = 1 - Math.exp(-Math.max(0, v - black) * exposure);
      t = t <= 0.0031308 ? 12.92 * t : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
      out[k + j] = clamp(Math.round(t * 255 + dither), 0, 255);
    }
  }
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `${name}.webp`);
  let q = quality;
  for (;;) {
    await sharp(out, { raw: { width: W, height: H, channels: 3 } })
      .webp({ quality: q, effort: 6, smartSubsample: true })
      .toFile(file);
    const size = statSync(file).size;
    if (size <= MAX_BYTES || q <= 40) {
      console.log(`${name}.webp  ${W}x${H}  ${(size / 1024).toFixed(0)} KB  (q${q})`);
      return;
    }
    q -= 4;
  }
}

/* ---------------------------------------------------------------- (a) planet horizon from orbit */

async function orbit() {
  const img = new Img();
  const n = perlin(11);
  const n2 = perlin(12);
  const R = 2600;
  const cx = 1180;
  const cy = 760 + R; // top of the limb sits at y = 760
  const sunAng = (-76 * Math.PI) / 180;
  const sx = cx + R * Math.cos(sunAng);
  const sy = cy + R * Math.sin(sunAng);
  // The sun is just behind the limb: light comes from behind the planet, so only a thin crescent is lit.
  const L = norm3([0.24 * Math.cos(sunAng), 0.24 * Math.sin(sunAng), -0.97]);

  // Coverage of the planet disc (anti-aliased) and the sky's transmission.
  const cover = new Float32Array(W * H);
  const sky = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const c = clamp(R - d + 0.5);
      cover[y * W + x] = c;
      sky[y * W + x] = 1 - c;
    }

  // Stars, washed out near the sun.
  starfield(img, 101, {
    count: 2600,
    mask: sky,
    density: (x, y) => smooth(150, 900, Math.hypot(x - sx, y - sy)) * (0.35 + 0.65 * smooth(0, 700, 760 - y + 300)),
  });

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      let ang = Math.atan2(dy, dx) - sunAng;
      ang = Math.atan2(Math.sin(ang), Math.cos(ang));
      // Forward scattering: the limb is brightest right where the sun sits behind it.
      const fwd = 0.16 + 1.5 * Math.exp(-((ang / 0.13) ** 2)) + 0.55 * Math.exp(-((ang / 0.42) ** 2));
      const h = d - R;
      if (h >= -1) {
        const hh = Math.max(0, h);
        const line = Math.exp(-hh / 3.2);
        const strat = Math.exp(-hh / 16);
        const haze = Math.exp(-hh / 90);
        const air = 0.05 * Math.exp(-(((hh - 30) / 5.5) ** 2)); // airglow: a faint separate band
        const k = fwd;
        img.add(
          i,
          k * (1.25 * line + 0.3 * strat * 0.78 + 0.055 * haze * 0.6) + air * 0.8,
          k * (1.25 * line + 0.3 * strat * 0.88 + 0.055 * haze * 0.74) + air * 0.95,
          k * (1.25 * line + 0.3 * strat * 1.0 + 0.055 * haze * 1.0) + air,
        );
      }
      if (cover[i] > 0) {
        const delta = Math.max(0, R - d);
        const nz = Math.sqrt(Math.max(0, R * R - d * d)) / R;
        const nx = dx / R;
        const ny = dy / R;
        const lam = nx * L[0] + ny * L[1] + nz * L[2];
        const lit = smooth(-0.015, 0.16, lam);
        let surf = 0;
        if (lit > 0.001) {
          const px = nx * 34;
          const py = ny * 34;
          const pz = nz * 34;
          const wx = fbm(n2, px * 0.5, py * 0.5, pz * 0.5, 3);
          const c = fbm(n, px + wx * 1.4, py * 1.0, pz + wx * 1.4, 6);
          const cloud = Math.pow(smooth(-0.12, 0.5, c), 1.6);
          const streak = 0.5 + 0.5 * fbm(n2, px * 3, py * 0.6, pz * 3, 4);
          surf = (0.03 + 0.95 * cloud * (0.7 + 0.5 * streak)) * lit * (0.25 + 0.9 * fwd) * 0.55;
        }
        // Looking through the atmosphere just inside the limb.
        const inner = fwd * (0.7 * Math.exp(-delta / 2.2) + 0.12 * Math.exp(-delta / 14));
        const c = cover[i];
        img.add(i, c * (surf * 1.0 + inner * 0.85), c * (surf * 0.98 + inner * 0.92), c * (surf * 0.95 + inner * 1.0));
      }
    }
  }

  // The sun: a hard core clipped by the limb, then glare.
  img.splat(sx, sy - 3, 30, 3.2, [1, 1, 1], 1, sky);
  img.splat(sx, sy, 1.1, 22, [1, 0.98, 0.95]);
  img.splat(sx, sy, 0.22, 110, [0.95, 0.97, 1]);
  img.splat(sx, sy, 0.03, 520, [0.85, 0.9, 1]);
  await save(img, "orbit", { exposure: 1.15, sat: 0.32 });
}

/* ---------------------------------------------------------------- (b) cratered moon */

/**
 * Renders a cratered moon disc additively into `img` (radiance x `gain`, tinted by `tint`) and returns
 * its anti-aliased coverage mask. Shared by the night moon and the daytime moon.
 */
function moonDisc(img, { cx, cy, R, L, gain = 1, tint = [1, 0.985, 0.96], earthshine = 0.012 }) {
  const n = perlin(21);
  const n2 = perlin(22);
  const r = rng(23);
  const K = 1.0; // relief exaggeration

  const bx = Math.floor(cx - R - 2);
  const by = Math.floor(cy - R - 2);
  const S = 2 * R + 5;
  const P = new Float32Array(S * S * 3);
  const inside = new Uint8Array(S * S);
  const hgt = new Float32Array(S * S);
  const alb = new Float32Array(S * S);
  // Rotate the globe a little so features are not axis-aligned.
  const ca = Math.cos(0.6);
  const sa = Math.sin(0.6);
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const x = (bx + i + 0.5 - cx) / R;
      const y = (by + j + 0.5 - cy) / R;
      const rr = x * x + y * y;
      if (rr >= 1.0) continue;
      const z = Math.sqrt(1 - rr);
      const k = j * S + i;
      inside[k] = 1;
      // Body coordinates (rotated about the y axis then x axis).
      const x1 = x * ca + z * sa;
      const z1 = -x * sa + z * ca;
      P[k * 3] = x1;
      P[k * 3 + 1] = y;
      P[k * 3 + 2] = z1;
    }

  // Albedo: dark maria (smooth, low-frequency) on brighter highlands.
  const mareAt = (x, y, z) => smooth(0.0, 0.3, fbm(n, x * 1.5 + 3, y * 1.5, z * 1.5, 7) + 0.35 * fbm(n2, x * 3.1, y * 3.1, z * 3.1, 5));
  for (let k = 0; k < S * S; k++) {
    if (!inside[k]) continue;
    const x = P[k * 3];
    const y = P[k * 3 + 1];
    const z = P[k * 3 + 2];
    const mare = mareAt(x, y, z);
    alb[k] = 0.62 - 0.34 * mare * (0.85 + 0.4 * fbm(n2, x * 5 + 9, y * 5, z * 5, 5)) + 0.08 * fbm(n2, x * 7, y * 7, z * 7, 5) + 0.04 * fbm(n, x * 30, y * 30, z * 30, 3) * (1 - 0.5 * mare);
    hgt[k] = 0.0016 * fbm(n, x * 28, y * 28, z * 28, 5) * (1 - 0.7 * mare) + 0.0009 * fbm(n2, x * 140, y * 140, z * 140, 3);
  }

  // Craters: power-law sizes, fewer on the maria. Each is rasterised only over its own footprint.
  const crater = (cxv, cyv, czv, rad, young) => {
    // Screen position of the crater centre (inverse of the body rotation).
    const sxv = cxv * ca - czv * sa;
    const szv = cxv * sa + czv * ca;
    if (szv < -0.15) return;
    const px = cx + sxv * R - bx;
    const py = cy + cyv * R - by;
    const ext = rad * 2.8 * R;
    const i0 = Math.max(0, Math.floor(px - ext));
    const i1 = Math.min(S - 1, Math.ceil(px + ext));
    const j0 = Math.max(0, Math.floor(py - ext));
    const j1 = Math.min(S - 1, Math.ceil(py + ext));
    // Small craters are deep bowls; big ones are shallow, flat-floored, with terraced rims.
    const depth = rad * (rad > 0.03 ? 0.07 + 0.03 * r() : 0.13 + 0.05 * r());
    const rim = 0.28 + 0.12 * r();
    const big = rad > 0.045;
    const floor = big ? -0.62 : -1;
    const wob = r() * 100;
    const fresh = rad < 0.014 && r() < 0.35;
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const k = j * S + i;
        if (!inside[k]) continue;
        const dot = P[k * 3] * cxv + P[k * 3 + 1] * cyv + P[k * 3 + 2] * czv;
        if (dot <= 0) continue;
        const a = Math.sqrt(Math.max(0, 2 - 2 * dot));
        // Slightly irregular rim.
        const rr = rad * (1 + 0.07 * n2(P[k * 3] * 30 + wob, P[k * 3 + 1] * 30, P[k * 3 + 2] * 30));
        const t = a / rr;
        if (t > 2.8) continue;
        let h;
        if (t < 1) {
          h = Math.max(floor, -1 + t * t * (1 + rim));
          if (big) h += 0.55 * Math.exp(-((t / 0.13) ** 2)); // central peak
        } else {
          h = rim * Math.exp(-(t - 1) * 3.2) * (t < 1.08 ? 1 : 0.9);
        }
        hgt[k] += h * depth;
        if (young) alb[k] += t < 1.15 ? 0.12 * (1 - t / 1.15) : 0.05 * Math.exp(-(t - 1) * 1.6);
        else if (fresh) alb[k] += 0.1 * Math.exp(-((t / 1.2) ** 2));
      }
  };
  const rays = [];
  // Cumulative size distribution N(>r) ~ r^-2: thousands of small pits, a few dozen large basins.
  for (let c = 0; c < 6000; c++) {
    const rad = Math.min(0.14, 0.004 / Math.sqrt(Math.max(1e-6, r())));
    const zc = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - zc * zc);
    const v = [s * Math.cos(th), zc, s * Math.sin(th)];
    if (mareAt(v[0], v[1], v[2]) > 0.5 && r() < 0.8) continue;
    const young = rad > 0.02 && rad < 0.05 && rays.length < 2 && r() < 0.15;
    if (young) rays.push({ v, rad });
    crater(v[0], v[1], v[2], rad, young);
  }
  // Ray systems from the young craters.
  for (const { v, rad } of rays) {
    const up = Math.abs(v[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const e1 = norm3([up[1] * v[2] - up[2] * v[1], up[2] * v[0] - up[0] * v[2], up[0] * v[1] - up[1] * v[0]]);
    const e2 = [v[1] * e1[2] - v[2] * e1[1], v[2] * e1[0] - v[0] * e1[2], v[0] * e1[1] - v[1] * e1[0]];
    for (let k = 0; k < S * S; k++) {
      if (!inside[k]) continue;
      const x = P[k * 3];
      const y = P[k * 3 + 1];
      const z = P[k * 3 + 2];
      const dot = x * v[0] + y * v[1] + z * v[2];
      if (dot < 0.3) continue;
      const a = Math.acos(clamp(dot, -1, 1));
      const th = Math.atan2(x * e2[0] + y * e2[1] + z * e2[2], x * e1[0] + y * e1[1] + z * e1[2]);
      const ray = Math.pow(clamp(0.5 + 0.5 * n(Math.cos(th) * 9, Math.sin(th) * 9, 4.2) * 1.8), 5);
      alb[k] += 0.22 * ray * Math.exp(-a / (rad * 9)) * smooth(rad, rad * 2, a);
    }
  }

  // Screen-space height (pixels) for normals and cast shadows.
  const Z = new Float32Array(S * S);
  for (let j = 0; j < S; j++)
    for (let i = 0; i < S; i++) {
      const k = j * S + i;
      if (!inside[k]) continue;
      const x = (bx + i + 0.5 - cx) / R;
      const y = (by + j + 0.5 - cy) / R;
      Z[k] = R * Math.sqrt(Math.max(0, 1 - x * x - y * y)) + K * R * hgt[k];
    }
  const lxy = Math.hypot(L[0], L[1]);
  const stepX = L[0] / lxy;
  const stepY = L[1] / lxy;
  const rise = L[2] / lxy;
  const moonMask = new Float32Array(W * H);

  for (let j = 1; j < S - 1; j++)
    for (let i = 1; i < S - 1; i++) {
      const k = j * S + i;
      const X = bx + i;
      const Y = by + j;
      if (X < 0 || X >= W || Y < 0 || Y >= H) continue;
      const x = (X + 0.5 - cx) / R;
      const y = (Y + 0.5 - cy) / R;
      const d = Math.hypot(x, y) * R;
      const cov = clamp(R - d + 0.5);
      if (cov <= 0) continue;
      moonMask[Y * W + X] = cov;
      const nz = Math.sqrt(Math.max(0, 1 - x * x - y * y));
      const hx = inside[k + 1] && inside[k - 1] ? (hgt[k + 1] - hgt[k - 1]) * 0.5 : 0;
      const hy = inside[k + S] && inside[k - S] ? (hgt[k + S] - hgt[k - S]) * 0.5 : 0;
      const N = norm3([x - nz * K * R * hx, y - nz * K * R * hy, nz]);
      const mu0 = N[0] * L[0] + N[1] * L[1] + N[2] * L[2];
      const mu = Math.max(0.02, N[2]);
      let shade = 0;
      if (mu0 > 0) {
        // Lommel-Seeliger blended with Lambert: the real moon's flat, limb-bright look.
        shade = 0.72 * ((2 * mu0) / (mu0 + mu)) * 0.5 + 0.38 * mu0;
        // Cast shadow by marching towards the light over the height field.
        let lightT = 1;
        const z0 = Z[k];
        for (let s = 1; s < 90; s++) {
          const si = Math.round(i + stepX * s);
          const sj = Math.round(j + stepY * s);
          if (si < 0 || sj < 0 || si >= S || sj >= S) break;
          const kk = sj * S + si;
          if (!inside[kk]) break;
          const over = Z[kk] - (z0 + rise * s);
          if (over > 0) {
            lightT = 0;
            break;
          }
          lightT = Math.min(lightT, clamp(-over / (s * 0.25) + 0.0));
        }
        shade *= 0.15 + 0.85 * smooth(0, 1, lightT * 4);
        shade *= smooth(0, 0.06, mu0);
      }
      // Earthshine on the night side.
      const es = earthshine * Math.max(0, -0.25 * N[0] + 0.97 * N[2]);
      const a = clamp(alb[k], 0.05, 1);
      const v = (a * shade * 1.9 + a * es) * cov * gain;
      img.add(Y * W + X, v * tint[0], v * tint[1], v * tint[2]);
    }
  return moonMask;
}

async function moon() {
  const img = new Img();
  const cx = 1900;
  const cy = 520;
  const R = 390;
  const moonMask = moonDisc(img, { cx, cy, R, L: norm3([0.86, -0.3, 0.42]) });
  const sky = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) sky[i] = 1 - moonMask[i];
  starfield(img, 202, {
    count: 2100,
    mask: sky,
    density: (x, y) => smooth(R * 1.05, R * 2.2, Math.hypot(x - cx, y - cy)),
  });
  // A faint scatter halo, brighter on the lit side.
  img.splat(cx + 60, cy - 20, 0.035, 260, [0.92, 0.95, 1], 1, sky);
  img.splat(cx + 30, cy - 10, 0.06, 90, [0.95, 0.97, 1], 1, sky);
  await save(img, "moon", { exposure: 1.2, sat: 0.25 });
}

/* ---------------------------------------------------------------- (c) nebula field */

async function nebula() {
  const img = new Img();
  const n = perlin(31);
  const n2 = perlin(32);
  const n3 = perlin(33);
  const trans = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const u = x / H;
      const v = y / H;
      // Gentle domain warp: billows, not marble.
      const qx = fbm(n2, u * 0.9, v * 0.9, 0.3, 4);
      const qy = fbm(n2, u * 0.9 + 5.2, v * 0.9 + 1.3, 0.3, 4);
      const wu = u + 0.32 * qx;
      const wv = v + 0.32 * qy;
      // Large-scale shape: a cloud complex on the right that trails off down-left; the centre stays quiet for text.
      const lobe = Math.exp(-(((u - 1.62) / 0.62) ** 2 + ((v - 0.46) / 0.5) ** 2));
      const trail = Math.exp(-(((v - 0.86 + (u - 0.6) * 0.32) / 0.22) ** 2)) * smooth(-0.2, 0.9, u);
      const knot = 1.4 * Math.exp(-(((u - 0.3) / 0.34) ** 2 + ((v - 0.22) / 0.24) ** 2));
      const shape = smooth(0.08, 0.95, 1.0 * lobe + 0.6 * trail + 0.42 * knot + 0.32 * fbm(n, u * 0.8, v * 0.8, 9, 3));
      const base = fbm(n, wu * 2.1, wv * 2.1, 2.0, 8, 2.0, 0.53);
      const dens = smooth(-0.12, 0.55, base + 0.55 * (shape - 0.5)) * shape;
      const billow = 0.55 + 0.75 * smooth(-0.35, 0.45, fbm(n3, wu * 6.5, wv * 6.5, 1.5, 5));
      const gas = Math.pow(dens, 2.1) * billow;
      // Bright ionisation fronts: thin creases, only where gas is dense.
      const fil = Math.pow(ridged(n2, wu * 3.6, wv * 3.6, 4.4, 5), 9) * Math.sqrt(dens);
      // A faint veil everywhere so the black is never flat.
      const veil = Math.pow(smooth(-0.2, 0.7, fbm(n3, u * 1.3 + qx, v * 1.3 + qy, 7.7, 6)), 3) * 0.06;
      // Dust: dark threads and pillars in front of the gas.
      const dn = fbm(n, wu * 3.0 + 11, wv * 3.0, 5.5, 7);
      const thread = Math.pow(ridged(n3, wu * 2.4 + 3, wv * 2.4, 8.8, 4), 6);
      const tau = 2.4 * smooth(0.05, 0.35, dn) * shape + 1.4 * thread * shape;
      const t = Math.exp(-tau);
      trans[i] = t;
      const m = smooth(-0.3, 0.35, qx + 0.6 * qy);
      const g = (gas * 0.75 + fil * 0.6 + veil) * t;
      const k = i * 3;
      img.d[k] += g * mix(1.0, 0.8, m);
      img.d[k + 1] += g * mix(0.97, 0.89, m);
      img.d[k + 2] += g * mix(0.93, 1.0, m);
    }
  }
  // Stars: dense, dimmed behind the dust; a few young ones sit inside the brightest gas.
  starfield(img, 303, { count: 9000, mask: trans, halos: false });
  const r = rng(304);
  for (let s = 0; s < 6; s++) {
    const x = W * (0.55 + r() * 0.35);
    const y = H * (0.2 + r() * 0.5);
    const b = 1.2 + r() * 2.2;
    img.splat(x, y, b, 0.9, [0.92, 0.95, 1]);
    img.splat(x, y, 0.025 * b, 9, [0.9, 0.94, 1]);
  }
  await save(img, "nebula", { exposure: 1.1, sat: 0.3 });
}

/* ---------------------------------------------------------------- (d) spiral galaxy */

async function galaxy() {
  const img = new Img();
  const n = perlin(41);
  const n2 = perlin(42);
  const r = rng(43);
  const cx = 1880;
  const cy = 500;
  const rg = 600; // disc scale in pixels
  const inc = (64 * Math.PI) / 180;
  const pa = (-24 * Math.PI) / 180;
  const cosI = Math.cos(inc);
  const cp = Math.cos(pa);
  const sp = Math.sin(pa);
  const pitch = (15 * Math.PI) / 180;
  const kSp = 1 / Math.tan(pitch);
  const toPlane = (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    const a = dx * cp + dy * sp;
    const b = (-dx * sp + dy * cp) / cosI;
    return [a / rg, b / rg];
  };
  const toScreen = (u, v) => {
    const a = u * rg;
    const b = v * rg * cosI;
    return [cx + a * cp - b * sp, cy + a * sp + b * cp];
  };
  const trans = new Float32Array(W * H).fill(1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [u, v] = toPlane(x + 0.5, y + 0.5);
      const rr = Math.hypot(u, v);
      if (rr > 1.9) continue;
      const i = y * W + x;
      const phi = Math.atan2(v, u);
      const warp = 0.55 * fbm(n2, u * 3, v * 3, 0.5, 4);
      const ph = phi - kSp * Math.log(rr + 0.02) + warp;
      const fadeIn = smooth(0.07, 0.2, rr);
      const arm = Math.pow(0.5 + 0.5 * Math.cos(2 * ph), 3) * fadeIn;
      const armS = Math.pow(0.5 + 0.5 * Math.cos(2 * ph), 9) * fadeIn;
      const clumps = (0.45 + 1.0 * smooth(-0.15, 0.55, fbm(n, u * 16, v * 16, 1.2, 5))) * (0.75 + 0.5 * fbm(n2, u * 48, v * 48, 2.2, 3));
      const disk = Math.exp(-rr / 0.2) * smooth(1.9, 0.9, rr);
      const bulge = 2.8 * Math.exp(-Math.pow(Math.hypot(u, v * cosI * 1.25) / 0.045, 0.85)) + 0.55 * Math.exp(-rr / 0.09);
      // Dust lanes trail the arms on their inner edges; the near side (v < 0 after tilt) shows more.
      const lane = Math.pow(0.5 + 0.5 * Math.cos(2 * (ph + 0.36)), 6) * smooth(-0.25, 0.35, fbm(n, u * 5 + 4, v * 5, 8.1, 5)) * smooth(0.05, 0.16, rr) * Math.exp(-rr / 0.7);
      const dustN = 0.6 + 0.6 * fbm(n, u * 9, v * 9, 3.3, 4);
      const mottle = smooth(0.0, 0.5, fbm(n2, u * 9, v * 9, 6.1, 5)) * smooth(0.08, 0.25, rr) * Math.exp(-rr / 0.6);
      const tau = 0.5 * mottle + 2.6 * lane * dustN * (v < 0 ? 1.25 : 0.85) + 0.25 * smooth(0.05, 0.4, rr) * Math.exp(-rr / 0.5) * dustN;
      const t = Math.exp(-tau);
      trans[i] = t;
      const armLight = disk * (0.45 + 1.1 * arm * clumps + 0.6 * armS * clumps);
      const outer = 0.08 * Math.exp(-rr / 0.55) * (0.4 + 0.6 * arm) * smooth(1.85, 0.9, rr);
      const bR = bulge * 1.0;
      const bG = bulge * 0.93;
      const bB = bulge * 0.82;
      const k = i * 3;
      img.d[k] += (bR + armLight * 0.82 + outer * 0.8) * t;
      img.d[k + 1] += (bG + armLight * 0.9 + outer * 0.88) * t;
      img.d[k + 2] += (bB + armLight * 1.0 + outer * 1.0) * t;
    }
  }
  // Star-forming knots along the arms.
  let knots = 0;
  while (knots < 380) {
    const rr = 0.08 + Math.pow(r(), 0.8) * 0.85;
    const phi = r() * Math.PI * 2;
    const u = rr * Math.cos(phi);
    const v = rr * Math.sin(phi);
    const ph = phi - kSp * Math.log(rr + 0.02) + 0.55 * fbm(n2, u * 3, v * 3, 0.5, 4);
    const arm = Math.pow(0.5 + 0.5 * Math.cos(2 * ph), 3);
    if (r() > arm) continue;
    knots++;
    const [sx, sy] = toScreen(u, v);
    const t = trans[Math.floor(clamp(sy, 0, H - 1)) * W + Math.floor(clamp(sx, 0, W - 1))];
    img.splat(sx, sy, (0.05 + r() * 0.25) * Math.exp(-rr / 0.5) * t, 0.7 + r() * 1.1, [0.82, 0.9, 1]);
  }
  // Foreground stars and a few faint background galaxies.
  starfield(img, 404, { count: 3400, density: (x, y) => 1 - 0.5 * smooth(500, 0, Math.hypot(x - cx, y - cy)) });
  for (let g = 0; g < 9; g++) {
    const x = r() * W;
    const y = r() * H;
    if (Math.hypot(x - cx, y - cy) < 800) continue;
    // Tiny, edge-on-ish smudges: distant galaxies, not out-of-focus blobs.
    const s = 1.2 + r() * 1.6;
    const a = r() * Math.PI;
    for (let q = 0; q < 5; q++) img.splat(x + Math.cos(a) * (q - 2) * s * 0.7, y + Math.sin(a) * (q - 2) * s * 0.7, (q === 2 ? 0.16 : 0.07) * (0.6 + r() * 0.6), s * 0.55, [1, 0.95, 0.88]);
  }
  await save(img, "galaxy", { exposure: 1.25, sat: 0.3 });
}

/* ================================================================ light (daylight) set
 * The light theme's scenes, public/space/light-*.webp. These are composed in display-referred linear
 * light (0 = black, 1 = paper white) instead of being tone mapped from HDR: the frame is mostly pale,
 * so the encoder only clamps, desaturates to a whisper of cool blue and applies the sRGB curve.
 */

async function saveLight(img, name, { sat = 0.35, quality = 88, grain = 0.9, gamma = 1 } = {}) {
  const out = Buffer.alloc(W * H * 3);
  const r = rng(4321);
  const d = img.d;
  for (let i = 0; i < W * H; i++) {
    const k = i * 3;
    const l = 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
    const dither = (r() + r() - 1) * grain;
    for (let j = 0; j < 3; j++) {
      let t = clamp(l + (d[k + j] - l) * sat);
      if (gamma !== 1) t = Math.pow(t, gamma);
      t = t <= 0.0031308 ? 12.92 * t : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
      out[k + j] = clamp(Math.round(t * 255 + dither), 0, 255);
    }
  }
  return encode(out, name, quality);
}

async function encode(raw, name, quality, channels = 3) {
  mkdirSync(OUT, { recursive: true });
  const file = join(OUT, `${name}.webp`);
  let q = quality;
  for (;;) {
    await sharp(raw, { raw: { width: W, height: H, channels } })
      .webp({ quality: q, alphaQuality: 80, effort: 6, smartSubsample: true })
      .toFile(file);
    const size = statSync(file).size;
    if (size <= MAX_BYTES || q <= 40) {
      console.log(`${name}.webp  ${W}x${H}  ${(size / 1024).toFixed(0)} KB  (q${q})`);
      return;
    }
    q -= 4;
  }
}

/** sRGB (0..255 or 0..1 hex-ish) to linear. */
const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
const linRGB = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
const mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/* ---------------------------------------------------------------- (a) daylight limb */

async function daylight() {
  const img = new Img();
  const n = perlin(51);
  const n2 = perlin(52);
  const n3 = perlin(53);
  const R = 2700;
  const cx = 1240;
  const top = 735;
  const cy = top + R;
  // The sun is high, in front and to the right: the whole disc is in daylight.
  const L = norm3([0.42, -0.42, 0.8]);
  const skyTop = linRGB(250, 251, 252);
  const skyLow = linRGB(232, 237, 243);
  const band = linRGB(158, 184, 216);
  const rim = linRGB(246, 249, 253);
  const ocean = linRGB(84, 102, 124);
  const deep = linRGB(58, 72, 92);
  const haze = linRGB(206, 218, 232);
  const cloudLit = linRGB(255, 255, 255);
  const cloudShade = linRGB(178, 188, 202);

  // Turbulence (sum of |noise|): cauliflower cumulus edges.
  const turb = (x, y, z, oct) => {
    let t = 0;
    let a = 1;
    let f = 1;
    let w = 0;
    for (let o = 0; o < oct; o++) {
      t += a * Math.abs(n3(x * f, y * f, z * f + o * 5.3));
      w += a;
      a *= 0.52;
      f *= 2.07;
    }
    return t / w;
  };
  const cloudAt = (x, y, z) => {
    const wx = fbm(n2, x * 0.5, y * 0.5, z * 0.5, 4);
    const wy = fbm(n2, x * 0.5 + 5.1, y * 0.5, z * 0.5 + 2.3, 4);
    // Weather systems sheared along latitude, cloud streets inside them, cumulus texture eroding the edges.
    const sys = fbm(n, x * 0.42 + wx * 1.5, y * 1.3 + wy * 0.6, z * 0.42 + wx * 1.5, 6);
    const streets = 0.5 + 0.5 * Math.sin((x + 0.6 * z) * 9 + wx * 6 + 2 * fbm(n2, x * 2, y * 2, z * 2, 3));
    const cum = turb(x * 4.2 + wx, y * 4.2 + wy, z * 4.2, 7);
    const v = sys + 0.05 + 0.16 * (streets - 0.5) + 0.55 * (cum - 0.3);
    const cov = smooth(-0.02, 0.2, v);
    return cov * (0.62 + 0.38 * smooth(0.1, 0.5, cum + 0.4 * sys));
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      const h = d - R;
      const k = i * 3;
      // Sky: paper white at the top, a cool blue-grey band hugging the limb, a hairline of bright rim.
      const hh = Math.max(0, h);
      const glow = Math.exp(-hh / 70) * 0.85 + Math.exp(-hh / 260) * 0.35;
      const sunSide = 0.5 + 0.5 * smooth(-1400, 1400, dx);
      let c = mix3(skyTop, skyLow, smooth(0, top, y) * 0.8);
      c = mix3(c, band, clamp(glow * (0.8 + 0.25 * sunSide)));
      c = mix3(c, rim, Math.exp(-(((hh - 3) / 4.5) ** 2)) * 0.9);
      // A second, fainter haze layer higher up (the stratospheric aerosol line).
      c = mix3(c, rim, Math.exp(-(((hh - 22) / 5) ** 2)) * 0.28);
      // Sun glow from the upper right (off frame).
      const sg = Math.exp(-Math.hypot(x - 2500, y + 200) / 900) * 0.18;
      c = [c[0] + sg, c[1] + sg, c[2] + sg * 0.98];
      const cov = clamp(R - d + 0.5);
      if (cov > 0) {
        const nx = dx / R;
        const ny = dy / R;
        const nz = Math.sqrt(Math.max(1e-6, 1 - nx * nx - ny * ny));
        const s = 9;
        const px = nx * s;
        const py = ny * s;
        const pz = nz * s;
        const cl = cloudAt(px, py, pz);
        // Cloud relief: brighter where the cover thickens towards the sun.
        const e = 0.012;
        const cl2 = cloudAt(px - L[0] * e * s, py - L[1] * e * s, pz);
        const relief = clamp(0.5 + (cl - cl2) * 5);
        const shadow = cloudAt(px + L[0] * 0.035, py + L[1] * 0.035, pz - 0.01);
        const lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        const sea = mix3(deep, ocean, 0.5 + 0.5 * fbm(n, px * 2, py * 2, pz * 2 + 9, 3));
        // Sun glint on the water.
        const ripple = 0.75 + 0.5 * fbm(n2, px * 14, py * 40, pz * 14, 3);
        const spec = (Math.exp(-(((x - 1840) / 330) ** 2 + ((y - 930) / 95) ** 2)) * 0.7 + Math.exp(-(((x - 1840) / 900) ** 2 + ((y - 930) / 260) ** 2)) * 0.12) * ripple;
        const sh = 1 - 0.55 * shadow * (1 - cl);
        let sfc = [sea[0] * sh + spec, sea[1] * sh + spec, sea[2] * sh + spec];
        const cc = mix3(cloudShade, cloudLit, clamp(0.25 + 0.75 * relief));
        sfc = mix3(sfc, cc, clamp(cl * 1.15));
        // Thin cirrus veils, stretched along latitude.
        const ci = smooth(0.05, 0.55, fbm(n2, px * 0.9 + 3, py * 4.5, pz * 0.9, 6)) * (0.6 + 0.4 * fbm(n3, px * 6, py * 22, pz * 6, 3));
        sfc = mix3(sfc, cloudLit, clamp(ci * 0.32 * (1 - cl)));
        sfc = sfc.map((v) => v * (0.55 + 0.5 * lam));
        // Aerial perspective: looking through more air towards the limb.
        const air = 1 - Math.exp(-0.085 / nz);
        const hz = mix3(haze, rim, Math.exp(-Math.max(0, R - d) / 6));
        sfc = mix3(sfc, hz, clamp(air * 1.05));
        c = mix3(c, sfc, cov);
      }
      img.d[k] = c[0];
      img.d[k + 1] = c[1];
      img.d[k + 2] = c[2];
    }
  }
  await saveLight(img, "light-daylight", { sat: 0.45 });
}

/* ---------------------------------------------------------------- (b) cloud deck at sunrise */

/** Hash two ints to [0, 1). */
function hash2(i, j, s) {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A field of jittered spheres seen from above (cumulus heads): height of the tallest dome over (x, z). */
function domes(x, z, cell, seed, fill = 0.85) {
  const gx = Math.floor(x / cell);
  const gz = Math.floor(z / cell);
  let best = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const a = gx + i;
      const b = gz + j;
      if (hash2(a, b, seed + 7) > fill) continue;
      const px = (a + 0.15 + 0.7 * hash2(a, b, seed)) * cell;
      const pz = (b + 0.15 + 0.7 * hash2(a, b, seed + 1)) * cell;
      const r = cell * (0.55 + 0.4 * hash2(a, b, seed + 2));
      const d2 = (x - px) ** 2 + (z - pz) ** 2;
      if (d2 < r * r) {
        const h = Math.sqrt(r * r - d2);
        if (h > best) best = h;
      }
    }
  return best;
}

/** In-place separable gaussian blur of the float image (softens column-marched silhouettes). */
function blur(img, sigma) {
  const r = Math.ceil(sigma * 3);
  const k = Array.from({ length: 2 * r + 1 }, (_, i) => Math.exp(-((i - r) ** 2) / (2 * sigma * sigma)));
  const sum = k.reduce((a, b) => a + b, 0);
  const tmp = new Float32Array(img.d.length);
  for (const [src, dst, horiz] of [
    [img.d, tmp, true],
    [tmp, img.d, false],
  ]) {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        for (let c = 0; c < 3; c++) {
          let v = 0;
          for (let i = -r; i <= r; i++) {
            const xx = horiz ? clamp(x + i, 0, W - 1) : x;
            const yy = horiz ? y : clamp(y + i, 0, H - 1);
            v += src[(yy * W + xx) * 3 + c] * k[i + r];
          }
          dst[(y * W + x) * 3 + c] = v / sum;
        }
  }
}

async function clouds() {
  const img = new Img();
  const n = perlin(61);
  const n2 = perlin(62);
  const hz = 455; // horizon row
  const cxs = W / 2;
  const f = 1250;
  const S = norm3([0.88, 0.2, 0.42]); // low sun, to the right and a little ahead
  const sunX = cxs + (S[0] / S[2]) * f * 0.42;
  const sunY = hz - 70;

  const skyTop = linRGB(214, 224, 236);
  const skyHz = linRGB(247, 248, 250);
  const lit = linRGB(255, 255, 254);
  const shade = linRGB(178, 189, 204);
  const deepShade = linRGB(138, 151, 170);
  const fogC = linRGB(246, 247, 249);

  // Sky first (everything above the clouds keeps it).
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = smooth(0, hz + 40, y);
      let c = mix3(skyTop, skyHz, Math.pow(t, 1.6));
      const dsx = (x - sunX) / 1.0;
      const dsy = (y - sunY) * 2.2;
      const g = Math.exp(-Math.hypot(dsx, dsy) / 620) * 0.3 + Math.exp(-Math.hypot(dsx, dsy) / 140) * 0.2;
      c = [c[0] + g, c[1] + g, c[2] + g * 0.97];
      // High, faint cirrus bands in the upper sky.
      const u = x / H;
      const v = y / H;
      const ci = smooth(0.05, 0.55, fbm(n2, u * 1.4 + 2, v * 7, 3.3, 6)) * smooth(0.05, 0.3, v) * smooth(hz / H, 0.2, v);
      c = mix3(c, lit, ci * 0.35);
      const k = (y * W + x) * 3;
      img.d[k] = c[0];
      img.d[k + 1] = c[1];
      img.d[k + 2] = c[2];
    }

  // Soft dome profile (no vertical walls, so the shading never aliases into stripes).
  const dome = (X, Z, cell, seed, fill) => {
    const h = domes(X, Z, cell, seed, fill);
    return h * h / (cell * 0.95);
  };
  const lowAt = (X, Z) => {
    const cov = smooth(-0.12, 0.3, fbm(n, X * 0.01, Z * 0.01, 1.7, 4));
    const roll = 1.6 * fbm(n2, X * 0.018, Z * 0.018, 4.2, 5);
    return { cov, base: roll + cov * (dome(X, Z, 16, 11, 0.8) * 0.75 + dome(X + 3, Z + 2, 7, 13, 0.75) * 0.7) - (1 - cov) * 2.4 };
  };
  const heightAt = (X, Z) => {
    const { cov, base } = lowAt(X, Z);
    const mid = dome(X + 0.7, Z, 2.8, 23, 0.85) * (0.25 + 0.75 * cov);
    const small = dome(X, Z + 0.3, 1.1, 37, 0.9) * (0.3 + 0.5 * cov);
    const fine = 0.22 * fbm(n, X * 0.7, Z * 0.7, 8.8, 4);
    return base + mid * 0.9 + small * 0.4 + fine;
  };

  const camH2 = 8.5;
  const ybuf = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    ybuf[x] = H;
    const dir = (x + 0.5 - cxs) / f;
    let z = 10;
    while (z < 2400) {
      const X = dir * z + 40;
      const Z = z;
      const h = heightAt(X, Z);
      const sy = hz + ((camH2 - h) / z) * f;
      if (sy < ybuf[x]) {
        const e = Math.max(0.02, z * 0.0011);
        const hx = (heightAt(X + e, Z) - h) / e;
        const hzz = (heightAt(X, Z + e) - h) / e;
        const N = norm3([-hx, 1, -hzz]);
        const ndl = N[0] * S[0] + N[1] * S[1] + N[2] * S[2];
        let occ = 0;
        for (const t of [0.6, 1.8]) {
          const hh = heightAt(X + S[0] * t, Z + S[2] * t) - (h + S[1] * t);
          occ = Math.max(occ, smooth(0, 0.4, hh));
        }
        // Crevices between heads sit in their neighbours' shade.
        const ao = smooth(-0.6, 0.9, h - lowAt(X, Z).base - 0.3);
        const diffuse = clamp((ndl + 0.45) / 1.45) * (1 - 0.6 * occ);
        const sky = 0.5 + 0.5 * N[1];
        let c = mix3(deepShade, shade, sky * (0.45 + 0.55 * ao));
        c = mix3(c, lit, Math.pow(diffuse, 1.1) * (0.55 + 0.45 * ao));
        const fog = 1 - Math.exp(-((z / 420) ** 1.25));
        const sunFog = Math.exp(-Math.abs(x - sunX) / 700) * 0.4;
        c = mix3(c, fogC, clamp(fog * (1 + sunFog)));
        const y0 = Math.max(0, Math.floor(sy));
        const y1 = Math.min(H, Math.ceil(ybuf[x]));
        for (let y = y0; y < y1; y++) {
          const k = (y * W + x) * 3;
          const a = y === y0 ? 1 - (sy - y0) : 1;
          img.d[k] = mix(img.d[k], c[0], a);
          img.d[k + 1] = mix(img.d[k + 1], c[1], a);
          img.d[k + 2] = mix(img.d[k + 2], c[2], a);
        }
        ybuf[x] = sy;
      }
      z += Math.max(0.01, z * 0.0022);
    }
  }
  blur(img, 1.4);
  await saveLight(img, "light-clouds", { sat: 0.4 });
}

/* ---------------------------------------------------------------- (c) the moon in a daytime sky */

async function lunar() {
  const img = new Img();
  const n = perlin(71);
  const n2 = perlin(72);
  const top = linRGB(170, 190, 216);
  const mid = linRGB(214, 224, 236);
  const low = linRGB(246, 248, 250);
  const white = linRGB(255, 255, 255);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = y / H;
      // Deeper silver-blue overhead, paling to near white at the horizon; brighter towards the (off-frame) sun on the left.
      let c = v < 0.55 ? mix3(top, mid, smooth(0, 0.55, v)) : mix3(mid, low, smooth(0.55, 1, v));
      const sun = Math.exp(-Math.hypot(x + 300, y - 900) / 1300) * 0.12;
      c = [c[0] + sun, c[1] + sun, c[2] + sun * 0.95];
      const k = (y * W + x) * 3;
      img.d[k] = c[0];
      img.d[k + 1] = c[1];
      img.d[k + 2] = c[2];
    }
  // The moon adds its light to the sky: the dark limb vanishes into the blue, the maria read as blue-grey.
  moonDisc(img, { cx: 1830, cy: 330, R: 210, L: norm3([0.5, -0.16, 0.85]), gain: 0.31, tint: [1, 1, 1], earthshine: 0 });
  // Cirrus in front of everything (a strand crosses the moon's lower limb), applied after the moon.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = x / H;
      const v = y / H;
      const warp = fbm(n2, u * 0.8, v * 0.8, 1.1, 3);
      const strand = smooth(0.06, 0.45, fbm(n, u * 1.1 + warp * 0.6, v * 6.5 + warp * 1.5, 2.2, 6));
      // Fibres: fine, strongly stretched streaks that follow the strand's slant.
      const fib = Math.pow(clamp(0.5 + 0.9 * fbm(n2, u * 3 + v * 2.2, v * 70 + warp * 8, 5.5, 4)), 1.6);
      const fray = 0.3 + 0.9 * fib;
      const zone = smooth(0.18, 0.7, v) * smooth(2.0, 0.5, u) + 0.4 * Math.exp(-(((v - 0.42) / 0.07) ** 2)) * smooth(0.9, 1.6, u);
      const a = clamp(strand * fray * zone * 0.62);
      const k = (y * W + x) * 3;
      img.d[k] = mix(img.d[k], white[0], a);
      img.d[k + 1] = mix(img.d[k + 1], white[1], a);
      img.d[k + 2] = mix(img.d[k + 2], white[2], a);
    }
  await saveLight(img, "light-lunar", { sat: 0.5 });
}

/* ---------------------------------------------------------------- (d) a celestial chart on paper */

/**
 * The Winter Hexagon (Orion, Taurus, Gemini, Auriga, the Dogs, Lepus) at J2000, stereographic
 * projection. Positions and magnitudes are real (rounded); the faint background dots are decorative.
 * [name, RA hours, Dec degrees, magnitude, label?]
 */
const CHART_STARS = {
  betelgeuse: [5.919, 7.41, 0.5, "Betelgeuse"],
  rigel: [5.242, -8.2, 0.13, "Rigel"],
  bellatrix: [5.419, 6.35, 1.64, "Bellatrix"],
  saiph: [5.796, -9.67, 2.06],
  alnitak: [5.679, -1.94, 1.77],
  alnilam: [5.603, -1.2, 1.69],
  mintaka: [5.533, -0.3, 2.23],
  meissa: [5.585, 9.93, 3.4],
  aldebaran: [4.599, 16.51, 0.85, "Aldebaran"],
  elnath: [5.438, 28.61, 1.65, "Elnath"],
  zetaTau: [5.627, 21.14, 3.0],
  gammaTau: [4.33, 15.63, 3.65],
  deltaTau: [4.382, 17.54, 3.76],
  epsTau: [4.477, 19.18, 3.53],
  thetaTau: [4.478, 15.87, 3.4],
  lambdaTau: [4.011, 12.49, 3.4],
  omicronTau: [3.414, 9.03, 3.6],
  alcyone: [3.791, 24.11, 2.87],
  electra: [3.748, 24.11, 3.7],
  atlas: [3.82, 24.05, 3.6],
  maia: [3.764, 24.37, 3.9],
  merope: [3.772, 23.95, 4.1],
  taygeta: [3.754, 24.47, 4.3],
  castor: [7.577, 31.89, 1.58, "Castor"],
  pollux: [7.755, 28.03, 1.14, "Pollux"],
  alhena: [6.628, 16.4, 1.93, "Alhena"],
  mebsuta: [6.732, 25.13, 3.06],
  tejat: [6.383, 22.51, 2.87],
  propus: [6.248, 22.51, 3.3],
  wasat: [7.335, 21.98, 3.5],
  mekbuda: [7.068, 20.57, 3.9],
  alzirr: [6.755, 12.9, 3.35],
  capella: [5.278, 46.0, 0.08, "Capella"],
  menkalinan: [5.992, 44.95, 1.9],
  thetaAur: [5.995, 37.21, 2.6],
  iotaAur: [4.95, 33.17, 2.7],
  epsAur: [5.033, 43.82, 3.0],
  sirius: [6.752, -16.72, -1.46, "Sirius"],
  mirzam: [6.378, -17.96, 1.98],
  wezen: [7.14, -26.39, 1.83],
  adhara: [6.977, -28.97, 1.5, "Adhara"],
  aludra: [7.402, -29.3, 2.45],
  furud: [6.338, -30.06, 3.0],
  procyon: [7.655, 5.22, 0.34, "Procyon"],
  gomeisa: [7.453, 8.29, 2.9],
  arneb: [5.545, -17.82, 2.6],
  nihal: [5.47, -20.76, 2.8],
  epsLep: [5.091, -22.37, 3.2],
  muLep: [5.216, -16.21, 3.3],
  deltaLep: [5.855, -20.88, 3.8],
  gammaLep: [5.741, -22.45, 3.6],
};
const CHART_LINES = [
  ["meissa", "betelgeuse"], ["meissa", "bellatrix"], ["betelgeuse", "alnitak"], ["bellatrix", "mintaka"],
  ["alnitak", "alnilam"], ["alnilam", "mintaka"], ["alnitak", "saiph"], ["mintaka", "rigel"], ["betelgeuse", "bellatrix"],
  ["elnath", "epsTau"], ["epsTau", "deltaTau"], ["deltaTau", "gammaTau"], ["gammaTau", "thetaTau"], ["thetaTau", "aldebaran"], ["aldebaran", "zetaTau"],
  ["gammaTau", "lambdaTau"], ["lambdaTau", "omicronTau"],
  ["castor", "pollux"], ["castor", "mebsuta"], ["mebsuta", "tejat"], ["tejat", "propus"], ["pollux", "wasat"], ["wasat", "mekbuda"], ["mekbuda", "alhena"], ["wasat", "alzirr"],
  ["capella", "menkalinan"], ["menkalinan", "thetaAur"], ["thetaAur", "elnath"], ["elnath", "iotaAur"], ["iotaAur", "epsAur"], ["epsAur", "capella"],
  ["mirzam", "sirius"], ["sirius", "wezen"], ["wezen", "aludra"], ["wezen", "adhara"], ["adhara", "furud"],
  ["procyon", "gomeisa"],
  ["muLep", "arneb"], ["arneb", "nihal"], ["nihal", "epsLep"], ["arneb", "gammaLep"], ["gammaLep", "deltaLep"],
];
const CHART_NAMES = [
  ["ORION", 5.25, 3.2],
  ["TAURUS", 4.15, 22.0],
  ["GEMINI", 7.0, 31.0],
  ["AURIGA", 5.6, 40.6],
  ["CANIS MAJOR", 6.55, -23.6],
  ["CANIS MINOR", 7.65, 9.6],
  ["LEPUS", 5.4, -25.4],
  ["PLEIADES", 3.6, 26.6],
];

async function chart() {
  const n = perlin(81);
  const n2 = perlin(82);
  const r = rng(83);
  const D = Math.PI / 180;
  const a0 = 6.0 * 15 * D;
  const d0 = 10 * D;
  const S = 11.2 / D; // px per radian at the centre
  const ccx = 1580;
  const ccy = 560;
  const proj = (raH, decDeg) => {
    const a = raH * 15 * D;
    const d = decDeg * D;
    const cosc = Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(a - a0);
    const k = 2 / (1 + cosc);
    const x = k * Math.cos(d) * Math.sin(a - a0);
    const y = k * (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(a - a0));
    // Sky charts are drawn as seen from below: east (increasing RA) is on the left.
    return [ccx - x * S, ccy - y * S];
  };
  const f1 = (v) => v.toFixed(1);
  const poly = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${f1(x)} ${f1(y)}`).join("");
  const parts = [];
  const mono = `font-family="JetBrains Mono, DejaVu Sans Mono, monospace"`;

  // Coordinate grid: declination circles every 10 deg, hour circles every 1h.
  const grid = [];
  for (let dec = -60; dec <= 80; dec += 10) {
    const pts = [];
    for (let ra = -2; ra <= 14; ra += 0.05) pts.push(proj(ra, dec));
    grid.push(poly(pts));
  }
  for (let ra = 0; ra < 24; ra += 1) {
    const pts = [];
    for (let dec = -80; dec <= 80; dec += 0.5) pts.push(proj(ra, dec));
    grid.push(poly(pts));
  }
  parts.push(`<path d="${grid.join("")}" fill="none" stroke="#0a0a0a" stroke-opacity="0.11" stroke-width="1"/>`);
  // Finer half-hour / 5 deg lines, fainter still.
  const fine = [];
  for (let dec = -55; dec <= 75; dec += 10) {
    const pts = [];
    for (let ra = -2; ra <= 14; ra += 0.05) pts.push(proj(ra, dec));
    fine.push(poly(pts));
  }
  for (let ra = 0.5; ra < 24; ra += 1) {
    const pts = [];
    for (let dec = -80; dec <= 80; dec += 0.5) pts.push(proj(ra, dec));
    fine.push(poly(pts));
  }
  parts.push(`<path d="${fine.join("")}" fill="none" stroke="#0a0a0a" stroke-opacity="0.05" stroke-width="1"/>`);
  // The celestial equator a little stronger, the ecliptic dashed.
  {
    const pts = [];
    for (let ra = -2; ra <= 14; ra += 0.05) pts.push(proj(ra, 0));
    parts.push(`<path d="${poly(pts)}" fill="none" stroke="#0a0a0a" stroke-opacity="0.24" stroke-width="1"/>`);
    const eps = 23.44 * D;
    const ec = [];
    for (let lam = -10; lam <= 210; lam += 0.5) {
      const l = lam * D;
      const ra = (Math.atan2(Math.sin(l) * Math.cos(eps), Math.cos(l)) / D / 15 + 24) % 24;
      const dec = Math.asin(Math.sin(l) * Math.sin(eps)) / D;
      ec.push(proj(ra > 18 ? ra - 24 : ra, dec));
    }
    parts.push(`<path d="${poly(ec)}" fill="none" stroke="#0a0a0a" stroke-opacity="0.32" stroke-width="1" stroke-dasharray="7 6"/>`);
    const [ex, ey] = proj(8.6, 18.9);
    parts.push(`<text x="${f1(ex)}" y="${f1(ey - 10)}" ${mono} font-size="13" letter-spacing="2.4" fill="#0a0a0a" fill-opacity="0.42" transform="rotate(-14 ${f1(ex)} ${f1(ey)})">ECLIPTIC</text>`);
    const [qx, qy] = proj(8.55, 0);
    parts.push(`<text x="${f1(qx)}" y="${f1(qy - 9)}" ${mono} font-size="13" letter-spacing="2.4" fill="#0a0a0a" fill-opacity="0.42" transform="rotate(-6 ${f1(qx)} ${f1(qy)})">EQUATOR</text>`);
  }
  // Grid labels: hours along the bottom, declinations up the right-hand side.
  for (let ra = 2; ra <= 10; ra++) {
    // Find where this hour circle crosses y = 1050.
    let best = null;
    for (let dec = -80; dec <= 80; dec += 0.1) {
      const [x, y] = proj(ra, dec);
      if (!best || Math.abs(y - 1050) < Math.abs(best[1] - 1050)) best = [x, y];
    }
    if (best && best[0] > 30 && best[0] < W - 60) parts.push(`<text x="${f1(best[0] + 7)}" y="1050" ${mono} font-size="14" fill="#0a0a0a" fill-opacity="0.5">${ra}h</text>`);
  }
  for (let dec = -20; dec <= 50; dec += 10) {
    const [x, y] = proj(3.05, dec);
    if (y > 30 && y < H - 30) parts.push(`<text x="${f1(x + 8)}" y="${f1(y - 6)}" ${mono} font-size="14" fill="#0a0a0a" fill-opacity="0.5">${dec > 0 ? "+" : dec < 0 ? "−" : ""}${Math.abs(dec)}°</text>`);
  }

  // Stars, with a paper-coloured gap around each so the figure lines stop short of them.
  const rad = (m) => clamp(1.3 + (3.6 - m) * 1.15, 1.2, 7.4);
  const P = Object.fromEntries(Object.entries(CHART_STARS).map(([k, [ra, dec, m, label]]) => [k, { xy: proj(ra, dec), m, label }]));
  const lines = [];
  for (const [a, b] of CHART_LINES) {
    const A = P[a];
    const B = P[b];
    const dx = B.xy[0] - A.xy[0];
    const dy = B.xy[1] - A.xy[1];
    const len = Math.hypot(dx, dy);
    const ga = rad(A.m) + 6;
    const gb = rad(B.m) + 6;
    if (len < ga + gb + 4) continue;
    const ux = dx / len;
    const uy = dy / len;
    lines.push(`M${f1(A.xy[0] + ux * ga)} ${f1(A.xy[1] + uy * ga)}L${f1(B.xy[0] - ux * gb)} ${f1(B.xy[1] - uy * gb)}`);
  }
  // The Winter Hexagon itself: a faint dotted asterism through its six first-magnitude stars.
  {
    const hex = ["sirius", "procyon", "pollux", "capella", "aldebaran", "rigel", "sirius"].map((k) => P[k].xy);
    parts.push(`<path d="${poly(hex)}" fill="none" stroke="#0a0a0a" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="1 5" stroke-linecap="round"/>`);
  }
  parts.push(`<path d="${lines.join("")}" fill="none" stroke="#0a0a0a" stroke-opacity="0.72" stroke-width="1.25" stroke-linecap="round"/>`);
  // Decorative faint field stars (kept tiny and grey so they never read as named objects).
  const field = [];
  for (let i = 0; i < 900; i++) {
    const x = r() * W;
    const y = r() * H;
    const m = 4.2 + Math.pow(r(), 0.6) * 2.4;
    field.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${(0.5 + (6.6 - m) * 0.42).toFixed(2)}"/>`);
  }
  parts.push(`<g fill="#0a0a0a" fill-opacity="0.38">${field.join("")}</g>`);
  for (const { xy, m } of Object.values(P)) {
    const rr = rad(m);
    if (m < 1) parts.push(`<circle cx="${f1(xy[0])}" cy="${f1(xy[1])}" r="${(rr + 4).toFixed(2)}" fill="none" stroke="#0a0a0a" stroke-opacity="0.5" stroke-width="0.9"/>`);
    parts.push(`<circle cx="${f1(xy[0])}" cy="${f1(xy[1])}" r="${rr.toFixed(2)}" fill="#0a0a0a"/>`);
  }
  // M42, the Orion Nebula: a dashed ring below the belt.
  {
    const [x, y] = proj(5.588, -5.39);
    parts.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="none" stroke="#0a0a0a" stroke-opacity="0.55" stroke-width="1" stroke-dasharray="2.5 2.5"/>`);
    parts.push(`<text x="${f1(x + 15)}" y="${f1(y + 4)}" ${mono} font-size="12" fill="#0a0a0a" fill-opacity="0.5">M42</text>`);
  }
  // Label placement per star: [dx, dy, anchor].
  const at = { capella: [14, -10, "start"], aldebaran: [-14, 22, "end"], castor: [-12, -8, "end"], pollux: [-14, 6, "end"], elnath: [14, 6, "start"], betelgeuse: [-14, 4, "end"], adhara: [14, 4, "start"], sirius: [-16, 4, "end"] };
  for (const [key, { xy, label }] of Object.entries(P)) {
    if (!label) continue;
    const [dx, dy, anchor] = at[key] ?? [12, 18, "start"];
    parts.push(`<text x="${f1(xy[0] + dx)}" y="${f1(xy[1] + dy)}" ${mono} font-size="13" text-anchor="${anchor}" fill="#0a0a0a" fill-opacity="0.62">${label}</text>`);
  }
  for (const [name, ra, dec] of CHART_NAMES) {
    const [x, y] = proj(ra, dec);
    parts.push(`<text x="${f1(x)}" y="${f1(y)}" ${mono} font-size="${name === "PLEIADES" ? 11 : 15}" letter-spacing="${name === "PLEIADES" ? 2 : 4.5}" text-anchor="middle" fill="#0a0a0a" fill-opacity="0.55">${name}</text>`);
  }
  // A graduated ring (planisphere style) around the field.
  {
    const R0 = 560;
    const ticks = [];
    for (let deg = 0; deg < 360; deg += 2) {
      const a = deg * D;
      const len = deg % 30 === 0 ? 16 : deg % 10 === 0 ? 9 : 5;
      ticks.push(`M${f1(ccx + Math.cos(a) * R0)} ${f1(ccy + Math.sin(a) * R0)}L${f1(ccx + Math.cos(a) * (R0 - len))} ${f1(ccy + Math.sin(a) * (R0 - len))}`);
    }
    parts.push(`<circle cx="${ccx}" cy="${ccy}" r="${R0}" fill="none" stroke="#0a0a0a" stroke-opacity="0.3" stroke-width="1"/>`);
    parts.push(`<circle cx="${ccx}" cy="${ccy}" r="${R0 + 7}" fill="none" stroke="#0a0a0a" stroke-opacity="0.16" stroke-width="1"/>`);
    parts.push(`<path d="${ticks.join("")}" stroke="#0a0a0a" stroke-opacity="0.32" stroke-width="1"/>`);
    for (let deg = 0; deg < 360; deg += 30) {
      const a = (deg - 90) * D;
      const x = ccx + Math.cos(a) * (R0 + 24);
      const y = ccy + Math.sin(a) * (R0 + 24);
      parts.push(`<text x="${f1(x)}" y="${f1(y + 4)}" ${mono} font-size="12" text-anchor="middle" fill="#0a0a0a" fill-opacity="0.45">${String(deg).padStart(3, "0")}</text>`);
    }
  }
  // Plate caption, top right.
  parts.push(`<g ${mono} fill="#0a0a0a"><text x="2290" y="62" font-size="13" letter-spacing="3" text-anchor="end" fill-opacity="0.6">PLATE IV · THE WINTER HEXAGON</text><text x="2290" y="84" font-size="12" letter-spacing="1.5" text-anchor="end" fill-opacity="0.42">EPOCH J2000.0 · STEREOGRAPHIC · CENTRE 6h +10°</text></g>`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;

  // Paper: warm-neutral off-white, a fine fibre texture, a faint wash where the Milky Way runs.
  const img = new Img();
  const paper = linRGB(246, 246, 243);
  const [mx0, my0] = proj(5.2, 48);
  const [mx1, my1] = proj(7.4, -28);
  const mdx = mx1 - mx0;
  const mdy = my1 - my0;
  const mlen = Math.hypot(mdx, mdy);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = x / H;
      const v = y / H;
      const fibre = 0.012 * fbm(n, u * 60, v * 9, 0.5, 3) + 0.008 * fbm(n2, u * 220, v * 220, 1.5, 2);
      const blot = 0.012 * fbm(n2, u * 2.2, v * 2.2, 3.3, 4);
      // Distance from the Milky Way's centre line.
      const t = ((x - mx0) * mdy - (y - my0) * mdx) / mlen;
      const mw = Math.exp(-((t / 150) ** 2)) * (0.5 + 0.5 * smooth(-0.3, 0.5, fbm(n, u * 3, v * 3, 7.1, 5)));
      const vig = 0.025 * smooth(0.5, 1.25, Math.hypot(u - 1.2, (v - 0.5) * 1.6));
      const k = 1 + fibre + blot - 0.05 * mw - vig;
      const i = (y * W + x) * 3;
      img.d[i] = paper[0] * k;
      img.d[i + 1] = paper[1] * k;
      img.d[i + 2] = paper[2] * k * (1 + 0.006 * mw);
    }
  const base = Buffer.alloc(W * H * 3);
  const rr = rng(84);
  for (let i = 0; i < W * H * 3; i++) {
    let t = clamp(img.d[i]);
    t = t <= 0.0031308 ? 12.92 * t : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
    base[i] = clamp(Math.round(t * 255 + (rr() + rr() - 1) * 0.8), 0, 255);
  }
  const raw = await sharp(base, { raw: { width: W, height: H, channels: 3 } })
    .composite([{ input: Buffer.from(svg) }])
    .removeAlpha()
    .raw()
    .toBuffer();
  await encode(raw, "light-chart", 90);
}

/* ---------------------------------------------------------------- clouds: drifting veil (RGBA, tiles horizontally) */

/**
 * Wisps of mist and cirrus on transparency, seamless left to right (noise sampled on a cylinder), for the
 * light "Clouds" scene: the hero slides two copies of it at different speeds over the deck (parallax).
 */
async function veil() {
  const n = perlin(91);
  const n2 = perlin(92);
  const out = Buffer.alloc(W * H * 4);
  const r = rng(93);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const th = (x / W) * Math.PI * 2;
      const v = y / H;
      // Horizontal period = the frame width; ~3.2 noise units around the cylinder per radian.
      const cx = Math.cos(th) * 1.7;
      const cz = Math.sin(th) * 1.7;
      const warp = fbm(n2, cx * 0.8, v * 4, cz * 0.8, 3);
      const mist = smooth(0.02, 0.5, fbm(n, cx + warp * 0.5, v * 24 + warp * 2.5, cz, 6));
      const fib = 0.5 + 0.5 * fbm(n2, cx * 4, v * 110 + warp * 10, cz * 4, 3);
      // Mist sits along the deck's horizon; a fainter cirrus band floats higher in the sky.
      const band = 0.9 * Math.exp(-(((v - 0.47) / 0.11) ** 2)) + 0.45 * Math.exp(-(((v - 0.2) / 0.08) ** 2)) + 0.35 * Math.exp(-(((v - 0.72) / 0.14) ** 2));
      const a = clamp(mist * fib * band * 0.55);
      const k = (y * W + x) * 4;
      out[k] = out[k + 1] = 255;
      out[k + 2] = 255;
      out[k + 3] = clamp(Math.round(a * 255 + (r() - 0.5)), 0, 255);
    }
  // Soft content: half resolution is indistinguishable once scaled up, at a fraction of the bytes.
  const file = join(OUT, "light-clouds-veil.webp");
  await sharp(out, { raw: { width: W, height: H, channels: 4 } })
    .resize(W / 2, H / 2)
    .webp({ quality: 70, alphaQuality: 70, effort: 6 })
    .toFile(file);
  console.log(`light-clouds-veil.webp  ${W / 2}x${H / 2}  ${(statSync(file).size / 1024).toFixed(0)} KB`);
}

/* ================================================================ home page set
 * The marketing home hero's scenes, public/space/home-*.webp: four night scenes and four daylight scenes,
 * distinct in subject from the dashboard set above. Same pipeline: night scenes are HDR into save(), day
 * scenes are display-referred into saveLight() (or SVG linework over paper). The headline sits centred over
 * the top ~55% of the frame, so each subject sits right of centre or in the lower third and the centre-top
 * stays calm.
 */

const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** fBm that fades out octaves finer than the sample footprint `fp` (noise units): no shimmer at distance. */
function fbmLod(n, x, y, z, oct, fp, lac = 2.03, gain = 0.5) {
  let s = 0;
  let a = 1;
  let f = 1;
  let t = 0;
  for (let i = 0; i < oct; i++) {
    const w = smooth(0.55, 0.22, f * fp);
    if (w > 0) s += a * w * n(x * f, y * f, z * f + i * 7.13);
    t += a;
    a *= gain;
    f *= lac;
  }
  return s / t;
}

/**
 * A Saturn-like ring system at `rho` (planet radii): [opacity, albedo]. D, C, B rings, the Cassini division,
 * the A ring with the Encke and Keeler gaps, and the narrow F ring; ringlets come from 1D noise.
 */
function ringProfile(rho, n) {
  if (rho < 1.11 || rho > 2.345) return [0, 0];
  const fine = (k, s) => n(rho * k, s, 0.5);
  if (rho < 1.24) return [0.03 * smooth(1.11, 1.22, rho), 0.3];
  if (rho < 1.525) {
    // C ring: translucent, with brighter plateaus.
    const plateau = smooth(0.25, 0.4, fine(26, 1.3));
    return [clamp(0.09 + 0.06 * smooth(1.24, 1.5, rho) + 0.12 * plateau + 0.03 * fine(120, 2.2)), 0.36 + 0.1 * plateau];
  }
  if (rho < 1.95) {
    // B ring: the dense, bright one, with fine radial structure.
    const t = (rho - 1.525) / 0.425;
    const a = 0.6 + 0.32 * smooth(0, 0.3, t) - 0.1 * smooth(0.88, 1, t) + 0.1 * fine(44, 2.1) + 0.07 * fine(150, 3.7);
    return [clamp(a), 0.66 + 0.24 * smooth(0, 0.45, t) + 0.12 * fine(30, 4.4) + 0.06 * fine(95, 8.1)];
  }
  if (rho < 2.025) {
    // Cassini division: nearly empty, a few faint ringlets.
    const ringlet = Math.exp(-(((rho - 1.99) / 0.004) ** 2)) * 0.12;
    return [0.05 + ringlet + 0.025 * Math.max(0, fine(160, 5.1)), 0.4];
  }
  if (rho < 2.27) {
    const t = (rho - 2.025) / 0.245;
    let a = 0.48 + 0.1 * smooth(0, 0.25, t) - 0.12 * smooth(0.72, 1, t) + 0.05 * fine(90, 6.2) + 0.03 * fine(170, 7.7);
    a *= 1 - 0.94 * Math.exp(-(((rho - 2.214) / 0.004) ** 2)); // Encke gap
    a *= 1 - 0.75 * Math.exp(-(((rho - 2.262) / 0.002) ** 2)); // Keeler gap
    return [clamp(a), 0.64 - 0.1 * t];
  }
  return [0.3 * Math.exp(-(((rho - 2.326) / 0.0035) ** 2)), 0.75]; // F ring
}

/**
 * A ringed gas giant, orthographic view along -z (screen y down, z towards the viewer). The pole is tilted
 * `tilt` towards the viewer and turned `pa` in the screen plane; the rings lie in the equatorial plane.
 * Handles occlusion both ways, the rings' shadow on the globe and the globe's shadow on the rings.
 * Adds radiance x `gain` into `img`, supersampled `ss` x `ss`, and returns the sky's transmission.
 */
function ringedPlanet(img, { cx, cy, R, tilt, pa, L, gain = 1, seed = 140, ss = 3, tint = [1, 0.985, 0.96], ringTint = [1, 1, 1], bandContrast = 1 }) {
  const n = perlin(seed + 1);
  const n2 = perlin(seed + 2);
  const n3 = perlin(seed + 3);
  const ct = Math.cos(tilt);
  const P = [ct * Math.sin(pa), -ct * Math.cos(pa), Math.sin(tilt)];
  const E1 = norm3(cross3([0, 0, 1], P));
  const E2 = cross3(P, E1);
  const nL = dot3(P, L);
  const litFace = Math.sign(nL) === Math.sign(P[2]);
  const ringLight = Math.pow(Math.abs(nL), 0.3);
  const sky = new Float32Array(W * H).fill(1);
  const ext = 2.36 * R;
  const x0 = Math.max(0, Math.floor(cx - ext - 2));
  const x1 = Math.min(W - 1, Math.ceil(cx + ext + 2));
  const ey = Math.max(R, ext * Math.abs(P[2]) + ext * 0.2 * Math.abs(Math.sin(pa)) + 4);
  const y0 = Math.max(0, Math.floor(cy - ey - 2));
  const y1 = Math.min(H - 1, Math.ceil(cy + ey + 2));
  const inv = 1 / (ss * ss);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      let pr = 0;
      let rr = 0;
      let tr = 0;
      for (let sj = 0; sj < ss; sj++)
        for (let si = 0; si < ss; si++) {
          const dx = x + (si + 0.5) / ss - cx;
          const dy = y + (sj + 0.5) / ss - cy;
          const d2 = dx * dx + dy * dy;
          const inDisc = d2 < R * R;
          const zs = inDisc ? Math.sqrt(R * R - d2) : -Infinity;
          const zr = -(P[0] * dx + P[1] * dy) / P[2];
          const rho = Math.sqrt(d2 + zr * zr) / R;
          let ra = 0;
          let ring = 0;
          if (rho > 1.1 && rho < 2.35 && zr > zs) {
            const [a, alb] = ringProfile(rho, n3);
            ra = a;
            if (a > 0) {
              // The globe's shadow on the rings.
              const b = dx * L[0] + dy * L[1] + zr * L[2];
              let sh = 1;
              if (b < 0) sh = smooth(R * 0.985, R * 1.012, Math.sqrt(Math.max(0, d2 + zr * zr - b * b)));
              ring = alb * (litFace ? a : a * (1 - a) * 1.3) * sh * ringLight;
            }
          }
          let planet = 0;
          if (inDisc) {
            const N = [dx / R, dy / R, zs / R];
            const mu0 = dot3(N, L);
            if (mu0 > -0.05) {
              const lat = Math.asin(clamp(dot3(N, P), -1, 1));
              const ex = dot3(N, E1);
              const ey2 = dot3(N, E2);
              // Zonal bands: a 1D noise profile in latitude, warped by sheared turbulence, fine streaks along the jets.
              const warp = fbm(n, ex * 2.6, lat * 9, ey2 * 2.6, 5);
              const lw = lat + 0.016 * warp + 0.005 * fbm(n2, ex * 8, lat * 38, ey2 * 8, 3);
              const prof = fbm(n, lw * 7.5, 3.1, 0.7, 6, 2.1, 0.62);
              const eq = Math.exp(-((lw / 0.22) ** 2));
              const bands = 0.34 * prof + 0.1 * eq + 0.05 * fbm(n2, ex * 1.4, lw * 80, ey2 * 1.4, 4) * (1 - 0.6 * smooth(0.7, 1.2, Math.abs(lat)));
              const alb = (0.66 + 0.5 * bandContrast * bands) * (1 - 0.3 * bandContrast * smooth(0.8, 1.35, Math.abs(lat)));
              let shade = Math.pow(Math.max(0, mu0), 0.8) * Math.pow(Math.max(0.02, N[2]), 0.3) * smooth(-0.04, 0.1, mu0);
              // The rings' shadow on the globe.
              if (Math.abs(nL) > 1e-4 && shade > 0) {
                const t = -(dot3(P, [dx, dy, zs])) / nL;
                if (t > 0) {
                  const q = Math.hypot(dx + t * L[0], dy + t * L[1], zs + t * L[2]) / R;
                  shade *= 1 - 0.9 * ringProfile(q, n3)[0];
                }
              }
              planet = alb * shade;
            }
          }
          if (ra > 0) {
            rr += ring;
            pr += planet * (1 - ra);
            tr += inDisc ? 0 : 1 - ra;
          } else {
            pr += planet;
            tr += inDisc ? 0 : 1;
          }
        }
      const i = y * W + x;
      sky[i] = tr * inv;
      const p = pr * inv * gain;
      const r = rr * inv * gain;
      img.add(i, p * tint[0] + r * ringTint[0], p * tint[1] + r * ringTint[1], p * tint[2] + r * ringTint[2]);
    }
  return sky;
}

/* ---------------------------------------------------------------- home (a) ringed gas giant */

async function homeRings() {
  const img = new Img();
  const cx = 1790;
  const cy = 700;
  const R = 255;
  const sky = ringedPlanet(img, { cx, cy, R, tilt: (17 * Math.PI) / 180, pa: (-19 * Math.PI) / 180, L: norm3([-0.84, -0.36, 0.4]), gain: 0.95, ringTint: [0.9, 0.91, 0.93] });
  starfield(img, 501, { count: 2600, mask: sky, density: (x, y) => 0.45 + 0.55 * smooth(250, 700, Math.hypot(x - cx, (y - cy) * 2.2)) });
  // Two small moons, unresolved points near the ring plane.
  img.splat(1190, 875, 0.5, 0.75, [1, 0.98, 0.95], 1, sky);
  img.splat(2268, 548, 0.28, 0.65, [1, 0.98, 0.95], 1, sky);
  await save(img, "home-rings", { exposure: 1.25, sat: 0.22 });
}

/* ---------------------------------------------------------------- home (b) total solar eclipse */

async function homeEclipse() {
  const img = new Img();
  const n = perlin(111);
  const n2 = perlin(112);
  const n3 = perlin(113);
  const cx = 1800;
  const cy = 560;
  const R = 104; // the sun; the moon is 2% larger
  const Rm = R * 1.02;
  const ax = (-17 * Math.PI) / 180; // the sun's equator: streamers crowd towards it
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  // Helmet streamers: [angle, base width, strength].
  const streamers = [
    [ax + 0.05, 0.3, 1.0],
    [ax + Math.PI - 0.08, 0.34, 0.85],
    [ax + 0.62, 0.16, 0.45],
    [ax - 0.55, 0.13, 0.32],
    [ax + Math.PI + 0.6, 0.15, 0.4],
    [ax + Math.PI - 0.72, 0.12, 0.3],
  ];
  const sky = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const r = Math.hypot(dx, dy);
      const cov = clamp(Rm - r + 0.5);
      sky[i] = 1 - cov;
      if (cov >= 1) {
        img.add(i, 0.0012, 0.0013, 0.0015); // earthshine, barely
        continue;
      }
      const rho = r / R;
      const th = Math.atan2(dy, dx);
      const phi = th - ax;
      const lat = Math.atan2(Math.sin(phi), Math.abs(Math.cos(phi)));
      const lr = Math.log(rho);
      const open = 1 - 1 / rho;
      // Field lines: traced back to a footpoint angle. Away from the streamers they open super-radially
      // (polar plumes lean towards the equator); next to a streamer they converge into its stalk.
      let fa = th + 0.3 * open * Math.sin(2 * phi) * smooth(0.25, 1.1, Math.abs(lat));
      let S = 0;
      for (const [a, w, amp] of streamers) {
        const d = wrap(th - a);
        const width = w * (0.32 + 0.68 / Math.pow(rho, 1.15));
        const wgt = Math.exp(-((d / (w * 1.6)) ** 2));
        fa += d * wgt * 0.9 * open;
        S += amp * Math.exp(-((d / width) ** 2));
      }
      const c0 = Math.cos(fa);
      const s0 = Math.sin(fa);
      const fil = 0.5 + 0.5 * fbm(n, c0 * 3.2, s0 * 3.2, lr * 0.5, 4);
      const fine = 0.5 + 0.5 * fbm(n2, c0 * 16, s0 * 16, lr * 0.75 + 0.3, 3);
      const hair = 0.5 + 0.5 * n3(c0 * 60, s0 * 60, lr * 1.2);
      const strand = Math.pow(clamp(fil), 2.4) * (0.3 + 1.0 * Math.pow(clamp(fine), 2)) * (0.6 + 0.8 * Math.pow(clamp(hair), 1.5));
      // Brightness falls steeply off the limb; the tone curve keeps the structure readable across the range.
      const K = 0.45 * Math.pow(rho, -7) + 0.24 * Math.pow(rho, -3.6) + 0.004 * Math.pow(rho, -1.5);
      // Streamers: broad helmets near the limb narrowing into long, faint, fibrous stalks.
      const helmet = 0.2 * Math.pow(rho, -2.7) * S * (0.3 + 0.9 * fil * fil + 0.45 * hair * fine) * smooth(1.0, 1.15, rho);
      const polar = smooth(0.7, 1.3, Math.abs(lat));
      let I = K * (0.22 + 1.5 * strand * (0.8 + 0.5 * polar)) + helmet;
      // A dim, smooth F-corona far out.
      I += 0.002 * Math.exp(-(rho - 1) / 5);
      // The chromosphere: a thin, broken rim peeking out on the lower right.
      const rimSide = Math.exp(-((wrap(th - 0.9) / 0.5) ** 2));
      const chrom = Math.exp(-Math.max(0, r - Rm) / 1.1) * rimSide * (0.4 + 0.6 * smooth(-0.1, 0.4, n3(th * 9, 0.2, 0.7)));
      const k = 1 - cov;
      img.add(i, (I + chrom * 2.2) * k, (I * 0.99 + chrom * 1.7) * k, (I * 1.02 + chrom * 1.8) * k);
    }
  // Prominences: a few small, soft tufts of glowing gas standing on the limb.
  const r = rng(114);
  for (const [ang, h, w] of [
    [0.78, 11, 0.05],
    [1.06, 7, 0.03],
    [-2.42, 9, 0.045],
    [2.72, 6, 0.03],
    [-0.36, 5, 0.025],
  ]) {
    for (let s = 0; s < 90; s++) {
      const t = Math.pow(r(), 1.6); // most of the gas sits low
      const a = ang + (r() - 0.5) * w * (1 - 0.5 * t) + 0.012 * Math.sin(t * 6 + ang);
      const rr = Rm - 0.5 + t * h;
      img.splat(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.018 * (1 - 0.7 * t), 1.0 + r() * 0.8, [1, 0.74, 0.8], 1, sky);
    }
  }
  starfield(img, 505, { count: 2000, mask: sky, density: (x, y) => smooth(R * 2.5, R * 6, Math.hypot(x - cx, y - cy)) });
  // Venus, low and to the right of the sun.
  img.splat(2205, 905, 3.2, 0.8, [1, 0.99, 0.96]);
  img.splat(2205, 905, 0.03, 4.5, [1, 0.99, 0.96]);
  await save(img, "home-eclipse", { exposure: 1.6, sat: 0.24 });
}

/* ---------------------------------------------------------------- home (c) aurora on the night limb */

async function homeAurora() {
  const img = new Img();
  const n = perlin(121);
  const n2 = perlin(122);
  const n3 = perlin(123);
  const R = 2600;
  const cx = 2060;
  const top = 520; // limb high enough to clear the home hero's product tour
  const cy = top + R;
  const sky = new Float32Array(W * H);
  // Brightness along the limb (arc length s, 0 at the top of the limb, positive to the right).
  const envelope = (s) => smooth(-1500, -950, s) * smooth(520, 260, s) * (0.35 + 0.65 * smooth(-1000, 0, s)) * (0.6 + 0.55 * smooth(-0.2, 0.4, fbm(n, s / 520, 3.3, 0.4, 3)));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      const h = d - R;
      const s = Math.atan2(dx, -dy) * R;
      const cov = clamp(-h + 0.5);
      sky[i] = 1 - cov;
      const E = envelope(s);
      let r = 0;
      let g = 0;
      let b = 0;
      // Airglow: a thin, faint shell ~90 km up, separated from the limb by a dark gap.
      const air = 0.05 * Math.exp(-(((h - 34) / 3.2) ** 2)) + 0.012 * Math.exp(-(((h - 34) / 12) ** 2));
      r += air * 0.86;
      g += air * 1.0;
      b += air * 0.98;
      // The aurora: curtains of vertical rays standing on a sharp, wavering lower edge.
      if (E > 0.001 && h > 0) {
        const hb = 40 + 18 * fbm(n, s / 360, 1.7, 0.2, 4) + 6 * fbm(n2, s / 70, 0.3, 1.1, 2);
        const Hc = 30 + 36 * (0.5 + 0.5 * fbm(n2, s / 300, 2.2, 0.9, 3));
        const u = h - hb;
        if (u > -4) {
          const edge = smooth(-2.5, 1.2, u);
          // A bright ribbon right above the lower edge, then rays fading upwards.
          const ribbon = Math.exp(-Math.max(0, u) / 7);
          const tall = Math.exp(-Math.max(0, u) / (Hc * 0.5)) + 0.18 * Math.exp(-Math.max(0, u) / (Hc * 1.7));
          const rays = Math.pow(clamp(0.5 + 0.8 * fbm(n3, s / 6.5, h / 300, 0.4, 3)), 4);
          const bundle = 0.35 + 0.9 * smooth(-0.25, 0.45, fbm(n3, s / 45, h / 700, 3.3, 3));
          // Folds: where the curtain turns towards us it is seen edge-on and brightens.
          const fold = 0.3 + 1.3 * Math.pow(smooth(-0.05, 0.5, fbm(n, s / 130, 5.2, 0.7, 3)), 2);
          const a = E * fold * edge * (0.85 * ribbon * (0.65 + 0.5 * rays) + 0.42 * tall * bundle * (0.2 + 1.2 * rays)) + E * 0.035 * Math.exp(-Math.abs(u) / 28);
          // Lower curtain a whisper of cyan, the tall upper rays neutral.
          const up = smooth(0, Hc, u);
          r += a * mix(0.8, 0.95, up);
          g += a * 1.0;
          b += a * mix(0.96, 1.0, up);
        }
      }
      if (cov > 0) {
        // Night side: no city lights; cloud tops faintly lit by moonlight and, near the aurora, by its glow.
        const delta = Math.max(0, -h);
        const nx = dx / R;
        const ny = dy / R;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
        const px = nx * 30;
        const py = ny * 30;
        const pz = nz * 30;
        const wx = fbm(n2, px * 0.5, py * 0.5, pz * 0.5, 3);
        const c = fbm(n, px + wx * 1.4, py, pz + wx * 1.4, 6);
        const cloud = Math.pow(smooth(-0.1, 0.5, c), 1.5);
        // Cloud tops: barely there, brighter (and foreshortened) towards the limb where the aurora lights them.
        const near = Math.exp(-delta / 220);
        const lit = 0.0012 + 0.0028 * cloud * (0.4 + 0.6 * near) + 0.016 * E * cloud * Math.exp(-delta / 90);
        // Looking edge-on through the airglow just inside the limb.
        const inner = 0.014 * Math.exp(-delta / 3);
        r = r * (1 - cov) + cov * (lit * 0.92 + inner * 0.86);
        g = g * (1 - cov) + cov * (lit * 0.97 + inner * 1.0);
        b = b * (1 - cov) + cov * (lit * 1.0 + inner * 0.98);
      }
      img.add(i, r, g, b);
    }
  starfield(img, 503, { count: 3300, mask: sky, density: (x, y) => 0.55 + 0.45 * smooth(top - 120, 0, y) });
  await save(img, "home-aurora", { exposure: 1.2, sat: 0.3 });
}

/* ---------------------------------------------------------------- home (d) the Milky Way */

async function homeMilkyway() {
  const img = new Img();
  const n = perlin(131);
  const n2 = perlin(132);
  const n3 = perlin(133);
  // The band runs from the top right corner down to the bottom, left of centre.
  const P0 = [2520, -220];
  const P1 = [780, 1320];
  const ln = Math.hypot(P1[0] - P0[0], P1[1] - P0[1]);
  const ux = (P1[0] - P0[0]) / ln;
  const uy = (P1[1] - P0[1]) / ln;
  const along = (x, y) => (x - P0[0]) * ux + (y - P0[1]) * uy;
  const across = (x, y) => -(x - P0[0]) * uy + (y - P0[1]) * ux;
  const aCore = along(1240, 990);
  const trans = new Float32Array(W * H);
  const dens = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const a = along(x, y);
      const t0 = across(x, y);
      const t = t0 - 60 * fbm(n2, a / 1100, 0.3, 1.1, 3);
      const sa = a / 1000;
      const st = t / 1000;
      const wide = Math.exp(-((t / 470) ** 2));
      const core = Math.exp(-((t / 185) ** 2));
      const bulge = Math.exp(-(((a - aCore) / 330) ** 2 + (t / 210) ** 2));
      // Star clouds: lumpy, stretched along the band.
      const cl = fbm(n, sa * 3.4, st * 7.5, 0.5, 7);
      const clouds = smooth(-0.3, 0.6, cl);
      const knots = Math.pow(smooth(0.1, 0.6, fbm(n2, sa * 11, st * 16, 4.4, 5)), 2);
      const glow = wide * 0.012 + core * (0.016 + 0.13 * clouds * clouds + 0.08 * knots) + bulge * (0.14 + 0.12 * clouds);
      // Dust: a long rift along the centre line with branching filaments and sharp-edged dark clouds.
      const wq = fbm(n2, sa * 3, st * 3, 6.6, 4);
      const rw = 26 + 30 * fbm(n2, sa * 1.6, 5.5, 1, 3);
      const broken = smooth(-0.15, 0.25, fbm(n, sa * 2.4, 1.9, 5.3, 3));
      const rift = broken * smooth(0.3, 0.8, Math.exp(-(((t + 18 - 85 * fbm(n3, sa * 1.3, 0.7, 2.2, 4) - 25 * fbm(n3, sa * 6, 2.7, 2.2, 3)) / rw) ** 2)) + 0.45 * fbm(n, sa * 14, st * 14, 3.1, 4));
      const fil = Math.pow(ridged(n3, sa * 2.6 + 0.7 * wq, st * 13 + 0.7 * wq, 4.4, 6), 6);
      const dark = Math.pow(smooth(-0.04, 0.42, fbm(n2, sa * 3.2 + 0.9 * wq, st * 12 + 0.9 * wq, 7.7, 7)), 1.5);
      const lace = smooth(0.0, 0.4, fbm(n, sa * 22, st * 30, 9.9, 4));
      const zone = 0.2 + 0.8 * Math.exp(-((t / 240) ** 2));
      const tau = (3.0 * rift * (0.5 + 0.6 * lace) + 2.6 * fil * (0.35 + 0.65 * lace) + 2.6 * dark * (0.45 + 0.55 * lace)) * zone;
      const tr = Math.exp(-tau);
      trans[i] = tr;
      dens[i] = clamp((0.1 * wide + core * (0.2 + 0.8 * clouds * clouds) + 0.6 * knots * core + 1.2 * bulge) / 1.7);
      // Warmer towards the bulge, a touch cooler in the outer band.
      const warm = clamp(bulge * 1.4);
      img.add(i, glow * tr * mix(0.92, 1.0, warm), glow * tr * mix(0.96, 0.95, warm), glow * tr * mix(1.0, 0.86, warm));
    }
  // Star grain: hundreds of thousands of faint, nearly unresolved stars piled up in the band (a steep
  // luminosity function, so they read as texture), dimmed behind the dust. Point sources sit at the pixel
  // scale, so they are drawn directly as tiny bilinear-weighted dots instead of gaussian splats.
  const r = rng(531);
  const dot = (x, y, b, col, t) => {
    const ix = Math.floor(x - 0.5);
    const iy = Math.floor(y - 0.5);
    const fx = x - 0.5 - ix;
    const fy = y - 0.5 - iy;
    for (const [ox, oy, w] of [
      [0, 0, (1 - fx) * (1 - fy)],
      [1, 0, fx * (1 - fy)],
      [0, 1, (1 - fx) * fy],
      [1, 1, fx * fy],
    ]) {
      const xx = ix + ox;
      const yy = iy + oy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const v = b * w * t;
      img.add(yy * W + xx, col[0] * v, col[1] * v, col[2] * v);
    }
  };
  let placed = 0;
  while (placed < 700000) {
    const x = r() * W;
    const y = r() * H;
    const i = Math.floor(y) * W + Math.floor(x);
    if (r() > 0.006 + 0.994 * dens[i]) continue;
    placed++;
    const b = Math.min(0.5, 0.012 * Math.pow(r(), -0.7));
    dot(x, y, b, starColor(0.25 + 0.6 * r()), trans[i]);
  }
  // Resolved stars on top: fewer, with the usual power law.
  starfield(img, 532, { count: 9000, mask: trans, density: (x, y) => 0.25 + 0.75 * dens[Math.floor(y) * W + Math.floor(x)], scale: 0.75 });
  starfield(img, 533, { count: 1100, density: (x, y) => 1 - 0.6 * dens[Math.floor(y) * W + Math.floor(x)] });
  await save(img, "home-milkyway", { exposure: 1.15, sat: 0.24 });
}

/* ---------------------------------------------------------------- home light (a) ringed planet by day */

async function homeLightRings() {
  const img = new Img();
  const n = perlin(151);
  const n2 = perlin(152);
  const top = linRGB(160, 184, 214);
  const mid = linRGB(206, 219, 235);
  const low = linRGB(244, 246, 249);
  const white = linRGB(255, 255, 255);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = y / H;
      let c = v < 0.62 ? mix3(top, mid, smooth(0, 0.62, v)) : mix3(mid, low, smooth(0.62, 1, v));
      const sun = Math.exp(-Math.hypot(x + 400, y - 1000) / 1400) * 0.12;
      c = [c[0] + sun, c[1] + sun, c[2] + sun * 0.96];
      const k = (y * W + x) * 3;
      img.d[k] = c[0];
      img.d[k + 1] = c[1];
      img.d[k + 2] = c[2];
    }
  // Daylight swamps the night side: the planet only adds its lit face and rings to the blue.
  ringedPlanet(img, { cx: 1840, cy: 390, R: 136, tilt: (22 * Math.PI) / 180, pa: (-16 * Math.PI) / 180, L: norm3([-0.62, -0.42, 0.66]), gain: 0.34, seed: 150, tint: [1, 1, 1], bandContrast: 1.9 });
  // Soft haze and fibrous cirrus over the lower sky, a strand crossing below the rings.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = x / H;
      const v = y / H;
      const warp = fbm(n2, u * 0.7, v * 0.9, 4.1, 3);
      const strand = smooth(0.04, 0.42, fbm(n, u * 0.9 + warp * 0.6, v * 5.5 + warp * 1.4, 6.2, 6));
      const fib = Math.pow(clamp(0.5 + 0.9 * fbm(n2, u * 2.6 - v * 1.4, v * 60 + warp * 7, 8.5, 4)), 1.6);
      const zone = smooth(0.5, 0.98, v) * (0.5 + 0.5 * smooth(0.4, 1.6, u));
      const a = clamp(strand * (0.3 + 0.9 * fib) * zone * 0.5 + 0.08 * smooth(0.65, 1, v));
      const k = (y * W + x) * 3;
      img.d[k] = mix(img.d[k], white[0], a);
      img.d[k + 1] = mix(img.d[k + 1], white[1], a);
      img.d[k + 2] = mix(img.d[k + 2], white[2], a);
    }
  await saveLight(img, "home-light-rings", { sat: 0.42 });
}

/* ---------------------------------------------------------------- home light (b) an orrery on paper */

/** Mean orbital elements (J2000): [name, a AU, e, mean longitude deg, rate deg/century, perihelion deg, disc px]. */
const ORRERY = [
  ["MERCURY", 0.387, 0.2056, 252.2503, 149472.6741, 77.457, 3.6],
  ["VENUS", 0.723, 0.0068, 181.9791, 58517.8154, 131.602, 5.4],
  ["EARTH", 1.0, 0.0167, 100.4646, 35999.3725, 102.937, 5.8],
  ["MARS", 1.524, 0.0934, -4.5534, 19140.3027, -23.944, 4.4],
  ["JUPITER", 5.203, 0.0484, 34.3964, 3034.7461, 14.728, 12],
  ["SATURN", 9.537, 0.0539, 49.9542, 1222.4936, 92.598, 10],
  ["URANUS", 19.19, 0.0473, 313.2381, 428.482, 170.954, 7.6],
  ["NEPTUNE", 30.07, 0.0086, -55.12, 218.4595, 44.965, 7.4],
];

async function homeLightOrrery() {
  const n = perlin(181);
  const n2 = perlin(182);
  const r = rng(183);
  const D = Math.PI / 180;
  const sx = 1760;
  const sy = 640;
  const k = 172; // px per sqrt(AU)
  const cosV = 0.36; // the plane seen from ~21 degrees above
  const az = 15 * D; // view azimuth: which ecliptic longitude points at the viewer
  const T = (2461041.5 - 2451545.0) / 36525; // 2026 Jan 1.0 TT
  // Ecliptic (AU, longitude) -> screen, with radii compressed as sqrt(r).
  const proj = (rAU, lonRad) => {
    const rr = k * Math.sqrt(rAU);
    const a = lonRad - az;
    return [sx + rr * Math.sin(a), sy + rr * Math.cos(a) * cosV];
  };
  const f1 = (v) => v.toFixed(1);
  const poly = (pts, close = false) => pts.map(([x, y], i) => `${i ? "L" : "M"}${f1(x)} ${f1(y)}`).join("") + (close ? "Z" : "");
  const mono = `font-family="JetBrains Mono, DejaVu Sans Mono, monospace"`;
  const ink = "#101114";
  // Labels sit on a paper-coloured knockout so belt dots and orbits never run through the letters.
  const label = (x, y, text, size, spacing, anchor, opacity) => {
    // Monospace: every glyph advances 0.6 em (plus letter-spacing).
    const w = text.length * (size * 0.6 + spacing);
    const x0 = anchor === "end" ? x - w : x;
    return `<rect x="${f1(x0 - 4)}" y="${f1(y - size * 0.82)}" width="${f1(w + 8)}" height="${f1(size * 1.12)}" fill="#f6f6f4" fill-opacity="0.92"/><text x="${f1(x)}" y="${f1(y)}" ${mono} font-size="${size}" letter-spacing="${spacing}" text-anchor="${anchor}" fill="${ink}" fill-opacity="${opacity}">${text}</text>`;
  };
  const parts = [];

  // Longitude ring: a graduated ellipse beyond Neptune.
  const RR = 33; // AU (sqrt-scaled like everything else)
  {
    const ring = [];
    const ring2 = [];
    for (let d = 0; d <= 360; d += 1) {
      ring.push(proj(RR, d * D));
      ring2.push(proj(RR + 1.2, d * D));
    }
    parts.push(`<path d="${poly(ring, true)}" fill="none" stroke="${ink}" stroke-opacity="0.28" stroke-width="1"/>`);
    parts.push(`<path d="${poly(ring2, true)}" fill="none" stroke="${ink}" stroke-opacity="0.12" stroke-width="1"/>`);
    const ticks = [];
    for (let d = 0; d < 360; d += 1) {
      const len = d % 30 === 0 ? 2.6 : d % 10 === 0 ? 1.6 : d % 5 === 0 ? 1.1 : 0.6;
      const [x0, y0] = proj(RR, d * D);
      const [x1, y1] = proj(RR - len, d * D);
      ticks.push(`M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}`);
    }
    parts.push(`<path d="${ticks.join("")}" stroke="${ink}" stroke-opacity="0.34" stroke-width="1"/>`);
    for (let d = 0; d < 360; d += 30) {
      const [x, y] = proj(RR + 3.4, d * D);
      if (x < 40 || x > W - 40 || y < 30 || y > 1000) continue;
      parts.push(`<text x="${f1(x)}" y="${f1(y + 4)}" ${mono} font-size="12" text-anchor="middle" fill="${ink}" fill-opacity="0.45">${String(d).padStart(3, "0")}°</text>`);
    }
  }
  // Faint spokes every 30 degrees of longitude.
  {
    const spokes = [];
    for (let d = 0; d < 360; d += 30) {
      if (d === 0) continue;
      const [x0, y0] = proj(0.3, d * D);
      const [x1, y1] = proj(RR - 3, d * D);
      spokes.push(`M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}`);
    }
    parts.push(`<path d="${spokes.join("")}" stroke="${ink}" stroke-opacity="0.1" stroke-width="1" stroke-dasharray="1 6"/>`);
  }
  // Direction of the vernal equinox (longitude 0).
  {
    const [x0, y0] = proj(0.12, 0);
    const [x1, y1] = proj(RR - 3, 0);
    parts.push(`<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${ink}" stroke-opacity="0.3" stroke-width="1" stroke-dasharray="2 5"/>`);
    const [x2, y2] = proj(RR + 3.4, 0);
    parts.push(`<text x="${f1(x2)}" y="${f1(y2 + 4)}" ${mono} font-size="12" text-anchor="middle" fill="${ink}" fill-opacity="0.55">γ</text>`);
  }
  // Main belt: a fine scatter of dots between 2.1 and 3.3 AU.
  {
    const dots = [];
    for (let i = 0; i < 1500; i++) {
      const a = 2.1 + 1.2 * Math.pow(r(), 0.9);
      const [x, y] = proj(a, r() * Math.PI * 2);
      dots.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${(0.45 + r() * 0.55).toFixed(2)}"/>`);
    }
    parts.push(`<g fill="${ink}" fill-opacity="0.32">${dots.join("")}</g>`);
  }
  // Orbits (true ellipses, the sun at a focus) and the planets on them at their 2026 Jan 1 positions.
  const planets = [];
  for (const [name, a, e, L0, rate, w, size] of ORRERY) {
    const pts = [];
    for (let nu = 0; nu <= 360; nu += 0.5) {
      const rr = (a * (1 - e * e)) / (1 + e * Math.cos(nu * D));
      pts.push(proj(rr, (nu + w) * D));
    }
    const strong = name === "EARTH";
    parts.push(`<path d="${poly(pts, true)}" fill="none" stroke="${ink}" stroke-opacity="${strong ? 0.55 : 0.36}" stroke-width="${strong ? 1.25 : 1}"/>`);
    const M = (((L0 + rate * T - w) % 360) + 360) % 360;
    let E = M * D;
    for (let it = 0; it < 12; it++) E -= (E - e * Math.sin(E) - M * D) / (1 - e * Math.cos(E));
    const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const rr = a * (1 - e * Math.cos(E));
    const lon = nu + w * D;
    planets.push({ name, a, size, lon, xy: proj(rr, lon) });
    // Perihelion tick on the orbit.
    const [px, py] = proj(a * (1 - e), w * D);
    const [qx, qy] = proj(a * (1 - e) * 0.94, w * D);
    if (e > 0.04) parts.push(`<path d="M${f1(px)} ${f1(py)}L${f1(qx)} ${f1(qy)}" stroke="${ink}" stroke-opacity="0.5" stroke-width="1"/>`);
  }
  // The sun.
  parts.push(`<circle cx="${sx}" cy="${sy}" r="15" fill="#fbfbfa" stroke="${ink}" stroke-opacity="0.85" stroke-width="1.2"/>`);
  parts.push(`<circle cx="${sx}" cy="${sy}" r="2.6" fill="${ink}"/>`);
  parts.push(`<circle cx="${sx}" cy="${sy}" r="24" fill="none" stroke="${ink}" stroke-opacity="0.25" stroke-width="1" stroke-dasharray="1.5 3"/>`);
  parts.push(label(sx + 30, sy - 20, "SOL", 12, 2, "start", 0.6));
  // Planets: a lit disc with its night half inked, facing away from the sun; a leader line and a label.
  const labelAt = { MERCURY: [1, -1.3], VENUS: [1, 1.1], EARTH: [1, 1], MARS: [-1, -1], JUPITER: [1, -1], SATURN: [1, -1], URANUS: [-1, 1], NEPTUNE: [-1, -1] };
  for (const { name, a, size, xy } of planets) {
    const [x, y] = xy;
    const ang = Math.atan2(y - sy, x - sx);
    const nxv = Math.cos(ang);
    const nyv = Math.sin(ang);
    if (name === "SATURN")
      parts.push(`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(size * 2.1)}" ry="${f1(size * 0.62)}" fill="none" stroke="${ink}" stroke-opacity="0.75" stroke-width="1" transform="rotate(-8 ${f1(x)} ${f1(y)})"/>`);
    parts.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${size}" fill="#fbfbfa" stroke="${ink}" stroke-width="1.1"/>`);
    // Night half: a semicircle on the far side from the sun.
    const ax = x + -nyv * size;
    const ay = y + nxv * size;
    const bx = x + nyv * size;
    const by = y - nxv * size;
    parts.push(`<path d="M${f1(ax)} ${f1(ay)}A${size} ${size} 0 0 0 ${f1(bx)} ${f1(by)}Z" fill="${ink}" fill-opacity="0.82"/>`);
    if (name === "EARTH") parts.push(`<circle cx="${f1(x)}" cy="${f1(y)}" r="${size + 9}" fill="none" stroke="${ink}" stroke-opacity="0.35" stroke-width="0.9"/><circle cx="${f1(x + size + 9)}" cy="${f1(y)}" r="1.8" fill="${ink}"/>`);
    const [lx, ly] = labelAt[name];
    const ex = x + lx * (size + 30);
    const ey = y + ly * (size + 24);
    parts.push(`<path d="M${f1(x + lx * (size + 4))} ${f1(y + Math.sign(ly) * (size + 4))}L${f1(ex)} ${f1(ey)}L${f1(ex + lx * 18)} ${f1(ey)}" fill="none" stroke="${ink}" stroke-opacity="0.45" stroke-width="1"/>`);
    const anchor = lx > 0 ? "start" : "end";
    const tx = ex + lx * 24;
    parts.push(label(tx, ey - 2, name, 13, 2, anchor, 0.7));
    parts.push(label(tx, ey + 14, `a ${a.toFixed(3)} AU`, 11, 0.8, anchor, 0.45));
  }
  // Scale: a ruler along the bottom, ticks at the sqrt-compressed distances.
  {
    const by = 1046;
    const segs = [`M${sx} ${by}L${f1(sx - k * Math.sqrt(31))} ${by}`];
    const labels = [];
    const ticks = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30];
    for (const t of ticks) {
      const x = sx - k * Math.sqrt(t);
      const major = [1, 5, 10, 20, 30].includes(t);
      segs.push(`M${f1(x)} ${by}L${f1(x)} ${by - (major ? 11 : 6)}`);
      if (major) labels.push(`<text x="${f1(x)}" y="${by + 18}" ${mono} font-size="11" text-anchor="middle" fill="${ink}" fill-opacity="0.5">${t}</text>`);
    }
    segs.push(`M${sx} ${by}L${sx} ${by - 14}`);
    labels.push(`<text x="${sx}" y="${by + 18}" ${mono} font-size="11" text-anchor="middle" fill="${ink}" fill-opacity="0.5">0</text>`);
    labels.push(`<text x="${f1(sx - k * Math.sqrt(31) - 14)}" y="${by + 4}" ${mono} font-size="11" letter-spacing="1.5" text-anchor="end" fill="${ink}" fill-opacity="0.5">AU</text>`);
    parts.push(`<path d="${segs.join("")}" stroke="${ink}" stroke-opacity="0.45" stroke-width="1"/>`);
    parts.push(labels.join(""));
  }
  // Plate caption, bottom right.
  parts.push(
    `<g ${mono} fill="${ink}"><text x="2300" y="62" font-size="13" letter-spacing="3" text-anchor="end" fill-opacity="0.62">FIG. 2 · THE SOLAR SYSTEM</text><text x="2300" y="84" font-size="11" letter-spacing="1.4" text-anchor="end" fill-opacity="0.42">ECLIPTIC J2000 · MEAN ELEMENTS · 2026 JAN 01</text><text x="2300" y="102" font-size="11" letter-spacing="1.4" text-anchor="end" fill-opacity="0.42">RADIUS ∝ √r · γ EQUINOX · VIEWED 21° ABOVE THE PLANE</text></g>`,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join("")}</svg>`;

  // Paper: a cool, neutral off-white with a fine laid texture and a soft light falloff.
  const img = new Img();
  const paper = linRGB(247, 247, 245);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = x / H;
      const v = y / H;
      const laid = 0.006 * Math.sin(v * 1100 + 1.6 * fbm(n, u * 3, v * 3, 0.2, 2)) * (0.5 + 0.5 * fbm(n2, u * 20, v * 2, 1.1, 2));
      const fibre = 0.01 * fbm(n, u * 70, v * 11, 0.5, 3) + 0.007 * fbm(n2, u * 240, v * 240, 1.5, 2);
      const blot = 0.01 * fbm(n2, u * 2, v * 2, 3.3, 4);
      const vig = 0.03 * smooth(0.4, 1.3, Math.hypot(u - 1.35, (v - 0.55) * 1.5));
      const kk = 1 + laid + fibre + blot - vig;
      const i = (y * W + x) * 3;
      img.d[i] = paper[0] * kk;
      img.d[i + 1] = paper[1] * kk;
      img.d[i + 2] = paper[2] * kk * 1.004;
    }
  const base = Buffer.alloc(W * H * 3);
  const rr = rng(184);
  for (let i = 0; i < W * H * 3; i++) {
    let t = clamp(img.d[i]);
    t = t <= 0.0031308 ? 12.92 * t : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
    base[i] = clamp(Math.round(t * 255 + (rr() + rr() - 1) * 0.8), 0, 255);
  }
  const raw = await sharp(base, { raw: { width: W, height: H, channels: 3 } })
    .composite([{ input: Buffer.from(svg) }])
    .removeAlpha()
    .raw()
    .toBuffer();
  await encode(raw, "home-light-orrery", 90);
}

/* ---------------------------------------------------------------- home light (c) dawn horizon from altitude */

async function homeLightDawn() {
  const img = new Img();
  const n = perlin(161);
  const n2 = perlin(162);
  const n3 = perlin(163);
  const hx = 1150;
  const hy = 520; // horizon high enough to clear the home hero's product tour
  const Rc = 8200; // apparent curvature of the horizon, px
  const horizon = (x) => hy + ((x - hx) * (x - hx)) / (2 * Rc);
  const sunX = 2090;
  const sunY = horizon(sunX) - 9;
  const f = 1500;
  const camH = 30;
  const Hs = 3.2; // cloud relief, world units
  // The sun is low, ahead and to the right: its direction over the deck.
  const S = norm3([(sunX - hx) / f, 0.1, 1]);
  const Sh = Math.hypot(S[0], S[2]);
  const skyTop = linRGB(174, 193, 220);
  const skyMid = linRGB(214, 224, 238);
  const hzWhite = linRGB(251, 251, 250);
  const lit = linRGB(255, 255, 253);
  const shade = linRGB(200, 208, 220);
  const deep = linRGB(170, 181, 198);
  const sea = linRGB(178, 191, 208);
  const fogC = linRGB(239, 242, 246);
  const turbLod = (x, z, oct, fp) => {
    let t = 0;
    let a = 1;
    let fq = 1;
    let w = 0;
    for (let o = 0; o < oct; o++) {
      const k = smooth(0.55, 0.22, fq * fp);
      t += a * (k * Math.abs(n3(x * fq, 0.37 + o * 1.7, z * fq)) + (1 - k) * 0.32);
      w += a;
      a *= 0.5;
      fq *= 2.07;
    }
    return t / w;
  };
  // Cloud-top height: rolling stratocumulus fields broken into heads, with soft edges into the gaps.
  const deck = (X, Z, fp) => {
    const cov = fbmLod(n, X * 0.018, Z * 0.018, 1.3, 5, fp * 0.018) + 0.2 * fbmLod(n2, X * 0.06, Z * 0.06, 2.2, 3, fp * 0.06);
    const heads = turbLod(X * 0.075, Z * 0.075, 5, fp * 0.075);
    const c = smooth(-0.32, 0.06, cov + 0.5 * (heads - 0.3));
    return { c, h: c * (0.3 + 1.6 * heads) };
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const yh = horizon(x);
      const h = yh - (y + 0.5);
      const k = (y * W + x) * 3;
      const dsun = Math.hypot(x - sunX, (y - sunY) * 1.5);
      let c = [0, 0, 0];
      if (h > -1.5) {
        // Sky: steel blue overhead to white at the horizon, with thin bright aerosol layers along the curve.
        const hh = Math.max(0, h);
        c = mix3(hzWhite, skyMid, smooth(0, 120, hh));
        c = mix3(c, skyTop, smooth(80, 620, hh) * 0.95);
        const sunSide = Math.exp(-Math.abs(x - sunX) / 900);
        const wisp = 0.7 + 0.6 * smooth(-0.3, 0.4, fbm(n3, x / 380, hh / 25, 0.3, 4));
        const layers =
          (0.07 * Math.exp(-(((hh - 6) / 2.6) ** 2)) + 0.05 * Math.exp(-(((hh - 15) / 2) ** 2)) * wisp + 0.03 * Math.exp(-(((hh - 26) / 1.6) ** 2)) * wisp + 0.06 * Math.exp(-hh / 40)) *
          (0.45 + 0.8 * sunSide);
        const glare = 0.13 * Math.exp(-dsun / 110) + 0.07 * Math.exp(-dsun / 420) + 0.035 * Math.exp(-dsun / 1300);
        const g = layers + glare;
        c = [c[0] + g, c[1] + g * 0.995, c[2] + g * 0.98];
        // Faint high cirrus far above, stretched along the horizon and caught by the low sun.
        const u = x / H;
        const v = y / H;
        const warp = fbm(n2, u * 0.6, v * 1.2, 7.3, 3);
        const ci = smooth(0.08, 0.5, fbm(n, u * 0.8 + warp * 0.5, v * 7 + warp * 1.6, 8.2, 6)) * Math.pow(clamp(0.5 + 0.9 * fbm(n3, u * 2.5, v * 55 + warp * 6, 2.7, 4)), 1.5);
        const band = smooth(30, 160, hh) * smooth(640, 250, hh);
        c = mix3(c, lit, clamp(ci * band * (0.42 + 0.4 * sunSide)));
      }
      if (h < 1.5) {
        // The cloud deck far below, in perspective; octaves fade with distance so the far field never shimmers.
        const dy = Math.max(0.6, -h);
        const z = (camH * f) / dy;
        const X = ((x + 0.5 - hx) * z) / f + 300;
        const Z = z;
        const fp = Math.max(z / f, (z * z) / (camH * f));
        const D0 = deck(X, Z, fp);
        const e = Math.max(0.35, fp);
        const hX = ((deck(X + e, Z, fp).h - deck(X - e, Z, fp).h) / (2 * e)) * Hs;
        const hZ = ((deck(X, Z + e, fp).h - deck(X, Z - e, fp).h) / (2 * e)) * Hs;
        const N = norm3([-hX, 1, -hZ]);
        const ndl = dot3(N, S);
        // Long low-sun shadows: a taller head between this point and the sun.
        let occ = 0;
        for (const st of [2, 5, 10, 18]) {
          const hh = deck(X + (S[0] / Sh) * st, Z + (S[2] / Sh) * st, fp).h * Hs;
          occ = Math.max(occ, smooth(0, 0.8, hh - D0.h * Hs - (S[1] / Sh) * st));
        }
        const sky = 0.5 + 0.5 * N[1];
        let col = mix3(deep, shade, sky);
        col = mix3(col, lit, clamp((ndl + 0.32) / 0.75) * (1 - 0.5 * occ));
        const water = mix3(sea, shade, 0.35 + 0.3 * fbmLod(n3, X * 0.4, Z * 0.4, 9.1, 3, fp * 0.4));
        col = mix3(water, col, smooth(0.0, 0.7, D0.c));
        const fog = 1 - Math.exp(-Math.pow(z / 650, 0.85));
        const sunFog = Math.exp(-Math.abs(x - sunX) / 650) * 0.3;
        col = mix3(col, fogC, clamp(fog * (1 + sunFog)));
        const glare = 0.12 * Math.exp(-dsun / 200) + 0.06 * Math.exp(-dsun / 700);
        col = [col[0] + glare, col[1] + glare * 0.995, col[2] + glare * 0.98];
        // A bright hairline where the deck meets the sky.
        const line = 0.06 * Math.exp(-((dy / 2) ** 2));
        col = [col[0] + line, col[1] + line, col[2] + line];
        const a = clamp(-h + 0.5);
        c = h > -1.5 ? mix3(c, col, a) : col;
      }
      img.d[k] = c[0];
      img.d[k + 1] = c[1];
      img.d[k + 2] = c[2];
    }
  // The sun itself, just clearing the horizon: a small, clipped white core.
  for (let y = Math.floor(sunY - 30); y < sunY + 30; y++)
    for (let x = Math.floor(sunX - 30); x < sunX + 30; x++) {
      const d = Math.hypot(x + 0.5 - sunX, y + 0.5 - sunY);
      const a = clamp(12 - d + 0.5) * clamp(horizon(x) - y + 0.5);
      const k = (y * W + x) * 3;
      for (let j = 0; j < 3; j++) img.d[k + j] = mix(img.d[k + j], 1.2, a);
    }
  await saveLight(img, "home-light-dawn", { sat: 0.45 });
}

/* ---------------------------------------------------------------- home light (d) partial eclipse in a haloed sky */

async function homeLightEclipse() {
  const img = new Img();
  const n = perlin(171);
  const n2 = perlin(172);
  const n3 = perlin(173);
  const cx = 1850;
  const cy = 470;
  const Rs = 40;
  const Rh = 345; // 22 degrees
  const mx = cx + 0.86 * Rs;
  const my = cy - 0.5 * Rs;
  const Rm = Rs * 1.03;
  const top = linRGB(176, 195, 220);
  const mid = linRGB(212, 223, 236);
  const low = linRGB(243, 245, 248);
  const ca = Math.cos(-0.32);
  const sa = Math.sin(-0.32);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = y / H;
      const u = x / H;
      let c = v < 0.55 ? mix3(top, mid, smooth(0, 0.55, v)) : mix3(mid, low, smooth(0.55, 1, v));
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const r = Math.hypot(dx, dy);
      // A thin cirrostratus sheet: patchy, with long fibres; it is what makes the halo.
      const ru = u * ca - v * sa;
      const rv = u * sa + v * ca;
      const sheet = 0.45 + 0.55 * smooth(-0.35, 0.45, fbm(n, u * 1.1, v * 1.1, 1.5, 5));
      const fib = clamp(0.5 + 0.8 * fbm(n2, ru * 1.6, rv * 30 + 2 * fbm(n3, ru, rv * 3, 0.2, 3), 3.3, 5));
      const veil = sheet * (0.55 + 0.6 * fib);
      // The inside of a halo is darker than the sky outside it.
      const inside = 1 - 0.012 * smooth(Rh + 2, Rh - 40, r) * veil;
      c = c.map((q) => q * inside);
      c = mix3(c, [1, 1, 1], clamp(0.16 * veil * (0.6 + 0.4 * smooth(1.6, 0.2, v))));
      // Glare: gentle, scattered by the veil.
      const glare = (0.07 * Math.exp(-r / 55) + 0.06 * Math.exp(-r / 200) + 0.05 * Math.exp(-r / 650)) * (0.75 + 0.35 * veil);
      // The 22 degree halo: sharp inner edge with a faint warm fringe, fading outwards.
      const hr = r - Rh;
      // The halo is only as bright as the ice in front of it: patchy around the ring, stronger at the sides.
      const th = Math.atan2(dy, dx);
      const arcs = 0.45 + 0.55 * smooth(-0.3, 0.5, fbm(n3, Math.cos(th) * 1.8, Math.sin(th) * 1.8, 4.4, 3)) + 0.25 * Math.cos(th) ** 2;
      const ring = smooth(-5, 1, hr) * Math.exp(-Math.max(0, hr) / 30) * (0.02 + 0.05 * veil) * arcs;
      const fringe = Math.exp(-(((hr + 1) / 3) ** 2)) * 0.02 * veil * arcs;
      // Parhelia just outside the halo at the sun's altitude, and the upper tangent arc.
      let dog = 0;
      for (const sgn of [-1, 1]) {
        const ddx = (dx - sgn * (Rh + 14)) * sgn;
        dog += Math.exp(-((dy / 12) ** 2)) * (ddx < 0 ? Math.exp(-((ddx / 8) ** 2)) : Math.exp(-ddx / 55)) * 0.09 * (0.4 + 0.6 * veil);
      }
      const tan = Math.exp(-(((y + 0.5 - (cy - Rh - 0.0009 * dx * dx)) / 4) ** 2)) * Math.exp(-((dx / 170) ** 2)) * 0.03 * veil;
      const add = glare + ring + dog + tan;
      c = [c[0] + add + fringe, c[1] + add + fringe * 0.9, c[2] + add * 1.02 + fringe * 0.7];
      // The sun with the moon taking a bite out of its upper right limb.
      const sdisc = clamp(Rs - r + 0.5);
      if (sdisc > 0) {
        const mdisc = clamp(Rm - Math.hypot(x + 0.5 - mx, y + 0.5 - my) + 0.5);
        const limb = 0.88 + 0.12 * Math.sqrt(Math.max(0, 1 - (r / Rs) ** 2));
        const a = sdisc * (1 - mdisc);
        c = c.map((q) => mix(q, 1.25 * limb, a));
      }
      const k = (y * W + x) * 3;
      img.d[k] = c[0];
      img.d[k + 1] = c[1];
      img.d[k + 2] = c[2];
    }
  await saveLight(img, "home-light-eclipse", { sat: 0.5 });
}

const SCENES = {
  orbit,
  moon,
  nebula,
  galaxy,
  "light-daylight": daylight,
  "light-clouds": clouds,
  "light-lunar": lunar,
  "light-chart": chart,
  "light-clouds-veil": veil,
  "home-rings": homeRings,
  "home-eclipse": homeEclipse,
  "home-aurora": homeAurora,
  "home-milkyway": homeMilkyway,
  "home-light-rings": homeLightRings,
  "home-light-orrery": homeLightOrrery,
  "home-light-dawn": homeLightDawn,
  "home-light-eclipse": homeLightEclipse,
};
const pick = process.argv.slice(2);
for (const [name, fn] of Object.entries(SCENES)) {
  if (pick.length && !pick.includes(name)) continue;
  const t = Date.now();
  await fn();
  console.log(`  rendered in ${((Date.now() - t) / 1000).toFixed(1)}s`);
}
