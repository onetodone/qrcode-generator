-- CreateEnum
CREATE TYPE "VerificationTokenType" AS ENUM ('EMAIL_VERIFY', 'EMAIL_CHANGE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pendingEmail" TEXT;

-- AlterTable
ALTER TABLE "VerificationToken" ADD COLUMN     "type" "VerificationTokenType" NOT NULL DEFAULT 'EMAIL_VERIFY';
