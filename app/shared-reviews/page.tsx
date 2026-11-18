import Link from "next/link";
import { connection } from "next/server";
import SharedReviewsList from "@/app/shared-reviews/shared-reviews-list";
import SiteHeader from "@/app/site-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type SharedReview = {
  user_id: string;
  username: string;
  movie_id: string;
  movie_title: string;
  movie_year: string;
  rating: number;
  review: string;
  updated_at: string;
  comments: {
    id: string;
    user_id: string;
    username: string;
    body: string;
    created_at: string;
  }[];
};

export default async function SharedReviewsPage() {
  await connection();

  let currentUserId = "";
  let signedIn = false;
  let reviews: SharedReview[] = [];
  let errorMessage = "";

  if (!isSupabaseConfigured()) {
    errorMessage =
      "Shared reviews are unavailable because Supabase is not configured.";
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
        const { data, error } = await supabase.rpc(
          "list_shared_movie_reviews",
        );

        if (error) {
          throw error;
        }

        reviews = data;
      }
    } catch (error) {
      console.error("Could not load shared movie reviews", error);
      errorMessage =
        "Shared reviews could not be loaded. Run the social reviews SQL setup in Supabase, then try again.";
    }
  }

  return (
    <main className="page-shell">
      <SiteHeader note="Your movie corner" />
      <section aria-labelledby="shared-reviews-title" className="ratings-page">
        <p className="eyebrow">GOOD MOVIES, SHARED</p>
        <h1 id="shared-reviews-title">Shared reviews</h1>
        <p className="ratings-page-copy">
          Reviews from your connections. Join the conversation with a comment.
        </p>

        {errorMessage ? (
          <div className="notice ratings-notice" role="alert">
            <span aria-hidden="true">!</span>
            <p>{errorMessage}</p>
          </div>
        ) : !signedIn ? (
          <div className="ratings-empty">
            <h2>Sign in to see shared reviews.</h2>
            <p>Connect with friends to share reviews and leave comments.</p>
            <Link className="ratings-search-link" href="/sign-in">
              Sign in
            </Link>
          </div>
        ) : reviews.length ? (
          <SharedReviewsList
            currentUserId={currentUserId}
            reviews={reviews}
          />
        ) : (
          <div className="ratings-empty">
            <h2>No shared reviews yet.</h2>
            <p>
              Connect with friends and they can share reviews from their movie
              pages.
            </p>
            <Link className="ratings-search-link" href="/connections">
              Manage connections
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
