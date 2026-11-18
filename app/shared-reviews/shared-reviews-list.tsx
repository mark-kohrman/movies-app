"use client";

import Link from "next/link";
import ReviewComments, {
  type ReviewComment,
} from "@/app/shared-reviews/review-comments";


type SharedReview = {
  user_id: string;
  username: string;
  movie_id: string;
  movie_title: string;
  movie_year: string;
  rating: number;
  review: string;
  updated_at: string;
  comments: ReviewComment[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

export default function SharedReviewsList({
  reviews,
  currentUserId,
}: {
  reviews: SharedReview[];
  currentUserId: string;
}) {
  return (
    <ul className="shared-reviews-list">
      {reviews.map((review) => (
        <li
          className="shared-review-card"
          key={`${review.user_id}-${review.movie_id}`}
        >
          <div className="shared-review-header">
            <div>
              <p className="eyebrow">
                {review.movie_year || "YEAR UNKNOWN"}
              </p>
              <h2>
                <Link href={`/movies/${encodeURIComponent(review.movie_id)}`}>
                  {review.movie_title}
                </Link>
              </h2>
              <p className="shared-review-author">Reviewed by {review.username}</p>
            </div>
            <p className="rating-card-score">
              <span aria-hidden="true">★</span> {review.rating.toFixed(1)}{" "}
              <span>/ 5.0</span>
            </p>
          </div>
          <p className="shared-review-body">{review.review}</p>
          <p className="rating-card-date">
            <time dateTime={review.updated_at}>
              Updated {formatDate(review.updated_at)}
            </time>
          </p>
          <ReviewComments
            canComment
            comments={review.comments}
            currentUserId={currentUserId}
            movieId={review.movie_id}
            movieTitle={review.movie_title}
            ratingUserId={review.user_id}
          />
        </li>
      ))}
    </ul>
  );
}
