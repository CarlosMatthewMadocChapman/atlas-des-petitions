import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import type { Core } from '../lib/data';
import type { MapGraph } from '../lib/graph';
import { RELATION_LABEL } from '../lib/format';
import type { RelationType } from '../lib/types';

const W = 1000;
const H = 760;
const R = 285;
const CX = W / 2;
const CY = H / 2;
const ORDER: RelationType[] = ['proche', 'complementaire', 'comparaison', 'thematique'];

interface View {
  k: number;
  x: number;
  y: number;
}
const HOME: View = { k: 1, x: 0, y: 0 };

function clip(text: string, max = 46): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function Legend({ present }: { present?: Set<RelationType> }) {
  return (
    <ul className="legend" aria-label="Légende des liens">
      {ORDER.filter((t) => !present || present.has(t)).map((type) => (
        <li key={type}>
          <svg width="34" height="10" viewBox="0 0 34 10" aria-hidden="true">
            <line x1="2" x2="32" y1="5" y2="5" className={`link link--${type}`} />
          </svg>
          {RELATION_LABEL[type]}
        </li>
      ))}
    </ul>
  );
}

interface Props {
  core: Core;
  graph: MapGraph;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  label: string;
}

export function ConstellationMap({ core, graph, selectedId, onSelect, label }: Props) {
  const [view, setView] = useState<View>(HOME);
  const [hover, setHover] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);

  const nodes = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const degree = useMemo(() => {
    const d = new Map<string, number>();
    for (const l of graph.links) {
      d.set(l.a, (d.get(l.a) ?? 0) + 1);
      d.set(l.b, (d.get(l.b) ?? 0) + 1);
    }
    return d;
  }, [graph]);
  const connected = useMemo(() => {
    const set = new Set<string>();
    if (selectedId) for (const l of graph.links) if (l.a === selectedId || l.b === selectedId) set.add(l.a === selectedId ? l.b : l.a);
    return set;
  }, [graph, selectedId]);

  const zoomBy = useCallback((factor: number, px = W / 2, py = H / 2) => {
    setView((v) => {
      const k = Math.min(6, Math.max(0.6, v.k * factor));
      const ratio = k / v.k;
      return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
    });
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) * W;
      const py = ((event.clientY - rect.top) / rect.height) * H;
      zoomBy(event.deltaY < 0 ? 1.15 : 1 / 1.15, px, py);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  useEffect(() => setView(HOME), [graph]);

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if ((event.target as Element).closest('.node')) return;
    drag.current = { x: event.clientX, y: event.clientY, view, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - d.x) / rect.width) * W;
    const dy = ((event.clientY - d.y) / rect.height) * H;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    setView({ ...d.view, x: d.view.x + dx, y: d.view.y + dy });
  }
  function onPointerUp(event: PointerEvent<SVGSVGElement>) {
    if (drag.current && !drag.current.moved && !(event.target as Element).closest('.node')) onSelect(null);
    drag.current = null;
  }
  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === '+' || event.key === '=') zoomBy(1.2);
    else if (event.key === '-') zoomBy(1 / 1.2);
    else if (event.key === '0') setView(HOME);
    else if (event.key === 'Escape') onSelect(null);
  }

  const labelled = (id: string) => id === selectedId || id === hover || connected.has(id) || (view.k >= 1.8 && (degree.get(id) ?? 0) >= 2);
  const radius = 10 / Math.sqrt(view.k);
  const fontSize = 14 / Math.sqrt(view.k);
  const point = (id: string) => {
    const n = nodes.get(id);
    return n ? { x: CX + n.x * R, y: CY + n.y * R } : { x: CX, y: CY };
  };

  return (
    <div className="map">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="group"
        aria-label={label}
        className="map__svg"
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <circle cx={CX} cy={CY} r={R * 1.12} className="map__halo" />
          {graph.links.map((l) => {
            const a = point(l.a);
            const b = point(l.b);
            const dim = selectedId && l.a !== selectedId && l.b !== selectedId;
            return (
              <line
                key={`${l.a}-${l.b}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                className={`link link--${l.relation.type}${dim ? ' link--dim' : ''}`}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {graph.nodes.map((n) => {
            const p = point(n.id);
            const petition = core.byId.get(n.id);
            const theme = core.themeById.get(n.theme);
            const selected = n.id === selectedId;
            const dim = selectedId && !selected && !connected.has(n.id);
            const show = labelled(n.id);
            return (
              <g
                key={n.id}
                className={`node node--${n.role}${selected ? ' node--selected' : ''}${dim ? ' node--dim' : ''}`}
                transform={`translate(${p.x} ${p.y})`}
                role="button"
                tabIndex={0}
                aria-pressed={selected}
                aria-label={n.id === 'vous' ? `Votre texte, relié à ${degree.get(n.id) ?? 0} pétition(s).` : `Pétition n° ${n.id} : ${petition?.title ?? ''}${n.count && n.count > 1 ? `, représentant ${n.count} textes très proches` : ''}. ${degree.get(n.id) ?? 0} lien(s) dans cette vue.`}
                onClick={() => onSelect(selected ? null : n.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(selected ? null : n.id);
                  }
                }}
                onPointerEnter={() => setHover(n.id)}
                onPointerLeave={() => setHover((h) => (h === n.id ? null : h))}
                onFocus={() => setHover(n.id)}
                onBlur={() => setHover((h) => (h === n.id ? null : h))}
              >
                {selected && <circle r={radius * 2.1} className="node__ring" />}
                <circle r={radius * 2.6} className="node__hit" />
                <circle
                  r={n.role === 'voisine' ? radius * 0.85 : radius * (n.count ? Math.min(2.2, 1 + Math.log2(n.count) * 0.32) : 1)}
                  fill={theme?.color ?? '#8f8a7c'}
                  className="node__dot"
                />
                {show && (
                  <text x={radius * 1.7} y={fontSize * 0.35} fontSize={fontSize} className="node__label">
                    {n.id === 'vous' ? 'Votre texte' : `${clip(petition?.title ?? n.id)}${n.count && n.count > 1 ? ` (×${n.count})` : ''}`}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      <div className="map__tools" role="group" aria-label="Zoom de la carte">
        <button type="button" className="icon-btn" onClick={() => zoomBy(1.25)} aria-label="Zoomer">
          <Plus size={18} aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn" onClick={() => zoomBy(1 / 1.25)} aria-label="Dézoomer">
          <Minus size={18} aria-hidden="true" />
        </button>
        <button type="button" className="icon-btn" onClick={() => setView(HOME)} aria-label="Recentrer la carte">
          <RotateCcw size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Miniature statique d'un dossier (positions calculées par le pipeline). */
export function MiniConstellation({ core, dossierId, size = 120 }: { core: Core; dossierId: string; size?: number }) {
  const dossier = core.dossierById.get(dossierId);
  if (!dossier) return null;
  const members = new Set(dossier.members);
  const index = new Map(dossier.members.map((id, i) => [id, i]));
  const pad = 0.12;
  const px = (v: number) => ((v + 1) / 2) * (1 - 2 * pad) * size + pad * size;
  const lines: { a: number; b: number; type: RelationType }[] = [];
  for (const id of dossier.members) {
    for (const n of core.adjacency.get(id) ?? []) {
      if (members.has(n.id) && Number(id) < Number(n.id)) lines.push({ a: index.get(id) as number, b: index.get(n.id) as number, type: n.relation.type });
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="mini" aria-hidden="true" focusable="false">
      {lines.map((l, i) => (
        <line
          key={i}
          x1={px(dossier.pos[l.a][0])} y1={px(dossier.pos[l.a][1])} x2={px(dossier.pos[l.b][0])} y2={px(dossier.pos[l.b][1])}
          className={`link link--${l.type}`} vectorEffect="non-scaling-stroke"
        />
      ))}
      {dossier.members.map((id, i) => (
        <circle
          key={id}
          cx={px(dossier.pos[i][0])} cy={px(dossier.pos[i][1])} r={i === 0 ? 3.6 : 2.4}
          fill={core.themeById.get(core.byId.get(id)?.themes[0] ?? '')?.color ?? '#8f8a7c'}
        />
      ))}
    </svg>
  );
}
