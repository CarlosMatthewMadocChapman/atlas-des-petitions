import type { Core } from './data';
import type { MapGraph, MapLink, MapNode } from './graph';
import type { Dossier, Relation, RelationType } from './types';

export interface DemandGroup {
  /** Pétition qui représente le groupe (la plus centrale du dossier). */
  rep: string;
  /** Toutes les pétitions du groupe, représentante comprise. */
  members: string[];
}

const RANK: Record<RelationType, number> = { proche: 0, comparaison: 1, complementaire: 2, thematique: 3 };

/**
 * Regroupe les pétitions d'un dossier dont les textes sont « très proches » (liens de type proche) :
 * ce sont, le plus souvent, la même demande déposée plusieurs fois. Un groupe = une demande à lire une fois.
 */
export function demandGroups(core: Core, dossier: Dossier): DemandGroup[] {
  const parent = new Map(dossier.members.map((m) => [m, m]));
  const find = (x: string): string => {
    let root = x;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    parent.set(x, root);
    return root;
  };
  for (const id of dossier.members) {
    for (const n of core.adjacency.get(id) ?? []) {
      if (n.relation.type === 'proche' && parent.has(n.id)) parent.set(find(id), find(n.id));
    }
  }
  const byRoot = new Map<string, string[]>();
  for (const id of dossier.members) {
    const root = find(id);
    byRoot.set(root, [...(byRoot.get(root) ?? []), id]);
  }
  // dossier.members est trié du plus central au moins central : la représentante est la première.
  return [...byRoot.values()]
    .map((members) => ({ rep: members[0], members }))
    .sort((a, b) => b.members.length - a.members.length || dossier.members.indexOf(a.rep) - dossier.members.indexOf(b.rep));
}

/** Graphe lisible : une pastille par demande (au plus `limit`), reliées par leur meilleur lien. */
export function condensedGraph(core: Core, dossier: Dossier, groups: DemandGroup[], limit = 8): MapGraph {
  const shown = groups.slice(0, limit);
  const repOf = new Map<string, string>();
  for (const g of shown) for (const m of g.members) repOf.set(m, g.rep);

  const nodes: MapNode[] = shown.map((g) => {
    const i = dossier.members.indexOf(g.rep);
    return {
      id: g.rep, x: dossier.pos[i][0], y: dossier.pos[i][1], role: 'membre',
      theme: core.byId.get(g.rep)?.themes[0] ?? '', count: g.members.length,
    };
  });

  const best = new Map<string, Relation>();
  for (const g of shown) {
    for (const id of g.members) {
      for (const n of core.adjacency.get(id) ?? []) {
        const other = repOf.get(n.id);
        const mine = repOf.get(id);
        if (!other || !mine || other === mine) continue;
        const key = [mine, other].sort().join('-');
        const current = best.get(key);
        if (!current || RANK[n.relation.type] < RANK[current.type] || (n.relation.type === current.type && n.relation.score > current.score)) {
          best.set(key, n.relation);
        }
      }
    }
  }
  // Lisibilité : chaque point garde au plus ses trois liens les plus forts.
  const ranked = [...best.entries()]
    .map(([key, relation]) => {
      const [a, b] = key.split('-');
      return { a, b, relation };
    })
    .sort((x, y) => RANK[x.relation.type] - RANK[y.relation.type] || y.relation.score - x.relation.score);
  const used = new Map<string, number>();
  const links: MapLink[] = [];
  for (const l of ranked) {
    if ((used.get(l.a) ?? 0) >= 3 && (used.get(l.b) ?? 0) >= 3) continue;
    used.set(l.a, (used.get(l.a) ?? 0) + 1);
    used.set(l.b, (used.get(l.b) ?? 0) + 1);
    links.push(l);
  }
  return { nodes: spread(nodes), links };
}

/** Réétale quelques points sur toute la carte : leurs positions d'origine viennent d'un dossier plus grand. */
export function spread(nodes: MapNode[], minGap = 0.34): MapNode[] {
  if (nodes.length < 2) return nodes;
  const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
  const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
  const reach = Math.max(...nodes.map((n) => Math.hypot(n.x - cx, n.y - cy))) || 1;
  const pts = nodes.map((n) => ({ ...n, x: ((n.x - cx) / reach) * 0.85, y: ((n.y - cy) / reach) * 0.85 }));
  for (let step = 0; step < 60; step++) {
    let moved = false;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        const d = Math.hypot(dx, dy) || 1e-6;
        if (d >= minGap) continue;
        const push = (minGap - d) / 2;
        pts[i].x -= (dx / d) * push;
        pts[i].y -= (dy / d) * push;
        pts[j].x += (dx / d) * push;
        pts[j].y += (dy / d) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return pts;
}

/** Ajoute à une carte un point « Votre texte », au centre des pétitions qui lui ressemblent. */
export function withYou(graph: MapGraph, matches: { id: string; close: boolean }[]): MapGraph {
  const present = matches.filter((m) => graph.nodes.some((n) => n.id === m.id));
  if (present.length === 0) return graph;
  const points = present.map((m) => graph.nodes.find((n) => n.id === m.id) as MapNode);
  const x = points.reduce((s, p) => s + p.x, 0) / points.length;
  const y = points.reduce((s, p) => s + p.y, 0) / points.length;
  const you: MapNode = { id: 'vous', x, y, role: 'centre', theme: '' };
  const links: MapLink[] = present.map((m) => ({
    a: 'vous', b: m.id,
    relation: {
      a: 'vous', b: m.id, type: m.close ? 'proche' : 'complementaire', score: 0, terms: [], cues: [], human: '', note: '',
    },
  }));
  return { nodes: [...graph.nodes, you], links: [...graph.links, ...links] };
}
