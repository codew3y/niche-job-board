'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import './picker.css';

/**
 * The prototype harness — behaviour contract from .claude/skills/prototype/PICKER.md,
 * expressed idiomatically: state instead of innerHTML, a keyed re-mount for replay, and a
 * layout effect for the highlight measurement.
 *
 * One variant at a time, full size. Switching is instant — flipping is a 100+/session action,
 * so the variant swap gets no animation; only the picker's own highlight slides.
 */
/**
 * `initial` comes from the server page's `searchParams`, so the server renders the selected
 * variant in the HTML. Reading ?v= on the client instead meant the first paint was always
 * variant 1 and the selection only arrived after hydration — which a screenshot caught.
 */
export function Picker({
  names,
  initial = 0,
  children,
}: {
  names: string[];
  initial?: number;
  children: ReactNode[];
}) {
  const [current, setCurrent] = useState(initial >= 0 && initial < names.length ? initial : 0);
  const [mount, setMount] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    // Enable the slide only after first paint, so load doesn't animate.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => navRef.current?.setAttribute('data-ready', '')),
    );
  }, []);

  useLayoutEffect(() => {
    const move = () => {
      const el = itemRefs.current[current];
      const hl = highlightRef.current;
      if (!el || !hl) return;
      hl.style.width = `${el.offsetWidth}px`;
      hl.style.transform = `translateX(${el.offsetLeft}px)`;
    };
    move();
    window.addEventListener('resize', move);
    return () => window.removeEventListener('resize', move);
  }, [current]);

  const select = (i: number) => {
    if (i < 0 || i >= names.length) return;
    setCurrent(i);
    setMount((m) => m + 1);
    const url = new URL(location.href);
    url.searchParams.set('v', String(i + 1));
    history.replaceState(null, '', url);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= names.length) select(n - 1);
      else if (e.key === 'ArrowRight') select((current + 1) % names.length);
      else if (e.key === 'ArrowLeft') select((current - 1 + names.length) % names.length);
      else if (e.key === 'r' || e.key === 'R') setMount((m) => m + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <>
      <div key={`${current}-${mount}`}>{children[current]}</div>
      <nav ref={navRef} className="proto-picker" aria-label="Prototype variants">
        <span ref={highlightRef} className="proto-picker-highlight" aria-hidden="true" />
        {names.map((name, i) => (
          <button
            key={name}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            type="button"
            className="proto-picker-item"
            data-active={i === current ? '' : undefined}
            aria-current={i === current ? 'true' : undefined}
            onClick={() => select(i)}
          >
            {name}
          </button>
        ))}
        <span className="proto-picker-divider" aria-hidden="true" />
        <button
          type="button"
          className="proto-picker-item proto-picker-replay"
          aria-label="Replay animation (R)"
          onClick={() => setMount((m) => m + 1)}
        >
          ↻
        </button>
      </nav>
    </>
  );
}
