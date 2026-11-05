import { Suspense } from "react";
import Link from "next/link";
import AuthForm from "@/app/sign-in/auth-form";
import SiteHeader from "@/app/site-header";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function SignInPage() {
  return (
    <main className="page-shell">
      <SiteHeader note="A place for people who love movies" />
      <section aria-labelledby="sign-in-title" className="auth-page">
        <p className="eyebrow">WELCOME TO ROTTEN PETERS</p>
        <h1 id="sign-in-title">Sign in to your movie corner.</h1>
        <p className="auth-page-copy">
          Continue with Google, or create an account with your email and a
          username.
        </p>
        <Suspense
          fallback={
            <p className="auth-loading" role="status">
              Preparing sign-in options…
            </p>
          }
        >
          <AuthForm configured={isSupabaseConfigured()} />
        </Suspense>
        <Link className="auth-back-link" href="/">
          <span aria-hidden="true">←</span> Back to movie search
        </Link>
      </section>
      <footer className="site-footer">
        <span>Made for movie people, by movie people.</span>
        <span>Movie data provided by OMDb.</span>
      </footer>
    </main>
  );
}
