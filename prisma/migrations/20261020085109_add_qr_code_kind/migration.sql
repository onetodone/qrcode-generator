-- CreateEnum
CREATE TYPE "QrKind" AS ENUM ('DYNAMIC', 'DIRECT');

-- AlterTable
ALTER TABLE "QrCode" ADD COLUMN     "kind" "QrKind" NOT NULL DEFAULT 'DYNAMIC',
ALTER COLUMN "urlHash" DROP NOT NULL;

-- Dynamic codes always have a short link, direct codes never do.
ALTER TABLE "QrCode" ADD CONSTRAINT "QrCode_urlHash_matches_kind" CHECK (("kind" = 'DYNAMIC') = ("urlHash" IS NOT NULL));
