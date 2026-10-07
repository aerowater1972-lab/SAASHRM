-- CreateTable
CREATE TABLE "RefreshTokenBlacklist" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshTokenBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshTokenBlacklist_tokenHash_key" ON "RefreshTokenBlacklist"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshTokenBlacklist_expiresAt_idx" ON "RefreshTokenBlacklist"("expiresAt");
