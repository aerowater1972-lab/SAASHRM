-- AlterTable
ALTER TABLE "LeaveBalance" ADD COLUMN     "debtCarry" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN     "maxNegativeDays" DECIMAL(5,2);
