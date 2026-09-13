ALTER TABLE "leads" ADD COLUMN "kind" text DEFAULT 'buyer' NOT NULL;--> statement-breakpoint
CREATE INDEX "leads_project_kind_idx" ON "leads" USING btree ("project_id","kind");