import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Duravel</h1>
      <p className="max-w-xl text-lg text-zinc-600">
        Coach-level training programs for hybrid and endurance athletes —
        personalized to you, adaptive to your performance, and periodized to
        peak you for race day. For a fraction of a coach&apos;s price.
      </p>
      <Link
        href="/onboarding"
        className="rounded-full bg-black px-6 py-3 text-white transition-colors hover:bg-zinc-800"
      >
        Build your program
      </Link>
    </main>
  );
}
