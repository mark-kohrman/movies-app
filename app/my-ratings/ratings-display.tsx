"use client";

import Link from "next/link";
import { useState } from "react";
import ReviewComments, {
  type ReviewComment,
} from "@/app/shared-reviews/review-comments";

type SavedRating = {
  movie_id: string;
  movie_title: string;
  movie_year: string;
  rating: number;
  review: string | null;
  is_private: boolean;
  updated_at: string;
  comments: ReviewComment[];
};

function formatRatedDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

export default function RatingsDisplay({
  ratings,
  currentUserId,
}: {
  ratings: SavedRating[];
  currentUserId: string;
}) {
  const [view, setView] = useState<"cards" | "table">("table");

  return (
    <>
      <div aria-label="Ratings view" className="ratings-view-toggle" role="group">
        <button
          aria-pressed={view === "table"}
          className="ratings-view-button"
          onClick={() => setView("table")}
          type="button"
        >
          Table
        </button>
        <button
          aria-pressed={view === "cards"}
          className="ratings-view-button"
          onClick={() => setView("cards")}
          type="button"
        >
          Cards
        </button>
      </div>

      {view === "cards" ? (
        <ul className="ratings-list">
          {ratings.map((item) => (
            <li className="rating-card" key={item.movie_id}>
              <div className="rating-card-copy">
                <p className="eyebrow">{item.movie_year || "YEAR UNKNOWN"}</p>
                <h2>
                  <Link href={`/movies/${encodeURIComponent(item.movie_id)}`}>
                    {item.movie_title}
                  </Link>
                </h2>
                <p className="rating-card-score">
                  <span aria-hidden="true">★</span> {item.rating.toFixed(1)}{" "}
                  <span>/ 5.0</span>
                </p>
                <p className="rating-privacy-badge">
                  {item.is_private ? "Private" : "Shared with connections"}
                </p>
                {item.review && (
                  <p className="rating-card-review">{item.review}</p>
                )}
                <p className="rating-card-date">
                  <time dateTime={item.updated_at}>
                    Rated on {formatRatedDate(item.updated_at)}
                  </time>
                </p>
                {item.comments.length > 0 && (
                  <ReviewComments
                    canComment={false}
                    comments={item.comments}
                    currentUserId={currentUserId}
                    movieId={item.movie_id}
                    movieTitle={item.movie_title}
                    ratingUserId={currentUserId}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div
          aria-label="My ratings table"
          className="ratings-table-scroll"
          role="region"
          tabIndex={0}
        >
          <table className="ratings-table">
            <caption className="visually-hidden">My movie ratings</caption>
            <colgroup>
              <col className="ratings-table-movie-column" />
              <col className="ratings-table-rating-column" />
              <col className="ratings-table-privacy-column" />
              <col className="ratings-table-date-column" />
              <col className="ratings-table-review-column" />
              <col className="ratings-table-comments-column" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">Movie</th>
                <th scope="col">Rating</th>
                <th scope="col">Visibility</th>
                <th scope="col">Rated on</th>
                <th scope="col">Review</th>
                <th scope="col">Comments</th>
              </tr>
            </thead>
            <tbody>
              {ratings.map((item) => (
                <tr key={item.movie_id}>
                  <th className="ratings-table-movie" scope="row">
                    <Link href={`/movies/${encodeURIComponent(item.movie_id)}`}>
                      {item.movie_title}
                    </Link>
                    <span className="ratings-table-year">
                      {item.movie_year || "Year unknown"}
                    </span>
                  </th>
                  <td className="ratings-table-score">
                    <span aria-hidden="true">★</span> {item.rating.toFixed(1)}
                    <span className="visually-hidden"> out of 5.0</span>
                  </td>
                  <td>
                    <span
                      className={
                        item.is_private
                          ? "ratings-table-privacy private"
                          : "ratings-table-privacy"
                      }
                    >
                      {item.is_private ? "Private" : "Shared"}
                    </span>
                  </td>
                  <td>
                    <time dateTime={item.updated_at}>
                      {formatRatedDate(item.updated_at)}
                    </time>
                  </td>
                  <td className="ratings-table-review">
                    {item.review ? (
                      <details>
                        <summary>Read review</summary>
                        <p>{item.review}</p>
                      </details>
                    ) : (
                      <span className="ratings-table-no-review">
                        No review
                      </span>
                    )}
                  </td>
                  <td className="ratings-table-comments">
                    {item.comments.length ? (
                      <details>
                        <summary>{item.comments.length} comments</summary>
                        <ReviewComments
                          canComment={false}
                          comments={item.comments}
                          currentUserId={currentUserId}
                          movieId={item.movie_id}
                          movieTitle={item.movie_title}
                          ratingUserId={currentUserId}
                        />
                      </details>
                    ) : (
                      <span className="ratings-table-no-review">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
