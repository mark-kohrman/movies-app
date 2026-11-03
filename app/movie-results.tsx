"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { MovieSummary } from "@/lib/omdb";

type PosterStatus = "checking" | "available" | "unavailable";

type MovieResultsProps = {
  movies: MovieSummary[];
};

function MovieCard({
  movie,
  status,
  onPosterLoad,
  onPosterError,
}: {
  movie: MovieSummary;
  status: PosterStatus;
  onPosterLoad: () => void;
  onPosterError: () => void;
}) {
  const hasPoster = status === "available";

  return (
    <li>
      <Link
        aria-label={`View details for ${movie.title}`}
        className="movie-card"
        href={`/movies/${encodeURIComponent(movie.id)}`}
      >
        <div className="poster-wrap">
          {hasPoster && movie.posterUrl ? (
            <Image
              alt={`${movie.title} poster`}
              className="poster"
              fill
              onError={onPosterError}
              onLoad={onPosterLoad}
              sizes="(max-width: 560px) 42vw, (max-width: 900px) 28vw, 220px"
              src={movie.posterUrl}
              unoptimized
            />
          ) : (
            <div aria-label="No poster available" className="poster-fallback">
              <span aria-hidden="true">✳</span>
              <span>Poster unavailable</span>
            </div>
          )}
          {hasPoster && (
            <span className="poster-link-label">
              View film <span aria-hidden="true">↗</span>
            </span>
          )}
        </div>
        <div className="movie-card-copy">
          <h3>{movie.title}</h3>
          <p>
            {movie.year || "Release year unknown"}
            {movie.rating !== null && (
              <span className="movie-rating">
                <span aria-hidden="true">★</span> {movie.rating.toFixed(1)}
              </span>
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}

export default function MovieResults({ movies }: MovieResultsProps) {
  const [posterStatuses, setPosterStatuses] = useState<
    Record<string, PosterStatus>
  >(() =>
    Object.fromEntries(
      movies.map((movie) => [
        movie.id,
        movie.posterUrl ? "checking" : "unavailable",
      ]),
    ),
  );
  const [showUnavailable, setShowUnavailable] = useState(false);

  function setPosterStatus(movieId: string, status: PosterStatus) {
    setPosterStatuses((current) =>
      current[movieId] === status
        ? current
        : { ...current, [movieId]: status },
    );
  }

  const visibleMovies = movies.filter(
    (movie) => posterStatuses[movie.id] === "available",
  );
  const unavailableMovies = movies.filter(
    (movie) => posterStatuses[movie.id] === "unavailable",
  );
  const checkingCount = movies.filter(
    (movie) => posterStatuses[movie.id] === "checking",
  ).length;

  return (
    <>
      <div aria-hidden="true" className="poster-probes">
        {movies.map((movie) =>
          posterStatuses[movie.id] === "checking" && movie.posterUrl ? (
            <Image
              key={movie.id}
              alt=""
              height={1}
              onError={() => setPosterStatus(movie.id, "unavailable")}
              onLoad={() => setPosterStatus(movie.id, "available")}
              src={movie.posterUrl}
              unoptimized
              width={1}
            />
          ) : null,
        )}
      </div>
      <div aria-live="polite" className="results-toolbar">
        <span className="result-count">
          {checkingCount > 0
            ? `${visibleMovies.length} ${visibleMovies.length === 1 ? "poster" : "posters"} found`
            : `${visibleMovies.length} ${visibleMovies.length === 1 ? "movie" : "movies"} with posters`}
        </span>
      </div>

      {visibleMovies.length > 0 && (
        <ul className="movie-grid">
          {visibleMovies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onPosterError={() => setPosterStatus(movie.id, "unavailable")}
              onPosterLoad={() => setPosterStatus(movie.id, "available")}
              status="available"
            />
          ))}
        </ul>
      )}

      {checkingCount > 0 && visibleMovies.length === 0 && (
        <p aria-live="polite" className="empty-copy">
          Checking poster availability…
        </p>
      )}

      {checkingCount === 0 && visibleMovies.length === 0 && (
        <p className="empty-copy">No posters are available for this search.</p>
      )}

      {unavailableMovies.length > 0 && (
        <div className="unavailable-results">
          <button
            aria-expanded={showUnavailable}
            className="view-more-button"
            onClick={() => setShowUnavailable((show) => !show)}
            type="button"
          >
            {showUnavailable ? "Show less" : "View more"}
            {!showUnavailable && ` (${unavailableMovies.length})`}
          </button>
          {showUnavailable && (
            <ul className="movie-grid unavailable-grid">
              {unavailableMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onPosterError={() => setPosterStatus(movie.id, "unavailable")}
                  onPosterLoad={() => setPosterStatus(movie.id, "available")}
                  status="unavailable"
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
