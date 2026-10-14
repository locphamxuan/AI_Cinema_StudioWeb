import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadCatalog, loadScript, parseCatalog, DEMO_DATA_DIR } from '@/lib/demo/catalog';
import { composeFilmMail, filmSubject } from '@/lib/demo/film-mail';
import { deliveriesFor, fitDelivery, matchProject, normalizeTitle } from '@/lib/demo/match';
import { parseBrief } from '@/lib/mail/brief-parser';
import { FIXTURE_MESSAGES } from '@/lib/mail/fixtures';

const brief = parseBrief(FIXTURE_MESSAGES[0])!;

describe('demo films of the studio', () => {
  it('ships a manifest that passes its own checks, with a script for every project', async () => {
    const catalog = await loadCatalog();
    expect(catalog.projects.length).toBeGreaterThan(0);
    for (const project of [...catalog.projects, catalog.generic]) {
      expect(await loadScript(project), `${project.title}: kịch bản ${project.script}`).not.toBeNull();
      expect(project.deliveries.map((d) => d.version)).toContain('v1');
    }
    expect(catalog.generic.deliveries.map((d) => d.version)).toEqual(['v1', 'v2']);
  });

  it('names the field that is wrong', () => {
    const delivery = { version: 'v1', label: 'L', summary: 'S', episodes: [{ title: 'T', durationSeconds: 10, url: 'https://x.test/a.mp4' }] };
    const project = { title: 'P', script: 's.txt', synopsis: 'S', deliveries: [delivery] };
    expect(() => parseCatalog({ projects: [project], generic: project })).not.toThrow();
    expect(() => parseCatalog({ projects: [] })).toThrow('projects');
    expect(() => parseCatalog({ projects: [{ ...project, deliveries: [] }], generic: project })).toThrow('projects[0].deliveries');
    const badUrl = { ...delivery, episodes: [{ title: 'T', durationSeconds: 10, url: 'ftp://x' }] };
    expect(() => parseCatalog({ projects: [project], generic: { ...project, deliveries: [badUrl] } })).toThrow('generic.deliveries[0].episodes[0].url');
    const badLength = { ...delivery, episodes: [{ title: 'T', durationSeconds: 0, url: 'https://x.test/a.mp4' }] };
    expect(() => parseCatalog({ projects: [{ ...project, deliveries: [badLength] }], generic: project })).toThrow('durationSeconds');
  });

  it('reads a script only from the scripts folder', async () => {
    const catalog = await loadCatalog();
    const escape = { ...catalog.generic, script: '../projects.json' };
    expect(await loadScript(escape)).toBeNull();
    expect(path.basename(DEMO_DATA_DIR)).toBe('demo-data');
  });

  it('compares titles without case, accents or punctuation', () => {
    expect(normalizeTitle('Căn Hộ Số 13')).toBe('can ho so 13');
    expect(normalizeTitle('  ĐẠI-dương!  ')).toBe('dai duong');
  });

  it('finds the films made for a title, else the studio general ones', async () => {
    const catalog = await loadCatalog();
    expect(matchProject(catalog, 'can ho SO 13')).toMatchObject({ specific: true, project: { title: 'Căn Hộ Số 13' } });
    expect(matchProject(catalog, 'Một phim lạ')).toMatchObject({ specific: false, project: { title: catalog.generic.title } });
  });

  it('fits a delivery to the number of episodes ordered', async () => {
    const [v1] = (await loadCatalog()).generic.deliveries;
    expect(fitDelivery(v1, v1.episodes.length)).toBe(v1);
    expect(fitDelivery(v1, 2).episodes).toHaveLength(2);
    const longer = fitDelivery(v1, v1.episodes.length + 2);
    expect(longer.episodes).toHaveLength(v1.episodes.length + 2);
    expect(longer.episodes.at(-1)?.title).toMatch(/^Tập \d+ — /);
    expect(fitDelivery(v1, 0)).toBe(v1);
  });

  it('offers every version of the matching project, fitted to the brief', async () => {
    const catalog = await loadCatalog();
    const { specific, deliveries } = deliveriesFor({ movieTitle: 'Căn Hộ Số 13', episodeCount: 3 }, catalog);
    expect(specific).toBe(true);
    expect(deliveries.map((d) => [d.version, d.episodes.length])).toEqual([['v1', 3], ['v2', 3]]);
    expect(deliveriesFor({ movieTitle: 'Khác', episodeCount: 4 }, catalog).deliveries[0].episodes).toHaveLength(4);
  });
});

describe('the mail that hands a film back', () => {
  it('goes to the Creator of the brief, with a download link per episode and the script', async () => {
    const catalog = await loadCatalog();
    const { project, deliveries } = deliveriesFor(brief, catalog);
    const v2 = deliveries[1];
    const mail = composeFilmMail({ brief, project, delivery: v2, script: Buffer.from('kịch bản'), studioName: 'Studio Ánh Trăng' });

    expect(mail.to).toBe('creator01@aicinema.com');
    expect(mail.subject).toBe(filmSubject(brief, v2));
    expect(mail.subject).toContain('Căn Hộ Số 13');
    expect(mail.subject).toContain('v2');
    for (const [i, episode] of v2.episodes.entries()) {
      expect(mail.text).toContain(`Tập ${i + 1} — ${episode.title}`);
      expect(mail.text).toContain(episode.url);
    }
    expect(mail.text).toContain('Kịch bản đính kèm');
    expect(mail.attachments).toEqual([{ filename: 'can-ho-so-13.txt', content: Buffer.from('kịch bản'), contentType: 'text/plain; charset=utf-8' }]);
  });

  it('goes without an attachment when the script is missing', async () => {
    const catalog = await loadCatalog();
    const { project, deliveries } = deliveriesFor(brief, catalog);
    const mail = composeFilmMail({ brief, project, delivery: deliveries[0], script: null, studioName: 'S' });
    expect(mail.attachments).toEqual([]);
    expect(mail.text).not.toContain('Kịch bản đính kèm');
  });
});
