"use server";

import { revalidatePath } from "next/cache";
import { getMovieDetails } from "@/lib/omdb";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type RatingFormState = {
  error?: string;
  success?: string;
  rating?: number;
  review?: string | null;
  isPrivate?: boolean;
};

export async function saveMovieRating(
  _previousState: RatingFormState,
  formData: FormData,
): Promise<RatingFormState> {
  const movieId = formData.get("movieId");
  const ratingValue = formData.get("rating");
  const reviewValue = formData.get("review");
  const isPrivate = formData.get("isPrivate") === "on";

  if (typeof movieId !== "string" || !/^tt\d+$/.test(movieId)) {
    return { error: "This movie could not be identified. Please try again." };
  }

  if (
    typeof ratingValue !== "string" ||
    !/^(?:[0-4](?:\.\d)?|5(?:\.0)?)$/.test(ratingValue)
  ) {
    return { error: "Choose a rating from 0.0 to 5.0." };
  }

  if (typeof reviewValue !== "string" || reviewValue.length > 5000) {
    return { error: "Reviews must be 5,000 characters or fewer." };
  }

  if (!isSupabaseConfigured()) {
    return { error: "Ratings are unavailable because Supabase is not configured." };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError && userError.name !== "AuthSessionMissingError") {
    console.error(
      "Could not verify the user before saving a movie rating",
      userError,
    );
    return { error: "We couldn’t verify your account. Please try again." };
  }

  if (!userData.user) {
    return { error: "Please sign in before saving a rating." };
  }

  let movie;
  try {
    movie = await getMovieDetails(movieId);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "We couldn’t verify this movie. Please try again.",
    };
  }

  const { error } = await supabase.from("movie_ratings").upsert(
    {
      user_id: userData.user.id,
      movie_id: movie.id,
      movie_title: movie.title,
      movie_year: movie.year,
      poster_url: movie.posterUrl,
      rating: Number(ratingValue),
      review: reviewValue.trim() || null,
      is_private: isPrivate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,movie_id" },
  );

  if (error) {
    console.error("Could not save the user's movie rating", error);
    return {
      error:
        "Your rating could not be saved. Check that the movie ratings database setup has been applied, then try again.",
    };
  }

  revalidatePath("/my-ratings");
  revalidatePath(`/movies/${movieId}`);

  return {
    success: "Your rating and review have been saved.",
    rating: Number(ratingValue),
    review: reviewValue.trim() || null,
    isPrivate,
  };
}
