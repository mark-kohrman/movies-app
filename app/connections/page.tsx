import Link from "next/link";
import { connection } from "next/server";
import ConnectionsManager from "@/app/connections/connections-manager";
import SiteHeader from "@/app/site-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type MovieConnection = {
  connection_id: string;
  other_user_id: string;
  other_username: string;
  status: "pending" | "accepted";
  direction: "incoming" | "outgoing";
  created_at: string;
};

export default async function ConnectionsPage() {
  await connection();

  let signedIn = false;
  let username: string | null = null;
  let connections: MovieConnection[] = [];
  let errorMessage = "";

  if (!isSupabaseConfigured()) {
    errorMessage =
      "Connections are unavailable because Supabase is not configured.";
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
        const [
          { data: usernameData, error: usernameError },
          { data: connectionData, error: connectionsError },
        ] = await Promise.all([
          supabase.rpc("get_my_movie_username"),
          supabase.rpc("list_movie_connections"),
        ]);

        if (usernameError) {
          throw usernameError;
        }
        if (connectionsError) {
          throw connectionsError;
        }

        username = usernameData;
        connections = connectionData;
      }
    } catch (error) {
      console.error("Could not load movie connections", error);
      errorMessage =
        "Connections could not be loaded. Run the social reviews SQL setup in Supabase, then try again.";
    }
  }

  return (
    <main className="page-shell">
      <SiteHeader note="Your movie corner" />
      <section aria-labelledby="connections-title" className="ratings-page">
        <p className="eyebrow">MOVIES ARE BETTER TOGETHER</p>
        <h1 id="connections-title">Connections</h1>
        <p className="ratings-page-copy">
          Connect with friends to share reviews and talk about the movies you
          love.
        </p>

        {errorMessage ? (
          <div className="notice ratings-notice" role="alert">
            <span aria-hidden="true">!</span>
            <p>{errorMessage}</p>
          </div>
        ) : !signedIn ? (
          <div className="ratings-empty">
            <h2>Sign in to connect with friends.</h2>
            <p>Connections let you share reviews and leave comments.</p>
            <Link className="ratings-search-link" href="/sign-in">
              Sign in
            </Link>
          </div>
        ) : (
          <ConnectionsManager connections={connections} username={username} />
        )}
      </section>
      <footer className="site-footer">
        <span>Made for movie people, by movie people.</span>
        <span>Movie data provided by OMDb.</span>
      </footer>
    </main>
  );
}
