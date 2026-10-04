-- Resume import: its own daily AI budget, and a per-person daily limit.
--
-- Hand-written, like 0010-0022.
--
-- 1. ai_usage gains the kind 'resume_import', so imports have a site-wide daily cap of their own
--    (lib/matching/budget.ts DAILY_LIMITS) and can never eat the matching budget.
-- 2. resume_import_usage counts each person's imports per day, so one account cannot spend the
--    whole site's allowance. reserve_resume_import() is the only way to write it: SECURITY DEFINER,
--    keyed on auth.uid(), so a caller can only spend their own allowance. No policies: the table is
--    unreadable through the API.
--
-- EXPAND ONLY. Safe to apply before the code is deployed.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.reserve_resume_import(integer);
--   DROP TABLE IF EXISTS resume_import_usage;
--   ALTER TABLE ai_usage DROP CONSTRAINT ai_usage_kind,
--     ADD CONSTRAINT ai_usage_kind CHECK (kind IN ('embedding', 'rerank'));
--     (only after deleting any 'resume_import' rows)
--   then delete this migration's row from drizzle.__drizzle_migrations.

ALTER TABLE "ai_usage" DROP CONSTRAINT IF EXISTS "ai_usage_kind";--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_kind" CHECK ("kind" IN ('embedding', 'rerank', 'resume_import'));--> statement-breakpoint

CREATE TABLE "resume_import_usage" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "resume_import_usage_pk" PRIMARY KEY ("user_id", "day"),
	CONSTRAINT "resume_import_usage_calls_positive" CHECK ("calls" >= 0)
);--> statement-breakpoint
ALTER TABLE "resume_import_usage" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "resume_import_usage" ADD CONSTRAINT "resume_import_usage_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- Same conditional-increment shape as reserve_ai_call (0017): the WHERE on the conflict update
-- is what makes the check and the increment one atomic step.
CREATE OR REPLACE FUNCTION public.reserve_resume_import(p_limit integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  uid uuid := auth.uid();
  reserved boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO resume_import_usage (user_id, day, calls)
  VALUES (uid, current_date, 1)
  ON CONFLICT (user_id, day) DO UPDATE
    SET calls = resume_import_usage.calls + 1
    WHERE resume_import_usage.calls < p_limit
  RETURNING true INTO reserved;

  RETURN coalesce(reserved, false);
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.reserve_resume_import(integer) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.reserve_resume_import(integer) TO authenticated;
