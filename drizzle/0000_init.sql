CREATE TABLE IF NOT EXISTS "characters" (
  "character_id" bigint PRIMARY KEY,
  "character_name" text NOT NULL,
  "refresh_token_enc" text NOT NULL,
  "access_token_enc" text,
  "access_expires_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "character_prefs" (
  "character_id" bigint PRIMARY KEY REFERENCES "characters"("character_id") ON DELETE CASCADE,
  "horizon_hours" integer DEFAULT 24 NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "colony_cache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "character_id" bigint NOT NULL REFERENCES "characters"("character_id") ON DELETE CASCADE,
  "planet_id" integer NOT NULL,
  "etag" text,
  "payload" jsonb NOT NULL,
  "expires_at" timestamptz,
  "fetched_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "colony_cache_char_planet" ON "colony_cache" ("character_id", "planet_id");

CREATE TABLE IF NOT EXISTS "manual_stocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "character_id" bigint NOT NULL REFERENCES "characters"("character_id") ON DELETE CASCADE,
  "planet_id" integer,
  "type_id" integer NOT NULL,
  "amount_at_entry" double precision NOT NULL,
  "recorded_at" timestamptz NOT NULL,
  "burn_rate_per_hour" double precision NOT NULL,
  "empty_at" timestamptz NOT NULL,
  "note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "oauth_states" (
  "state" text PRIMARY KEY,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
