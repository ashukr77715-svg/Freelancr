-- CreateEnum
CREATE TYPE "RecurringInterval" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "is_recurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "next_recurring_date" TIMESTAMP(3),
ADD COLUMN     "parent_invoice_id" TEXT,
ADD COLUMN     "recurring_interval" "RecurringInterval";
