-- CreateEnum
CREATE TYPE "QrDisabledReason" AS ENUM ('UNSAFE_DESTINATION', 'MANUAL');

-- AlterTable
ALTER TABLE "QrCode" ADD COLUMN     "destinationCheckedAt" TIMESTAMP(3),
ADD COLUMN     "destinationSetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "disabledReason" "QrDisabledReason";

-- Existing codes count as set when created; `updatedAt` also moves on every scan.
UPDATE "QrCode" SET "destinationSetAt" = "createdAt";
