'use client';

import { useLayoutEffect, useRef, type ComponentProps } from 'react';

/**
 * A `<form action>` that keeps what the person typed when the server says no.
 *
 * React 19 resets every uncontrolled field once a form action finishes — on success AND on
 * failure. On success that is usually right (the page re-renders with the saved values, or the
 * form closes). On failure it is not: one wrong field wiped everything else they had typed.
 *
 * So: on submit, note each field's value; when the action comes back `{ ok: false }`, put them
 * back. React's reset runs in the commit that delivers the new state, before layout effects, so
 * the restore lands after it and nothing flashes empty. Values are set through the native setter
 * and announced with an `input` event (checkboxes are clicked), so any React `onChange` (a
 * character count, a preview) sees them too. File inputs cannot be refilled by script and are
 * left alone; hidden inputs are never reset in the first place.
 *
 * Everything else is a plain `<form action>`: `useFormStatus()` in a SubmitButton still works.
 */
export function Form({
  state,
  onSubmit,
  ref,
  ...props
}: ComponentProps<'form'> & {
  /** The useActionState result. `{ ok: false }` means "rejected: restore what was typed". */
  state: { ok: boolean } | null | undefined;
}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const typed = useRef<Snapshot | null>(null);

  useLayoutEffect(() => {
    const form = formRef.current;
    if (!form || !typed.current) return;
    if (state?.ok === false) restore(form, typed.current);
    typed.current = null;
  }, [state]);

  return (
    <form
      {...props}
      ref={(node) => {
        formRef.current = node;
        if (typeof ref === 'function') return ref(node);
        if (ref) ref.current = node;
      }}
      onSubmit={(event) => {
        typed.current = snapshot(event.currentTarget);
        onSubmit?.(event);
      }}
    />
  );
}

type Snapshot = Map<Element, string | boolean | string[]>;

function snapshot(form: HTMLFormElement): Snapshot {
  const values: Snapshot = new Map();
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLInputElement) {
      if (el.type === 'file' || el.type === 'hidden') continue;
      values.set(el, el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value);
    } else if (el instanceof HTMLTextAreaElement) {
      values.set(el, el.value);
    } else if (el instanceof HTMLSelectElement) {
      values.set(
        el,
        Array.from(el.selectedOptions, (o) => o.value),
      );
    }
  }
  return values;
}

function restore(form: HTMLFormElement, values: Snapshot) {
  for (const [el, value] of values) {
    if (!el.isConnected || !form.contains(el)) continue;
    if (el instanceof HTMLInputElement && typeof value === 'boolean') {
      // A radio is put back by clicking the one that was chosen; clicking never unchecks one.
      if (el.checked === value || (el.type === 'radio' && !value)) continue;
      // A real click toggles it the way a person would, so React's onChange runs.
      el.click();
    } else if (el instanceof HTMLSelectElement && Array.isArray(value)) {
      const now = Array.from(el.selectedOptions, (o) => o.value);
      if (now.join('\0') === value.join('\0')) continue;
      for (const option of Array.from(el.options)) option.selected = value.includes(option.value);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
      typeof value === 'string'
    ) {
      if (el.value === value) continue;
      const proto =
        el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
      setNative(proto, 'value', el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

/**
 * React tracks a field's last known value through its own setter; writing through the native one
 * makes the following input event register as a real change, so onChange handlers run.
 */
function setNative(proto: object, key: 'value', el: Element, value: string) {
  Object.getOwnPropertyDescriptor(proto, key)?.set?.call(el, value);
}
