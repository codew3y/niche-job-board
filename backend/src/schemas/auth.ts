import { z } from 'zod';

import { activeRole } from './enums';
import { trimmed } from './primitives';

export const signupInput = z.object({
  email: z.email('Enter a valid email address.').max(254),
  // Length over composition rules: NIST guidance, and composition rules mostly produce
  // Passw0rd! Strength checking belongs in the UI meter, not in a regex here.
  password: z.string().min(12, 'Use at least 12 characters.').max(200),
  displayName: trimmed.min(2, 'What should we call you?').max(80),
});

export const loginInput = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const selectRoleInput = z.object({ role: activeRole });
export const switchRoleInput = z.object({ role: activeRole });

export type SignupInput = z.infer<typeof signupInput>;
