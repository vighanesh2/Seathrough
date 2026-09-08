import { wantsFunctionGraph } from "@/lib/topics/functionParse";
import type { VisualAsset } from "@/lib/visuals/types";
import { getVisualAsset, VISUAL_ASSETS } from "@/lib/visuals/assets/catalog";

/** Score how well an asset fits the USER prompt only (never narration). */
export function scoreAssetForPrompt(
  prompt: string,
  asset: VisualAsset,
): number {
  const t = prompt.toLowerCase();
  let score = 0;

  for (const tag of asset.tags) {
    if (tagIncludes(t, tag)) score += Math.max(tag.length, 4);
  }

  const idPhrase = asset.id.replace(/-/g, " ");
  if (t.includes(idPhrase)) score += 14;

  // Hard rejects for known false friends
  if (asset.id === "loop-cycle" && /\b(life\s*cycle|lifecycle|sdlc)\b/.test(t)) {
    return 0;
  }
  if (
    asset.id === "horse-rider" &&
    !/\b(horse|horseriding|equestrian|saddle|riding)\b/.test(t)
  ) {
    return 0;
  }
  if (
    asset.id === "airplane-side-view" &&
    !/\b(airplane|aeroplane|plane|flight|lift|wing|aerodynamic)\b/.test(t)
  ) {
    return 0;
  }
  if (
    asset.id === "classroom-blueprint" &&
    !/\b(classroom|school classroom)\b/.test(t)
  ) {
    return 0;
  }
  if (asset.id === "class-blueprint") {
    const oopSignal =
      /\b(oop|object[- ]oriented|java|python|blueprint|vs\s+object|public\s+class|what\s+is\s+a\s+class|classes?\s+in)\b/.test(
        t,
      ) || /\b(class|classes)\b/.test(t);
    if (!oopSignal) return 0;
    // Other topics that can appear after an OOP lesson must not rematch this asset.
    if (
      /\b(cryptograph|encrypt|decrypt|cipher|plaintext|photosynthesis|gravity|inertia|big\s*bang|neuron|mitosis)\b/.test(
        t,
      )
    ) {
      return 0;
    }
  }
  // chart-area is a DATA chart, not geometric area / perimeter
  if (asset.id === "chart-area") {
    if (/\bperimeter\b/.test(t)) return 0;
    if (
      /\b(area\s+chart|chart\s+area|data\s+viz|statistics|compound interest)\b/.test(
        t,
      )
    ) {
      // keep normal scoring
    } else if (/\barea\b/.test(t) && !/\b(chart|graph|data|plot)\b/.test(t)) {
      return 0;
    }
  }
  // Generic function icon is a weak stand-in for a real y = f(x) graph
  // and for "what is a derivative".
  if (asset.id === "tabler-math-function") {
    if (wantsFunctionGraph(prompt)) return 0;
    if (
      /\b(graphing|graph|plot|sketch)\b/.test(t) &&
      /\b(function|curve|y\s*=|f\s*\(\s*x\s*\))\b/.test(t)
    ) {
      return 0;
    }
    if (
      /\bderivative\b/.test(t) &&
      /\b(mean|means|meaning|what is|what's|explain)\b/.test(t) &&
      !/\b(graph|plot|draw the)\b/.test(t)
    ) {
      return 0;
    }
  }

  return score;
}

export function matchAssetToPrompt(
  prompt: string,
  minScore = 5,
): VisualAsset | undefined {
  let best: VisualAsset | undefined;
  let bestScore = 0;
  for (const asset of VISUAL_ASSETS) {
    const s = scoreAssetForPrompt(prompt, asset);
    if (s > bestScore) {
      bestScore = s;
      best = asset;
    }
  }
  return bestScore >= minScore ? best : undefined;
}

/** Only accept LLM assetId if it actually relates to the user prompt */
export function acceptAssetId(
  prompt: string,
  assetId: string | undefined,
): VisualAsset | undefined {
  if (!assetId) return undefined;
  const asset = getVisualAsset(assetId);
  if (!asset) return undefined;
  return scoreAssetForPrompt(prompt, asset) > 0 ? asset : undefined;
}

export function wantsSimpleMath(prompt: string): boolean {
  const t = prompt.toLowerCase();
  return (
    /\b(pythagoras|pythagorean|hypotenuse|theorem|triangle|right[- ]angled|geometry|algebra|equation|formula|sine|cosine|tangent)\b/.test(
      t,
    ) && !/\b(horse|airplane|photosynthesis|sdlc)\b/.test(t)
  );
}

function tagIncludes(text: string, tag: string): boolean {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (tag.includes(" ")) return text.includes(tag);
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(text);
}
