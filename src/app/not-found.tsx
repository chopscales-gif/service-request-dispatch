import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16">
      <h1 className="text-3xl font-bold">That page is not here</h1>
      <p className="mt-3 leading-relaxed text-muted">If you followed a link to a job or a visit, it belonged to a copy of the demo that has since been reset.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Open the board
      </Link>
    </main>
  );
}
