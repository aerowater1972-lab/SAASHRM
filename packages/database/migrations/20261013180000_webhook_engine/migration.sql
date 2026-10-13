-- OA-03 — Webhook Engine (event subscription, retry eksponensial, delivery log)

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secretHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebhookEndpoint_tenantId_isActive_idx" ON "WebhookEndpoint"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextRetryAt_idx" ON "WebhookDelivery"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_endpointId_createdAt_idx" ON "WebhookDelivery"("endpointId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_tenantId_createdAt_idx" ON "WebhookDelivery"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
