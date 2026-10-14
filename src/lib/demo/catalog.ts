import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** The films the studio prepared in advance for the demo: it makes no video, it only hands these back. */

export interface DemoEpisode {
  title: string;
  durationSeconds: number;
  url: string;
}

export interface Delivery {
  /** v1 = first delivery, v2 = the fixed one after the Reviewer asked for changes. */
  version: string;
  label: string;
  summary: string;
  episodes: DemoEpisode[];
}

export interface DemoProject {
  title: string;
  aliases: string[];
  /** File in demo-data/scripts, sent along with the films. */
  script: string;
  synopsis: string;
  deliveries: Delivery[];
}

export interface DemoCatalog {
  projects: DemoProject[];
  /** Used for any project without films of its own. */
  generic: DemoProject;
}

export const DEMO_DATA_DIR = path.join(process.cwd(), 'demo-data');

type Json = Record<string, unknown>;

function fail(where: string, what: string): never {
  throw new Error(`demo-data/projects.json: ${where} ${what}`);
}

function text(value: unknown, where: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(where, 'phải là chuỗi không rỗng');
  return value;
}

function episode(raw: Json, where: string): DemoEpisode {
  const url = text(raw.url, `${where}.url`);
  if (!/^https?:\/\//.test(url)) fail(`${where}.url`, 'phải là link http(s)');
  const durationSeconds = Number(raw.durationSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) fail(`${where}.durationSeconds`, 'phải là số giây dương');
  return { title: text(raw.title, `${where}.title`), durationSeconds, url };
}

function delivery(raw: Json, where: string): Delivery {
  const episodes = raw.episodes;
  if (!Array.isArray(episodes) || episodes.length === 0) fail(`${where}.episodes`, 'cần ít nhất một tập');
  return {
    version: text(raw.version, `${where}.version`),
    label: text(raw.label, `${where}.label`),
    summary: text(raw.summary, `${where}.summary`),
    episodes: episodes.map((item, i) => episode(item as Json, `${where}.episodes[${i}]`)),
  };
}

function project(raw: Json, where: string): DemoProject {
  const deliveries = raw.deliveries;
  if (!Array.isArray(deliveries) || deliveries.length === 0) fail(`${where}.deliveries`, 'cần ít nhất một bản giao');
  const aliases = Array.isArray(raw.aliases) ? raw.aliases.map((a, i) => text(a, `${where}.aliases[${i}]`)) : [];
  return {
    title: text(raw.title, `${where}.title`),
    aliases,
    script: text(raw.script, `${where}.script`),
    synopsis: text(raw.synopsis, `${where}.synopsis`),
    deliveries: deliveries.map((item, i) => delivery(item as Json, `${where}.deliveries[${i}]`)),
  };
}

/** Checks the shape of the manifest and returns it typed; a mistake names the field. */
export function parseCatalog(raw: unknown): DemoCatalog {
  const root = raw as Json;
  if (!root || typeof root !== 'object' || !Array.isArray(root.projects) || !root.generic) {
    fail('(gốc)', 'cần `projects` và `generic`');
  }
  return {
    projects: (root.projects as Json[]).map((item, i) => project(item, `projects[${i}]`)),
    generic: project(root.generic as Json, 'generic'),
  };
}

export async function loadCatalog(dir: string = DEMO_DATA_DIR): Promise<DemoCatalog> {
  return parseCatalog(JSON.parse(await readFile(path.join(dir, 'projects.json'), 'utf8')));
}

/** The script of a project, or null when its file is missing (the reply then goes without it). */
export async function loadScript(project: DemoProject, dir: string = DEMO_DATA_DIR): Promise<Buffer | null> {
  const file = path.join(dir, 'scripts', path.basename(project.script));
  return readFile(file).catch(() => null);
}
