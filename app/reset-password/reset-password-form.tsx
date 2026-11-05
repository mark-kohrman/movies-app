"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState(
    searchParams.get("error") === "callback"
      ? "This password reset link is invalid or expired. Request a new one and try again."
      : "",
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword"));

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await createClient().auth.updateUser({ password });

      if (error) {
        setErrorMessage(error.message);
        setIsSaving(false);
        return;
      }

      setStatusMessage("Your password has been updated. Taking you home…");
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Supabase password update failed", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't update your password. Request a new reset link and try again.",
      );
      setIsSaving(false);
    }
  }

  return (
    <form className="email-auth-form" onSubmit={updatePassword}>
      {errorMessage && (
        <p className="auth-error" role="alert">
          {errorMessage}
        </p>
      )}
      {statusMessage && (
        <p className="auth-success" role="status">
          {statusMessage}
        </p>
      )}
      <div className="auth-field">
        <label htmlFor="reset-password">New password</label>
        <input
          autoComplete="new-password"
          id="reset-password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>
      <div className="auth-field">
        <label htmlFor="reset-confirm-password">Confirm new password</label>
        <input
          autoComplete="new-password"
          id="reset-confirm-password"
          minLength={8}
          name="confirmPassword"
          required
          type="password"
        />
      </div>
      <button
        className="email-submit-button"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Updating password…" : "Update password"}
      </button>
    </form>
  );
}
