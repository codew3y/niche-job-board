'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Full-viewport video background for the landing page: a slideshow of short clips that
 * crossfade (~1s) from one to the next and wrap back to the first after the last.
 *
 * SOURCES AND LICENCE — all Mixkit, under the Mixkit Stock Video Free License
 * (https://mixkit.co/license/#videoFree): "can be used in your commercial and non-commercial
 * projects, for free … Attribution is not required." Credited anyway:
 *   code    — "Computer code in the screen", #9757
 *   circuit — "Close up of electronic circuit board", #47048
 *   network — "3D animation of lines and luminous points rotating", #31510
 * Each trimmed to 8s, audio stripped, 24fps; MP4/H.264 + WebM/VP9, with the first frame as a
 * JPEG poster. network is 960×540 (its particle noise compresses badly, and it sits under a 45%
 * overlay); the others are 1280×720.
 *
 * ADDING A CLIP is one entry in CLIPS: drop `<name>.mp4`, `<name>.webm` and `<name>-poster.jpg`
 * into /public/videos.
 *
 * HOW THE CROSSFADE WORKS — every clip is its own <video>, stacked, with only the current one
 * opaque. Each plays once (`loop` off); on `ended`, the next one starts and the two swap opacity
 * over 1s. The next clip is preloaded while the current one plays, so the swap never waits on
 * the network; clips further ahead stay `preload="none"`.
 *
 * WHEN THERE IS NO VIDEO — the first poster alone, and no video bytes fetched, under
 * `prefers-reduced-motion`, Save-Data, or a 2G connection.
 *
 * WCAG 2.2.2 (Pause, Stop, Hide): it moves, starts on its own and runs past five seconds beside
 * other content, so it has a pause control, remembered for the session.
 */

type Clip = { name: string; label: string };

const CLIPS: Clip[] = [
  { name: 'code', label: 'code scrolling on a monitor' },
  { name: 'circuit', label: 'a glowing circuit board' },
  { name: 'network', label: 'a rotating network of lines and points' },
];

const src = (clip: Clip, ext: 'mp4' | 'webm') => `/videos/${clip.name}.${ext}`;
const poster = (clip: Clip) => `/videos/${clip.name}-poster.jpg`;

type Connection = { saveData?: boolean; effectiveType?: string };

function allowsMotion(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && /(^|-)2g$/.test(connection.effectiveType)) return false;
  return true;
}

const PAUSED_KEY = 'landing-video-paused';

export function VideoBackground() {
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  // null = undecided: the server render and first client render agree on poster-only.
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    // After first paint and idle, so video never competes with the login form for bandwidth.
    const start = () => {
      try {
        setPaused(sessionStorage.getItem(PAUSED_KEY) === '1');
      } catch {
        // Storage unavailable (private mode): default to playing.
      }
      setEnabled(allowsMotion());
    };
    const idle = 'requestIdleCallback' in window;
    const handle = idle ? window.requestIdleCallback(start) : window.setTimeout(start, 400);

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setEnabled(allowsMotion());
    query.addEventListener('change', onChange);
    return () => {
      query.removeEventListener('change', onChange);
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, []);

  // Play the current clip (or pause it); everything else stays stopped.
  useEffect(() => {
    if (!enabled) return;
    const video = videos.current[current];
    if (!video) return;
    if (paused) video.pause();
    else void video.play().catch(() => {});
  }, [enabled, current, paused]);

  const advance = (from: number) => {
    const next = (from + 1) % CLIPS.length;
    const nextVideo = videos.current[next];
    if (nextVideo) {
      nextVideo.currentTime = 0;
      void nextVideo.play().catch(() => {});
    }
    setCurrent(next);
    // Rewind the outgoing clip once it has faded out, ready for the next lap.
    window.setTimeout(() => {
      const prev = videos.current[from];
      if (prev && from !== next) prev.currentTime = 0;
    }, 1100);
  };

  const togglePause = () => {
    const next = !paused;
    setPaused(next);
    try {
      sessionStorage.setItem(PAUSED_KEY, next ? '1' : '0');
    } catch {
      // Not remembering is fine; the control still works for this view.
    }
  };

  return (
    <>
      <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden bg-neutral-950">
        {/* The first poster is painted immediately, before any video exists — and is all there
            is when motion is off. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- a full-bleed decorative
            backdrop under a video; fetchPriority high, and it is the LCP candidate. */}
        <img
          src={poster(CLIPS[0]!)}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
        />

        {enabled &&
          CLIPS.map((clip, i) => {
            const isNext = i === (current + 1) % CLIPS.length;
            return (
              <video
                key={clip.name}
                ref={(el) => {
                  videos.current[i] = el;
                }}
                muted
                playsInline
                autoPlay={i === 0 && !paused}
                preload={i === current || isNext ? 'auto' : 'none'}
                poster={poster(clip)}
                onEnded={() => advance(i)}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
                  i === current ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <source src={src(clip, 'webm')} type="video/webm" />
                <source src={src(clip, 'mp4')} type="video/mp4" />
              </video>
            );
          })}

        {/* The readability overlay: text on moving footage needs a floor under its contrast. */}
        <div className="absolute inset-0 bg-black/45" />
      </div>

      {enabled && (
        <button
          type="button"
          onClick={togglePause}
          // One stable name; aria-pressed carries the state (see the old hero video's note).
          aria-pressed={paused}
          aria-label={`Pause background video: ${CLIPS[current]!.label}`}
          className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom,0px))] z-10 grid size-9 place-items-center rounded-md border border-white/25 bg-black/30 text-white hover:bg-black/50 focus-visible:outline-white"
        >
          {paused ? <Play aria-hidden="true" size={15} /> : <Pause aria-hidden="true" size={15} />}
        </button>
      )}
    </>
  );
}
