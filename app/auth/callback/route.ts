import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");
  const requestedNext = requestUrl.searchParams.get("next");
  const next =
    requestedNext === "/reset-password" ? requestedNext : "/";
  const errorDestination =
    next === "/reset-password"
      ? "/reset-password?error=callback"
      : "/sign-in?error=callback";

  if (providerError || !code) {
    const destination =
      next === "/reset-password"
        ? errorDestination
        : `/sign-in?error=${providerError ? "cancelled" : "callback"}`;
    return NextResponse.redirect(new URL(destination, requestUrl));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Supabase OAuth code exchange failed", error);
      return NextResponse.redirect(new URL(errorDestination, requestUrl));
    }

    return NextResponse.redirect(new URL(next, requestUrl));
  } catch (error) {
    console.error("Supabase OAuth callback failed", error);
    return NextResponse.redirect(new URL(errorDestination, requestUrl));
  }
}
