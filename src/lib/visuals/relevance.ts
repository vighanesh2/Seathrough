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
  if (
    asset.id === "class-blueprint" &&
    !/\b(class|classes|oop|object[- ]oriented|blueprint|java class|python class)\b/.test(
      t,
    )
  ) {
    return 0;
  }

  return score;
}

export function matchAssetToPrompt(prompt: string): VisualAsset | undefined {
  let best: VisualAsset | undefined;
  let bestScore = 0;
  for (const asset of VISUAL_ASSETS) {
    const s = scoreAssetForPrompt(prompt, asset);
    if (s > bestScore) {
      bestScore = s;
      best = asset;
    }
  }
  return bestScore > 0 ? best : undefined;
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

export function wantsRightTriangle(prompt: string): boolean {
  const t = prompt.toLowerCase();
  return /\b(pythagoras|pythagorean|hypotenuse|right[- ]angled\s+triangle|right triangle)\b/.test(
    t,
  );
}

function tagIncludes(text: string, tag: string): boolean {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (tag.includes(" ")) return text.includes(tag);
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(text);
}
