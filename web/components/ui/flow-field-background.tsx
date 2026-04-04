"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type NeuralBackgroundProps = {
  color?: string;
  trailOpacity?: number;
  speed?: number;
  className?: string;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const s =
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(s, 16);
  if (Number.isNaN(n)) return [129, 140, 248];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function parseCssColor(css: string): [number, number, number] | null {
  const t = css.trim();
  if (t.startsWith("#")) return hexToRgb(t);
  const m = t.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

export default function NeuralBackground({
  color = "#818cf8",
  trailOpacity = 0.1,
  speed = 0.8,
  className,
}: NeuralBackgroundProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = wrapRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const root = container;
    const surface = canvas;
    const c2d = ctx;

    const [r, g, b] = hexToRgb(color);
    let bgRgb: [number, number, number] = [8, 12, 20];

    const syncBg = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-primary")
        .trim();
      const parsed = parseCssColor(raw);
      if (parsed) bgRgb = parsed;
    };
    syncBg();

    type Particle = {
      x: number;
      y: number;
      trail: [number, number][];
    };

    const particles: Particle[] = [];
    let particleCount = 180;
    const trailLen = 12;
    const scale = 0.0022;

    let mouseX = 0;
    let mouseY = 0;
    let hasMouse = false;

    const REPEL_RADIUS = 120;
    const REPEL_RADIUS_SQ = REPEL_RADIUS * REPEL_RADIUS;
    const REPEL_STRENGTH = 2.8;

    function onWindowMouseMove(e: MouseEvent) {
      const rect = root.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      hasMouse = true;
    }

    function clearMouse() {
      hasMouse = false;
    }

    function flowAngle(x: number, y: number, time: number): number {
      return (
        Math.sin(x * scale + time * 0.9) *
          Math.cos(y * scale * 0.75 + time * 0.55) *
          1.8 +
        Math.sin(x * scale * 0.45 + y * scale + time * 0.35) * 1.2
      );
    }

    function initParticles(w: number, h: number) {
      particleCount = Math.min(
        420,
        Math.max(180, Math.floor((w * h) / 8000))
      );
      particles.length = 0;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          trail: [],
        });
      }
    }

    let raf = 0;
    let time = 0;
    let dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = root.clientWidth;
      const h = root.clientHeight;
      surface.width = Math.max(1, Math.floor(w * dpr));
      surface.height = Math.max(1, Math.floor(h * dpr));
      surface.style.width = `${w}px`;
      surface.style.height = `${h}px`;
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      initParticles(w, h);
    }

    const ro = new ResizeObserver(() => {
      syncBg();
      resize();
    });
    ro.observe(root);
    resize();

    window.addEventListener("mousemove", onWindowMouseMove);
    document.documentElement.addEventListener("mouseleave", clearMouse);
    window.addEventListener("blur", clearMouse);

    function step() {
      const w = root.clientWidth;
      const h = root.clientHeight;
      if (w < 1 || h < 1) {
        raf = requestAnimationFrame(step);
        return;
      }

      time += 0.007 * speed;
      const fade = 0.12 + (1 - trailOpacity) * 0.07;
      const [br, bg, bb] = bgRgb;
      c2d.fillStyle = `rgba(${br},${bg},${bb},${Math.min(0.24, fade)})`;
      c2d.fillRect(0, 0, w, h);

      const lineAlpha = Math.min(0.38, trailOpacity * 2.0);
      c2d.strokeStyle = `rgba(${r},${g},${b},${lineAlpha})`;
      c2d.lineWidth = 0.65;
      c2d.lineCap = "round";

      for (const p of particles) {
        const ang = flowAngle(p.x, p.y, time);
        const stepSize = 1.4 * speed;
        p.x += Math.cos(ang) * stepSize;
        p.y += Math.sin(ang) * stepSize;

        if (hasMouse) {
          const dx = p.x - mouseX;
          const dy = p.y - mouseY;
          const distSq = dx * dx + dy * dy;
          if (distSq < REPEL_RADIUS_SQ && distSq > 1e-6) {
            const dist = Math.sqrt(distSq);
            const t = 1 - dist / REPEL_RADIUS;
            const strength = REPEL_STRENGTH * t * t;
            p.x += (dx / dist) * strength;
            p.y += (dy / dist) * strength;
          }
        }

        p.trail.push([p.x, p.y]);
        if (p.trail.length > trailLen) p.trail.shift();

        if (p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
          p.x = Math.random() * w;
          p.y = Math.random() * h;
          p.trail = [];
          continue;
        }

        if (p.trail.length < 2) continue;
        c2d.beginPath();
        c2d.moveTo(p.trail[0][0], p.trail[0][1]);
        for (let k = 1; k < p.trail.length; k++) {
          c2d.lineTo(p.trail[k][0], p.trail[k][1]);
        }
        c2d.stroke();
      }

      raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onWindowMouseMove);
      document.documentElement.removeEventListener("mouseleave", clearMouse);
      window.removeEventListener("blur", clearMouse);
    };
  }, [color, trailOpacity, speed]);

  return (
    <div
      ref={wrapRef}
      className={cn("pointer-events-none overflow-hidden", className)}
      aria-hidden
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
