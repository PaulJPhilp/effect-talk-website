-- Add release_version to patterns so the app can derive "new" (e.g. release_version >= '0.12.0')
ALTER TABLE "patterns" ADD COLUMN IF NOT EXISTS "release_version" text;
