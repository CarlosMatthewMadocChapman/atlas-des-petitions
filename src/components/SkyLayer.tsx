import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MAX_STARS, sceneFor, type SkyScene } from '../lib/skyScene';
import { useCoreState } from '../state/DataContext';

const FRAME_MS = 1000 / 24;
const MAX_DPR = 1.5;
const GLIDE_SECONDS = 1.3;
const OPEN = [255, 214, 158];
const CLOSED = [150, 176, 226];
const OPEN_DAY = [186, 104, 20];
const CLOSED_DAY = [58, 92, 156];
const mix = (a: number, b: number, k: number) => Math.round(a + (b - a) * k);
const DUST = 180;

interface Slot {
  id: string | null;
  x: number; y: number; size: number; alpha: number; warm: number; focus: number;
  tx: number; ty: number; tsize: number; talpha: number; twarm: number; tfocus: number;
  ax: number; ay: number; wx: number; wy: number; phase: number;
}

const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Le fond de tout l'Atlas : un seul ciel, jamais rechargé, en trois profondeurs (poussière, liens, astres).
 * Quand on change de page, les astres glissent vers la nouvelle constellation. Un astre est une pétition, à la taille de
 * ses signatures ; doré, elle peut encore être signée. Purement décoratif : aucun clic, aucune information exclusive.
 */
export function SkyLayer() {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useCoreState();
  const { pathname } = useLocation();
  const core = state.status === 'ready' ? state.core : null;
  const engine = useRef<{ apply: (scene: SkyScene) => void; still?: () => void } | null>(null);

  useEffect(() => {
    const isNight = () => document.documentElement.dataset.ciel === 'nuit';
    let night = isNight() ? 1 : 0;
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    const slots: Slot[] = Array.from({ length: MAX_STARS }, (_, i) => ({
      id: null, x: rand(i + 1) * 2 - 1, y: rand(i + 40) * 2 - 1, size: 0, alpha: 0, warm: 0, focus: 0,
      tx: rand(i + 1) * 2 - 1, ty: rand(i + 40) * 2 - 1, tsize: 0, talpha: 0, twarm: 0, tfocus: 0,
      ax: 20 + rand(i + 80) * 40, ay: 16 + rand(i + 120) * 32,
      wx: (Math.PI * 2) / (90 + rand(i + 160) * 90), wy: (Math.PI * 2) / (110 + rand(i + 200) * 110), phase: rand(i + 240) * 6.28,
    }));
    const dust = Array.from({ length: DUST }, (_, i) => ({ x: rand(i + 300), y: rand(i + 700), r: 0.4 + rand(i + 1100) * 0.9, w: (Math.PI * 2) / (40 + rand(i + 1500) * 80), p: rand(i + 1900) * 6.28 }));
    let links: { a: Slot; b: Slot; score: number }[] = [];
    let linkLight = 0;
    let level = 0.32;
    let targetLevel = 0.32;

    engine.current = {
      apply(scene) {
        const wanted = new Map(scene.stars.map((s) => [s.id, s]));
        for (const slot of slots) if (slot.id && !wanted.has(slot.id)) { slot.id = null; slot.talpha = 0; slot.tsize = 0; slot.tfocus = 0; }
        const owner = new Map(slots.filter((s) => s.id).map((s) => [s.id as string, s]));
        const free = slots.filter((s) => !s.id);
        for (const star of scene.stars) {
          const slot = owner.get(star.id) ?? free.shift();
          if (!slot) continue;
          slot.id = star.id;
          owner.set(star.id, slot);
          slot.tx = star.x; slot.ty = star.y; slot.tsize = star.size; slot.talpha = 1;
          slot.twarm = star.open ? 1 : 0; slot.tfocus = star.focus ? 1 : 0;
        }
        links = scene.links.flatMap((l) => {
          const a = owner.get(l.a);
          const b = owner.get(l.b);
          return a && b ? [{ a, b, score: l.score }] : [];
        });
        linkLight = 0;
        targetLevel = scene.level;
      },
    };

    let width = 0;
    let height = 0;
    let px = 0;
    let py = 0;
    let mx = 0;
    let my = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const pointer = (e: PointerEvent) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; };

    const point = (s: Slot, t: number, scroll: number) => {
      const turn = Math.sin(t * 0.008) * 0.05;
      const sx = s.x * width * 0.47;
      const sy = s.y * height * 0.47;
      return {
        x: width / 2 + sx * Math.cos(turn) - sy * Math.sin(turn) + Math.sin(t * s.wx + s.phase) * s.ax - px * 26,
        y: height / 2 + sx * Math.sin(turn) + sy * Math.cos(turn) + Math.cos(t * s.wy + s.phase) * s.ay - py * 26 - scroll * 0.05,
      };
    };

    const draw = (ms: number, glide: number) => {
      const t = ms / 1000;
      const scroll = window.scrollY;
      px += (mx - px) * 0.03;
      py += (my - py) * 0.03;
      for (const s of slots) {
        s.x += (s.tx - s.x) * glide; s.y += (s.ty - s.y) * glide; s.size += (s.tsize - s.size) * glide;
        s.alpha += (s.talpha - s.alpha) * glide; s.warm += (s.twarm - s.warm) * glide; s.focus += (s.tfocus - s.focus) * glide;
      }
      linkLight += (1 - linkLight) * glide * 0.6;
      night += ((isNight() ? 1 : 0) - night) * glide;
      level += (targetLevel - level) * glide;
      ctx.clearRect(0, 0, width, height);

      for (const d of dust) {
        ctx.fillStyle = `rgba(${mix(110, 214, night)},${mix(98, 224, night)},${mix(76, 245, night)},${((0.24 + 0.16 * Math.sin(t * d.w + d.p)) * (0.35 + 0.65 * level)).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(d.x * width - px * 8, ((d.y * height - scroll * 0.02) % height + height) % height - py * 8, d.r, 0, 6.29);
        ctx.fill();
      }

      const near = Math.min(width, height) * 0.62;
      ctx.lineWidth = 1;
      for (const l of links) {
        const a = point(l.a, t, scroll);
        const b = point(l.b, t, scroll);
        const closeness = Math.max(0, 1 - Math.hypot(a.x - b.x, a.y - b.y) / near);
        const alpha = linkLight * Math.min(l.a.alpha, l.b.alpha) * (0.07 + 0.42 * closeness * closeness * (0.5 + 0.5 * l.score));
        if (alpha < 0.004) continue;
        ctx.strokeStyle = `rgba(${mix(70, 226, night)},${mix(60, 214, night)},${mix(45, 190, night)},${(alpha * level).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      for (const s of slots) {
        if (s.alpha < 0.01) continue;
        const { x, y } = point(s, t, scroll);
        const pulse = (0.82 + 0.18 * Math.sin(t * 0.35 + s.phase)) * s.alpha * (0.3 + 0.7 * level);
        const tone = (i: number) => mix(mix(CLOSED_DAY[i], CLOSED[i], night), mix(OPEN_DAY[i], OPEN[i], night), s.warm);
        const r = tone(0);
        const g = tone(1);
        const b = tone(2);
        const radius = 1.3 + 15 * s.size * (0.4 + 0.6 * level) + 3 * s.focus;
        const glow = radius * (5.5 + 3 * s.focus);
        const halo = ctx.createRadialGradient(x, y, 0, x, y, glow);
        halo.addColorStop(0, `rgba(${r},${g},${b},${((0.42 + 0.25 * s.focus) * pulse * level).toFixed(3)})`);
        halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, glow, 0, 6.29);
        ctx.fill();
        ctx.fillStyle = `rgba(${r},${g},${b},${((0.88 + 0.12 * s.focus) * pulse).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 6.29);
        ctx.fill();
      }
    };

    resize();
    const still = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    let frame = 0;
    let last = 0;
    let previous = performance.now();
    const tick = (ms: number) => {
      frame = requestAnimationFrame(tick);
      if (ms - last < FRAME_MS || document.hidden) return;
      last = ms;
      draw(ms, 1 - Math.exp(-Math.min(0.5, (ms - previous) / 1000) / GLIDE_SECONDS));
      previous = ms;
    };
    const onResize = () => { resize(); draw(performance.now(), still ? 1 : 0); };
    window.addEventListener('resize', onResize);
    const observer = new MutationObserver(() => draw(performance.now(), still ? 1 : 0));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ciel'] });
    window.addEventListener('pointermove', pointer, { passive: true });
    if (!still) frame = requestAnimationFrame(tick);
    // Première scène posée d'emblée, sans attendre une image d'animation ; ensuite les astres glissent.
    let placed = false;
    engine.current.still = () => {
      if (still || !placed) draw(performance.now(), 1);
      placed = true;
    };
    draw(performance.now(), 0);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', pointer);
      observer.disconnect();
      engine.current = null;
    };
  }, []);

  useEffect(() => {
    if (!core || !engine.current) return;
    engine.current.apply(sceneFor(core, pathname));
    engine.current.still?.();
  }, [core, pathname]);

  return <canvas ref={ref} className="sky" aria-hidden="true" />;
}
