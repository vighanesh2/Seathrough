import { BookOpen, GraduationCap, Heart, Target } from "lucide-react";

const FEATURES = [
  {
    title: "Visual explanations",
    description: "Turn complex topics into simple visuals",
    icon: BookOpen,
    soft: "bg-[#dcebf7] text-[#1b6ca8]",
  },
  {
    title: "Personalized learning",
    description: "Adapts to your level and goals",
    icon: Target,
    soft: "bg-[#ebe4f5] text-[#7c5cbf]",
  },
  {
    title: "Practice & apply",
    description: "Quizzes, problems, and real examples",
    icon: GraduationCap,
    soft: "bg-[#e3f3ea] text-[#2a7a5c]",
  },
  {
    title: "Learn anything",
    description: "From math and science to history, business, and more",
    icon: Heart,
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
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex flex-col items-center text-center"
            >
              <span
                className={`flex size-14 items-center justify-center rounded-full ${feature.soft}`}
              >
                <Icon className="size-6" strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em] text-[#1a2b3c] sm:text-[18px]">
                {feature.title}
              </h3>
              <p className="mt-1.5 max-w-[16rem] text-[15px] leading-6 text-[#6a7d90] sm:text-[16px] sm:leading-7">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
