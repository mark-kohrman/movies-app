import Link from "next/link";
import { Suspense } from "react";
import ResetPasswordForm from "@/app/reset-password/reset-password-form";
import SiteHeader from "@/app/site-header";

export default function ResetPasswordPage() {
  return (
    <main className="page-shell">
      <SiteHeader note="A place for people who love movies" />
      <section aria-labelledby="reset-password-title" className="auth-page">
        <p className="eyebrow">ACCOUNT RECOVERY</p>
        <h1 id="reset-password-title">Choose a new password.</h1>
        <p className="auth-page-copy">
          Enter and confirm your new password below.
        </p>
        <Suspense
          fallback={
            <p className="auth-loading" role="status">
              Preparing password form…
            </p>
          }
        >
          <ResetPasswordForm />
        </Suspense>
        <Link className="auth-back-link" href="/sign-in">
          <span aria-hidden="true">←</span> Back to sign in
        </Link>
      </section>
      <footer className="site-footer">
        <span>Made for movie people, by movie people.</span>
        <span>Movie data provided by OMDb.</span>
      </footer>
    </main>
  );
}
