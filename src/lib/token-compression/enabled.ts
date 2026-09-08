/**
 * Feature switch for token compression on the lesson stream.
 * Default ON. Set TOKEN_COMPRESSION_ENABLED=0 to disable without deleting code.
 */
export function isTokenCompressionEnabled(): boolean {
  const raw = process.env.TOKEN_COMPRESSION_ENABLED?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") {
    return false;
  }
  return true;
}

/**
 * Independent job judge on live ship_short.
 * Default OFF (week one: eval/gold only).
 * Turn ON only after human agreement that judge sameJob matches gold
 * ship-short vs failure note on A rows 1–16 and #21.
 * Set TOKEN_COMPRESSION_RUNTIME_JOB_JUDGE=1 to enable.
 */
export function isRuntimeJobJudgeEnabled(): boolean {
  const raw =
    process.env.TOKEN_COMPRESSION_RUNTIME_JOB_JUDGE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on" || raw === "yes";
}
