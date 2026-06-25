/*
  Warnings:

  - You are about to drop the column `defaultCommissionRate` on the `vendor_plans` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[taxCardNumber]` on the table `vendor_profiles` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[commercialRegistrationNumber]` on the table `vendor_profiles` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('earned', 'redeemed', 'adjusted', 'expired');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "pointsDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "pointsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsRedeemed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "vendor_commissions" ADD COLUMN     "paymentProof" TEXT,
ADD COLUMN     "paymentProofPublicId" VARCHAR(255);

-- AlterTable
ALTER TABLE "vendor_plans" DROP COLUMN "defaultCommissionRate";

-- AlterTable
ALTER TABLE "vendor_profiles" ADD COLUMN     "commercialRegistrationNumber" VARCHAR(100),
ADD COLUMN     "phone" VARCHAR(20),
ADD COLUMN     "secondaryPhone" VARCHAR(20),
ADD COLUMN     "taxCardNumber" VARCHAR(50);

-- CreateTable
CREATE TABLE "loyalty_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "earnRatePercent" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "pointValue" DECIMAL(10,4) NOT NULL DEFAULT 0.50,
    "minRedemptionPoints" INTEGER NOT NULL DEFAULT 100,
    "maxRedemptionPercent" DECIMAL(5,2) NOT NULL DEFAULT 50.00,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalRedeemed" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "orderId" TEXT,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_accounts_userId_key" ON "loyalty_accounts"("userId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_accountId_idx" ON "loyalty_transactions"("accountId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_orderId_idx" ON "loyalty_transactions"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_profiles_taxCardNumber_key" ON "vendor_profiles"("taxCardNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_profiles_commercialRegistrationNumber_key" ON "vendor_profiles"("commercialRegistrationNumber");

-- AddForeignKey
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "loyalty_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
