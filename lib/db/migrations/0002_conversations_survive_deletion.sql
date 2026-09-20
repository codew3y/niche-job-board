ALTER TABLE "conversations" DROP CONSTRAINT "conversations_client_id_client_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_talent_id_talent_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ALTER COLUMN "talent_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_client_profiles_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."client_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_talent_id_talent_profiles_id_fk" FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE set null ON UPDATE no action;