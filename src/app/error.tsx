"use client";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-20">
      <h1 className="text-4xl">This page did not load</h1>
      <p className="mt-3 leading-relaxed text-muted">
        Try again. If it keeps happening, use Reset demo in the bar at the top to start from a fresh copy of the sample day. This demo needs cookies
        turned on to keep your copy separate from other visitors.
      </p>
      <button type="button" onClick={() => retry()} className="btn btn-primary mt-6">
        Try again
      </button>
    </main>
  );
}
