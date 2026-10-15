import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

/**
 * The share card behind a job or profile link (opengraph-image.tsx in each route): what LinkedIn,
 * Slack, WhatsApp and X show when someone pastes the link. 1200×630, the size every one of them
 * crops to safely.
 *
 * Drawn in the light theme's colours as fixed hex values: a share card is an image, it does not
 * follow anyone's theme. Text only, plus the logo mark read from disk; no remote images, so a slow
 * or missing photo can never break the card. Satori's built-in font, so there is no font file to
 * ship.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const INK = '#141414';
const MUTED = '#57534e';
const BLUE = '#0f67a0';
const PAGE = '#fafaf9';
const TINT = '#e6f0fa';

let mark: Promise<string> | null = null;
const logoMark = () =>
  (mark ??= readFile(join(process.cwd(), 'public/brand/logo-mark-128.png')).then(
    (b) => `data:image/png;base64,${b.toString('base64')}`,
  ));

export async function shareCard({
  kicker,
  title,
  facts,
  tags,
}: {
  /** The small line above the title: "Open brief" or "Developer". */
  kicker: string;
  title: string;
  /** One line of facts under the title, joined with separators. */
  facts: string[];
  tags: string[];
}) {
  const src = await logoMark();
  const clipped = title.length > 90 ? `${title.slice(0, 88).trimEnd()}…` : title;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px',
        background: PAGE,
        borderTop: `16px solid ${BLUE}`,
        color: INK,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws <img>, not next/image */}
        <img src={src} width={48} height={48} alt="" />
        <span style={{ fontSize: 32, fontWeight: 700 }}>TechSelect</span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 24,
            color: BLUE,
            background: TINT,
            padding: '8px 18px',
            borderRadius: 999,
          }}
        >
          {kicker}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: clipped.length > 50 ? 60 : 72, fontWeight: 700, lineHeight: 1.1 }}>
          {clipped}
        </div>
        {facts.length > 0 && (
          <div style={{ fontSize: 30, color: MUTED }}>{facts.join('  ·  ')}</div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {tags.slice(0, 5).map((t) => (
          <span
            key={t}
            style={{
              fontSize: 24,
              padding: '8px 18px',
              borderRadius: 10,
              border: '2px solid #d9d7d3',
              background: '#ffffff',
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>,
    OG_SIZE,
  );
}
