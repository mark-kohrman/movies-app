"use client";

import { useActionState, useState } from "react";
import {
  saveMovieRating,
  type RatingFormState,
} from "@/app/actions/ratings";

const initialState: RatingFormState = {};
const ratingOptions = Array.from({ length: 51 }, (_, index) =>
  ((50 - index) / 10).toFixed(1),
);

type MovieRatingFormProps = {
  movieId: string;
  rating: number | null;
  review: string | null;
  isPrivate: boolean;
};

export default function MovieRatingForm({
  movieId,
  rating,
  review,
  isPrivate,
}: MovieRatingFormProps) {
  const [isEditing, setIsEditing] = useState(rating === null);
  const [state, formAction, pending] = useActionState(
    async (previousState: RatingFormState, formData: FormData) => {
      const result = await saveMovieRating(previousState, formData);

      if (result.rating !== undefined) {
        setIsEditing(false);
      }

      return result;
    },
    initialState,
  );
  const savedRating = state.rating ?? rating;
  const savedReview = state.rating === undefined ? review : state.review;
  const savedPrivacy =
    state.isPrivate === undefined ? isPrivate : state.isPrivate;

  return (
    <section aria-labelledby="your-rating-title" className="rating-editor">
      {savedRating !== null && !isEditing ? (
        <>
          <h2 id="your-rating-title">Your rating</h2>
          <p className="saved-rating-score">
            <span aria-hidden="true">★</span> {savedRating.toFixed(1)}{" "}
            <span>/ 5.0</span>
          </p>
          <p className="saved-rating-review">
            {savedReview || "No review written."}
          </p>
          <p className="saved-rating-privacy">
            {savedPrivacy
              ? "Private — only you can see this review."
              : "Shared with your connections."}
          </p>
          {state.success && (
            <p aria-live="polite" className="rating-form-success" role="status">
              {state.success}
            </p>
          )}
          <button
            className="rating-edit-button"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            Edit
          </button>
        </>
      ) : (
        <>
          <h2 id="your-rating-title">
            {savedRating === null ? "Your rating" : "Update your rating"}
          </h2>
          <p className="rating-editor-copy">
            Use the Peter Meter below to rate from 0.0 to 5.0 and add a review if you like.
          </p>
          <form action={formAction} className="rating-form">
            <input name="movieId" type="hidden" value={movieId} />
            <label className="rating-field" htmlFor="movie-rating">
              Rating
              <select
                defaultValue={savedRating === null ? "5.0" : savedRating.toFixed(1)}
                id="movie-rating"
                name="rating"
                required
              >
                {ratingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="rating-field" htmlFor="movie-review">
              Review
              <textarea
                defaultValue={savedReview ?? ""}
                id="movie-review"
                maxLength={5000}
                name="review"
                placeholder="What did you think?"
                rows={5}
              />
            </label>
            <label className="rating-privacy-field">
              <input
                defaultChecked={savedPrivacy}
                name="isPrivate"
                type="checkbox"
              />
              <span>
                <strong>Keep this review private</strong>
                <span>
                  Only you can see a private review. Otherwise, your connected
                  friends can read and comment on it.
                </span>
              </span>
            </label>
            {state.error && (
              <p aria-live="polite" className="rating-form-error" role="alert">
                {state.error}
              </p>
            )}
            <button className="rating-submit" disabled={pending} type="submit">
              {pending ? "Saving…" : "Save rating"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
