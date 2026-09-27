import { clsx, type ClassValue } from 'clsx';

/** Conditional class names. clsx, per the pick-ui-library list — no string-template ternaries. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
