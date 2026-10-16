import { describe, expect, it } from 'vitest';
import { composePayload, defaultDraft, draftFor, ownersByPerson } from '@/components/compose-draft';
import { ComposeError, defaultCompose, greeting, ownerOf, parseCompose } from '@/lib/mail/compose';

const lead = { name: 'Creator Một', email: 'creator01@aicinema.com' };
const helper = { name: 'Creator Hai', email: 'creator02@aicinema.com' };
const brief = {
  contactName: lead.name,
  contactEmail: lead.email,
  coSenders: [helper],
  episodeOwners: [
    { episodeNumber: 1, ...lead },
    { episodeNumber: 2, ...helper },
    { episodeNumber: 3, ...helper },
  ],
};

describe('the envelope of a film mail', () => {
  it('goes to the contact and CCs the co-senders by default', () => {
    expect(defaultCompose(brief, 'S')).toEqual({ to: lead.email, cc: [helper.email], subject: 'S' });
  });

  it('reads what the studio wrote, lower-cased, without repeating To in CC', () => {
    expect(parseCompose({ to: ' Creator02@AICinema.com ', cc: ['CREATOR01@aicinema.com', 'creator02@aicinema.com'], subject: ' Tập 2 ' })).toEqual({
      to: helper.email,
      cc: [lead.email],
      subject: 'Tập 2',
    });
    expect(parseCompose(undefined)).toBeNull();
  });

  it('refuses a wrong address, too many CCs or an empty subject', () => {
    expect(() => parseCompose({ to: 'not-an-email', cc: [], subject: 'S' })).toThrow(ComposeError);
    expect(() => parseCompose({ to: lead.email, cc: ['x@'], subject: 'S' })).toThrow('Email CC không hợp lệ');
    const many = Array.from({ length: 11 }, (_, i) => `p${i}@aicinema.com`);
    expect(() => parseCompose({ to: lead.email, cc: many, subject: 'S' })).toThrow('CC tối đa');
    expect(() => parseCompose({ to: lead.email, cc: [], subject: '  ' })).toThrow('Tiêu đề');
  });

  it('greets whom the mail goes to and names the owner of each episode', () => {
    expect(greeting(brief, helper.email)).toBe('Chào Creator Hai,');
    expect(greeting(brief, 'someone@else.com')).toBe('Chào anh/chị,');
    expect(ownerOf(brief, 2)).toBe('Phụ trách: Creator Hai <creator02@aicinema.com>');
    expect(ownerOf(brief, 9)).toBeNull();
  });
});

describe('the draft in the reply panels', () => {
  const people = { contact: lead, coSenders: [helper], owners: brief.episodeOwners };

  it('groups the episodes by the Creator who holds them', () => {
    expect(ownersByPerson(people, ['Tập 1', 'Tập 2', 'Tập 3'])).toEqual([
      { person: lead, parts: ['Tập 1'] },
      { person: helper, parts: ['Tập 2', 'Tập 3'] },
    ]);
  });

  it('sends only to one Creator with the contact in CC, and splits the CC line', () => {
    expect(draftFor(people, helper)).toEqual({ to: helper.email, cc: lead.email, subject: null });
    expect(draftFor(people, lead).cc).toBe('');
    expect(composePayload({ ...defaultDraft(people), cc: 'a@x.com; b@x.com, ' }, 'Auto')).toEqual({
      to: lead.email,
      cc: ['a@x.com', 'b@x.com'],
      subject: 'Auto',
    });
  });
});
