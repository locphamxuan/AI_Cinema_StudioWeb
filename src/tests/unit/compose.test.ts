import { describe, expect, it } from 'vitest';
import { composePayload, defaultDraft } from '@/components/compose-draft';
import { ComposeError, envelopeFor, greeting, parseSubject } from '@/lib/mail/compose';

const brief = { contactName: 'Creator Một', contactEmail: 'creator01@aicinema.com' };

describe('the envelope of a film mail (BR-67)', () => {
  it('always goes to the lead Creator named in the brief, under the subject the studio wrote', () => {
    expect(envelopeFor(brief, null, 'Auto')).toEqual({ to: brief.contactEmail, subject: 'Auto' });
    expect(envelopeFor(brief, 'Tập 2', 'Auto')).toEqual({ to: brief.contactEmail, subject: 'Tập 2' });
  });

  it('reads only the subject, so a request cannot send the film to a co-Creator', () => {
    expect(parseSubject({ to: 'phu@aicinema.com', cc: ['ba@aicinema.com'], subject: ' Tập 2 ' })).toBe('Tập 2');
    expect(parseSubject(undefined)).toBeNull();
  });

  it('refuses an empty or overlong subject', () => {
    expect(() => parseSubject({ subject: '  ' })).toThrow(ComposeError);
    expect(() => parseSubject({ subject: 'x'.repeat(201) })).toThrow('Tiêu đề');
    expect(() => parseSubject('S')).toThrow(ComposeError);
  });

  it('greets the lead Creator', () => {
    expect(greeting(brief)).toBe('Chào Creator Một,');
    expect(greeting({ contactName: '' })).toBe('Chào anh/chị,');
  });

  it('sends the auto subject until the studio types its own', () => {
    expect(composePayload(defaultDraft(), ' Auto ')).toEqual({ subject: 'Auto' });
    expect(composePayload({ subject: 'Riêng' }, 'Auto')).toEqual({ subject: 'Riêng' });
  });
});
