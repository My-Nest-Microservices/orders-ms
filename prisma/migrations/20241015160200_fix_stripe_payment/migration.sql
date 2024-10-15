/*
  Warnings:

  - You are about to drop the column `stripeCargeId` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "stripeCargeId",
ADD COLUMN     "stripeChargeId" TEXT,
ALTER COLUMN "receiptId" DROP NOT NULL;
