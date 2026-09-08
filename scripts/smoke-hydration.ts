import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(path), "utf8");

const footer = read("src/components/site/SiteFooter.tsx");
assert.ok(
  !footer.includes("new Date("),
  "SiteFooter must render the serialized server year",
);
assert.ok(footer.includes("copyrightYear"));

const homePage = read("src/app/page.tsx");
assert.ok(homePage.includes("new Date().getUTCFullYear()"));
assert.ok(homePage.includes("copyrightYear="));

const questionAccess = read("src/components/usage/QuestionAccess.tsx");
assert.ok(questionAccess.includes("useSyncExternalStore"));
assert.ok(questionAccess.includes("() => false"));
assert.ok(
  questionAccess.indexOf("quotaHydrated") <
    questionAccess.indexOf("remainingQuestions()"),
  "Quota storage must only be read after hydration",
);
assert.ok(!questionAccess.includes("suppressHydrationWarning"));

console.log("hydration determinism smoke checks passed");
