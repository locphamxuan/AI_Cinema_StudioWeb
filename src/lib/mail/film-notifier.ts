import type { AiCinemaConfig } from '../config';

/** What AI Cinema is told once a film is mailed to the Creator: enough to find the hand-off, nothing more. */
export interface FilmSentReport {
  studioEmail: string;
  creatorEmail: string;
  movieTitle: string;
  scope: string;
  version: string;
  label: string;
  episodeCount: number;
}

/** Tells AI Cinema that a film went out, so the Creator and Reviewer see it in the app. */
export interface FilmNotifier {
  filmSent(report: FilmSentReport): Promise<void>;
}

const TIMEOUT_MS = 8000;

/** Posts the report to AI Cinema's studio inbound channel, signed with the token both sides share. */
export class HttpFilmNotifier implements FilmNotifier {
  constructor(private readonly target: AiCinemaConfig) {}

  async filmSent(report: FilmSentReport): Promise<void> {
    const response = await fetch(`${this.target.apiUrl.replace(/\/+$/, '')}/studio-inbound/film-sent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-studio-token': this.target.token },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const detail = ((await response.json().catch(() => null)) as { message?: string } | null)?.message;
      throw new Error(`AI Cinema trả lỗi ${response.status}${detail ? `: ${detail}` : ''}`);
    }
  }
}

/** Keeps the reports instead of sending them: for the fixtures source and for tests. */
export class MemoryNotifier implements FilmNotifier {
  readonly reports: FilmSentReport[] = [];

  async filmSent(report: FilmSentReport): Promise<void> {
    this.reports.push(report);
  }
}
