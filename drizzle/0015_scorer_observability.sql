ALTER TABLE "llm_usage" ADD COLUMN "model" text;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "provider" text;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "latency_ms" integer;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "items_asked" integer;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "items_answered" integer;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "finish_reason" text;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "schema_failed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "attempt" integer;--> statement-breakpoint
ALTER TABLE "llm_usage" ADD COLUMN "reasoning_tokens" integer;--> statement-breakpoint
CREATE INDEX "llm_usage_project_purpose_at_idx" ON "llm_usage" USING btree ("project_id","purpose","at");