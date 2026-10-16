import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** One film the studio handed back, kept so the inbox shows what was already answered. */
export interface SentRecord {
  id: string;
  /** The hand-off mail it answers. */
  messageId: string;
  version: string;
  to: string;
  /** Copied in; absent on records written before CC existed. */
  cc?: string[];
  subject: string;
  movieTitle: string;
  episodeCount: number;
  sentAt: string;
  /** prepared = a film of demo-data; upload = videos the studio uploaded. Absent on records written before. */
  source?: 'prepared' | 'upload';
  label?: string;
  /** The uploaded videos, by episode of the order. */
  files?: { episode: number; fileName: string; sizeBytes: number }[];
}

const FILE = 'sent.json';

export async function readSent(dataDir: string): Promise<SentRecord[]> {
  try {
    return JSON.parse(await readFile(path.join(dataDir, FILE), 'utf8')) as SentRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/** Appends a record; a read of the file and its rewrite are not atomic, which is fine for one studio clicking one button. */
export async function appendSent(dataDir: string, record: SentRecord): Promise<void> {
  const all = await readSent(dataDir);
  await mkdir(dataDir, { recursive: true });
  await writeFile(path.join(dataDir, FILE), JSON.stringify([record, ...all], null, 2), 'utf8');
}

export function sentFor(records: SentRecord[], messageId: string): SentRecord[] {
  return records.filter((record) => record.messageId === messageId);
}
