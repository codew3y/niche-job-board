-- ┌──────────────────────────────────────────────────────────────────────────────┐
-- │ HAND-ADDED PREAMBLE — drizzle-kit does NOT emit these.                        │
-- │ Without them this migration fails on a fresh database at the first            │
-- │ vector(1536) column. If you regenerate this file, PUT THIS BLOCK BACK.        │
-- │ lib/db/migrations.test.ts fails if it goes missing.                           │
-- └──────────────────────────────────────────────────────────────────────────────┘
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint

CREATE TYPE "public"."active_role" AS ENUM('talent', 'client');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('applied', 'viewed', 'shortlisted', 'rejected', 'hired', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."availability" AS ENUM('full_time', 'part_time', 'occasional', 'unavailable');--> statement-breakpoint
CREATE TYPE "public"."engagement_type" AS ENUM('fixed', 'hourly', 'retainer');--> statement-breakpoint
CREATE TYPE "public"."experience_level" AS ENUM('junior', 'mid', 'senior', 'lead');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('draft', 'open', 'closed', 'filled');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('remote', 'hybrid', 'onsite');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('application_received', 'application_status_changed', 'strong_match', 'message_received');--> statement-breakpoint
CREATE TYPE "public"."proficiency" AS ENUM('familiar', 'proficient', 'expert');--> statement-breakpoint
CREATE TYPE "public"."report_subject" AS ENUM('profile', 'job', 'message', 'conversation');--> statement-breakpoint
CREATE TYPE "public"."skill_category" AS ENUM('Languages', 'Frontend', 'Mobile', 'Backend', 'Data', 'Cloud & DevOps', 'Automation & integration', 'Platforms & CMS', 'AI/ML', 'Practices');--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"location" text,
	"active_role" "active_role" DEFAULT 'talent' NOT NULL,
	"has_talent" boolean DEFAULT false NOT NULL,
	"has_client" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" "skill_category" NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"requested_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name"),
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "item_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt_text" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_media" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"role" text,
	"outcome" text,
	"tech_stack" text[] DEFAULT '{}'::text[] NOT NULL,
	"repo_url" text,
	"live_url" text,
	"cover_image_url" text,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"embedding" vector(1536),
	"embedding_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_date_order" CHECK ("portfolio_items"."started_at" is null or "portfolio_items"."ended_at" is null or "portfolio_items"."started_at" <= "portfolio_items"."ended_at"),
	CONSTRAINT "item_urls_https" CHECK (("portfolio_items"."repo_url" is null or "portfolio_items"."repo_url" ~* '^https://') and ("portfolio_items"."live_url" is null or "portfolio_items"."live_url" ~* '^https://'))
);
--> statement-breakpoint
ALTER TABLE "portfolio_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "talent_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"headline" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"hourly_rate_min" numeric(10, 2),
	"hourly_rate_max" numeric(10, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"availability" "availability" DEFAULT 'part_time' NOT NULL,
	"years_experience" integer,
	"timezone" text,
	"website_url" text,
	"github_url" text,
	"linkedin_url" text,
	"website_checked_at" timestamp with time zone,
	"website_status" smallint,
	"accepts_messages" boolean DEFAULT true NOT NULL,
	"portfolio_item_count" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"embedding" vector(1536),
	"embedding_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "talent_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "talent_profiles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "talent_publish_gate" CHECK (not "talent_profiles"."is_published" or (length(btrim("talent_profiles"."bio")) > 0 and ("talent_profiles"."website_url" is not null or "talent_profiles"."portfolio_item_count" >= 2))),
	CONSTRAINT "talent_rate_order" CHECK ("talent_profiles"."hourly_rate_min" is null or "talent_profiles"."hourly_rate_max" is null or "talent_profiles"."hourly_rate_min" <= "talent_profiles"."hourly_rate_max"),
	CONSTRAINT "talent_currency_iso" CHECK ("talent_profiles"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "talent_urls_https" CHECK (("talent_profiles"."website_url" is null or "talent_profiles"."website_url" ~* '^https://')
        and ("talent_profiles"."github_url" is null or "talent_profiles"."github_url" ~* '^https://')
        and ("talent_profiles"."linkedin_url" is null or "talent_profiles"."linkedin_url" ~* '^https://'))
);
--> statement-breakpoint
ALTER TABLE "talent_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "talent_skills" (
	"talent_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"proficiency" "proficiency" DEFAULT 'proficient' NOT NULL,
	"years" integer,
	CONSTRAINT "talent_skills_talent_id_skill_id_pk" PRIMARY KEY("talent_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "talent_skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "client_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" text NOT NULL,
	"website" text,
	"industry" text,
	"company_size" text,
	"about" text DEFAULT '' NOT NULL,
	"logo_url" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "client_website_https" CHECK ("client_profiles"."website" is null or "client_profiles"."website" ~* '^https://')
);
--> statement-breakpoint
ALTER TABLE "client_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "job_skills" (
	"job_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	CONSTRAINT "job_skills_job_id_skill_id_pk" PRIMARY KEY("job_id","skill_id")
);
--> statement-breakpoint
ALTER TABLE "job_skills" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"responsibilities" text,
	"requirements" text,
	"engagement_type" "engagement_type" NOT NULL,
	"budget_min" numeric(12, 2),
	"budget_max" numeric(12, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"location_type" "location_type" DEFAULT 'remote' NOT NULL,
	"location" text,
	"experience_level" "experience_level",
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"deadline" timestamp with time zone,
	"published_at" timestamp with time zone,
	"embedding" vector(1536),
	"embedding_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_slug_unique" UNIQUE("slug"),
	CONSTRAINT "job_budget_order" CHECK ("jobs"."budget_min" is null or "jobs"."budget_max" is null or "jobs"."budget_min" <= "jobs"."budget_max"),
	CONSTRAINT "job_currency_iso" CHECK ("jobs"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "job_location_present" CHECK ("jobs"."location_type" = 'remote' or ("jobs"."location" is not null and length(btrim("jobs"."location")) > 0)),
	CONSTRAINT "job_published_has_timestamp" CHECK ("jobs"."status" = 'draft' or "jobs"."published_at" is not null)
);
--> statement-breakpoint
ALTER TABLE "jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "application_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"from_status" "application_status",
	"to_status" "application_status" NOT NULL,
	"actor_id" uuid,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"talent_id" uuid NOT NULL,
	"cover_note" text DEFAULT '' NOT NULL,
	"status" "application_status" DEFAULT 'applied' NOT NULL,
	"match_score" integer,
	"match_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_job_talent_unique" UNIQUE("job_id","talent_id"),
	CONSTRAINT "application_score_range" CHECK ("applications"."match_score" is null or ("applications"."match_score" between 0 and 100))
);
--> statement-breakpoint
ALTER TABLE "applications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "block_not_self" CHECK ("blocks"."blocker_id" <> "blocks"."blocked_id")
);
--> statement-breakpoint
ALTER TABLE "blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"talent_id" uuid NOT NULL,
	"job_id" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_participants_unique" UNIQUE("client_id","talent_id","job_id")
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid,
	"body" text NOT NULL,
	"is_redacted" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_body_length" CHECK (length("messages"."body") between 1 and 5000)
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"subject_type" "report_subject" NOT NULL,
	"subject_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "embedding_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"last_error" text,
	"first_failed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_failed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "embedding_failures_entity_unique" UNIQUE("entity_type","entity_id"),
	CONSTRAINT "embedding_failures_entity_type" CHECK ("embedding_failures"."entity_type" in ('talent_profile', 'portfolio_item', 'job'))
);
--> statement-breakpoint
ALTER TABLE "embedding_failures" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "match_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"reason" text,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "match_cache_subject_target_unique" UNIQUE("subject_type","subject_id","target_id"),
	CONSTRAINT "match_cache_subject_type" CHECK ("match_cache"."subject_type" in ('talent', 'job')),
	CONSTRAINT "match_cache_score_range" CHECK ("match_cache"."score" between 0 and 100)
);
--> statement-breakpoint
ALTER TABLE "match_cache" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedupe_unique" UNIQUE("user_id","dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_jobs" (
	"talent_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_jobs_talent_id_job_id_pk" PRIMARY KEY("talent_id","job_id")
);
--> statement-breakpoint
ALTER TABLE "saved_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "saved_talent" (
	"client_id" uuid NOT NULL,
	"talent_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_talent_client_id_talent_id_pk" PRIMARY KEY("client_id","talent_id")
);
--> statement-breakpoint
ALTER TABLE "saved_talent" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_media" ADD CONSTRAINT "item_media_item_id_portfolio_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."portfolio_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "portfolio_items_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_profiles" ADD CONSTRAINT "talent_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_skills" ADD CONSTRAINT "talent_skills_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "talent_skills" ADD CONSTRAINT "talent_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_client_profiles_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_events" ADD CONSTRAINT "application_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_users_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_users_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_client_profiles_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_jobs" ADD CONSTRAINT "saved_jobs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_talent" ADD CONSTRAINT "saved_talent_client_id_client_profiles_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_talent" ADD CONSTRAINT "saved_talent_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skills_category_idx" ON "skills" USING btree ("category");--> statement-breakpoint
CREATE INDEX "skills_aliases_gin_idx" ON "skills" USING gin ("aliases");--> statement-breakpoint
CREATE INDEX "media_item_order_idx" ON "item_media" USING btree ("item_id","sort_order");--> statement-breakpoint
CREATE INDEX "items_talent_order_idx" ON "portfolio_items" USING btree ("talent_id","sort_order");--> statement-breakpoint
CREATE INDEX "items_tech_stack_gin_idx" ON "portfolio_items" USING gin ("tech_stack");--> statement-breakpoint
CREATE INDEX "items_embedding_hnsw_idx" ON "portfolio_items" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "talent_published_idx" ON "talent_profiles" USING btree ("is_published","updated_at");--> statement-breakpoint
CREATE INDEX "talent_availability_idx" ON "talent_profiles" USING btree ("availability");--> statement-breakpoint
CREATE INDEX "talent_embedding_hnsw_idx" ON "talent_profiles" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "talent_skills_skill_idx" ON "talent_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "job_skills_skill_idx" ON "job_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "jobs_status_published_idx" ON "jobs" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "jobs_client_idx" ON "jobs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "jobs_fts_idx" ON "jobs" USING gin (to_tsvector('english', "title" || ' ' || "description" || ' ' || coalesce("requirements", '')));--> statement-breakpoint
CREATE INDEX "application_events_app_idx" ON "application_events" USING btree ("application_id","at");--> statement-breakpoint
CREATE INDEX "applications_job_idx" ON "applications" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "applications_talent_idx" ON "applications" USING btree ("talent_id");--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "conversations_client_idx" ON "conversations" USING btree ("client_id","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_talent_idx" ON "conversations" USING btree ("talent_id","last_message_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "reports_unresolved_idx" ON "reports" USING btree ("resolved_at","created_at");--> statement-breakpoint
CREATE INDEX "match_cache_lookup_idx" ON "match_cache" USING btree ("subject_type","subject_id","score");--> statement-breakpoint
CREATE INDEX "match_cache_expiry_idx" ON "match_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE POLICY "user_profiles_select_public" ON "user_profiles" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "user_profiles_insert_self" ON "user_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint
CREATE POLICY "user_profiles_update_self" ON "user_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);--> statement-breakpoint
CREATE POLICY "skills_select_approved" ON "skills" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (is_approved = true);--> statement-breakpoint
CREATE POLICY "skills_request_insert" ON "skills" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (is_approved = false and requested_by = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "media_select" ON "item_media" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (
        select 1 from portfolio_items i
        join talent_profiles p on p.id = i.talent_id
        where i.id = "item_media"."item_id" and (p.is_published or p.user_id = (select auth.uid()))
      ));--> statement-breakpoint
CREATE POLICY "media_write_own" ON "item_media" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (
        select 1 from portfolio_items i
        join talent_profiles p on p.id = i.talent_id
        where i.id = "item_media"."item_id" and p.user_id = (select auth.uid())
      )) WITH CHECK (exists (
        select 1 from portfolio_items i
        join talent_profiles p on p.id = i.talent_id
        where i.id = "item_media"."item_id" and p.user_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "items_select" ON "portfolio_items" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from talent_profiles p where p.id = "portfolio_items"."talent_id" and (p.is_published or p.user_id = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "items_write_own" ON "portfolio_items" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from talent_profiles p where p.id = "portfolio_items"."talent_id" and p.user_id = (select auth.uid()))) WITH CHECK (exists (select 1 from talent_profiles p where p.id = "portfolio_items"."talent_id" and p.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "talent_select_published_or_own" ON "talent_profiles" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("talent_profiles"."is_published" = true or "talent_profiles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "talent_insert_own" ON "talent_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("talent_profiles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "talent_update_own" ON "talent_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("talent_profiles"."user_id" = (select auth.uid())) WITH CHECK ("talent_profiles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "talent_delete_own" ON "talent_profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("talent_profiles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "talent_skills_select" ON "talent_skills" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (select 1 from talent_profiles p where p.id = "talent_skills"."talent_id" and (p.is_published or p.user_id = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "talent_skills_write_own" ON "talent_skills" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from talent_profiles p where p.id = "talent_skills"."talent_id" and p.user_id = (select auth.uid()))) WITH CHECK (exists (select 1 from talent_profiles p where p.id = "talent_skills"."talent_id" and p.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "client_select_public" ON "client_profiles" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "client_insert_own" ON "client_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("client_profiles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "client_update_own" ON "client_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("client_profiles"."user_id" = (select auth.uid())) WITH CHECK ("client_profiles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "client_delete_own" ON "client_profiles" AS PERMISSIVE FOR DELETE TO "authenticated" USING ("client_profiles"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "job_skills_select" ON "job_skills" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (exists (
        select 1 from jobs j where j.id = "job_skills"."job_id"
        and (j.status <> 'draft' or exists (
          select 1 from client_profiles c where c.id = j.client_id and c.user_id = (select auth.uid())
        ))
      ));--> statement-breakpoint
CREATE POLICY "job_skills_write_own" ON "job_skills" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (
        select 1 from jobs j join client_profiles c on c.id = j.client_id
        where j.id = "job_skills"."job_id" and c.user_id = (select auth.uid())
      )) WITH CHECK (exists (
        select 1 from jobs j join client_profiles c on c.id = j.client_id
        where j.id = "job_skills"."job_id" and c.user_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "jobs_select_open_or_own" ON "jobs" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("jobs"."status" <> 'draft' or exists (
        select 1 from client_profiles c where c.id = "jobs"."client_id" and c.user_id = (select auth.uid())
      ));--> statement-breakpoint
CREATE POLICY "jobs_write_own" ON "jobs" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from client_profiles c where c.id = "jobs"."client_id" and c.user_id = (select auth.uid()))) WITH CHECK (exists (select 1 from client_profiles c where c.id = "jobs"."client_id" and c.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "application_events_select_participants" ON "application_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from applications a
        left join talent_profiles p on p.id = a.talent_id
        left join jobs j on j.id = a.job_id
        left join client_profiles c on c.id = j.client_id
        where a.id = "application_events"."application_id"
          and (p.user_id = (select auth.uid()) or c.user_id = (select auth.uid()))
      ));--> statement-breakpoint
CREATE POLICY "applications_select_participants" ON "applications" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from talent_profiles p where p.id = "applications"."talent_id" and p.user_id = (select auth.uid()))
        or exists (
          select 1 from jobs j join client_profiles c on c.id = j.client_id
          where j.id = "applications"."job_id" and c.user_id = (select auth.uid())
        ));--> statement-breakpoint
CREATE POLICY "applications_insert_talent" ON "applications" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from talent_profiles p where p.id = "applications"."talent_id" and p.user_id = (select auth.uid()))
        and exists (select 1 from jobs j where j.id = "applications"."job_id" and j.status = 'open'));--> statement-breakpoint
CREATE POLICY "applications_update_participants" ON "applications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from talent_profiles p where p.id = "applications"."talent_id" and p.user_id = (select auth.uid()))
        or exists (
          select 1 from jobs j join client_profiles c on c.id = j.client_id
          where j.id = "applications"."job_id" and c.user_id = (select auth.uid())
        ));--> statement-breakpoint
CREATE POLICY "blocks_manage_own" ON "blocks" AS PERMISSIVE FOR ALL TO "authenticated" USING ("blocks"."blocker_id" = (select auth.uid())) WITH CHECK ("blocks"."blocker_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "conversations_select_participants" ON "conversations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from client_profiles c where c.id = "conversations"."client_id" and c.user_id = (select auth.uid()))
        or exists (select 1 from talent_profiles p where p.id = "conversations"."talent_id" and p.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "conversations_insert_client" ON "conversations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (exists (select 1 from client_profiles c where c.id = "conversations"."client_id" and c.user_id = (select auth.uid()))
        and exists (
          select 1 from talent_profiles p
          where p.id = "conversations"."talent_id" and p.is_published = true and p.accepts_messages = true
        )
        and not exists (
          select 1 from blocks b join talent_profiles p on p.id = "conversations"."talent_id"
          where b.blocker_id = p.user_id and b.blocked_id = (select auth.uid())
        ));--> statement-breakpoint
CREATE POLICY "conversations_update_participants" ON "conversations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (exists (select 1 from client_profiles c where c.id = "conversations"."client_id" and c.user_id = (select auth.uid()))
        or exists (select 1 from talent_profiles p where p.id = "conversations"."talent_id" and p.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "messages_select_participants" ON "messages" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (
        select 1 from conversations v
        left join client_profiles c on c.id = v.client_id
        left join talent_profiles p on p.id = v.talent_id
        where v.id = "messages"."conversation_id"
          and (c.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
      ));--> statement-breakpoint
CREATE POLICY "messages_insert_participants" ON "messages" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("messages"."sender_id" = (select auth.uid())
        and exists (
          select 1 from conversations v
          left join client_profiles c on c.id = v.client_id
          left join talent_profiles p on p.id = v.talent_id
          where v.id = "messages"."conversation_id"
            and (c.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
            and not exists (
              select 1 from blocks b
              where b.blocked_id = (select auth.uid())
                and b.blocker_id in (c.user_id, p.user_id)
            )
        ));--> statement-breakpoint
CREATE POLICY "messages_update_recipient" ON "messages" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("messages"."sender_id" is distinct from (select auth.uid()) and exists (
        select 1 from conversations v
        left join client_profiles c on c.id = v.client_id
        left join talent_profiles p on p.id = v.talent_id
        where v.id = "messages"."conversation_id"
          and (c.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
      ));--> statement-breakpoint
CREATE POLICY "reports_insert_self" ON "reports" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ("reports"."reporter_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "reports_select_own" ON "reports" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("reports"."reporter_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "notifications_select_own" ON "notifications" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("notifications"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "notifications_update_own" ON "notifications" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("notifications"."user_id" = (select auth.uid())) WITH CHECK ("notifications"."user_id" = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "saved_jobs_manage_own" ON "saved_jobs" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from talent_profiles p where p.id = "saved_jobs"."talent_id" and p.user_id = (select auth.uid()))) WITH CHECK (exists (select 1 from talent_profiles p where p.id = "saved_jobs"."talent_id" and p.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "saved_talent_manage_own" ON "saved_talent" AS PERMISSIVE FOR ALL TO "authenticated" USING (exists (select 1 from client_profiles c where c.id = "saved_talent"."client_id" and c.user_id = (select auth.uid()))) WITH CHECK (exists (select 1 from client_profiles c where c.id = "saved_talent"."client_id" and c.user_id = (select auth.uid())));