CREATE TYPE "SkinTone" AS ENUM ('light', 'mediumLight', 'medium', 'mediumDark', 'dark');

ALTER TABLE "User" ADD COLUMN "skinTone" "SkinTone" NOT NULL DEFAULT 'medium';
