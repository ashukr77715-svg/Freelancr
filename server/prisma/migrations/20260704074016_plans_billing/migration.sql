-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'PRO', 'AGENCY');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" "Plan" NOT NULL DEFAULT 'STARTER',
ADD COLUMN     "plan_activated_at" TIMESTAMP(3),
ADD COLUMN     "plan_cycle" "BillingCycle",
ADD COLUMN     "plan_renews_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "plan_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "razorpay_link_id" TEXT,
    "link_url" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_orders_user_id_idx" ON "plan_orders"("user_id");

-- AddForeignKey
ALTER TABLE "plan_orders" ADD CONSTRAINT "plan_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
