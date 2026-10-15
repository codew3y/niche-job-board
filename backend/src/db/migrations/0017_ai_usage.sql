-- Daily counters for AI calls, and the hard cap that reads them.
--
-- PROJECT.md §8 asks for "rate limiting and a hard monthly spend cap on every AI endpoint".
-- On the free tier the scarce resource is REQUESTS, not money — roughly 1,000 embedding
-- requests a day — so the cap counts calls. If a paid key ever replaces the free one, the
-- same counter answers "what did today cost" by multiplying.
--
-- One row per (day, kind) rather than one per call. A log of every request would grow without
-- bound on a 500MB database to answer a question that is always "how many today".
--
-- The counter is authoritative BEFORE the call, not after: reserving then spending means a
-- crash mid-call loses a request rather than letting the next one over the line. Counting
-- after would let a burst of concurrent calls all pass the check together.
CREATE TABLE IF NOT EXISTS "ai_usage" (
  "day" date NOT NULL,
  "kind" text NOT NULL,
  "calls" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ai_usage_pk" PRIMARY KEY ("day", "kind"),
  CONSTRAINT "ai_usage_kind" CHECK ("kind" IN ('embedding', 'rerank')),
  CONSTRAINT "ai_usage_calls_positive" CHECK ("calls" >= 0)
);--> statement-breakpoint

ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- No policy for anon or authenticated. Usage is operational data: it says nothing a user
-- needs and it tells anyone reading it exactly how close the project is to its ceiling.
GRANT SELECT, INSERT, UPDATE ON "ai_usage" TO service_role;--> statement-breakpoint

/**
 * Reserve a call, or refuse.
 *
 * Atomic on purpose. Two concurrent embeds reading "999 used" would both decide there was
 * room and both spend, which is how a cap is exceeded by exactly the amount of concurrency
 * you have. The INSERT ... ON CONFLICT DO UPDATE ... WHERE is a single statement: Postgres
 * serialises it, and the WHERE is what makes the increment conditional rather than
 * unconditional-then-checked.
 *
 * Returns true when the call may proceed.
 */
CREATE OR REPLACE FUNCTION public.reserve_ai_call(p_kind text, p_limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  reserved boolean;
BEGIN
  INSERT INTO ai_usage (day, kind, calls, updated_at)
  VALUES (current_date, p_kind, 1, now())
  ON CONFLICT (day, kind) DO UPDATE
    SET calls = ai_usage.calls + 1, updated_at = now()
    WHERE ai_usage.calls < p_limit
  RETURNING true INTO reserved;

  -- No row returned means the conflicting row failed the WHERE: the cap is reached.
  RETURN coalesce(reserved, false);
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.reserve_ai_call(text, integer) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.reserve_ai_call(text, integer) TO service_role;
