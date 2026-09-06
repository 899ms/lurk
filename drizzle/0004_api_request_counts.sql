CREATE TABLE "api_request_counts" (
	"key_id" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "api_request_counts_key_id_day_pk" PRIMARY KEY("key_id","day")
);
--> statement-breakpoint
CREATE TABLE "api_key_names" (
	"key_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_request_counts" ADD CONSTRAINT "api_request_counts_key_id_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_names" ADD CONSTRAINT "api_key_names_key_id_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;
