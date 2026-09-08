const FEATURES = [
  {
    title: "Visual explanations",
    description: "Turn complex topics into simple visuals",
    iconUrl:
      "https://api.iconify.design/ph/presentation-chart.svg?color=%231b6ca8",
    soft: "bg-[#dcebf7] text-[#1b6ca8]",
  },
  {
    title: "Personalized learning",
    description: "Adapts to your level and goals",
    iconUrl: "https://api.iconify.design/ph/user-focus.svg?color=%237c5cbf",
    soft: "bg-[#ebe4f5] text-[#7c5cbf]",
  },
  {
    title: "Practice & apply",
    description: "Quizzes, problems, and real examples",
    iconUrl: "https://api.iconify.design/ph/exam.svg?color=%232a7a5c",
    soft: "bg-[#e3f3ea] text-[#2a7a5c]",
  },
  {
    title: "Learn anything",
    description: "From math and science to history, business, and more",
    iconUrl: "https://api.iconify.design/ph/globe-hemisphere-west.svg?color=%23c45c4a",
    soft: "bg-[#fde8e8] text-[#c45c4a]",
  },
] as const;

/** Four-up feature strip under the hero. */
export function MarketingFeaturesSection() {
  return (
    <section
      id="features"
      className="relative z-10 scroll-mt-24 bg-white px-5 py-14 md:px-6 md:py-16"
    >
      <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center text-center"
            >
              <span
                className={`flex size-14 items-center justify-center rounded-full ${feature.soft}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- icon is served by Iconify */}
                <img
                  src={feature.iconUrl}
                  alt=""
                  aria-hidden="true"
                  className="size-7"
                />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-[#1a2b3c] sm:text-[18px]">
                {feature.title}
              </h3>
              <p className="mt-1.5 max-w-[16rem] text-[15px] leading-6 text-[#6a7d90] sm:text-[16px] sm:leading-7">
                {feature.description}
              </p>
            </div>
          ))}
      </div>
    </section>
  );
}
