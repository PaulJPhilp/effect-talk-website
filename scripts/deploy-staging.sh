#!/usr/bin/env bash
# Deploy to staging: build with staging redirect URI, deploy prebuilt, alias to staging-effecttalk.vercel.app
set -euo pipefail

STAGING_ALIAS="staging-effecttalk.vercel.app"
STAGING_REDIRECT_URI="https://${STAGING_ALIAS}/auth/callback"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

echo "Cleaning build artifacts..."
rm -rf .next .vercel/output

echo "Building for preview (NEXT_PUBLIC_WORKOS_REDIRECT_URI=$STAGING_REDIRECT_URI)..."
NEXT_PUBLIC_WORKOS_REDIRECT_URI="$STAGING_REDIRECT_URI" vercel build

echo "Deploying prebuilt..."
DEPLOY_OUTPUT=$(vercel deploy --prebuilt 2>&1)
echo "$DEPLOY_OUTPUT"

PREVIEW_URL=$(echo "$DEPLOY_OUTPUT" | grep -E '^Preview: https://' | head -1 | sed -E 's/^Preview: (https:\/\/[^[:space:]]+).*/\1/')
if [[ -z "${PREVIEW_URL:-}" ]]; then
  echo "Could not parse preview URL from deploy output. Alias manually:"
  echo "  vercel alias <preview-url> $STAGING_ALIAS"
  exit 1
fi

echo "Aliasing $PREVIEW_URL -> $STAGING_ALIAS..."
vercel alias "$PREVIEW_URL" "$STAGING_ALIAS"

echo "Running auth redirect smoke test..."
bun run smoke:auth:staging

echo "Done. Staging: https://$STAGING_ALIAS"
