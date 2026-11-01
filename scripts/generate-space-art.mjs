#!/usr/bin/env node
/**
 * Procedural space art for the dashboard hero (public/space/*.webp).
 *
 * Every pixel is computed here: no photos, no external images. Each scene is rendered in linear light
 * into a float buffer, desaturated to the site's monochrome palette (a faint cool tint survives), tone
 * mapped, dithered and encoded as WebP with sharp.
 *
 *   node scripts/generate-space-art.mjs            # all scenes
 *   node scripts/generate-space-art.mjs moon       # one scene (orbit | moon | nebula | galaxy)
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

async function moon() {
  const img = new Img();
  const n = perlin(21);
  const n2 = perlin(22);
  const r = rng(23);
  const cx = 1900;
  const cy = 520;
  const R = 390;
  const L = norm3([0.86, -0.3, 0.42]);
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
      const es = 0.012 * Math.max(0, -0.25 * N[0] + 0.97 * N[2]);
      const a = clamp(alb[k], 0.05, 1);
      const v = (a * shade * 1.9 + a * es) * cov;
      img.add(Y * W + X, v * 1.0, v * 0.985, v * 0.96);
    }

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

const SCENES = { orbit, moon, nebula, galaxy };
const pick = process.argv.slice(2);
for (const [name, fn] of Object.entries(SCENES)) {
  if (pick.length && !pick.includes(name)) continue;
  const t = Date.now();
  await fn();
  console.log(`  rendered in ${((Date.now() - t) / 1000).toFixed(1)}s`);
}
