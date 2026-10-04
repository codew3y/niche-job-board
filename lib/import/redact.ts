/**
 * Remove contact details from resume text before it leaves the server.
 *
 * Matching and profile prefill need what someone has done, not how to reach them, and the
 * extraction runs on Gemini (privacy policy: what is sent). Email addresses and phone numbers are
 * replaced with a marker, so the model sees that something was there without seeing it.
 *
 * Deliberately conservative on phones: a run of at least 8 digits, allowing the usual separators
 * and a leading +. Years ("2019 - 2023"), percentages and version numbers have fewer digits or
 * different shapes and survive.
 *
 * Pure, so it is unit-tested directly.
 */
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?<![\w/])\+?\d(?:[\s().-]*\d){7,14}(?![\w/])/g;

export function redactContactDetails(text: string): string {
  return text.replace(EMAIL, '[email removed]').replace(PHONE, (match) => {
    const digits = match.replace(/\D/g, '');
    // A date range like 2019-2023 is 8 digits; treat 4+4 with one separator as a range, not a phone.
    if (/^\s*\d{4}\s*[-–]\s*\d{4}\s*$/.test(match)) return match;
    return digits.length >= 8 ? '[phone removed]' : match;
  });
}
