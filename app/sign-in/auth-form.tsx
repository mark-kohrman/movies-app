"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";
type LoadingAction = "google" | "email" | null;

type AuthFormProps = {
  configured: boolean;
};

export default function AuthForm({ configured }: AuthFormProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackError = getCallbackError(searchParams.get("error"));
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [errorMessage, setErrorMessage] = useState(callbackError);
  const [statusMessage, setStatusMessage] = useState("");

  async function signIn() {
    setErrorMessage("");
    setStatusMessage("");
    setLoadingAction("google");

    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoadingAction(null);
      }
    } catch (error) {
      console.error("Supabase Google sign-in failed", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't start sign-in. Please try again.",
      );
      setLoadingAction(null);
    }
  }

  async function submitEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setLoadingAction("email");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim();
    const password = String(formData.get("password"));
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const username = String(formData.get("username") ?? "")
      .trim()
      .toLowerCase();

    if (mode === "forgot-password") {
      try {
        const { error } = await createClient().auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });

        if (error) {
          setErrorMessage(error.message);
          setLoadingAction(null);
          return;
        }

        setStatusMessage(
          "If an account exists for that email, a password reset link will be sent. Check your inbox and spam folder.",
        );
        setLoadingAction(null);
      } catch (error) {
        console.error("Supabase password reset request failed", error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We couldn't request a password reset. Please try again.",
        );
        setLoadingAction(null);
      }
      return;
    }

    if (mode === "sign-up" && password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setLoadingAction(null);
      return;
    }

    const isSimpleUsername = /^[a-z0-9_]{3,24}$/.test(username);
    const isEmailUsername =
      username.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);

    if (mode === "sign-up" && !isSimpleUsername && !isEmailUsername) {
      setErrorMessage(
        "Use 3–24 letters, numbers, or underscores, or enter a valid email address as your username.",
      );
      setLoadingAction(null);
      return;
    }

    try {
      const supabase = createClient();

      if (mode === "sign-up") {
        const { data: usernameAvailable, error: usernameCheckError } =
          await supabase.rpc("is_username_available", {
            requested_username: username,
          });

        if (usernameCheckError) {
          console.error("Could not check username availability", usernameCheckError);
          setErrorMessage(
            "We couldn't check that username. Make sure the Rotten Peters username SQL setup has been run in Supabase, then try again.",
          );
          setLoadingAction(null);
          return;
        }

        if (!usernameAvailable) {
          setErrorMessage("That username is already taken. Please choose another.");
          setLoadingAction(null);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          if (error.code === "user_already_exists") {
            setErrorMessage(
              "An account with this email already exists. Sign in instead.",
            );
            setMode("sign-in");
          } else {
            const { data: stillAvailable, error: checkError } =
              await supabase.rpc("is_username_available", {
                requested_username: username,
              });

            if (!checkError && !stillAvailable) {
              setErrorMessage(
                "That username was just claimed. Please choose another.",
              );
            } else {
              setErrorMessage(error.message);
            }
          }
          setLoadingAction(null);
          return;
        }

        if (data.user?.identities?.length === 0) {
          setErrorMessage(
            "An account with this email already exists. Sign in instead.",
          );
          setMode("sign-in");
          setLoadingAction(null);
          return;
        }

        if (data.session) {
          router.replace("/");
          router.refresh();
          return;
        }

        setStatusMessage(
          "If this is a new account, check your inbox and spam folder for a confirmation link. Supabase's default email service only delivers to project team members and is rate-limited; configure custom SMTP to send to other addresses.",
        );
        setMode("sign-in");
        setLoadingAction(null);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoadingAction(null);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error(`Supabase email ${mode} failed`, error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't complete email authentication. Please try again.",
      );
      setLoadingAction(null);
    }
  }

  return (
    <div className="auth-form">
      {!configured && (
        <p className="auth-setup-notice" role="status">
          Sign-in is not ready yet. Configure the public Supabase URL and anon
          key in your local environment, then restart the app.
        </p>
      )}
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
      <div className="auth-provider-list">
        <button
          className="auth-provider-button"
          disabled={!configured || loadingAction !== null}
          onClick={signIn}
          type="button"
        >
          <span aria-hidden="true" className="google-mark">
            G
          </span>
          {loadingAction === "google"
            ? "Connecting to Google…"
            : "Continue with Google"}
        </button>
      </div>
      <div aria-hidden="true" className="auth-divider">
        <span>or use email</span>
      </div>
      <div aria-label="Email account options" className="auth-mode-switch">
        <button
          aria-pressed={mode === "sign-in"}
          className="auth-mode-button"
          disabled={loadingAction !== null}
          onClick={() => {
            setMode("sign-in");
            setErrorMessage("");
            setStatusMessage("");
          }}
          type="button"
        >
          Sign in
        </button>
        <button
          aria-pressed={mode === "sign-up"}
          className="auth-mode-button"
          disabled={loadingAction !== null}
          onClick={() => {
            setMode("sign-up");
            setErrorMessage("");
            setStatusMessage("");
          }}
          type="button"
        >
          Create account
        </button>
      </div>
      <form className="email-auth-form" onSubmit={submitEmailAuth}>
        {mode === "sign-up" && (
          <div className="auth-field">
            <label htmlFor="auth-username">Username</label>
            <input
              autoCapitalize="none"
              autoComplete="username"
              maxLength={254}
              id="auth-username"
              minLength={3}
              name="username"
              placeholder="movie_fan"
              required
              spellCheck={false}
              title="Use 3–24 letters, numbers, or underscores, or enter an email address."
            />
            <span className="auth-field-hint">
              Use 3–24 letters, numbers, or underscores, or an email address
            </span>
          </div>
        )}
        <div className="auth-field">
          <label htmlFor="auth-email">Email</label>
          <input
            autoComplete="email"
            id="auth-email"
            name="email"
            placeholder="you@example.com"
            required
            type="email"
          />
        </div>
        {mode !== "forgot-password" && <div className="auth-field">
          <label htmlFor="auth-password">Password</label>
          <input
            autoComplete={
              mode === "sign-up" ? "new-password" : "current-password"
            }
            id="auth-password"
            minLength={mode === "sign-up" ? 8 : undefined}
            name="password"
            required
            type="password"
          />
        </div>}
        {mode === "sign-up" && (
          <div className="auth-field">
            <label htmlFor="auth-confirm-password">Confirm password</label>
            <input
              autoComplete="new-password"
              id="auth-confirm-password"
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </div>
        )}
        <button
          className="email-submit-button"
          disabled={!configured || loadingAction !== null}
          type="submit"
        >
          {loadingAction === "email"
            ? mode === "sign-up"
              ? "Creating account…"
              : mode === "forgot-password"
                ? "Sending reset link…"
                : "Signing in…"
            : mode === "sign-up"
              ? "Create account with email"
              : mode === "forgot-password"
                ? "Send password reset link"
                : "Sign in with email"}
        </button>
      </form>
      {mode === "sign-in" && (
        <button
          aria-label="Forgot password?"
          className="forgot-password-button"
          disabled={loadingAction !== null}
          onClick={() => {
            setMode("forgot-password");
            setErrorMessage("");
            setStatusMessage("");
          }}
          type="button"
        >
          Forgot password?
        </button>
      )}
      {mode === "forgot-password" && (
        <button
          className="forgot-password-button"
          disabled={loadingAction !== null}
          onClick={() => {
            setMode("sign-in");
            setErrorMessage("");
            setStatusMessage("");
          }}
          type="button"
        >
          Back to sign in
        </button>
      )}
      <p aria-live="polite" className="auth-loading">
        {loadingAction === "google" && "Redirecting to Google…"}
        {loadingAction === "email" &&
          (mode === "sign-up"
            ? "Creating your account…"
            : mode === "forgot-password"
              ? "Requesting a reset link…"
              : "Signing you in…")}
      </p>
    </div>
  );
}

function getCallbackError(error: string | null) {
  if (error === "cancelled") {
    return "Sign-in was cancelled. You can try again whenever you're ready.";
  }
  if (error === "callback") {
    return "We couldn't complete sign-in. Check the provider credentials and redirect URLs in Supabase, then try again.";
  }
  return "";
}
