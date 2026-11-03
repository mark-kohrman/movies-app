import Link from "next/link";
import MovieResults from "@/app/movie-results";
import { searchMovies, type MovieSummary } from "@/lib/omdb";

type HomeProps = {
  searchParams: Promise<{ query?: string | string[] }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const query = typeof params.query === "string" ? params.query.trim() : "";
  let movies: MovieSummary[] = [];
  let errorMessage = "";

  if (query) {
    try {
      movies = await searchMovies(query);
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : "Something went wrong while searching. Please try again.";
    }
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link aria-label="Rotten Peters home" className="wordmark" href="/">
          <span aria-hidden="true" className="wordmark-icon">
            R
          </span>
          <span>rotten peters</span>
        </Link>
        <span className="header-note">A place for people who love movies</span>
      </header>

      <section aria-labelledby="search-title" className="hero">
        <p className="eyebrow">
          <span aria-hidden="true" className="eyebrow-star">
            ✳
          </span>
          YOUR NEXT GREAT WATCH STARTS HERE
        </p>
        <h1 id="search-title">
          Every movie has
          <br />
          <span>a story.</span> Find yours.
        </h1>
        <p className="hero-copy">
          Search the movies you love, then find out what everyone thinks.
        </p>
        <form action="/" className="search-form" role="search">
          <label className="visually-hidden" htmlFor="movie-search">
            Search movies by title
          </label>
          <span aria-hidden="true" className="search-icon">
            ⌕
          </span>
          <input
            autoComplete="off"
            defaultValue={query}
            id="movie-search"
            name="query"
            placeholder="Try “Pulp Fiction”"
            type="search"
          />
          <button type="submit">Find a film</button>
        </form>
        <p className="search-hint">Search by movie title</p>
      </section>

      <section aria-live="polite" className="results-section">
        {query ? (
          <>
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE BIG SCREEN, AT YOUR FINGERTIPS</p>
                <h2>
                  {errorMessage
                    ? "Search unavailable"
                    : movies.length
                      ? `Results for “${query}”`
                      : `No movies found for “${query}”`}
                </h2>
              </div>
            </div>

            {errorMessage ? (
              <div className="notice" role="alert">
                <span aria-hidden="true">!</span>
                <p>{errorMessage}</p>
              </div>
            ) : movies.length ? (
              <MovieResults key={query} movies={movies} />
            ) : (
              <p className="empty-copy">
                Check the spelling or try a different title.
              </p>
            )}
          </>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true" className="empty-state-mark">
              ✳
            </span>
            <div>
              <p className="eyebrow">A LITTLE MOVIE MAGIC</p>
              <h2>What are you in the mood for?</h2>
              <p>Search a title above to discover a film and explore its details.</p>
            </div>
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span>Made for movie people, by movie people.</span>
        <span>
          Movie data provided by OMDb.
        </span>
      </footer>
    </main>
  );
}
