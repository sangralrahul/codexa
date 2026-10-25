ALTER TABLE "deployments" DROP CONSTRAINT "deployments_created_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "project_activity" DROP CONSTRAINT "project_activity_actor_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_activity" ADD CONSTRAINT "project_activity_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;