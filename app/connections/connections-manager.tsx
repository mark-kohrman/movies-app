"use client";

import { useActionState } from "react";
import {
  removeMovieConnection,
  requestMovieConnection,
  respondToMovieConnection,
  saveMovieUsername,
  type SocialActionState,
} from "@/app/actions/social";

type MovieConnection = {
  connection_id: string;
  other_user_id: string;
  other_username: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
  created_at: string;
};

const initialState: SocialActionState = {};

function UsernameForm({ username }: { username: string | null }) {
  const [state, formAction, pending] = useActionState(
    saveMovieUsername,
    initialState,
  );
  const currentUsername = state.username ?? username;

  if (currentUsername) {
    return (
      <p className="connections-current-username">
        Your username: <strong>{currentUsername}</strong>
      </p>
    );
  }

  return (
    <form action={formAction} className="connections-form">
      <label className="connections-field" htmlFor="movie-username">
        Choose a username so friends can find you
        <input
          autoCapitalize="none"
          autoComplete="username"
          id="movie-username"
          maxLength={24}
          minLength={3}
          name="username"
          pattern="[A-Za-z0-9_]{3,24}"
          placeholder="movie_fan"
          required
        />
      </label>
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
        {pending ? "Saving…" : "Save username"}
      </button>
    </form>
  );
}

function RequestForm() {
  const [state, formAction, pending] = useActionState(
    requestMovieConnection,
    initialState,
  );

  return (
    <form action={formAction} className="connections-form request-connection-form">
      <label className="connections-field" htmlFor="connection-username">
        Connect by username
        <input
          autoCapitalize="none"
          autoComplete="off"
          id="connection-username"
          maxLength={254}
          name="username"
          placeholder="Enter their username"
          required
        />
      </label>
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
        {pending ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}

function ConnectionRow({ connection }: { connection: MovieConnection }) {
  const [responseState, responseAction, responding] = useActionState(
    respondToMovieConnection,
    initialState,
  );
  const [removeState, removeAction, removing] = useActionState(
    removeMovieConnection,
    initialState,
  );

  return (
    <li className="connection-row">
      <div>
        <strong>{connection.other_username}</strong>
        <span className="connection-row-status">
          {connection.status === "accepted"
            ? "Connected"
            : connection.direction === "incoming"
              ? "Wants to connect"
              : "Request sent"}
        </span>
      </div>
      {connection.status === "pending" &&
      connection.direction === "incoming" ? (
        <div className="connection-row-actions">
          <form action={responseAction}>
            <input
              name="connectionId"
              type="hidden"
              value={connection.connection_id}
            />
            <button
              className="social-button"
              disabled={responding}
              name="decision"
              type="submit"
              value="accept"
            >
              Accept
            </button>
          </form>
          <form action={responseAction}>
            <input
              name="connectionId"
              type="hidden"
              value={connection.connection_id}
            />
            <button
              className="social-button secondary"
              disabled={responding}
              name="decision"
              type="submit"
              value="decline"
            >
              Decline
            </button>
          </form>
        </div>
      ) : (
        <form action={removeAction}>
          <input
            name="connectionId"
            type="hidden"
            value={connection.connection_id}
          />
          <button
            className="social-button secondary"
            disabled={removing}
            type="submit"
          >
            {removing ? "Removing…" : "Remove"}
          </button>
        </form>
      )}
      {(responseState.error || removeState.error) && (
        <p className="social-form-error" role="alert">
          {responseState.error || removeState.error}
        </p>
      )}
    </li>
  );
}

export default function ConnectionsManager({
  username,
  connections,
}: {
  username: string | null;
  connections: MovieConnection[];
}) {
  const incoming = connections.filter(
    (connection) =>
      connection.status === "pending" && connection.direction === "incoming",
  );
  const others = connections.filter(
    (connection) =>
      connection.status === "accepted" || connection.direction === "outgoing",
  );

  return (
    <div className="connections-content">
      <section aria-labelledby="your-username-title" className="social-panel">
        <h2 id="your-username-title">Your username</h2>
        <p>Share it with friends so they can send you a connection request.</p>
        <UsernameForm username={username} />
      </section>

      <section aria-labelledby="add-connection-title" className="social-panel">
        <h2 id="add-connection-title">Connect with a friend</h2>
        <p>Send a request using the username they chose for Rotten Peters.</p>
        <RequestForm />
      </section>

      <section
        aria-labelledby="connection-requests-title"
        className="social-panel"
      >
        <h2 id="connection-requests-title">Connection requests</h2>
        {incoming.length ? (
          <ul className="connections-list">
            {incoming.map((connection) => (
              <ConnectionRow
                connection={connection}
                key={connection.connection_id}
              />
            ))}
          </ul>
        ) : (
          <p className="connections-empty">No incoming requests right now.</p>
        )}
      </section>

      <section aria-labelledby="your-connections-title" className="social-panel">
        <h2 id="your-connections-title">Your connections</h2>
        {others.length ? (
          <ul className="connections-list">
            {others.map((connection) => (
              <ConnectionRow
                connection={connection}
                key={connection.connection_id}
              />
            ))}
          </ul>
        ) : (
          <p className="connections-empty">
            Accepted connections will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
