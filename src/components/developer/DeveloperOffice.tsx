"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AccountMenu } from "@/components/lms/AccountMenu";
import { BrandMark } from "@/components/lms/BrandMark";
import { useQuestionAccess } from "@/components/usage/QuestionAccess";
import { Button } from "@/components/ui/button";
import {
  AGENTS,
  CREDIT_MAX,
  CREDIT_RESET_MS,
  PM,
  SPOTS,
  formatReset,
  loadCredits,
  nextOfficeTask,
  saveCredits,
  travelMs,
  walkPath,
  type AgentId,
  type AgentPhase,
  type OfficeTask,
  type Point,
  type SpotId,
} from "@/lib/developer/office";

type LogLine = { id: number; text: string; at: string };

type AgentView = {
  id: AgentId;
  spot: SpotId;
  pos: Point;
  facing: 1 | -1;
  phase: AgentPhase;
  walking: boolean;
  walkMs: number;
  task: OfficeTask | null;
  say: string;
};

const START: Record<AgentId, AgentView> = {
  ada: {
    id: "ada",
    spot: "deskAda",
    pos: SPOTS.deskAda,
    facing: 1,
    phase: "desk",
    walking: false,
    walkMs: 480,
    task: null,
    say: "",
  },
  byte: {
    id: "byte",
    spot: "deskByte",
    pos: SPOTS.deskByte,
    facing: -1,
    phase: "desk",
    walking: false,
    walkMs: 480,
    task: null,
    say: "",
  },
};

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function clock(): string {
  return new Date().toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function DeveloperOffice() {
  const { openAuth } = useQuestionAccess();
  const [agents, setAgents] = useState(START);
  const [credits, setCredits] = useState(CREDIT_MAX);
  const [pmSay, setPmSay] = useState("Bring me the next ticket.");
  const [resetIn, setResetIn] = useState<number | null>(null);
  const [log, setLog] = useState<LogLine[]>([]);
  const creditsRef = useRef(CREDIT_MAX);
  const agentsRef = useRef(START);
  const taskIndex = useRef(0);
  const logId = useRef(0);
  const pmGate = useRef(Promise.resolve());
  const resetTimer = useRef<number | null>(null);

  const pushLog = useCallback((text: string) => {
    logId.current += 1;
    setLog((rows) =>
      [{ id: logId.current, text, at: clock() }, ...rows].slice(0, 14),
    );
  }, []);

  const patchAgent = useCallback((id: AgentId, next: Partial<AgentView>) => {
    setAgents((prev) => {
      const updated = { ...prev, [id]: { ...prev[id], ...next } };
      agentsRef.current = updated;
      return updated;
    });
  }, []);

  const setCreditPool = useCallback((value: number) => {
    const next = Math.max(0, Math.min(CREDIT_MAX, value));
    creditsRef.current = next;
    setCredits(next);
    saveCredits(next);
  }, []);

  const spendCredits = useCallback(
    (amount: number) => {
      const next = Math.max(0, creditsRef.current - amount);
      setCreditPool(next);
      return next;
    },
    [setCreditPool],
  );

  const walkTo = useCallback(
    async (id: AgentId, dest: SpotId, signal: AbortSignal) => {
      const agent = agentsRef.current[id];
      const steps = walkPath(agent.spot, dest, id);
      for (const spot of steps) {
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        const from = agentsRef.current[id].pos;
        const to = SPOTS[spot];
        const ms = prefersReducedMotion() ? 80 : travelMs(from, to);
        patchAgent(id, {
          walking: true,
          walkMs: ms,
          facing: to.x >= from.x ? 1 : -1,
          pos: to,
          spot,
        });
        await wait(ms, signal);
      }
      patchAgent(id, { walking: false, spot: dest, pos: SPOTS[dest] });
    },
    [patchAgent],
  );

  const withPm = useCallback((job: () => Promise<void>) => {
    const run = pmGate.current.then(job, job);
    pmGate.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  const startResetClock = useCallback(() => {
    if (resetTimer.current) return;
    const ends = Date.now() + CREDIT_RESET_MS;
    setResetIn(CREDIT_RESET_MS);
    const tick = window.setInterval(() => {
      const left = ends - Date.now();
      if (left <= 0) {
        window.clearInterval(tick);
        resetTimer.current = null;
        setResetIn(null);
        setCreditPool(CREDIT_MAX);
      } else {
        setResetIn(left);
      }
    }, 250);
    resetTimer.current = tick;
  }, [setCreditPool]);

  useEffect(() => {
    const saved = loadCredits();
    setCreditPool(saved);
    if (saved <= 0) startResetClock();
    pushLog("Night shift is open. Agents will fetch work from Brief.");

    const abort = new AbortController();
    const { signal } = abort;

    async function runShift(id: AgentId, delay: number) {
      const meta = AGENTS[id];
      await wait(delay, signal).catch(() => undefined);
      while (!signal.aborted) {
        try {
          if (creditsRef.current <= 0) {
            if (agentsRef.current[id].spot !== meta.room) {
              patchAgent(id, {
                phase: "to-room",
                say: "Credits are gone. I'm out.",
                task: null,
              });
              pushLog(`${meta.name} walks to their room — credits empty.`);
              await walkTo(id, meta.room, signal);
            }
            patchAgent(id, {
              phase: "sleeping",
              say: "",
              walking: false,
              facing: 1,
            });
            startResetClock();
            while (!signal.aborted && creditsRef.current <= 0) {
              await wait(400, signal);
            }
            patchAgent(id, { phase: "to-desk-from-room", say: "Back on." });
            pushLog(`${meta.name} wakes. Credits reset.`);
            await walkTo(id, meta.desk, signal);
            patchAgent(id, { phase: "desk", say: "" });
            continue;
          }

          await withPm(async () => {
            patchAgent(id, { phase: "to-pm", say: "Need a task." });
            await walkTo(id, "pm", signal);
            patchAgent(id, {
              phase: "asking",
              walking: false,
              say: "What should I take?",
            });
            const task = nextOfficeTask(taskIndex.current++);
            await wait(prefersReducedMotion() ? 200 : 1100, signal);
            setPmSay(`${meta.name}: ${task.title}`);
            patchAgent(id, { task, say: task.title });
            pushLog(`Brief assigns ${meta.name} — ${task.title}`);
            await wait(prefersReducedMotion() ? 200 : 900, signal);
            patchAgent(id, { phase: "to-desk", say: task.title });
            await walkTo(id, meta.desk, signal);
          });

          if (creditsRef.current <= 0) continue;

          const task = agentsRef.current[id].task;
          if (!task) continue;
          patchAgent(id, { phase: "working", walking: false, say: "" });
          const slices = Math.max(3, Math.round(task.cost / 2));
          for (let i = 0; i < slices; i += 1) {
            if (signal.aborted) return;
            await wait(prefersReducedMotion() ? 160 : 700, signal);
            const left = spendCredits(Math.ceil(task.cost / slices));
            if (left <= 0) break;
          }
          if (creditsRef.current > 0) {
            pushLog(`${meta.name} ships “${task.title}”.`);
            patchAgent(id, { task: null, phase: "desk" });
            await wait(prefersReducedMotion() ? 120 : 500, signal);
          }
        } catch (caught) {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          await wait(800, signal).catch(() => undefined);
        }
      }
    }

    void runShift("ada", 600);
    void runShift("byte", 2800);

    return () => {
      abort.abort();
      if (resetTimer.current) window.clearInterval(resetTimer.current);
    };
  }, [patchAgent, pushLog, spendCredits, startResetClock, walkTo, withPm]);

  const sleeping = useMemo(
    () => Object.values(agents).filter((agent) => agent.phase === "sleeping").length,
    [agents],
  );

  return (
    <div className="developer-office min-h-dvh">
      <header className="border-b border-[#cbbfa8]/70 bg-[#f3ead8]/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <nav className="flex min-w-0 items-center gap-3">
            <BrandMark />
            <span className="hidden text-[#8a7a62] sm:inline">/</span>
            <span className="truncate font-[family-name:var(--font-ibm-plex-mono)] text-[12px] tracking-wide text-[#5c4e3a] uppercase">
              Night shift
            </span>
          </nav>
          <AccountMenu
            onLogin={() => openAuth("login")}
            onSignup={() => openAuth("signup")}
          />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] tracking-[0.18em] text-[#8a6a3a] uppercase">
              Programming floor
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-[2rem] tracking-tight text-[#241c14]">
              Two agents, one board
            </h1>
            <p className="mt-1 max-w-xl text-[14px] leading-6 text-[#5c4e3a]">
              Ada and Byte walk to Brief for a ticket, code at their desks, then
              sleep in their rooms when the Cursor credit pool hits zero. The
              pool here is local — Cursor does not publish live billing to this
              page — and it refills on a timer.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/smart-tutor">Back to Smart tutor</Link>
          </Button>
        </div>

        <section className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-[#cbbfa8] bg-[#f7f0e2] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] tracking-wide text-[#6a5a40] uppercase">
                Cursor credits
              </p>
              <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[13px] text-[#241c14]">
                {credits} / {CREDIT_MAX}
                {resetIn != null ? ` · reset ${formatReset(resetIn)}` : ""}
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4d5b8]">
              <div
                className="h-full rounded-full bg-[#c45e1a] transition-[width] duration-300"
                style={{ width: `${(credits / CREDIT_MAX) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-[12px] text-[#6a5a40]">
              {credits <= 0
                ? sleeping
                  ? "Both desks are dark. Agents sleep until the pool refills."
                  : "Credits empty. Agents are heading to their rooms."
                : "Each shipped ticket burns a slice of the pool."}
            </p>
          </div>
          <button
            type="button"
            className="rounded-2xl border border-[#cbbfa8] bg-[#241c14] px-4 py-3 text-left text-[13px] text-[#f3ead8] hover:bg-[#3a3126]"
            onClick={() => {
              if (resetTimer.current) {
                window.clearInterval(resetTimer.current);
                resetTimer.current = null;
              }
              setResetIn(null);
              setCreditPool(CREDIT_MAX);
              pushLog("Credits topped up by hand.");
            }}
          >
            <span className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] tracking-wide uppercase">
              Wake the floor
            </span>
            <span className="mt-1 block text-[12px] text-[#d8c9ae]">
              Refill credits now
            </span>
          </button>
        </section>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16.5rem]">
          <div className="developer-floor relative h-[min(56vh,520px)] overflow-hidden rounded-[28px] border border-[#b9a888] shadow-[0_24px_50px_rgba(48,32,12,0.18)]">
            <div className="developer-night pointer-events-none absolute inset-x-0 top-0 h-[34%]" />
            <div className="absolute top-[7%] right-[7%] h-[16%] w-[24%] rounded-sm bg-[#8fd3ff]/30 shadow-[inset_0_0_24px_rgba(140,200,255,0.4)]" />
            <p className="absolute top-[8%] left-[8%] font-[family-name:var(--font-ibm-plex-mono)] text-[10px] tracking-[0.2em] text-[#d8c9ae]/80 uppercase">
              SeeThrough loft · 11th floor
            </p>

            <Room x={8} y={6} label={`${AGENTS.ada.name}'s room`} />
            <Room x={32} y={6} label={`${AGENTS.byte.name}'s room`} />
            <Desk x={14} y={64} glow={agents.ada.phase === "working"} name={AGENTS.ada.name} />
            <Desk x={38} y={64} glow={agents.byte.phase === "working"} name={AGENTS.byte.name} />
            <PmBoard say={pmSay} />

            <AgentSprite agent={agents.ada} color={AGENTS.ada.hue} accent={AGENTS.ada.accent} />
            <AgentSprite agent={agents.byte} color={AGENTS.byte.hue} accent={AGENTS.byte.accent} />
            <PmSprite />
          </div>

          <aside className="flex max-h-[min(70vh,640px)] flex-col rounded-2xl border border-[#cbbfa8] bg-[#241c14] p-4 text-[#f3ead8]">
            <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[11px] tracking-[0.16em] text-[#d8c9ae] uppercase">
              Floor log
            </p>
            <ol className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
              {log.map((line) => (
                <li key={line.id} className="border-b border-white/8 pb-2 last:border-0">
                  <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[10px] text-[#a89474]">
                    {line.at}
                  </p>
                  <p className="text-[13px] leading-5 text-[#f3ead8]">{line.text}</p>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Room({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <div
      className="absolute h-[26%] w-[20%] rounded-md border border-[#8d7a5c] bg-[#d7c4a4]"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="absolute inset-x-[12%] top-[18%] h-[42%] rounded-sm bg-[#8a6a4a]/80" />
      <div className="absolute inset-x-[18%] top-[8%] h-[10%] rounded-full bg-[#cfc0a4]" />
      <p className="absolute inset-x-1 bottom-1 text-center font-[family-name:var(--font-ibm-plex-mono)] text-[9px] text-[#5c4e3a]">
        {label}
      </p>
    </div>
  );
}

function Desk({
  x,
  y,
  glow,
  name,
}: {
  x: number;
  y: number;
  glow: boolean;
  name: string;
}) {
  return (
    <div
      className="absolute h-[16%] w-[20%]"
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div className="absolute bottom-0 h-[46%] w-full rounded-[3px] bg-[#6b4f32] shadow-[0_3px_0_#4a3420]" />
      <div
        className={`absolute top-[4%] left-[22%] h-[42%] w-[56%] rounded-[3px] border border-[#1a2230] ${
          glow ? "developer-monitor" : "bg-[#1a2430]"
        }`}
      />
      <p className="absolute -bottom-4 left-0 font-[family-name:var(--font-ibm-plex-mono)] text-[9px] text-[#5c4e3a]">
        {name}
      </p>
    </div>
  );
}

function PmBoard({ say }: { say: string }) {
  return (
    <div className="absolute top-[42%] right-[4%] h-[36%] w-[24%] rounded-md border border-[#3a3f4a] bg-[#2b3038] p-2">
      <p className="font-[family-name:var(--font-ibm-plex-mono)] text-[9px] tracking-wide text-[#9aa3b0] uppercase">
        Brief · board
      </p>
      <p className="mt-2 line-clamp-4 font-[family-name:var(--font-ibm-plex-mono)] text-[11px] leading-4 text-[#e8edf2]">
        {say}
      </p>
    </div>
  );
}

function AgentSprite({
  agent,
  color,
  accent,
}: {
  agent: AgentView;
  color: string;
  accent: string;
}) {
  const sleeping = agent.phase === "sleeping";
  const reduced = prefersReducedMotion();
  return (
    <div
      className={`developer-agent absolute z-10 ${agent.walking ? "is-walking" : ""} ${
        sleeping ? "is-sleeping" : ""
      }`}
      style={{
        left: `${agent.pos.x}%`,
        top: `${agent.pos.y}%`,
        transform: "translate(-50%, -90%)",
        transition: reduced
          ? "none"
          : `left ${agent.walkMs}ms linear, top ${agent.walkMs}ms linear`,
      }}
    >
      {agent.say && !sleeping ? (
        <span className="pointer-events-none absolute bottom-[110%] left-1/2 w-max max-w-[9rem] -translate-x-1/2 rounded-md bg-[#241c14] px-2 py-1 text-center font-[family-name:var(--font-ibm-plex-mono)] text-[10px] leading-3 text-[#f3ead8]">
          {agent.say}
        </span>
      ) : null}
      {sleeping ? (
        <span className="developer-zzz absolute -top-5 left-4 font-[family-name:var(--font-fraunces)] text-[13px] text-[#5c4e3a]">
          zzz
        </span>
      ) : null}
      <div
        className="developer-body"
        style={{
          transform: sleeping
            ? "rotate(82deg) translate(10px, 4px)"
            : `scaleX(${agent.facing})`,
          transformOrigin: sleeping ? "70% 80%" : "50% 50%",
        }}
      >
        <svg width="36" height="58" viewBox="0 0 36 58" aria-hidden>
          <circle cx="18" cy="10" r="8" fill={accent} />
          <rect x="11" y="18" width="14" height="20" rx="4" fill={color} />
          <rect
            className="leg-a"
            x="12"
            y="38"
            width="4"
            height="16"
            rx="2"
            fill="#2a2218"
          />
          <rect
            className="leg-b"
            x="20"
            y="38"
            width="4"
            height="16"
            rx="2"
            fill="#2a2218"
          />
          {agent.phase === "working" ? (
            <rect x="24" y="26" width="8" height="3" rx="1" fill="#f3ead8" />
          ) : null}
        </svg>
      </div>
    </div>
  );
}

function PmSprite() {
  return (
    <div
      className="developer-agent absolute z-10"
      style={{
        left: `${SPOTS.pm.x}%`,
        top: `${SPOTS.pm.y}%`,
        transform: "translate(-50%, -90%)",
      }}
    >
      <svg width="38" height="62" viewBox="0 0 38 62" aria-hidden>
        <circle cx="19" cy="10" r="8" fill="#d8c9ae" />
        <rect x="11" y="18" width="16" height="22" rx="4" fill={PM.hue} />
        <rect x="17" y="22" width="4" height="10" fill="#c9a227" />
        <rect x="13" y="40" width="4" height="16" rx="2" fill="#1c1814" />
        <rect x="21" y="40" width="4" height="16" rx="2" fill="#1c1814" />
      </svg>
      <p className="absolute top-[100%] left-1/2 -translate-x-1/2 whitespace-nowrap font-[family-name:var(--font-ibm-plex-mono)] text-[9px] text-[#3a3f4a]">
        {PM.name}
      </p>
    </div>
  );
}
