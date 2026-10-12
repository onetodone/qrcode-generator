-- Fails on the unique index if two accounts differ only in letter case;
-- such accounts have to be merged by hand first.
UPDATE "User" SET "email" = lower("email") WHERE "email" <> lower("email");
UPDATE "User" SET "pendingEmail" = lower("pendingEmail") WHERE "pendingEmail" <> lower("pendingEmail");
UPDATE "VerificationToken" SET "identifier" = lower("identifier") WHERE "identifier" <> lower("identifier");

ALTER TABLE "User" ADD CONSTRAINT "User_email_lowercase" CHECK ("email" = lower("email"));
ALTER TABLE "User" ADD CONSTRAINT "User_pendingEmail_lowercase" CHECK ("pendingEmail" = lower("pendingEmail"));
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_identifier_lowercase" CHECK ("identifier" = lower("identifier"));
