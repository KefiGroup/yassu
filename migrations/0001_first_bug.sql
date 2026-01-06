CREATE TABLE "digest_email_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"week_start" timestamp NOT NULL,
	"week_end" timestamp NOT NULL,
	"ideas_count" integer DEFAULT 0 NOT NULL,
	"matches_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "digest_email_log" ADD CONSTRAINT "digest_email_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;