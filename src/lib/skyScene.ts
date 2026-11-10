import type { Core } from './data';
import { dossierGraph, egoGraph, type MapGraph } from './graph';

export interface SkyStar {
  id: string;
  /** Position de -1 à 1 sur la largeur et la hauteur de l'écran. */
  x: number;
  y: number;
  /** De 0 à 1, racine des signatures rapportée à la plus signée de la scène : la surface suit les signatures. */
  size: number;
  open: boolean;
  focus: boolean;
}

export interface SkyLink {
  a: string;
  b: string;
  score: number;
}

export interface SkyScene {
  key: string;
  stars: SkyStar[];
  links: SkyLink[];
}

export const MAX_STARS = 64;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const hash = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

function fromGraph(core: Core, key: string, graph: MapGraph, focus: string | null): SkyScene {
  const nodes = graph.nodes.filter((n) => core.byId.has(n.id)).slice(0, MAX_STARS);
  const max = Math.max(1, ...nodes.map((n) => core.byId.get(n.id)?.votes ?? 0));
  const kept = new Set(nodes.map((n) => n.id));
  return {
    key,
    stars: nodes.map((n) => {
      const petition = core.byId.get(n.id);
      return { id: n.id, x: n.x, y: n.y, size: Math.sqrt((petition?.votes ?? 0) / max), open: petition?.status === 'ouverte', focus: n.id === focus };
    }),
    links: graph.links.filter((l) => kept.has(l.a) && kept.has(l.b)).map((l) => ({ a: l.a, b: l.b, score: l.relation.score })),
  };
}

/** Le ciel commun : les pétitions les plus signées, en spirale, le centre laissé libre pour le texte. Chaque page le tourne un peu. */
function commonSky(core: Core, key: string): SkyScene {
  const top = [...core.petitions].sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1)).slice(0, MAX_STARS);
  const max = Math.max(1, top[0]?.votes ?? 1);
  const turn = (hash(key) % 628) / 100;
  const kept = new Set(top.map((p) => p.id));
  const links: SkyLink[] = [];
  for (const p of top) {
    for (const n of core.adjacency.get(p.id) ?? []) {
      if (kept.has(n.id) && p.id < n.id) links.push({ a: p.id, b: n.id, score: n.relation.score });
    }
  }
  return {
    key,
    stars: top.map((p, i) => {
      const angle = i * GOLDEN + turn;
      const reach = 0.42 + 0.56 * Math.sqrt((i + 1) / top.length);
      return { id: p.id, x: Math.cos(angle) * reach, y: Math.sin(angle) * reach, size: Math.sqrt((p.votes ?? 0) / max), open: p.status === 'ouverte', focus: false };
    }),
    links,
  };
}

/** Ce que le ciel montre pour une adresse : la constellation visitée, celle de la pétition ouverte, sinon le ciel commun. */
export function sceneFor(core: Core, pathname: string): SkyScene {
  const dossierId = /^\/constellations\/([^/]+)/.exec(pathname)?.[1];
  const dossier = dossierId ? core.dossierById.get(dossierId) : undefined;
  if (dossier) return fromGraph(core, pathname, dossierGraph(core, dossier, 0), null);

  const petitionId = /^\/petition\/([^/]+)/.exec(pathname)?.[1];
  const petition = petitionId ? core.byId.get(petitionId) : undefined;
  if (petition) {
    const home = petition.dossier ? core.dossierById.get(petition.dossier) : undefined;
    return fromGraph(core, pathname, home ? dossierGraph(core, home, 0) : egoGraph(core, petition.id, 12), petition.id);
  }
  return commonSky(core, pathname);
}
