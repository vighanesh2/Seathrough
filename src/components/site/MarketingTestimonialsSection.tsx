import { UserRound } from "lucide-react";

const QUOTES = [
  {
    quote:
      "SeeThrough turned my confusing lecture notes into visuals that actually made sense. It's a game changer.",
    name: "Alex R.",
    role: "College Student",
  },
  {
    quote:
      "I finally understand concepts that used to take me hours to figure out. The diagrams are incredible.",
    name: "Priya S.",
    role: "High School Student",
  },
  {
    quote:
      "As a teacher, I use SeeThrough to create quick visuals for my lessons. My students are way more engaged.",
    name: "Mr. Thompson",
    role: "High School Teacher",
  },
] as const;

/** Three-up social proof strip. Copy is illustrative. */
export function MarketingTestimonialsSection() {
  return (
    <section className="bg-[#eef5fb] px-5 py-16 md:px-6 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold tracking-[0.12em] text-[#1b6ca8] uppercase">
            Loved by learners
          </p>
          <h2 className="mt-3 font-display text-[2rem] leading-[1.15] font-medium tracking-[-0.03em] text-[#1a2b3c] sm:text-[2.4rem] md:text-[2.6rem]">
            Real students, real progress
          </h2>
        </div>

        <ul className="mt-12 grid gap-5 md:grid-cols-3">
          {QUOTES.map((item) => (
            <li
              key={item.name}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_12px_40px_-28px_rgba(26,43,60,0.28)] sm:p-7"
            >
              <p className="flex-1 text-[15px] leading-7 text-[#1a2b3c]">
                &ldquo;{item.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#dcebf7] text-[#1b6ca8]">
                  <UserRound className="size-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="text-[14px] font-semibold tracking-[-0.01em] text-[#1a2b3c]">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-[13px] text-[#6a7d90]">{item.role}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
