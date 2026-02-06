import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function MarketingPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 p-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-orange-500 px-2 py-1 text-xs font-semibold text-white">
            MusicGenerator
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" className="cursor-pointer">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <Button asChild variant="outline" className="cursor-pointer">
            <Link href="/auth/sign-in">Sign in</Link>
          </Button>
          <Button asChild className="cursor-pointer">
            <Link href="/auth/sign-up">Try free</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center gap-8">
        <section className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Turn ideas into studio-quality tracks in minutes.
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
            Describe the vibe you want, paste your lyrics, or let AI write them
            for you. MusicGenerator turns your ideas into fully produced
            audio with cover art — ready to share or refine.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="cursor-pointer">
              <Link href="/auth/sign-up">Start generating for free</Link>
            </Button>
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg border bg-background p-4">
            <h2 className="text-sm font-semibold">Text-to-music</h2>
            <p className="text-muted-foreground mt-2 text-xs">
              Describe your track in natural language and get full songs back,
              powered by ACE-Step.
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <h2 className="text-sm font-semibold">Smart lyrics modes</h2>
            <p className="text-muted-foreground mt-2 text-xs">
              Bring your own lyrics or describe what you want and let the LLM
              draft them for you.
            </p>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <h2 className="text-sm font-semibold">Cover art, included</h2>
            <p className="text-muted-foreground mt-2 text-xs">
              Every song gets matching cover art so it looks as good as it
              sounds.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

