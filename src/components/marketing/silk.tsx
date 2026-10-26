"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { isCalm } from "@/lib/client/motion";

/**
 * Live "silk" light: a small WebGL fragment shader (domain-warped noise) blending
 * the --silk-0..3 theme colours. Used by <Backdrop variant="wash"> and <Horizon>.
 *
 * Budget (PLAN §3.4): at most one live canvas per page and none in the app;
 * renders at ≤1.5 DPR × 0.5 scale, caps at ~30 fps, pauses off-screen and in hidden tabs.
 * Skipped entirely (the CSS poster shows) when calm, on Save-Data, on ≤4-core
 * devices and on small touch screens. A lost WebGL context falls back to the poster.
 * `reactive` reads --horizon-boost (0–0.4) every frame: the light brightens and
 * flows faster while the hero prompt is focused or typed into.
 */
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `
precision mediump float;
uniform vec2 u_res;uniform float u_time;uniform float u_boost;uniform vec3 u_c0;uniform vec3 u_c1;uniform vec3 u_c2;uniform vec3 u_c3;
vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}
float sn(vec2 p){const float K1=.366025404;const float K2=.211324865;vec2 i=floor(p+(p.x+p.y)*K1);vec2 a=p-i+(i.x+i.y)*K2;float m=step(a.y,a.x);vec2 o=vec2(m,1.-m);vec2 b=a-o+K2;vec2 c=a-1.+2.*K2;vec3 h=max(.5-vec3(dot(a,a),dot(b,b),dot(c,c)),0.);vec3 n=h*h*h*h*vec3(dot(a,h2(i)),dot(b,h2(i+o)),dot(c,h2(i+1.)));return dot(n,vec3(70.));}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;vec2 p=uv*vec2(u_res.x/u_res.y,1.)*.55;
  float t=u_time*.03;
  vec2 q=vec2(sn(p+vec2(t,-t*.6)),sn(p+vec2(3.1-t*.7,1.7+t)));
  vec2 r=vec2(sn(p*1.1+q*.9+vec2(1.7,9.2)+t*.9),sn(p*1.1+q*.9+vec2(8.3,2.8)-t*.8));
  float f=sn(p*.8+r*.9);
  vec3 col=mix(u_c0,u_c1,smoothstep(-.8,.9,f)*.9);
  col=mix(col,u_c2,smoothstep(-.3,1.,r.x)*(.75+u_boost*.5));
  col=mix(col,u_c3,smoothstep(0.,1.1,q.y*.7+r.y*.5+.2)*(.5+u_boost*.6));
  col+=u_boost*.35*mix(u_c2,u_c3,.4)*(1.-uv.y);
  float g=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233))+u_time*3.)*43758.5453);
  col+=(g-.5)*.025;
  gl_FragColor=vec4(col,1.);
}`;

function parseColor(value: string): [number, number, number] {
  const v = value.trim();
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  const rgb = v.match(/(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/);
  return rgb ? [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255] : [0, 0, 0];
}

/** True when the device or the visitor should not run a live shader. */
function shouldSkip(): boolean {
  if (isCalm()) return true;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return true;
  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency <= 4) return true;
  if (window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 768) return true;
  return false;
}

export function Silk({
  className,
  scale = 0.5,
  reactive = false,
  surface = "wash",
  mask,
}: {
  className?: string;
  /** Render scale relative to CSS pixels × min(DPR, 1.5). */
  scale?: number;
  /** Read --horizon-boost every frame. */
  reactive?: boolean;
  /** "wash" keeps the .backdrop__canvas look (with its CSS poster); "horizon" is the bare canvas used inside <Horizon>. */
  surface?: "wash" | "horizon";
  /** Optional CSS mask-image for the canvas. */
  mask?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cleanup: (() => void) | null = null;

    const init = () => {
      if (cleanup || shouldSkip()) return;
      const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
      if (!gl) return;
      const compile = (type: number, src: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
      };
      const prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return; // keep the CSS poster
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const u = (n: string) => gl.getUniformLocation(prog, n);
      const uRes = u("u_res");
      const uTime = u("u_time");
      const uBoost = u("u_boost");

      const readColors = () => {
        const cs = getComputedStyle(canvas);
        ["u_c0", "u_c1", "u_c2", "u_c3"].forEach((name, i) => gl.uniform3fv(u(name), parseColor(cs.getPropertyValue(`--silk-${i}`))));
      };
      const resize = () => {
        const k = Math.min(window.devicePixelRatio || 1, 1.5) * scale;
        const w = Math.max(1, Math.round(canvas.clientWidth * k));
        const h = Math.max(1, Math.round(canvas.clientHeight * k));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
        gl.uniform2f(uRes, w, h);
      };

      let clock = 20; // seconds; start mid-flow, not from a symmetric frame
      let boost = 0;
      let raf = 0;
      let last = 0;
      let visible = true;
      let lost = false;
      const draw = () => {
        gl.uniform1f(uTime, clock);
        gl.uniform1f(uBoost, boost);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop);
        if (now - last < 33) return;
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0.033;
        last = now;
        if (reactive) {
          const raw = parseFloat(getComputedStyle(canvas).getPropertyValue("--horizon-boost"));
          const target = Number.isFinite(raw) ? Math.min(0.4, Math.max(0, raw)) : 0;
          boost += (target - boost) * Math.min(1, dt * 6);
        }
        clock += dt * (1 + boost * 2.5);
        draw();
      };
      const play = () => {
        if (raf || lost || !visible || document.hidden || isCalm()) return;
        last = 0;
        raf = requestAnimationFrame(loop);
      };
      const pause = () => {
        cancelAnimationFrame(raf);
        raf = 0;
      };

      readColors();
      resize();
      draw();
      canvas.dataset.ready = "true";
      play();

      const ro = new ResizeObserver(() => {
        resize();
        draw();
      });
      ro.observe(canvas);
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting;
        if (visible) play();
        else pause();
      });
      io.observe(canvas);
      const onVis = () => (document.hidden ? pause() : play());
      document.addEventListener("visibilitychange", onVis);
      // Theme switches toggle .dark on <html>; area tones change --silk-* via :has().
      const mo = new MutationObserver(() => {
        readColors();
        draw();
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-motion"] });
      const onLost = (e: Event) => {
        e.preventDefault();
        lost = true;
        pause();
        canvas.dataset.lost = "true";
      };
      canvas.addEventListener("webglcontextlost", onLost);

      cleanup = () => {
        pause();
        ro.disconnect();
        io.disconnect();
        mo.disconnect();
        document.removeEventListener("visibilitychange", onVis);
        canvas.removeEventListener("webglcontextlost", onLost);
      };
      Object.assign(cleanup, { pause, play });
    };

    init();
    // MotionToggle flips calm live: stop (poster) on calm, start when motion returns.
    const onMotion = () => {
      const ctl = cleanup as unknown as { pause?: () => void; play?: () => void } | null;
      if (isCalm()) {
        ctl?.pause?.();
        canvas.dataset.calm = "true";
      } else {
        delete canvas.dataset.calm;
        if (ctl) ctl.play?.();
        else init();
      }
    };
    window.addEventListener("codexa:motion", onMotion);
    return () => {
      window.removeEventListener("codexa:motion", onMotion);
      cleanup?.();
    };
  }, [scale, reactive]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={cn(surface === "wash" ? "backdrop__canvas" : "horizon__canvas", className)}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
    />
  );
}
