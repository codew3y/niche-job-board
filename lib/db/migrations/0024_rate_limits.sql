-- Rate limits that the database enforces: applying, publishing jobs, reporting.
--
-- Hand-written, like 0010-0023. docs/api.md §3 specifies 10/min for each. Checking in the app
-- alone would not hold: anyone can call the API directly with their own session token, and RLS
-- lets them insert their own applications, jobs and reports. A BEFORE trigger is the one place
-- every path goes through.
--
-- Each trigger applies only to the API roles (authenticated / anon), so the seed, migrations and
-- the service role are unaffected. Counting runs as the caller, under RLS, and each caller can
-- see their own rows, so the count is theirs. The error message starts with "rate_limited:",
-- which lib/actions maps to a plain sentence.
--
-- EXPAND ONLY. Safe to apply before the code is deployed (older code shows its generic error).
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS applications_rate_limit ON applications;
--   DROP TRIGGER IF EXISTS jobs_publish_rate_limit ON jobs;
--   DROP TRIGGER IF EXISTS reports_rate_limit ON reports;
--   DROP FUNCTION IF EXISTS public.rate_limit_applications(), public.rate_limit_job_publish(),
--     public.rate_limit_reports();
--   then delete this migration's row from drizzle.__drizzle_migrations.

CREATE OR REPLACE FUNCTION public.rate_limit_applications()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF (SELECT count(*) FROM applications
       WHERE talent_id = NEW.talent_id AND created_at > now() - interval '1 minute') >= 10 THEN
    RAISE EXCEPTION 'rate_limited: applications';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS applications_rate_limit ON applications;--> statement-breakpoint
CREATE TRIGGER applications_rate_limit BEFORE INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_applications();--> statement-breakpoint

-- A job counts when it becomes open: a new open job, or a draft or closed one being published or
-- reopened. Edits to a job that is already open do not count.
CREATE OR REPLACE FUNCTION public.rate_limit_job_publish()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'open' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'open') THEN
    IF (SELECT count(*) FROM jobs
         WHERE client_id = NEW.client_id AND published_at > now() - interval '1 minute') >= 10 THEN
      RAISE EXCEPTION 'rate_limited: jobs';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS jobs_publish_rate_limit ON jobs;--> statement-breakpoint
CREATE TRIGGER jobs_publish_rate_limit BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_job_publish();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.rate_limit_reports()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  IF (SELECT count(*) FROM reports
       WHERE reporter_id = NEW.reporter_id AND created_at > now() - interval '1 minute') >= 10 THEN
    RAISE EXCEPTION 'rate_limited: reports';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS reports_rate_limit ON reports;--> statement-breakpoint
CREATE TRIGGER reports_rate_limit BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION public.rate_limit_reports();
