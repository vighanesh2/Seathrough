import type { DrawCommand } from "@/lib/draw-engine/commands";

export type GeneratedSvgPlacement = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function generatedSvgToDrawCommand(input: {
  dataUrl: string;
  alt: string;
  placement: GeneratedSvgPlacement;
  t0?: number;
}): DrawCommand {
  return {
    type: "image",
    id: `generated-svg-${Math.round(input.placement.y)}`,
    t0: input.t0 ?? 0,
    durationMs: 650,
    x: input.placement.x,
    y: input.placement.y,
    w: input.placement.width,
    h: input.placement.height,
    src: input.dataUrl,
    alt: input.alt,
  };
}
