"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setErrorMessage("");
    setIsSigningOut(true);

    try {
      const { error } = await createClient().auth.signOut();
      if (error) {
        setErrorMessage(error.message);
        setIsSigningOut(false);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Supabase sign-out failed", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't sign you out. Please try again.",
      );
      setIsSigningOut(false);
    }
  }

  return (
    <span className="sign-out-control">
      <button
        className="sign-out-button"
        disabled={isSigningOut}
        onClick={signOut}
        type="button"
      >
        {isSigningOut ? "Signing out…" : "Sign out"}
      </button>
      {errorMessage && (
        <span className="sign-out-error" role="alert">
          {errorMessage}
        </span>
      )}
    </span>
  );
}
