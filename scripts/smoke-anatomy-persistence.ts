import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { anatomySessionSchema } from "../src/lib/anatomy/sessionSchema";
import { mergeAnatomySessions } from "../src/lib/anatomy/sessionHistory";

const baseSession = anatomySessionSchema.parse({
  id: "anatomy_test",
  title: "How the retina works",
  sceneId: "eye",
  mode: "light-path",
  reveal: 4,
  selected: "retina",
  focused: ["retina"],
  turns: [
    {
      id: "turn_test",
      question: "How does light reach the retina?",
      error: "Offline",
      createdAt: "2026-09-07T12:00:00.000Z",
    },
  ],
  createdAt: "2026-09-07T12:00:00.000Z",
  updatedAt: "2026-09-07T12:00:00.000Z",
});

assert.equal(
  anatomySessionSchema.safeParse({ ...baseSession, title: "" }).success,
  false,
);
assert.equal(
  anatomySessionSchema.safeParse({
    ...baseSession,
    sceneId: "kidney",
    mode: "light-path",
  }).success,
  false,
);
assert.equal(
  anatomySessionSchema.safeParse({
    ...baseSession,
    selected: "glomerulus",
  }).success,
  false,
);
assert.equal(
  anatomySessionSchema.parse({
    ...baseSession,
    updatedAt: "2026-09-07T08:00:00.000-05:00",
  }).updatedAt,
  "2026-09-07T13:00:00.000Z",
);

const newer = {
  ...baseSession,
  title: "Updated retina lesson",
  updatedAt: "2026-09-07T13:00:00.000Z",
};
assert.deepEqual(mergeAnatomySessions([baseSession], [newer]), [newer]);

const migration = readFileSync(
  resolve("docs/supabase/006_anatomy_conversations.sql"),
  "utf8",
);
for (const requirement of [
  "create table if not exists public.anatomy_conversations",
  "primary key (user_id, id)",
  "turn_count = jsonb_array_length(turns)",
  "client_updated_at",
  "enable row level security",
  "auth.uid() = user_id",
  "anatomy_conversations_set_updated_at",
]) {
  assert.ok(migration.includes(requirement), `Migration missing: ${requirement}`);
}

const store = readFileSync(
  resolve("src/lib/anatomy/sessionStore.ts"),
  "utf8",
);
assert.ok(
  (store.match(/\.eq\("user_id", userId\)/g)?.length ?? 0) >= 3,
  "Every service-role anatomy query must be scoped to user_id",
);
assert.ok(store.includes('insertError.code !== "23505"'));
assert.ok(store.includes('eq("turn_count", current.turns.length)'));

const workspace = readFileSync(
  resolve("src/components/anatomy/AnatomyWorkspace.tsx"),
  "utf8",
);
assert.ok(workspace.includes(".slice(0, MAX_SESSION_TURNS)"));
assert.ok(workspace.includes("const latestOwned = readAnatomySessions(ownerId)"));
assert.ok(workspace.includes("ownerRef.current !== requestOwner"));

console.log("anatomy persistence smoke checks passed");
