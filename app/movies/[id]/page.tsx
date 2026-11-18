import { Suspense } from "react";
import { notFound } from "next/navigation";
import MovieContent from "@/app/movies/[id]/movie-content";

type MoviePageProps = {
  params: Promise<{ id: string }>;
};

function MovieLoading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="page-shell loading-state"
    >
      <span aria-hidden="true" className="loading-mark">
        ✳
      </span>
      <p>Loading movie details…</p>
    </main>
  );
}

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params;

  if (!/^tt\d+$/.test(id)) {
    notFound();
  }

  return (
    <Suspense fallback={<MovieLoading />}>
      <MovieContent id={id} />
    </Suspense>
  );
}
