import { BRAND } from "@/lib/constants";

export function FeedHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
        <span className="nz-serif text-xl font-black tracking-tight">
          {BRAND}
        </span>
        <span className="flex-1" />
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 to-rose-400 text-xs font-bold text-white">
          U
        </span>
      </div>
    </header>
  );
}

export function CardSkeleton() {
  return (
    <div className="nz-skeleton nz-card-shadow rounded-xl bg-white p-3.5">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-gray-200" />
        <div className="h-3 w-24 rounded bg-gray-200" />
      </div>
      <div className="mt-3 flex gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
          <div className="h-3 w-1/2 rounded bg-gray-100" />
        </div>
        <div className="h-20 w-28 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}
