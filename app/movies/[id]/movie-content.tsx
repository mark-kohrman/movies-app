import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import MovieRatingForm from "@/app/movie-rating-form";
import SiteHeader from "@/app/site-header";
import { getMovieDetails, OmdbError } from "@/lib/omdb";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type MovieContentProps = {
  id: string;
};

type UserRating = {
  rating: number;
  review: string | null;
  is_private: boolean;
};

export default async function MovieContent({ id }: MovieContentProps) {
  let movie;
  try {
    movie = await getMovieDetails(id);
  } catch (error) {
    if (error instanceof OmdbError && error.status === 404) {
      notFound();
    }

    return (
      <main className="page-shell">
        <SiteHeader />
        <section className="detail-error" role="alert">
          <p className="eyebrow">A QUICK PAUSE</p>
          <h1>We couldn’t load this film.</h1>
          <p>
            {error instanceof Error
              ? error.message
              : "Something went wrong while loading movie details. Please try again."}
          </p>
          <Link className="back-link" href="/">
            <span aria-hidden="true">←</span> Back to search
          </Link>
        </section>
      </main>
    );
  }

  let userSignedIn = false;
  let userRating: UserRating | null = null;
  let ratingError = "";

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError && userError.name !== "AuthSessionMissingError") {
        throw userError;
      }

      if (userData.user) {
        userSignedIn = true;
        const { data, error } = await supabase
          .from("movie_ratings")
          .select("rating, review, is_private")
          .eq("user_id", userData.user.id)
          .eq("movie_id", movie.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        userRating = data;
      }
    } catch (error) {
      console.error("Could not load the user's rating for this movie", error);
      ratingError =
        "Your rating could not be loaded. Check that the movie ratings database setup has been applied, then try again.";
    }
  }

  return (
    <main className="page-shell">
      <SiteHeader
        action={
          <Link className="header-back-link" href="/">
            <span aria-hidden="true">←</span> Search movies
          </Link>
        }
      />

      <article className="movie-detail">
        <Link className="back-link" href="/">
          <span aria-hidden="true">←</span> Back to search
        </Link>
        <div className="detail-layout">
          <div className="detail-poster-wrap">
            {movie.posterUrl ? (
              <Image
                alt={`${movie.title} poster`}
                className="detail-poster"
                fill
                priority
                sizes="(max-width: 700px) 68vw, 340px"
                src={movie.posterUrl}
              />
            ) : (
              <div aria-label="No poster available" className="poster-fallback">
                <span aria-hidden="true">✳</span>
                <span>Poster unavailable</span>
              </div>
            )}
          </div>

          <div className="detail-copy">
            <p className="eyebrow">THE MOVIE, UP CLOSE</p>
            <h1>{movie.title}</h1>

            <div aria-label="Movie facts" className="detail-facts">
              {movie.year && <span>{movie.year}</span>}
              {movie.runtime && <span>{movie.runtime}</span>}
              {movie.rating !== null && (
                <span>
                  <span aria-hidden="true">★</span>{" "}
                  {movie.rating.toFixed(1)} / 10
                </span>
              )}
              {movie.rated && <span>{movie.rated}</span>}
            </div>

            {movie.genres.length > 0 && (
              <ul aria-label="Genres" className="genre-list">
                {movie.genres.map((genre) => (
                  <li key={genre}>{genre}</li>
                ))}
              </ul>
            )}

            <section aria-labelledby="overview-title" className="overview">
              <h2 id="overview-title">The story</h2>
              <p>
                {movie.plot || "An overview for this movie is not available yet."}
              </p>
            </section>

            {(movie.director || movie.actors || movie.released) && (
              <p className="original-title">
                {movie.director && <>Directed by {movie.director}</>}
                {movie.director && movie.released && " · "}
                {movie.released}
                {movie.actors && (
                  <>
                    <br />
                    Starring {movie.actors}
                  </>
                )}
              </p>
            )}

            {ratingError ? (
              <div className="notice rating-load-error" role="alert">
                <span aria-hidden="true">!</span>
                <p>{ratingError}</p>
              </div>
            ) : userSignedIn ? (
              <MovieRatingForm
                movieId={movie.id}
                isPrivate={userRating?.is_private ?? false}
                rating={userRating?.rating ?? null}
                review={userRating?.review ?? null}
              />
            ) : (
              <section
                aria-labelledby="sign-in-to-rate-title"
                className="rating-prompt"
              >
                <h2 id="sign-in-to-rate-title">Make it personal.</h2>
                <p>Sign in to rate this movie and write a review.</p>
                <Link className="ratings-search-link" href="/sign-in">
                  Sign in to rate
                </Link>
              </section>
            )}
          </div>
        </div>
      </article>

      <footer className="site-footer">
        <span>Made for movie people, by movie people.</span>
        <span>Movie data provided by OMDb.</span>
      </footer>
    </main>
  );
}
