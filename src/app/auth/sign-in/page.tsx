import { getSignInUrl } from "@workos-inc/authkit-nextjs";
import { AlertCircle } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  encodeAuthReturnState,
  getSafeReturnPath,
  sanitizeReturnToPath,
} from "@/lib/authRedirect";
import { buildMetadata } from "@/lib/seo";
import { getCurrentUser, isWorkOSConfigured } from "@/services/Auth";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Sign In",
  description: "Sign in to EffectTalk with your GitHub account.",
  noIndex: true,
});

interface SignInPageProps {
  searchParams: Promise<{
    error?: string;
    details?: string;
    returnTo?: string;
  }>;
}

async function getRedirectUriForRequest(): Promise<string> {
  const configuredRedirectUri =
    process.env.NEXT_PUBLIC_WORKOS_REDIRECT_URI ??
    process.env.WORKOS_REDIRECT_URI;
  const baseUrl = process.env.APP_BASE_URL;
  const isLocalDev =
    process.env.VERCEL_ENV === undefined ||
    process.env.VERCEL_ENV === "development";

  if (!isLocalDev) {
    if (configuredRedirectUri) {
      return configuredRedirectUri;
    }

    if (!baseUrl) {
      throw new Error("APP_BASE_URL is required in deployed environments.");
    }

    if (baseUrl.includes("localhost")) {
      throw new Error(
        `Invalid APP_BASE_URL for deployed environment: ${baseUrl}`
      );
    }

    return `${baseUrl.replace(/\/$/, "")}/auth/callback`;
  }

  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  if (host) {
    return `${protocol}://${host}/auth/callback`;
  }

  if (!(baseUrl || isLocalDev)) {
    throw new Error("APP_BASE_URL is required in deployed environments.");
  }

  const resolvedBaseUrl = baseUrl ?? "http://localhost:3000";
  if (!isLocalDev && resolvedBaseUrl.includes("localhost")) {
    throw new Error(
      `Invalid APP_BASE_URL for deployed environment: ${resolvedBaseUrl}`
    );
  }

  return `${resolvedBaseUrl.replace(/\/$/, "")}/auth/callback`;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const safeReturnTo = sanitizeReturnToPath(params.returnTo);

  // If already logged in, redirect to settings
  const user = await getCurrentUser();
  if (user) {
    redirect(getSafeReturnPath(safeReturnTo, "/settings"));
  }

  const workOSConfigured = isWorkOSConfigured();
  const redirectUri = await getRedirectUriForRequest();
  const authUrl = workOSConfigured
    ? await getSignInUrl({
        redirectUri,
        state: safeReturnTo ? encodeAuthReturnState(safeReturnTo) : undefined,
      })
    : "#";

  return (
    <div className="container flex justify-center px-4 py-20 md:px-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign in to EffectTalk</CardTitle>
          <CardDescription>
            Use your GitHub account to sign in or create an account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {params.error === "workos_error" ? (
                  <>
                    <strong>WorkOS sign-in failed.</strong>
                    {params.details && (
                      <span className="mt-1 block text-xs">
                        {params.details}
                      </span>
                    )}
                    <span className="mt-1 block text-xs">
                      Ensure your Redirect URI is added in the WorkOS Dashboard
                      (Redirects) and matches{" "}
                      <code className="break-all">{redirectUri}</code> exactly.
                    </span>
                  </>
                ) : params.error === "auth_failed" ? (
                  <>
                    Authentication failed.{" "}
                    {params.details && (
                      <span className="mt-1 block text-xs">
                        {params.details}
                      </span>
                    )}
                    <span className="mt-1 block text-xs">
                      Check the server logs for more details.
                    </span>
                  </>
                ) : params.error === "missing_code" ? (
                  "Missing authorization code. Please try again."
                ) : (
                  "An error occurred during sign in. Please try again."
                )}
              </AlertDescription>
            </Alert>
          )}
          {!workOSConfigured && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                WorkOS AuthKit is not configured. Set{" "}
                <code className="text-xs">WORKOS_CLIENT_ID</code>,{" "}
                <code className="text-xs">WORKOS_API_KEY</code>,{" "}
                <code className="text-xs">WORKOS_COOKIE_PASSWORD</code> (32+
                chars), and{" "}
                <code className="text-xs">NEXT_PUBLIC_WORKOS_REDIRECT_URI</code>{" "}
                in <code className="text-xs">.env.local</code> for local dev.{" "}
                <strong>If this is the deployed site</strong>, set them in
                Vercel → Project → Settings → Environment Variables
                (Production), then redeploy.
              </AlertDescription>
            </Alert>
          )}
          <Button
            asChild
            className="w-full"
            disabled={!workOSConfigured}
            size="lg"
          >
            <a href={workOSConfigured ? authUrl : "#"}>
              <svg
                aria-hidden
                className="mr-2 h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <title>GitHub</title>
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Continue with GitHub
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
