import Link from "next/link";
import { connection } from "next/server";
import RatingsDisplay from "@/app/my-ratings/ratings-display";
import SiteHeader from "@/app/site-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type SavedRating = {
  movie_id: string;
  movie_title: string;
  movie_year: string;
  rating: number;
  review: string | null;
  is_private: boolean;
  updated_at: string;
  comments: {
    id: string;
    user_id: string;
    username: string;
    body: string;
    created_at: string;
  }[];
};

export default async function MyRatingsPage() {
  await connection();

  let ratings: SavedRating[] = [];
  let signedIn = false;
  let currentUserId = "";
  let errorMessage = "";

  if (!isSupabaseConfigured()) {
    errorMessage =
      "Ratings are unavailable because Supabase is not configured for this app.";
  } else {
    try {
      const supabase = await createClient();
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError && userError.name !== "AuthSessionMissingError") {
        throw userError;
      }

      if (userData.user) {
        signedIn = true;
        currentUserId = userData.user.id;
        const { data, error } = await supabase.rpc("list_my_movie_ratings");

        if (error) {
          throw error;
        }

        ratings = data;
      }
    } catch (error) {
      console.error("Could not load the user's movie ratings", error);
      errorMessage =
        "Your ratings could not be loaded. Run the movie ratings and social reviews SQL setup in Supabase, then try again.";
    }
  }

  return (
    <main className="page-shell">
      <SiteHeader note="Your movie corner" />
      <section aria-labelledby="my-ratings-title" className="ratings-page">
        <p className="eyebrow">YOUR MOVIE JOURNAL</p>
        <h1 id="my-ratings-title">My ratings</h1>
        <p className="ratings-page-copy">
          Every film you’ve rated, all in one place.
        </p>

        {errorMessage ? (
          <div className="notice ratings-notice" role="alert">
            <span aria-hidden="true">!</span>
            <p>{errorMessage}</p>
          </div>
        ) : !signedIn ? (
          <div className="ratings-empty">
            <h2>Sign in to see your movie journal.</h2>
            <p>Your ratings and reviews will be waiting here.</p>
            <Link className="ratings-search-link" href="/sign-in">
              Sign in
            </Link>
          </div>
        ) : ratings.length ? (
          <RatingsDisplay currentUserId={currentUserId} ratings={ratings} />
        ) : (
          <div className="ratings-empty">
            <h2>Your movie journal is just getting started.</h2>
            <p>Search for a film and leave your first rating or review.</p>
            <Link className="ratings-search-link" href="/">
              Find a film
            </Link>
          </div>
        )}
      </section>
      <footer className="site-footer">
        <span>Made for movie people, by movie people.</span>
        <span>Movie data provided by OMDb.</span>
      </footer>
    </main>
  );
}
