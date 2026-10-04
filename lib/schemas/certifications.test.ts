import { describe, expect, it } from 'vitest';

import { certificationDates } from '../../components/talent/history-format';
import { talentToText } from '../matching/text';
import { certificationInput } from './talent';

const base = {
  name: 'AWS Certified Developer, Associate',
  issuer: 'Amazon Web Services',
  issuedOn: '2024-03',
};

describe('certificationInput (migration 0022)', () => {
  it('accepts the required fields alone and stores the month as its 1st', () => {
    const r = certificationInput.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.data?.issuedOn).toBe('2024-03-01');
    expect(r.data?.expiresOn).toBeNull();
    expect(r.data?.credentialId).toBeNull();
    expect(r.data?.verificationUrl).toBeNull();
  });

  it('needs a name, an issuer and an issue month', () => {
    expect(certificationInput.safeParse({ ...base, name: '' }).success).toBe(false);
    expect(certificationInput.safeParse({ ...base, issuer: '' }).success).toBe(false);
    expect(certificationInput.safeParse({ ...base, issuedOn: '' }).success).toBe(false);
  });

  it('refuses an expiry before the issue date, on the expiry field', () => {
    const r = certificationInput.safeParse({ ...base, expiresOn: '2023-12' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(['expiresOn']);
  });

  it('takes only https verification links, like every link in the product', () => {
    expect(
      certificationInput.safeParse({ ...base, verificationUrl: 'https://www.credly.com/badges/x' })
        .success,
    ).toBe(true);
    for (const url of ['http://credly.com/badges/x', 'javascript:alert(1)', 'credly.com/x']) {
      expect(certificationInput.safeParse({ ...base, verificationUrl: url }).success, url).toBe(
        false,
      );
    }
  });
});

describe('certificationDates', () => {
  const today = '2026-10-05';

  it('shows the issue month alone when it does not expire', () => {
    expect(certificationDates('2024-03-01', null, today)).toEqual({
      text: 'Issued Mar 2024',
      expired: false,
    });
  });

  it('says Expires while valid and Expired once lapsed, without hiding it', () => {
    expect(certificationDates('2024-03-01', '2027-03-01', today)).toEqual({
      text: 'Issued Mar 2024, expires Mar 2027',
      expired: false,
    });
    expect(certificationDates('2021-03-01', '2024-03-01', today)).toEqual({
      text: 'Issued Mar 2021, expired Mar 2024',
      expired: true,
    });
  });

  it('is still valid during its expiry month', () => {
    expect(certificationDates('2024-10-01', '2026-10-01', today).expired).toBe(false);
  });
});

describe('certifications in the matching text', () => {
  it('names each certification with its issuer, and adds nothing when there are none', () => {
    const profile = { headline: 'Cloud developer', bio: '', skills: [], items: [] };
    expect(talentToText(profile)).not.toContain('Certifications');
    expect(
      talentToText({
        ...profile,
        certifications: [{ name: 'AWS Certified Developer', issuer: 'Amazon Web Services' }],
      }),
    ).toContain('Certifications: AWS Certified Developer (Amazon Web Services)');
  });
});
