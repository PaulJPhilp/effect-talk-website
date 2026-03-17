import { handleAuth } from "@workos-inc/authkit-nextjs";
import { Effect } from "effect";
import { NextResponse } from "next/server";
import { setSessionCookie } from "@/services/Auth";
import { upsertUser } from "@/services/Db/api";

function getAppBaseUrl(): string {
  const appBaseUrl = process.env.APP_BASE_URL;
  const isLocalDev =
    process.env.VERCEL_ENV === undefined ||
    process.env.VERCEL_ENV === "development";

  if (appBaseUrl) {
    return appBaseUrl;
  }

  if (isLocalDev) {
    return "http://localhost:3000";
  }

  throw new Error("APP_BASE_URL is required in deployed environments.");
}

const appBaseUrl = getAppBaseUrl();

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * WorkOS AuthKit callback: SDK exchanges the code and sets its session.
 * We upsert the user into our DB and set our session cookie so getCurrentUser() and API routes keep working.
 * The callback defaults to `/settings`, but WorkOS state can override this with
 * a safe in-app return path such as a protected tour mode URL.
 */
export const GET = handleAuth({
  returnPathname: "/settings",
  baseURL: appBaseUrl,
  onSuccess: async ({ user }) => {
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined;
    try {
      const dbUser = await Effect.runPromise(
        upsertUser({
          workosId: user.id,
          email: user.email,
          name: name || undefined,
          avatarUrl: user.profilePictureUrl ?? undefined,
        })
      );
      await setSessionCookie(dbUser.id);
      console.log(
        "[Auth callback] User upserted and session cookie set for:",
        user.email,
        "DB ID:",
        dbUser.id
      );
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(
        "[Auth callback] upsert/session failed:",
        err.message,
        err.name
      );
      if (err.cause) {
        console.error("[Auth callback] cause:", err.cause);
      }
      throw error;
    }
  },
  onError: ({ error, request }) => {
    try {
      const fromWorkOS =
        request.nextUrl.searchParams.get("error") ??
        request.nextUrl.searchParams.get("error_description");
      const message =
        error == null
          ? fromWorkOS == null
            ? "Sign-in was cancelled or the authorization code was missing or invalid."
            : String(fromWorkOS)
          : safeErrorMessage(error);
      console.error("[Auth callback] onError:", message, error);
      const origin = request.nextUrl.origin;
      const url = new URL("/auth/sign-in", origin);
      url.searchParams.set("error", "auth_failed");
      url.searchParams.set("details", message.slice(0, 200));
      return Promise.resolve(NextResponse.redirect(url));
    } catch (onErrorFailure) {
      console.error("[Auth callback] onError handler failed:", onErrorFailure);
      const origin = request.nextUrl.origin;
      return Promise.resolve(
        NextResponse.redirect(
          `${origin}/auth/sign-in?error=auth_failed&details=Sign-in%20failed`
        )
      );
    }
  },
});
