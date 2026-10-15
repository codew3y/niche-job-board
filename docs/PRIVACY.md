# Privacy & Data Retention — TechSelect

A summary for developers working on the code. **The binding policy is the site's own page at
`/privacy`** (`frontend/app/(marketing)/privacy/page.tsx`); when the two differ, that page wins,
and any change to data handling updates it first.

## Data we collect

- **Account:** email address and display name; your avatar and name from Google or GitHub if you
  sign in with them (never a password from either).
- **Developer profile:** headline, bio, skills, rates, availability, time zone, years of
  experience, portfolio items with their links and images, work experience, education,
  certifications, and website, GitHub and LinkedIn links.
- **Client profile:** company name, website and description; job posts.
- **Activity:** applications and their status history, saved jobs and saved developers,
  messages, blocks and reports.

### What is public

A **published** developer profile and an **open** job post are public and indexed by search
engines. Everything else is private to you and, where relevant, the other party: drafts and
unpublished profiles, your email address (never shown anywhere), saved lists (one-directional),
applications (applicant and job owner only) and messages (the two participants only).

Blocking is mutual and silent. Reports are one-way: the reported person cannot see who reported
them. A person reads reports; there is no automated action.

## Processors

| Service | Used for | Receives |
| --- | --- | --- |
| Supabase | database, authentication, file storage | everything above; it is where the data lives |
| Vercel | hosting | request metadata, including IP address |
| Google, GitHub | optional sign-in | they send us your email, name and avatar |
| Resend | transactional email | your email address and the email's contents |
| Google Gemini API | matching and resume import | see below |
| Sentry | error tracking, when enabled | the technical error, page path and browser; never email, messages, form contents or cookies |

There is no analytics, advertising or tracking. The only cookies are the ones that keep you
signed in.

### Matching and the Gemini API

Matching sends **only published, public text**: job titles and descriptions, and developer
headlines, bios, portfolio text and certification names. It never sends email addresses,
messages, applications, saved lists, drafts or unpublished profiles.

**Resume import** is the one exception, and the user starts it: the text of the uploaded PDF,
with email addresses and phone numbers removed, is sent to Gemini to sort into profile sections.
The file itself is never stored, and nothing is added to the profile until the user chooses.

TechSelect uses Gemini's free tier, and Google states that content sent to it may be used to
improve its products. The policy page says so plainly.

## Retention

- Profiles, portfolios, jobs, applications, saved lists and messages are kept until you delete
  them or delete your account.
- Uploaded resume files are never stored.
- Matching keeps derived data (embeddings and precomputed rankings) for published content only;
  unpublishing or deleting the content removes it from matching.

## Rights (access / correction / deletion / portability)

- **Access and portability:** Settings → Account → export downloads your data as JSON
  (`/dashboard/settings/account/export`, limited by RLS to your own rows).
- **Correction:** everything you entered is editable in the dashboard.
- **Deletion:** Settings → Account → delete. Your profile, portfolio, uploads, job posts,
  applications, saved lists and blocks are removed. Conversations are the deliberate exception:
  a thread has two owners, so it survives with your side tombstoned (your name detached and
  your messages replaced with a note). The other person keeps their own words and cannot
  recover yours.

## Security

- Row Level Security on every table is the authorisation boundary; requests run as the signed-in
  user.
- The service-role key is used only for account deletion, email delivery and background
  matching, never in the browser. `DATABASE_URL` is never present in the hosted runtime.
- No endpoint returns another user's email address, and public diagnostics reveal only whether
  the service is up.
- Secrets live in Vercel and GitHub Actions secrets, never in the repository.
