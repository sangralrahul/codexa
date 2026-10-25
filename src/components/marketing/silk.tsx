"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Live "silk" gradient: a small WebGL fragment shader (domain-warped noise)
 * blending the --silk-0..3 theme colours. It renders at reduced resolution,
 * caps at ~30 fps, pauses when off-screen or in a background tab, draws a
 * single still frame when motion is reduced, and re-reads colours when the
 * theme changes. Without WebGL the element keeps its CSS gradient fallback.
 */
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `
precision mediump float;
uniform vec2 u_res;uniform float u_time;uniform vec3 u_c0;uniform vec3 u_c1;uniform vec3 u_c2;uniform vec3 u_c3;
vec2 h2(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return -1.+2.*fract(sin(p)*43758.5453);}
float sn(vec2 p){const float K1=.366025404;const float K2=.211324865;vec2 i=floor(p+(p.x+p.y)*K1);vec2 a=p-i+(i.x+i.y)*K2;float m=step(a.y,a.x);vec2 o=vec2(m,1.-m);vec2 b=a-o+K2;vec2 c=a-1.+2.*K2;vec3 h=max(.5-vec3(dot(a,a),dot(b,b),dot(c,c)),0.);vec3 n=h*h*h*h*vec3(dot(a,h2(i)),dot(b,h2(i+o)),dot(c,h2(i+1.)));return dot(n,vec3(70.));}
void main(){
  vec2 uv=gl_FragCoord.xy/u_res;vec2 p=uv*vec2(u_res.x/u_res.y,1.)*.55;
  float t=u_time*.03;
  vec2 q=vec2(sn(p+vec2(t,-t*.6)),sn(p+vec2(3.1-t*.7,1.7+t)));
  vec2 r=vec2(sn(p*1.1+q*.9+vec2(1.7,9.2)+t*.9),sn(p*1.1+q*.9+vec2(8.3,2.8)-t*.8));
  float f=sn(p*.8+r*.9);
  vec3 col=mix(u_c0,u_c1,smoothstep(-.8,.9,f)*.9);
  col=mix(col,u_c2,smoothstep(-.3,1.,r.x)*.75);
  col=mix(col,u_c3,smoothstep(0.,1.1,q.y*.7+r.y*.5+.2)*.5);
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

export function Silk({ className, scale = 0.45 }: { className?: string; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { antialias: false, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!canvas || !gl) return;

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
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return; // keep the CSS fallback
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("u_res");
    const uTime = u("u_time");

    const readColors = () => {
      const cs = getComputedStyle(canvas);
      ["u_c0", "u_c1", "u_c2", "u_c3"].forEach((name, i) => gl.uniform3fv(u(name), parseColor(cs.getPropertyValue(`--silk-${i}`))));
    };
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uRes, w, h);
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now() - 20_000; // start mid-flow, not from a symmetric frame
    let raf = 0;
    let last = 0;
    let visible = true;
    const draw = (now: number) => {
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return;
      last = now;
      draw(now);
    };
    const play = () => {
      if (reduced || raf || !visible || document.hidden) return;
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    readColors();
    resize();
    draw(performance.now());
    canvas.dataset.ready = "true";
    play();

    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
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
    // Theme switches toggle the .dark class on <html>.
    const mo = new MutationObserver(() => {
      readColors();
      draw(performance.now());
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => {
      pause();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [scale]);

  return <canvas ref={ref} aria-hidden="true" className={cn("backdrop__canvas", className)} />;
}
