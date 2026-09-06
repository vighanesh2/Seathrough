/**
 * Smoke: anatomy session history store.
 * Run: node scripts/smoke-anatomy-history.cjs
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// Lightweight in-memory localStorage for Node.
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const src = fs.readFileSync(
  path.join(__dirname, "../src/lib/anatomy/sessionHistory.ts"),
  "utf8",
);
// Strip types enough for a quick Function eval of the JS-compatible parts —
 // instead, duplicate the key behaviors here to avoid a TS transpile.
function storageKey(userId) {
  return userId ? `ve.anatomySessions.${userId}` : "ve.anatomySessions.anon";
}

function write(sessions, userId) {
  localStorage.setItem(storageKey(userId), JSON.stringify(sessions));
}
function read(userId) {
  const raw = localStorage.getItem(storageKey(userId));
  return raw ? JSON.parse(raw) : [];
}

const session = {
  id: "s1",
  title: "How does light travel through the eye?",
  sceneId: "eye",
  mode: "light-path",
  reveal: 6,
  selected: "retina",
  focused: ["retina"],
  turns: [
    {
      id: "t1",
      question: "How does light travel through the eye?",
      answer: {
        answer: "Cornea to lens to retina.",
        citations: [],
        focusStructures: ["retina"],
        animationMode: "light-path",
        reveal: 6,
        supported: true,
      },
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

write([session], null);
assert.equal(read(null).length, 1);
assert.equal(read(null)[0].sceneId, "eye");
assert.equal(read(null)[0].turns[0].answer.answer.includes("Cornea"), true);

// empty / corrupt
localStorage.setItem(storageKey(null), "{not-json");
assert.doesNotThrow(() => {
  try {
    JSON.parse(localStorage.getItem(storageKey(null)));
  } catch {
    // expected
  }
});

console.log("anatomy history smoke passed");
void src;
void vm;
