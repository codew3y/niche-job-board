'use client';

import { Pause, Play } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

/**
 * The landing-page hero video.
 *
 * SOURCE AND LICENCE — "Software developer working while drinks coffee", Mixkit clip #1730,
 * https://mixkit.co/free-stock-video/software-developer-working-while-drinks-coffee-1730/
 * Mixkit Stock Video Free License (https://mixkit.co/license/#videoFree): "can be used in your
 * commercial and non-commercial projects, for free … Attribution is not required". Credited
 * anyway, here and in DESIGN.md §6.
 *
 * Re-encoded for this page (DESIGN.md §6): trimmed to 11s with the last second crossfaded into
 * the first so the loop has no visible seam, audio stripped, 1280×720 at 24fps.
 * MP4/H.264 346 KB, WebM/VP9 257 KB — against a 3 MB budget.
 *
 * WHY THE POSTER IS AN <Image> AND NOT JUST `poster=""`
 *
 * The poster is the Largest Contentful Paint element. A `poster` attribute is discovered only
 * once the <video> is parsed and is never preloaded; an <Image preload> is in the <head> before
 * the body arrives, and is served as AVIF/WebP at the width the viewport needs. The video is
 * then mounted AFTER hydration and fades in over the poster once it is actually playing, so it
 * can never delay LCP and never shows a black frame while it buffers.
 *
 * WHEN THERE IS NO VIDEO AT ALL — the poster alone is shown, and the <video> element is never
 * created, so not one byte of video is fetched, when:
 *   - `prefers-reduced-motion: reduce` — motion the reader has asked not to see;
 *   - Save-Data is on — the reader has asked for fewer bytes, and this is decoration;
 *   - the connection reports 2G or slower — 350 KB of decoration competes with the page.
 *
 * WCAG 2.2.2 (Pause, Stop, Hide) applies: this moves, starts on its own, runs longer than five
 * seconds and sits beside other content, so it has a visible pause control. The choice is
 * remembered for the session, because someone who paused it once did not want it back on the
 * next page view.
 */

type Props = {
  poster: string;
  webm: string;
  mp4: string;
  /** Describes the scene for the pause control's context; the media itself is decorative. */
  label: string;
  className?: string;
};

type Connection = { saveData?: boolean; effectiveType?: string };

function allowsMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false;
  return true;
}

const PAUSED_KEY = 'hero-video-paused';

/** The pause choice remembered for this session. */
function readPaused(): boolean {
  try {
    return sessionStorage.getItem(PAUSED_KEY) === '1';
  } catch {
    // Storage can be unavailable (private mode, blocked). Default to playing.
    return false;
  }
}

export function HeroVideo({ poster, webm, mp4, label, className = '' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // `null` = undecided (server render and first client render agree: poster only).
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // Wait for the browser to be idle after the first paint, so the video's network request
    // and decoder start-up never compete with the content the visitor came for.
    // The remembered choice is read here, in the same callback that decides whether a video
    // exists at all — before the <video> mounts, so a reader who paused it never sees it play.
    const start = () => {
      setPaused(readPaused());
      setEnabled(allowsMotion());
    };
    // Safari has no requestIdleCallback; a short timeout is the fallback there.
    const idle = 'requestIdleCallback' in window;
    const handle = idle ? window.requestIdleCallback(start) : window.setTimeout(start, 400);

    // A reader who switches reduced-motion on mid-visit gets the poster back immediately.
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setEnabled(allowsMotion());
    query.addEventListener('change', onChange);

    return () => {
      query.removeEventListener('change', onChange);
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  // Play and pause follow both the reader's choice and visibility: a video scrolled out of
  // view is decoding frames nobody sees, which is battery spent for nothing.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !paused) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.1 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [enabled, paused]);

  const toggle = () => {
    const next = !paused;
    setPaused(next);
    try {
      sessionStorage.setItem(PAUSED_KEY, next ? '1' : '0');
    } catch {
      // Not remembering is fine; the control still works for this view.
    }
  };

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <Image src={poster} alt="" fill preload sizes="100vw" className="object-cover" />

      {enabled && (
        <video
          ref={videoRef}
          // Decorative: the heading beside it carries the meaning, so the video is hidden from
          // assistive technology rather than given a description nobody needs twice.
          aria-hidden="true"
          muted
          loop
          playsInline
          autoPlay={!paused}
          preload="auto"
          poster={poster}
          // Set once, on the first real frame, and never unset: pausing should freeze the frame
          // the reader stopped on, not fade back to a poster from a different moment.
          onPlaying={() => setPlaying(true)}
          // Opacity only — the poster underneath is the same frame, so a fade reads as the
          // photograph starting to move rather than one image replacing another.
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-(--duration-slow) ease-(--ease-out) ${
            playing ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <source src={webm} type="video/webm" />
          <source src={mp4} type="video/mp4" />
        </video>
      )}

      {enabled && (
        <button
          type="button"
          onClick={toggle}
          // A toggle keeps ONE name and lets aria-pressed carry the state. Swapping the label
          // between "Play" and "Pause" as well would announce the state twice, contradictorily
          // ("Play, toggle button, pressed").
          aria-pressed={paused}
          aria-label={`Pause background video: ${label}`}
          className="pressable absolute right-4 bottom-4 z-(--z-raised) grid size-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-[background-color,transform] duration-(--duration-fast) ease-(--ease-out) hover:bg-black/65 focus-visible:outline-white"
        >
          {paused ? <Play aria-hidden="true" size={16} /> : <Pause aria-hidden="true" size={16} />}
        </button>
      )}
    </div>
  );
}
