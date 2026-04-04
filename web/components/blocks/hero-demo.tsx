import { Hero } from "@/components/blocks/hero";

function HeroDemo() {
  return (
    <Hero
      title="AI that works for you."
      subtitle="Transform your workflow with intelligent automation. Simple, powerful, reliable."
      actions={[
        {
          label: "Try Demo",
          href: "#",
          variant: "outline",
        },
        {
          label: "Start Free",
          href: "#",
          variant: "default",
        },
      ]}
      titleClassName="text-5xl font-extrabold md:text-6xl"
      subtitleClassName="max-w-[600px] text-lg md:text-xl"
      actionsClassName="mt-8"
    />
  );
}

export { HeroDemo };
