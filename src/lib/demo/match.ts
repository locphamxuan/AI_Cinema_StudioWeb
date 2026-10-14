import type { Brief } from '../mail/brief-parser';
import type { DemoCatalog, DemoProject, Delivery } from './catalog';

/** "Căn Hộ Số 13" and "can ho so 13" are the same film: compare without case, accents or punctuation. */
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface ProjectMatch {
  project: DemoProject;
  /** True when the films were made for this very title; false for the generic ones. */
  specific: boolean;
}

export function matchProject(catalog: DemoCatalog, movieTitle: string): ProjectMatch {
  const wanted = normalizeTitle(movieTitle);
  const found = catalog.projects.find((p) => [p.title, ...p.aliases].some((name) => normalizeTitle(name) === wanted));
  return found ? { project: found, specific: true } : { project: catalog.generic, specific: false };
}

/** A delivery with exactly `count` episodes: extra ones are dropped, missing ones repeat the prepared films in turn. */
export function fitDelivery(delivery: Delivery, count: number): Delivery {
  if (count <= 0 || delivery.episodes.length === count) return delivery;
  const episodes = Array.from({ length: count }, (_, i) => {
    const source = delivery.episodes[i % delivery.episodes.length];
    return i < delivery.episodes.length ? source : { ...source, title: `Tập ${i + 1} — ${source.title}` };
  });
  return { ...delivery, episodes };
}

/** What the studio can send back for a brief: the films of the matching project, fitted to the number of episodes ordered. */
export function deliveriesFor(brief: Pick<Brief, 'movieTitle' | 'episodeCount'>, catalog: DemoCatalog) {
  const match = matchProject(catalog, brief.movieTitle);
  return {
    ...match,
    deliveries: match.project.deliveries.map((delivery) => fitDelivery(delivery, brief.episodeCount)),
  };
}
