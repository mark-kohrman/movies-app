import Link from "next/link";
import { connection } from "next/server";
import SignOutButton from "@/app/sign-out-button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export default async function AccountControls() {
  let userName = "";
  let accountError = "";

  if (isSupabaseConfigured()) {
    await connection();
    const supabase = await createClient();

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        if (error.name !== "AuthSessionMissingError") {
          console.error("Could not load the current Supabase user", error);
          accountError = "Account status is unavailable.";
        }
      } else if (data.user) {
        const metadata = data.user.user_metadata;
        userName =
          (typeof metadata.username === "string" && metadata.username) ||
          (typeof metadata.full_name === "string" && metadata.full_name) ||
          (typeof metadata.name === "string" && metadata.name) ||
          data.user.email ||
          "Signed in";
      }
    } catch (error) {
      console.error("Could not load the current Supabase user", error);
      accountError = "Account status is unavailable.";
    }
  }

  return (
    <div className="account-controls">
      {accountError ? (
        <span className="account-status-error" role="status">
          {accountError}
        </span>
      ) : userName ? (
        <>
          <span className="header-account" title={userName}>
            {userName}
          </span>
          <SignOutButton />
        </>
      ) : (
        <Link className="header-sign-in" href="/sign-in">
          Sign in
        </Link>
      )}
    </div>
  );
}
