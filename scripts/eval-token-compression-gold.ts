/**
 * Gold + harness eval (live LLM).
 *
 * Week one: job judge is EVAL ONLY — does not gate production ship_short.
 *
 * Run:
 *   npm run eval:token-compression-gold -- --limit=seed
 *   npm run eval:token-compression-gold -- --limit=all --stage=a
 *   npm run eval:token-compression-gold -- --limit=all --stage=all
 *
 * Stages: seed | a | b | scope | requirements | offgold | all
 */
import { getLlmConfig } from "../src/lib/env";
import {
  GOLD_A_ROWS,
  OFF_GOLD_ASKS,
  OFF_GOLD_HUMAN_READ_IDS,
  STRANGER_SAMPLE_SLUGS,
  landfillFromBadLongPane,
  landfillFromOffGoldTightAsk,
  selectGoldARows,
  selectGoldBRows,
  type GoldARow,
  type GoldBRow,
  type OffGoldAsk,
} from "../src/lib/token-compression/goldRows";
import {
  evalHardGate,
  judgeGoldAPane,
  judgeOffGoldPane,
} from "../src/lib/token-compression/goldJudge";
import { runPipeA } from "../src/lib/token-compression/pipeA";
import { runPipeB } from "../src/lib/token-compression/pipeB";
import {
  hitsForbiddenClaims,
  normalizePaneText,
} from "../src/lib/token-compression/responseHarness";

function parseArgs(argv: string[]) {
  const out: {
    limit: string;
    stage: string;
    skipJudge: boolean;
  } = {
    limit: "seed",
    stage: "seed",
    skipJudge: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--limit" && argv[i + 1]) {
      out.limit = argv[++i]!;
    } else if (a.startsWith("--limit=")) {
      out.limit = a.slice("--limit=".length);
    } else if (a === "--stage" && argv[i + 1]) {
      out.stage = argv[++i]!;
    } else if (a.startsWith("--stage=")) {
      out.stage = a.slice("--stage=".length);
    } else if (a === "--skip-judge") {
      out.skipJudge = true;
    }
  }
  // Convenience: --limit=seed implies stage seed unless stage overridden later
  if (out.limit === "seed" && !argv.some((a) => a.includes("--stage"))) {
    out.stage = "seed";
  }
  return out;
}

type RowResult = {
  id: string;
  pass: boolean;
  detail: string;
};

const PIPE_A_SCOPE_REGRESSIONS = [
  {
    id: "scope-computer-science",
    draft: "Explain all of computer science",
    forbiddenOptions: [
      "algorithms and data structures",
      "algorithms data structures",
      "computer architecture",
      "theory of computation",
    ],
    broadConfirmed:
      "Theory of Computation — automata, formal languages, and complexity classes.",
  },
  {
    id: "scope-integral-calculus",
    draft: "Explain integral calculus",
    forbiddenOptions: [
      "fundamentals of integral calculus",
      "techniques of integration",
      "applications of integrals",
    ],
    broadConfirmed:
      "Techniques of integration — substitution and integration by parts.",
  },
] as const;

async function evalPipeAScopeRegression(
  row: (typeof PIPE_A_SCOPE_REGRESSIONS)[number],
): Promise<RowResult> {
  let result;
  try {
    result = await runPipeA({ draft: row.draft });
  } catch (error) {
    return {
      id: row.id,
      pass: false,
      detail: `pipeA_throw: ${error instanceof Error ? error.message : error}`,
    };
  }
  if (result.decision !== "ask") {
    return {
      id: row.id,
      pass: false,
      detail: `expected ask, got run: ${result.tightAsk}`,
    };
  }

  const optionText = normalizePaneText(
    result.options
      .map((option) => `${option.label} ${option.tightAsk}`)
      .join(" "),
  );
  const forbidden = row.forbiddenOptions.find((phrase) =>
    optionText.includes(normalizePaneText(phrase)),
  );
  if (forbidden) {
    return {
      id: row.id,
      pass: false,
      detail: `survey-sized option survived: "${forbidden}"`,
    };
  }

  const firstChoice = result.options[0]!;
  let confirmed: Awaited<ReturnType<typeof runPipeA>>;
  let bypassAttempt: Awaited<ReturnType<typeof runPipeA>>;
  try {
    confirmed = await runPipeA({
      draft: row.draft,
      confirmedTightAsk: firstChoice.tightAsk,
    });
    bypassAttempt = await runPipeA({
      draft: row.draft,
      confirmedTightAsk: row.broadConfirmed,
    });
  } catch (error) {
    return {
      id: row.id,
      pass: false,
      detail: `confirmed scope check threw: ${error instanceof Error ? error.message : error}`,
    };
  }
  if (confirmed.decision !== "run") {
    return {
      id: row.id,
      pass: false,
      detail: `validated option did not run when selected: ${firstChoice.label}`,
    };
  }

  if (bypassAttempt.decision !== "ask") {
    return {
      id: row.id,
      pass: false,
      detail: `broad confirmedTightAsk bypassed scope gate: ${bypassAttempt.tightAsk}`,
    };
  }

  return {
    id: row.id,
    pass: true,
    detail: `ask ok (${result.options.length} concrete options), selected option runs, broad confirmation re-asks: ${result.options
      .map((option) => option.label)
      .join(" | ")}`,
  };
}

function printStrangerChecklist(rows: GoldARow[]) {
  console.log("\n=== Stranger G1–G3 samples (human checklist) ===");
  for (const slug of STRANGER_SAMPLE_SLUGS) {
    const row = rows.find((r) => r.slug === slug) ?? GOLD_A_ROWS.find((r) => r.slug === slug);
    if (!row) continue;
    console.log(`\n#${row.id} ${row.title}`);
    console.log(`  G1 sibling: ${row.sibling}`);
    console.log(`  G2 intuition: ${row.intuitionPath}`);
    console.log(`  G3 / must-not: ${row.mustNotClaim.join(" | ")}`);
    console.log(`  Pass looks like: ${row.passLooksLike}`);
  }
  console.log(
    "\n(See docs/token-compression-stranger-checklist.md — do not claim stranger pass from this script.)",
  );
}

async function evalARow(
  row: GoldARow,
  skipJudge: boolean,
): Promise<RowResult> {
  const landfill = landfillFromBadLongPane(row.badLongPane);
  const phrases = [...row.mustNotClaim, row.failureNote];

  let pipe;
  try {
    pipe = await runPipeB({
      tightAsk: row.tightAsk,
      contentName: row.contentName,
      scope: row.scope,
      landfillBeats: landfill.beats,
      landfillHumanSummary: landfill.humanSummary,
      forbiddenPhrases: phrases,
      unitHints: {
        coreConceptSummary: row.coreConceptSummary,
        mapping: row.mapping,
        nextStep: row.nextStep,
        shipShortJob: row.shipShort,
      },
    });
  } catch (error) {
    return {
      id: `A#${row.id}:${row.slug}`,
      pass: false,
      detail: `pipeB_throw: ${error instanceof Error ? error.message : error}`,
    };
  }

  const hard = evalHardGate({
    paneScript: pipe.paneScript,
    forbiddenPhrases: phrases,
    criticYes: pipe.criticPass === "yes",
    voiceOk: pipe.voiceOk,
  });

  if (hard.forbiddenHit) {
    console.warn(
      `  [phrase] A#${row.id} fired: "${hard.forbiddenPhrase}"`,
    );
  }

  let judgeNote = "judge=skipped";
  let judgeOk = true;
  if (!skipJudge) {
    try {
      const judge = await judgeGoldAPane({
        row,
        paneScript: pipe.paneScript,
      });
      judgeOk = judge.sameJob === "yes";
      judgeNote = `judge.sameJob=${judge.sameJob} ask=${judge.sameTightAsk} job=${judge.sameJobAsShipShort} failHit=${judge.hitsFailureOrMustNot}${judge.notes ? ` (${judge.notes})` : ""}`;
    } catch (error) {
      judgeOk = false;
      judgeNote = `judge_error: ${error instanceof Error ? error.message : error}`;
    }
  }

  // Eval pass for A: no forbidden phrase on shipped path intent; judge sameJob when run;
  // recovery may be refuse (pass1) — then hard forbidden on final pane still fails.
  const phraseFail = hard.forbiddenHit;
  const pass = !phraseFail && judgeOk;

  return {
    id: `A#${row.id}:${row.slug}`,
    pass,
    detail: [
      `recovery=${pipe.recovery}`,
      `critic=${pipe.criticPass}`,
      `words=${pipe.wordCount}`,
      `harness=${hard.harnessReason}`,
      phraseFail ? `PHRASE="${hard.forbiddenPhrase}"` : "phrase=ok",
      judgeNote,
    ].join(" | "),
  };
}

async function evalBRow(row: GoldBRow): Promise<RowResult> {
  let result;
  try {
    result = await runPipeA({ draft: row.sloppyDraft });
  } catch (error) {
    return {
      id: `B#${row.id}:${row.slug}`,
      pass: false,
      detail: `pipeA_throw: ${error instanceof Error ? error.message : error}`,
    };
  }

  if (result.decision !== "ask") {
    const hay = normalizePaneText(
      [
        result.tightAsk,
        result.contentName,
        result.displayRewrite ?? "",
      ].join(" "),
    );
    const invented = row.forbiddenTitles.find((t) =>
      hay.includes(normalizePaneText(t)),
    );
    return {
      id: `B#${row.id}:${row.slug}`,
      pass: false,
      detail: `expected ask, got run${invented ? ` + forbidden title "${invented}"` : ""} (content=${result.contentName})`,
    };
  }

  const optHay = normalizePaneText(
    [result.message, ...result.options.map((o) => `${o.label} ${o.tightAsk}`)].join(
      " ",
    ),
  );
  const invented = row.forbiddenTitles.find((t) =>
    optHay.includes(normalizePaneText(t)),
  );
  if (invented) {
    return {
      id: `B#${row.id}:${row.slug}`,
      pass: false,
      detail: `ask but mentions forbidden title "${invented}"`,
    };
  }

  return {
    id: `B#${row.id}:${row.slug}`,
    pass: true,
    detail: `ask ok (${result.options.length} options)`,
  };
}

async function evalOffGold(
  ask: OffGoldAsk,
  skipJudge: boolean,
): Promise<RowResult> {
  const id = `OG:${ask.id}`;

  let pipeA;
  try {
    pipeA = await runPipeA({ draft: ask.draft });
  } catch (error) {
    return {
      id,
      pass: false,
      detail: `pipeA_throw: ${error instanceof Error ? error.message : error}`,
    };
  }

  const surveyHay =
    pipeA.decision === "ask"
      ? normalizePaneText(
          [
            pipeA.message,
            ...pipeA.options.map((o) => `${o.label} ${o.tightAsk}`),
          ].join(" "),
        )
      : normalizePaneText(
          [
            pipeA.tightAsk,
            pipeA.contentName,
            pipeA.displayRewrite ?? "",
          ].join(" "),
        );

  const surveyHit = ask.forbiddenSurveyTitles.find((t) =>
    surveyHay.includes(normalizePaneText(t)),
  );
  if (surveyHit) {
    return {
      id,
      pass: false,
      detail: `pipeA invented survey title "${surveyHit}" (decision=${pipeA.decision})`,
    };
  }

  if (pipeA.decision === "ask") {
    // Refuse / clarify path — pass for blob and prefer_ask; also ok for ship_or_ask.
    return {
      id,
      pass: true,
      detail: `pipeA=ask (${pipeA.options.length} options) · expect=${ask.expect}`,
    };
  }

  // og-1 product expect is heart rooms — building atriums is the wrong canvas.
  if (
    ask.n === 1 &&
    /building|architecture|lobby|courtyard/i.test(
      `${pipeA.tightAsk} ${pipeA.contentName}`,
    )
  ) {
    return {
      id,
      pass: false,
      detail: `pipeA=run building atriums; expect heart rooms · tightAsk=${pipeA.tightAsk}`,
    };
  }

  // prefer_ask / refuse_blob that somehow ran: fail if kind requires ask
  if (ask.kind === "refuse_blob" || ask.kind === "prefer_ask") {
    return {
      id,
      pass: false,
      detail: `pipeA=run but expect prefer/refuse ask · tightAsk=${pipeA.tightAsk}`,
    };
  }

  const landfill = landfillFromOffGoldTightAsk(pipeA.tightAsk);
  let pipeB;
  try {
    pipeB = await runPipeB({
      tightAsk: pipeA.tightAsk,
      contentName: pipeA.contentName,
      scope: pipeA.scope,
      landfillBeats: landfill.beats,
      landfillHumanSummary: landfill.humanSummary,
      forbiddenPhrases: ask.nearbyForbidden,
      unitHints: {
        coreConceptSummary: `${pipeA.contentName} for this canvas.`,
        mapping: pipeA.scope.include,
        nextStep: "Follow the board mapping for the next teaching move.",
      },
    });
  } catch (error) {
    return {
      id,
      pass: false,
      detail: `pipeB_throw: ${error instanceof Error ? error.message : error}`,
    };
  }

  const hard = evalHardGate({
    paneScript: pipeB.paneScript,
    forbiddenPhrases: ask.nearbyForbidden,
    criticYes: pipeB.criticPass === "yes",
    voiceOk: pipeB.voiceOk,
  });

  if (hard.forbiddenHit && pipeB.recovery === "ship_short") {
    return {
      id,
      pass: false,
      detail: `harness phrase shipped: "${hard.forbiddenPhrase}" · recovery=${pipeB.recovery}`,
    };
  }

  // Also fail if forbidden appears in pane even on pass1 (wandering claim)
  const wander = hitsForbiddenClaims(pipeB.paneScript, ask.nearbyForbidden);
  if (wander.hit) {
    return {
      id,
      pass: false,
      detail: `nearby mustNotClaim in pane: "${wander.phrase}" · recovery=${pipeB.recovery}`,
    };
  }

  if (hard.soupHit && pipeB.recovery === "ship_short") {
    return {
      id,
      pass: false,
      detail: `keyword soup shipped · recovery=${pipeB.recovery}`,
    };
  }

  const refusedShort =
    pipeB.recovery === "loosen_pass1" || pipeB.recovery === "keep_landfill";
  const shipped = pipeB.recovery === "ship_short";

  let judgeNote = "judge=skipped";
  let judgeOk = true;
  if (!skipJudge && shipped) {
    try {
      const judge = await judgeOffGoldPane({
        tightAsk: pipeA.tightAsk,
        paneScript: pipeB.paneScript,
        expectNote: ask.expect,
      });
      judgeOk =
        judge.sameTightAsk === "yes" &&
        judge.hitsFailureOrMustNot === "no";
      judgeNote = `judge.sameJob=${judge.sameJob} ask=${judge.sameTightAsk} job=${judge.sameJobAsShipShort} failHit=${judge.hitsFailureOrMustNot}`;
    } catch (error) {
      judgeOk = false;
      judgeNote = `judge_error: ${error instanceof Error ? error.message : error}`;
    }
  } else if (refusedShort) {
    judgeNote = "judge=n/a (refused short)";
  }

  const pass = (shipped || refusedShort) && judgeOk;
  return {
    id,
    pass,
    detail: [
      `pipeA=run`,
      `tightAsk=${pipeA.tightAsk.slice(0, 80)}`,
      `recovery=${pipeB.recovery}`,
      `critic=${pipeB.criticPass}`,
      `words=${pipeB.wordCount}`,
      `harness=${hard.harnessReason}`,
      judgeNote,
    ].join(" | "),
  };
}

function printOffGoldHumanRead() {
  console.log("\n=== Off-gold human skim (script does NOT stranger-pass) ===");
  for (const id of OFF_GOLD_HUMAN_READ_IDS) {
    const row = OFF_GOLD_ASKS.find((a) => a.id === id);
    if (!row) continue;
    console.log(`\n#${row.n} ${row.draft}`);
    console.log(`  Expect: ${row.expect}`);
  }
  console.log("\n(See docs/token-compression-off-gold.md)");
}

async function evalPipeBRequirementRegression(): Promise<RowResult> {
  const tightAsk =
    "Explain the CIA triad with one real-world example for each; exclude other security principles.";
  try {
    const result = await runPipeB({
      tightAsk,
      contentName: "CIA triad",
      scope: {
        include: "Confidentiality, integrity, and availability with one example each.",
        exclude: "Other security principles and implementation surveys.",
      },
      landfillBeats: [
        {
          id: "cia-map",
          kind: "concept",
          narration:
            "On the board, three labeled shields map to confidentiality, integrity, and availability.",
        },
        {
          id: "cia-examples",
          kind: "example",
          narration:
            "Confidentiality maps to a clinic encrypting patient files. Integrity maps to a bank hashing transaction logs so changes are visible. Availability maps to a hospital using backup servers so records remain reachable during an outage.",
        },
      ],
      landfillHumanSummary:
        "The three shields protect secrecy, correctness, and access. Next: match one technical control to each pillar.",
    });
    const pane = normalizePaneText(result.paneScript);
    const missing = [
      "confidentiality",
      "integrity",
      "availability",
      "clinic",
      "bank",
      "hospital",
    ].filter((term) => !pane.includes(term));
    return {
      id: "pipe-b-explicit-requirements",
      pass: missing.length === 0,
      detail: missing.length
        ? `missing requested CIA example content: ${missing.join(", ")}`
        : `all three requested examples preserved · recovery=${result.recovery} · words=${result.wordCount}`,
    };
  } catch (error) {
    return {
      id: "pipe-b-explicit-requirements",
      pass: false,
      detail: `pipeB_throw: ${error instanceof Error ? error.message : error}`,
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const llm = getLlmConfig();
  console.log("=== token-compression gold eval ===");
  console.log(`model (pinned for this run): ${llm.provider}/${llm.model}`);
  console.log(
    "NOTE: temp 0 on judge is not a freeze — re-run 17 A after Groq model swaps.",
  );
  console.log(
    "NOTE: job judge is EVAL ONLY — live ship_short ignores it until human gate + TOKEN_COMPRESSION_RUNTIME_JOB_JUDGE=1.",
  );
  console.log(`limit=${args.limit} stage=${args.stage} skipJudge=${args.skipJudge}`);

  const results: RowResult[] = [];

  const runA =
    args.stage === "seed" ||
    args.stage === "a" ||
    args.stage === "all";
  const runB =
    args.stage === "seed" ||
    args.stage === "b" ||
    args.stage === "all";
  const runOff =
    args.stage === "offgold" || args.stage === "all";
  const runScope =
    args.stage === "scope" || args.stage === "all";
  const runRequirements =
    args.stage === "requirements" || args.stage === "all";

  if (runA) {
    const rows =
      args.stage === "seed"
        ? selectGoldARows("seed")
        : selectGoldARows(args.limit === "seed" ? "all" : args.limit);
    console.log(`\n--- Pipe B gold A (${rows.length}) ---`);
    for (const row of rows) {
      process.stdout.write(`  ${row.slug}... `);
      const r = await evalARow(row, args.skipJudge);
      results.push(r);
      console.log(r.pass ? "PASS" : "FAIL");
      console.log(`    ${r.detail}`);
    }
    printStrangerChecklist(rows);
  }

  if (runB) {
    const rows =
      args.stage === "seed"
        ? selectGoldBRows("seed")
        : selectGoldBRows(args.limit === "seed" ? "all" : args.limit);
    console.log(`\n--- Pipe A gold B (${rows.length}) ---`);
    for (const row of rows) {
      process.stdout.write(`  ${row.slug}... `);
      const r = await evalBRow(row);
      results.push(r);
      console.log(r.pass ? "PASS" : "FAIL");
      console.log(`    ${r.detail}`);
    }
  }

  if (runScope) {
    console.log(
      `\n--- Pipe A one-canvas scope regressions (${PIPE_A_SCOPE_REGRESSIONS.length}) ---`,
    );
    for (const row of PIPE_A_SCOPE_REGRESSIONS) {
      process.stdout.write(`  ${row.id}... `);
      const result = await evalPipeAScopeRegression(row);
      results.push(result);
      console.log(result.pass ? "PASS" : "FAIL");
      console.log(`    ${result.detail}`);
    }
  }

  if (runRequirements) {
    console.log("\n--- Pipe B explicit-requirement regression (1) ---");
    process.stdout.write("  pipe-b-explicit-requirements... ");
    const result = await evalPipeBRequirementRegression();
    results.push(result);
    console.log(result.pass ? "PASS" : "FAIL");
    console.log(`    ${result.detail}`);
  }

  if (runOff) {
    console.log(`\n--- Off-gold (${OFF_GOLD_ASKS.length}) ---`);
    console.log(
      "Locked drafts: docs/token-compression-off-gold.md · Pipe A first, then B ship/refuse",
    );
    for (const ask of OFF_GOLD_ASKS) {
      process.stdout.write(`  ${ask.id} (#${ask.n})... `);
      const r = await evalOffGold(ask, args.skipJudge);
      results.push(r);
      console.log(r.pass ? "PASS" : "FAIL");
      console.log(`    ${r.detail}`);
    }
    printOffGoldHumanRead();
  }

  const failed = results.filter((r) => !r.pass);
  console.log("\n=== summary ===");
  console.log(`pass ${results.length - failed.length}/${results.length}`);
  if (failed.length) {
    console.log("failures:");
    for (const f of failed) {
      console.log(`  - ${f.id}: ${f.detail}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
