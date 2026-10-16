import { describe, expect, it } from 'vitest';
import { isBriefSubject, parseBrief } from '@/lib/mail/brief-parser';
import { FIXTURE_MESSAGES } from '@/lib/mail/fixtures';
import type { MailMessage } from '@/lib/mail/types';

const [first] = FIXTURE_MESSAGES;

describe('hand-off mail (what AI Cinema sends a studio)', () => {
  it('recognises the subject of a brief and nothing else', () => {
    expect(isBriefSubject('[AI Cinema] Đơn đặt hàng sản xuất phim "A" (Mùa 1)')).toBe(true);
    expect(isBriefSubject('  [AI Cinema] Đơn đặt hàng sản xuất phim "A"')).toBe(true);
    expect(isBriefSubject('[Studio] Giao phim "A"')).toBe(false);
    expect(isBriefSubject('Re: [AI Cinema] Đơn đặt hàng sản xuất phim "A"')).toBe(false);
  });

  it('reads the film, the scope, the fee and whom to answer', () => {
    const brief = parseBrief(first)!;
    expect(brief).toMatchObject({
      messageId: '1001',
      movieTitle: 'Căn Hộ Số 13',
      scope: 'Toàn bộ dự án',
      episodeCount: 3,
      feeTokens: 15000,
      feeVnd: 15_000_000,
      studioName: 'Studio Ánh Trăng',
      contactName: 'Nguyễn Thị Creator',
      contactEmail: 'creator01@aicinema.com',
    });
    expect(brief.briefFile?.fileName).toBe('brief-1001.pdf');
  });

  it('keeps a title with quotes and a season scope', () => {
    const message: MailMessage = {
      ...first,
      subject: '[AI Cinema] Đơn đặt hàng sản xuất phim "Phim "lạ"" (Mùa 2)',
      text: first.text.replace(/sản xuất phim ".+" \(.+\) gồm 3 tập/u, 'sản xuất phim "Phim "lạ"" (Mùa 2) gồm 8 tập'),
    };
    expect(parseBrief(message)).toMatchObject({ movieTitle: 'Phim "lạ"', scope: 'Mùa 2', episodeCount: 8 });
  });

  it('lower-cases the address to answer', () => {
    const message = { ...first, text: first.text.replace('creator01@aicinema.com', 'Creator01@AICinema.com') };
    expect(parseBrief(message)?.contactEmail).toBe('creator01@aicinema.com');
  });

  it('still reads older briefs that put an em dash before the address', () => {
    const message = { ...first, text: first.text.replace(' - creator01@aicinema.com', ' — creator01@aicinema.com') };
    expect(parseBrief(message)?.contactEmail).toBe('creator01@aicinema.com');
  });

  it('is not fooled by another mail or a brief that does not say whom to answer', () => {
    expect(parseBrief({ ...first, subject: 'Chào mừng bạn' })).toBeNull();
    expect(parseBrief({ ...first, text: first.text.replace(/Đầu mối:.*/u, '') })).toBeNull();
    expect(parseBrief({ ...first, text: 'Nội dung khác' })).toBeNull();
  });

  it('reads the co-senders to CC and who holds each episode', () => {
    const team = [
      'Đồng gửi: Trần Phụ <Phu@AICinema.com>, Lê Ba <ba@aicinema.com>',
      'Phân công tập:',
      '- Tập 1: Nguyễn Thị Creator - creator01@aicinema.com',
      '- Tập 2: Trần Phụ - phu@aicinema.com',
      '- Tập 3: Lê Ba - ba@aicinema.com',
    ].join('\r\n');
    const brief = parseBrief({ ...first, text: `${first.text}\r\n${team}` })!;
    expect(brief.coSenders).toEqual([
      { name: 'Trần Phụ', email: 'phu@aicinema.com' },
      { name: 'Lê Ba', email: 'ba@aicinema.com' },
    ]);
    expect(brief.episodeOwners.map((owner) => [owner.episodeNumber, owner.email])).toEqual([
      [1, 'creator01@aicinema.com'],
      [2, 'phu@aicinema.com'],
      [3, 'ba@aicinema.com'],
    ]);
  });

  it('has nobody to CC on a brief from before "Đồng gửi"', () => {
    expect(parseBrief(first)).toMatchObject({ coSenders: [], episodeOwners: [] });
  });

  it('copes with a brief that carries no fee line or PDF', () => {
    const brief = parseBrief({ ...first, text: first.text.replace(/Phí sản xuất:.*\n/u, ''), attachments: [] })!;
    expect(brief.feeTokens).toBeNull();
    expect(brief.briefFile).toBeNull();
  });
});
