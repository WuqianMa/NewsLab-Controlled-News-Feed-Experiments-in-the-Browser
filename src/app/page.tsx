import Link from "next/link";

const FUNCTIONS = [
  ["Design", "Experiments, conditions, consent, surveys"],
  ["Deliver", "Responsive feeds and article experiences"],
  ["Observe", "Sessions, checkpoints, and interaction events"],
  ["Export", "Structured CSV files and a data dictionary"],
];

export default function Home() {
  const publicDemo = process.env.PUBLIC_DEMO_MODE === "true";

  return (
    <main className="bg-[#0d1119] text-white">
      <section className="relative overflow-hidden bg-[#0d1119] pt-[94px] sm:h-[86svh] sm:min-h-[620px] sm:pt-0">
        <video
          className="relative aspect-video h-auto w-full object-contain sm:absolute sm:inset-0 sm:h-full"
          src="/demo/newslab-overview.mp4"
          poster="/demo/newslab-overview-poster.png"
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
          aria-label="NewsLab function tour"
        />

        <header className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-[#0d1119]/90 px-5 py-4 sm:px-8">
          <div className="flex items-baseline gap-3">
            <h1 className="text-xl font-bold">NewsLab</h1>
            <span className="text-xs text-gray-300">Research experiment prototype</span>
          </div>
          {publicDemo && (
            <span className="border border-amber-300/60 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">
              Read-only researcher demo
            </span>
          )}
        </header>

        <div className="relative z-10 flex flex-col gap-4 border-t border-white/15 bg-[#0d1119]/90 px-5 py-5 sm:absolute sm:inset-x-0 sm:bottom-14 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="max-w-2xl text-sm text-gray-200 sm:text-base">
            Configure controlled news-feed studies, run the participant flow,
            monitor sessions, and export structured records.
          </p>
          <nav className="flex flex-wrap gap-3" aria-label="Prototype entry points">
            <Link
              href="/admin"
              className="bg-[#5fd0bd] px-4 py-2 text-sm font-semibold text-[#0d1119] hover:bg-[#84e1d1]"
            >
              Researcher dashboard
            </Link>
            <Link
              href="/exp/demo-misinformation/welcome"
              className="border border-white/40 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Participant example
            </Link>
          </nav>
        </div>
      </section>

      <section className="bg-white px-5 py-8 text-gray-900 sm:px-8" aria-label="NewsLab workflow">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FUNCTIONS.map(([title, description], index) => (
            <div key={title} className="border-l-4 px-4" style={{ borderColor: ["#5fd0bd", "#f4c95d", "#ef7f6d", "#4059ad"][index] }}>
              <h2 className="text-sm font-bold">{title}</h2>
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
