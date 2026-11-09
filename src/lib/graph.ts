import type { Core } from './data';
import type { Dossier, Neighbor, Relation, RelationType } from './types';

export interface MapNode {
  id: string;
  x: number;
  y: number;
  /** « membre » appartient au dossier affiché ; « voisine » vient d'un autre dossier ou d'aucun. */
  role: 'membre' | 'voisine' | 'centre';
  theme: string;
  /** Nombre de pétitions que représente ce point (carte condensée). */
  count?: number;
}

export interface MapLink {
  a: string;
  b: string;
  relation: Relation;
}

export interface MapGraph {
  nodes: MapNode[];
  links: MapLink[];
}

const NON_THEMATIC: RelationType[] = ['proche', 'complementaire', 'comparaison'];

function primaryTheme(core: Core, id: string): string {
  return core.byId.get(id)?.themes[0] ?? '';
}

/** Constellation d'un dossier : positions calculées par le pipeline, plus quelques voisines extérieures. */
export function dossierGraph(core: Core, dossier: Dossier, satelliteLimit = 10): MapGraph {
  const members = new Set(dossier.members);
  const nodes: MapNode[] = dossier.members.map((id, i) => ({
    id, x: dossier.pos[i][0], y: dossier.pos[i][1], role: 'membre', theme: primaryTheme(core, id),
  }));
  const placed = new Map(nodes.map((n) => [n.id, n]));

  const links: MapLink[] = [];
  const seen = new Set<string>();
  const external: { id: string; anchor: string; relation: Relation }[] = [];
  for (const id of dossier.members) {
    for (const n of core.adjacency.get(id) ?? []) {
      const key = [id, n.id].sort().join('-');
      if (members.has(n.id)) {
        if (!seen.has(key)) {
          seen.add(key);
          links.push({ a: n.relation.a, b: n.relation.b, relation: n.relation });
        }
      } else if (NON_THEMATIC.includes(n.relation.type)) {
        external.push({ id: n.id, anchor: id, relation: n.relation });
      }
    }
  }

  external.sort((x, y) => y.relation.score - x.relation.score || Number(x.id) - Number(y.id));
  const taken = new Set<string>();
  const perAnchor = new Map<string, number>();
  for (const e of external) {
    if (taken.has(e.id)) continue;
    if (taken.size >= satelliteLimit) break;
    taken.add(e.id);
    const anchor = placed.get(e.anchor) as MapNode;
    const count = perAnchor.get(e.anchor) ?? 0;
    perAnchor.set(e.anchor, count + 1);
    const base = Math.atan2(anchor.y, anchor.x || 0.001);
    const angle = base + (count % 2 === 0 ? 1 : -1) * Math.ceil(count / 2) * 0.22;
    const node: MapNode = {
      id: e.id, x: Math.cos(angle) * 1.3, y: Math.sin(angle) * 1.3, role: 'voisine', theme: primaryTheme(core, e.id),
    };
    nodes.push(node);
    placed.set(e.id, node);
  }
  for (const e of external) {
    if (!taken.has(e.id)) continue;
    const key = [e.anchor, e.id].sort().join('-');
    if (!seen.has(key)) {
      seen.add(key);
      links.push({ a: e.relation.a, b: e.relation.b, relation: e.relation });
    }
  }
  return { nodes, links };
}

/** Voisinage d'une pétition : elle au centre, ses voisines en couronne, regroupées par type de relation. */
export function egoGraph(core: Core, id: string, limit = 12): MapGraph {
  const neighbors: Neighbor[] = (core.adjacency.get(id) ?? []).slice(0, limit);
  const ids = new Set(neighbors.map((n) => n.id));
  const nodes: MapNode[] = [{ id, x: 0, y: 0, role: 'centre', theme: primaryTheme(core, id) }];
  neighbors.forEach((n, i) => {
    const angle = -Math.PI / 2 + (i / Math.max(1, neighbors.length)) * Math.PI * 2;
    nodes.push({ id: n.id, x: Math.cos(angle), y: Math.sin(angle), role: 'voisine', theme: primaryTheme(core, n.id) });
  });
  const links: MapLink[] = neighbors.map((n) => ({ a: n.relation.a, b: n.relation.b, relation: n.relation }));
  const seen = new Set(links.map((l) => `${l.a}-${l.b}`));
  for (const n of neighbors) {
    for (const m of core.adjacency.get(n.id) ?? []) {
      if (!ids.has(m.id)) continue;
      const key = `${m.relation.a}-${m.relation.b}`;
      if (!seen.has(key) && m.relation.type !== 'thematique') {
        seen.add(key);
        links.push({ a: m.relation.a, b: m.relation.b, relation: m.relation });
      }
    }
  }
  return { nodes, links };
}

export function relationBetween(core: Core, a: string, b: string): Relation | undefined {
  return core.adjacency.get(a)?.find((n) => n.id === b)?.relation;
}

export function groupNeighbors(neighbors: Neighbor[]): Record<RelationType, Neighbor[]> {
  const groups: Record<RelationType, Neighbor[]> = { proche: [], comparaison: [], complementaire: [], thematique: [] };
  for (const n of neighbors) groups[n.relation.type].push(n);
  return groups;
}
