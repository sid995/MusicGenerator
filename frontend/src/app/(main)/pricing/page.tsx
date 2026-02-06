import Link from "next/link";
import { Button } from "~/components/ui/button";
import Upgrade from "~/components/sidebar/upgrade";

const tiers = [
  {
    name: "Free",
    description: "Try MusicGenerator with a small pool of credits.",
    price: "$0",
    credits: "10 credits / month",
    features: [
      "Short clips up to 60 seconds",
      "Email & password login",
      "Access to create & library",
    ],
  },
  {
    name: "Pro",
    description: "For creators who generate tracks regularly.",
    price: "From Polar",
    credits: "50+ credits / month",
    features: [
      "Up to 3 minutes per track",
      "Priority processing",
      "Commercial-friendly usage",
    ],
    highlight: true,
  },
  {
    name: "Studio",
    description: "High-volume tiers for studios and teams.",
    price: "From Polar",
    credits: "200+ credits / month",
    features: [
      "Up to 4 minutes per track",
      "Highest priority in the queue",
      "Best for studios & power users",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 p-6">
      <section className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Simple, credit-based pricing
        </h1>
        <p className="text-muted-foreground mt-3 text-sm md:text-base">
          Start free, then upgrade when you need more generations. Each song
          generation costs 1 credit.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`flex flex-col justify-between rounded-xl border bg-background p-5 shadow-sm ${tier.highlight ? "border-orange-400 shadow-md" : ""}`}
          >
            <div className="space-y-3">
              <h2 className="text-xl font-semibold">{tier.name}</h2>
              <p className="text-muted-foreground text-sm">
                {tier.description}
              </p>
              <p className="text-2xl font-bold">{tier.price}</p>
              <p className="text-muted-foreground text-xs">{tier.credits}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {tier.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {tier.name === "Free" ? (
                <Button asChild variant="outline" className="cursor-pointer">
                  <Link href="/auth/sign-up">Get started free</Link>
                </Button>
              ) : (
                <Upgrade />
              )}
            </div>
          </div>
        ))}
      </section>

      <p className="text-muted-foreground text-center text-xs">
        For custom needs or higher limits, contact us for a bespoke plan.
      </p>
    </div>
  );
}

