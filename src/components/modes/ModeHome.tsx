import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { listEnabledModes } from "@/modes/registry";
import type { ModeDefinition } from "@/modes/types";
import { BrandMark } from "@/components/lms/BrandMark";
import { MODE_UI } from "@/components/lms/modeUi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ModeCard({
  mode,
  featured = false,
}: {
  mode: ModeDefinition;
  featured?: boolean;
}) {
  const ui = MODE_UI[mode.id];
  const Icon = ui.icon;

  return (
    <Link href={mode.href} className="group block h-full outline-none">
      <Card
        className={`h-full transition duration-200 ring-foreground/8 group-hover:-translate-y-0.5 group-hover:ring-accent/30 group-focus-visible:ring-3 group-focus-visible:ring-ring/50 ${
          featured ? "bg-accent-soft/40" : ""
        }`}
      >
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent-deep">
              <Icon className="size-5" />
            </span>
            {mode.badge ? (
              <Badge variant="secondary" className="capitalize">
                {mode.badge}
              </Badge>
            ) : featured ? (
              <Badge>Start here</Badge>
            ) : null}
          </div>
          <CardTitle className="text-lg">{mode.title}</CardTitle>
          <CardDescription className="text-pretty leading-relaxed">
            {ui.hint}
          </CardDescription>
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent-deep">
            Open
            <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
          </p>
        </CardHeader>
      </Card>
    </Link>
  );
}

/**
 * Student home: one obvious start, then the rest as course-style cards.
 */
export function ModeHome() {
  const learning = listEnabledModes("learning");
  const tools = listEnabledModes("tool");
  const primary = learning.find((m) => m.id === "lessons") ?? learning[0];
  const others = learning.filter((m) => m.id !== primary?.id);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur-md md:px-8">
        <BrandMark />
        {primary ? (
          <Button asChild>
            <Link href={primary.href}>
              Ask a question
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : null}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 md:px-8 md:py-12">
          <section className="max-w-xl">
            <p className="text-sm font-medium text-accent">For college students</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Stuck on homework?
            </h1>
            <p className="mt-3 text-base leading-relaxed text-ink-soft md:text-lg">
              Ask it, upload a photo, or pick a study tool. We’ll draw the
              explanation on a whiteboard — like a tutor sitting next to you.
            </p>
            {primary ? (
              <Button asChild size="lg" className="mt-6">
                <Link href={primary.href}>
                  Start a lesson
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : null}
          </section>

          <section>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted">
              Study
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {primary ? <ModeCard mode={primary} featured /> : null}
              {others.map((mode) => (
                <ModeCard key={mode.id} mode={mode} />
              ))}
            </div>
          </section>

          {tools.length > 0 ? (
            <section className="pb-8">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-muted">
                Labs
              </h2>
              <ul className="flex flex-wrap gap-2">
                {tools.map((mode) => {
                  const Icon = MODE_UI[mode.id].icon;
                  return (
                    <li key={mode.id}>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={mode.href}>
                          <Icon className="size-3.5" />
                          {mode.title}
                        </Link>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
