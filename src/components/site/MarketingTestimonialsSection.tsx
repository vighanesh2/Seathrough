import { cn } from "@/lib/utils";

/**
 * Testimonials — Gamma visual hierarchy, Linear polish, Perplexity calm.
 * Copy is illustrative (not attributed to real people).
 */
const FEATURED = {
  quote:
    "I finally stopped rereading the same paragraph. The board draws the step while it’s explained, so the idea sticks.",
  name: "Maya Ellison",
  role: "Calc II student · Austin",
  initials: "ME",
} as const;

const GRID = [
  {
    quote:
      "Spinning the heart and tapping a chamber beats any flat diagram I’ve used for tutoring.",
    name: "Jordan Hale",
    role: "Anatomy tutor · Chicago",
    initials: "JH",
    tone: "soft" as const,
  },
  {
    quote:
      "Feels closer to a quiet study desk than another chatbot. One prompt, and the visual just shows up.",
    name: "Priya Nandakumar",
    role: "Self-taught CS · Seattle",
    initials: "PN",
    tone: "ink" as const,
  },
  {
    quote:
      "The 3D scenes make orbital motion obvious in a way slides never did.",
    name: "Sam Rivera",
    role: "Physics major · Boston",
    initials: "SR",
    tone: "ink" as const,
  },
  {
    quote:
      "Derivatives finally clicked when I saw the slope change on the board instead of a formula sheet.",
    name: "Noah Park",
    role: "High school senior · Portland",
    initials: "NP",
    tone: "soft" as const,
  },
  {
    quote:
      "Clean enough that I don’t get lost in chrome. I ask, watch it draw, and move on.",
    name: "Elena Vogt",
    role: "Pre-med · Denver",
    initials: "EV",
    tone: "soft" as const,
  },
] as const;

export function MarketingTestimonialsSection() {
  return (
    <section className="relative overflow-hidden px-5 py-16 md:px-6 md:py-24">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_50%_0%,rgba(27,108,168,0.1),transparent_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[12px] font-medium tracking-[0.08em] text-[#8a9aab] uppercase">
            From learners
          </p>
          <h2 className="mt-2 text-[1.75rem] leading-tight font-medium tracking-[-0.03em] text-[#1a2b3c] md:text-[2.35rem]">
            People who learn by seeing it drawn.
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-[#6a7d90]">
            Short notes from students and tutors who use SeeThrough to make hard
            ideas visual.
          </p>
        </div>

        {/* Featured pull-quote */}
        <figure
          className="animate-fade-up group relative mt-12 overflow-hidden rounded-[1.75rem] border border-[#dce6ef] bg-white p-7 shadow-[0_20px_50px_-28px_rgba(26,43,60,0.28)] sm:p-10 md:p-12"
        >
          <div
            className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[radial-gradient(circle,rgba(27,108,168,0.14),transparent_68%)] transition duration-500 group-hover:scale-110"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-[radial-gradient(circle,rgba(212,232,246,0.9),transparent_70%)]"
            aria-hidden
          />
          <span
            className="font-display relative block text-[4.5rem] leading-none text-[#1b6ca8]/20 select-none md:text-[6rem]"
            aria-hidden
          >
            “
          </span>
          <blockquote className="relative -mt-8 max-w-3xl font-display text-[1.45rem] leading-[1.35] font-medium tracking-tight text-[#1a2b3c] sm:text-[1.75rem] md:text-[2rem]">
            {FEATURED.quote}
          </blockquote>
          <figcaption className="relative mt-8 flex items-center gap-3">
            <Avatar initials={FEATURED.initials} size="lg" />
            <div>
              <p className="text-[14.5px] font-medium tracking-[-0.01em] text-[#1a2b3c]">
                {FEATURED.name}
              </p>
              <p className="mt-0.5 text-[13px] text-[#6a7d90]">{FEATURED.role}</p>
            </div>
          </figcaption>
        </figure>

        {/* Bento grid */}
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {GRID.map((item, index) => {
            const wide = index === 0 || index === 3;
            return (
              <li
                key={item.name}
                className={cn(
                  "animate-fade-up",
                  wide ? "sm:col-span-2 lg:col-span-3" : "lg:col-span-2",
                )}
                style={{ animationDelay: `${120 + index * 55}ms` }}
              >
                <QuoteTile {...item} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function QuoteTile({
  quote,
  name,
  role,
  initials,
  tone,
}: {
  quote: string;
  name: string;
  role: string;
  initials: string;
  tone: "soft" | "ink";
}) {
  return (
    <figure
      className={cn(
        "group flex h-full flex-col justify-between overflow-hidden rounded-2xl border p-5 transition duration-300 sm:p-6",
        "hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(26,43,60,0.28)]",
        tone === "ink"
          ? "border-[#1a2b3c]/90 bg-[#1a2b3c] text-white shadow-[0_16px_40px_-28px_rgba(26,43,60,0.55)] hover:border-[#1b6ca8]"
          : "border-[#e6ebf0] bg-white/90 backdrop-blur-sm hover:border-[#c8d6e4]",
      )}
    >
      <blockquote
        className={cn(
          "text-[15px] leading-7 tracking-[-0.01em] sm:text-[15.5px]",
          tone === "ink" ? "text-white/92" : "text-[#1a2b3c]",
        )}
      >
        “{quote}”
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <Avatar initials={initials} tone={tone} />
        <div className="min-w-0">
          <p
            className={cn(
              "truncate text-[13.5px] font-medium tracking-[-0.01em]",
              tone === "ink" ? "text-white" : "text-[#1a2b3c]",
            )}
          >
            {name}
          </p>
          <p
            className={cn(
              "truncate text-[12.5px]",
              tone === "ink" ? "text-white/55" : "text-[#6a7d90]",
            )}
          >
            {role}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

function Avatar({
  initials,
  size = "md",
  tone = "soft",
}: {
  initials: string;
  size?: "md" | "lg";
  tone?: "soft" | "ink";
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-sans font-semibold tracking-[-0.02em] transition",
        size === "lg" ? "size-11 text-[13px]" : "size-9 text-[11.5px]",
        tone === "ink"
          ? "bg-white/12 text-white ring-1 ring-white/15"
          : "bg-[#eef4f9] text-[#1b6ca8] ring-1 ring-[#1b6ca8]/12 group-hover:bg-[#d4e8f6]",
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
