-- Back-fill usernames for any users that don't have one yet
-- (takes the email local-part, lowercased, non-alphanumeric → underscore)
UPDATE "users"
SET "username" = LOWER(REGEXP_REPLACE(SPLIT_PART("email", '@', 1), '[^a-zA-Z0-9_]', '_', 'g'))
WHERE "username" IS NULL;

-- Resolve duplicates: append first 4 chars of the UUID for the later-created row
WITH ranked AS (
  SELECT id,
         username,
         ROW_NUMBER() OVER (PARTITION BY username ORDER BY "createdAt") AS rn
  FROM "users"
)
UPDATE "users"
SET "username" = "users"."username" || '_' || SUBSTRING("users"."id", 1, 4)
FROM ranked
WHERE ranked.id = "users".id AND ranked.rn > 1;

-- Enforce NOT NULL on username
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- Make email nullable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
