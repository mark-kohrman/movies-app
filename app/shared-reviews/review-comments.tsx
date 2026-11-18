"use client";

import { useActionState } from "react";
import {
  addReviewComment,
  deleteReviewComment,
  type SocialActionState,
} from "@/app/actions/social";

export type ReviewComment = {
  id: string;
  user_id: string;
  username: string;
  body: string;
  created_at: string;
};

const initialState: SocialActionState = {};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

function CommentItem({
  comment,
  canDelete,
}: {
  comment: ReviewComment;
  canDelete: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    deleteReviewComment,
    initialState,
  );

  return (
    <li className="review-comment">
      <div className="review-comment-heading">
        <strong>{comment.username}</strong>
        <time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
      </div>
      <p>{comment.body}</p>
      {canDelete && (
        <form action={formAction}>
          <input name="commentId" type="hidden" value={comment.id} />
          <button
            className="comment-delete-button"
            disabled={pending}
            type="submit"
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        </form>
      )}
      {state.error && (
        <p className="social-form-error" role="alert">
          {state.error}
        </p>
      )}
    </li>
  );
}

function CommentForm({
  ratingUserId,
  movieId,
}: {
  ratingUserId: string;
  movieId: string;
}) {
  const [state, formAction, pending] = useActionState(
    addReviewComment,
    initialState,
  );
  const fieldId = `comment-${ratingUserId}-${movieId}`;

  return (
    <form action={formAction} className="review-comment-form">
      <input name="ratingUserId" type="hidden" value={ratingUserId} />
      <input name="movieId" type="hidden" value={movieId} />
      <label className="visually-hidden" htmlFor={fieldId}>
        Add a comment
      </label>
      <textarea
        id={fieldId}
        maxLength={2000}
        name="body"
        placeholder="Write a thoughtful comment…"
        required
        rows={3}
      />
      {state.error && (
        <p className="social-form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="social-form-success" role="status">
          {state.success}
        </p>
      )}
      <button className="social-button" disabled={pending} type="submit">
        {pending ? "Posting…" : "Post comment"}
      </button>
    </form>
  );
}

export default function ReviewComments({
  comments,
  currentUserId,
  ratingUserId,
  movieId,
  movieTitle,
  canComment,
}: {
  comments: ReviewComment[];
  currentUserId: string;
  ratingUserId: string;
  movieId: string;
  movieTitle: string;
  canComment: boolean;
}) {
  return (
    <section
      aria-label={`Comments on ${movieTitle} review`}
      className="review-comments"
    >
      <h3>Comments ({comments.length})</h3>
      {comments.length ? (
        <ul className="review-comments-list">
          {comments.map((comment) => (
            <CommentItem
              canDelete={
                comment.user_id === currentUserId ||
                ratingUserId === currentUserId
              }
              comment={comment}
              key={comment.id}
            />
          ))}
        </ul>
      ) : (
        <p className="connections-empty">No comments yet.</p>
      )}
      {canComment && (
        <CommentForm movieId={movieId} ratingUserId={ratingUserId} />
      )}
    </section>
  );
}
