import {
  Binary,
  BookOpenText,
  Brain,
  FlaskConical,
  Globe2,
  Palette,
  ChartColumnIncreasing,
  Sigma,
} from "lucide-react";

const SUBJECTS = [
  {
    label: "Math",
    icon: Sigma,
    soft: "bg-[#ebe4f5] text-[#7c5cbf]",
  },
  {
    label: "Science",
    icon: FlaskConical,
    soft: "bg-[#dcebf7] text-[#1b6ca8]",
  },
  {
    label: "History",
    icon: Globe2,
    soft: "bg-[#e3f3ea] text-[#2a7a5c]",
  },
  {
    label: "Literature",
    icon: BookOpenText,
    soft: "bg-[#f7dce6] text-[#c45c7a]",
  },
  {
    label: "Economics",
    icon: ChartColumnIncreasing,
    soft: "bg-[#fff3d9] text-[#c49a1a]",
  },
  {
    label: "Computer Science",
    icon: Binary,
    soft: "bg-[#e4e0f5] text-[#5b4db0]",
  },
  {
    label: "Psychology",
    icon: Brain,
    soft: "bg-[#fde8e8] text-[#c45c4a]",
  },
  {
    label: "And more...",
    icon: Palette,
    soft: "bg-[#d9f0ec] text-[#2a8a7a]",
  },
] as const;

/** Subject grid: from class to curiosity. */
export function MarketingSubjectsSection() {
  return (
    <section
      id="subjects"
      className="scroll-mt-24 bg-[#fafbfc] px-5 py-16 md:px-6 md:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-[0.12em] text-[#1b6ca8] uppercase">
            Learn any subject
          </p>
          <h2 className="mt-3 font-display text-[2rem] leading-[1.15] font-medium tracking-[-0.03em] text-[#1a2b3c] sm:text-[2.4rem] md:text-[2.6rem]">
            From class to curiosity
          </h2>
          <p className="mt-3 text-[15px] leading-7 text-[#6a7d90] sm:text-[16px] sm:leading-8">
            Whether you&apos;re studying for an exam or just exploring something
            new, SeeThrough helps you learn it visually.
          </p>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-8 lg:gap-x-3">
          {SUBJECTS.map((subject) => {
            const Icon = subject.icon;
            return (
              <li
                key={subject.label}
                className="flex flex-col items-center text-center"
              >
                <span
                  className={`flex size-[4.5rem] items-center justify-center rounded-2xl sm:size-[4.75rem] ${subject.soft}`}
                >
                  <Icon className="size-7" strokeWidth={1.75} />
                </span>
                <p className="mt-3 text-[13.5px] font-medium tracking-[-0.01em] text-[#1a2b3c] sm:text-[14px]">
                  {subject.label}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
