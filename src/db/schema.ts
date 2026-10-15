import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  doublePrecision,
  bigint,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const characters = pgTable("characters", {
  characterId: bigint("character_id", { mode: "number" }).primaryKey(),
  characterName: text("character_name").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  accessTokenEnc: text("access_token_enc"),
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const characterPrefs = pgTable("character_prefs", {
  characterId: bigint("character_id", { mode: "number" })
    .primaryKey()
    .references(() => characters.characterId, { onDelete: "cascade" }),
  horizonHours: integer("horizon_hours").notNull().default(24),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const colonyCache = pgTable(
  "colony_cache",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    characterId: bigint("character_id", { mode: "number" })
      .notNull()
      .references(() => characters.characterId, { onDelete: "cascade" }),
    planetId: integer("planet_id").notNull(),
    etag: text("etag"),
    payload: jsonb("payload").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("colony_cache_char_planet").on(t.characterId, t.planetId)],
);

export const manualStocks = pgTable("manual_stocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  characterId: bigint("character_id", { mode: "number" })
    .notNull()
    .references(() => characters.characterId, { onDelete: "cascade" }),
  planetId: integer("planet_id"),
  typeId: integer("type_id").notNull(),
  amountAtEntry: doublePrecision("amount_at_entry").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
  burnRatePerHour: doublePrecision("burn_rate_per_hour").notNull(),
  emptyAt: timestamp("empty_at", { withTimezone: true }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const oauthStates = pgTable("oauth_states", {
  state: text("state").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
