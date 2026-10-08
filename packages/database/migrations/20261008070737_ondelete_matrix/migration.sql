-- DropForeignKey
ALTER TABLE "Application" DROP CONSTRAINT "Application_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "AttendanceCorrection" DROP CONSTRAINT "AttendanceCorrection_approvedBy_fkey";

-- DropForeignKey
ALTER TABLE "BenefitEligibilityRule" DROP CONSTRAINT "BenefitEligibilityRule_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "BenefitEligibilityRule" DROP CONSTRAINT "BenefitEligibilityRule_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_entityId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_shiftGroupId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_workLocationId_fkey";

-- DropForeignKey
ALTER TABLE "Employment" DROP CONSTRAINT "Employment_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "Employment" DROP CONSTRAINT "Employment_shiftGroupId_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_reviewId_fkey";

-- DropForeignKey
ALTER TABLE "HolidayCalendar" DROP CONSTRAINT "HolidayCalendar_entityId_fkey";

-- DropForeignKey
ALTER TABLE "IndividualDevelopmentPlan" DROP CONSTRAINT "IndividualDevelopmentPlan_reviewCycleId_fkey";

-- DropForeignKey
ALTER TABLE "JobPosting" DROP CONSTRAINT "JobPosting_requisitionId_fkey";

-- DropForeignKey
ALTER TABLE "JobRequisition" DROP CONSTRAINT "JobRequisition_approvedBy_fkey";

-- DropForeignKey
ALTER TABLE "JobRequisition" DROP CONSTRAINT "JobRequisition_manpowerPlanItemId_fkey";

-- DropForeignKey
ALTER TABLE "MovementRequest" DROP CONSTRAINT "MovementRequest_newDepartmentId_fkey";

-- DropForeignKey
ALTER TABLE "MovementRequest" DROP CONSTRAINT "MovementRequest_newOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "MovementRequest" DROP CONSTRAINT "MovementRequest_newPositionId_fkey";

-- DropForeignKey
ALTER TABLE "MovementRequest" DROP CONSTRAINT "MovementRequest_performanceReviewRefId_fkey";

-- DropForeignKey
ALTER TABLE "OvertimeRecord" DROP CONSTRAINT "OvertimeRecord_overtimeRequestId_fkey";

-- DropForeignKey
ALTER TABLE "Position" DROP CONSTRAINT "Position_gradeId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAttempt" DROP CONSTRAINT "QuizAttempt_quizId_fkey";

-- DropForeignKey
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_shiftGroupId_fkey";

-- DropForeignKey
ALTER TABLE "SuccessionPlan" DROP CONSTRAINT "SuccessionPlan_currentEmployeeId_fkey";

-- DropForeignKey
ALTER TABLE "SuccessionPlan" DROP CONSTRAINT "SuccessionPlan_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Training" DROP CONSTRAINT "Training_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Training" DROP CONSTRAINT "Training_recommendedViolationCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_employeeId_fkey";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_workLocationId_fkey" FOREIGN KEY ("workLocationId") REFERENCES "WorkLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_shiftGroupId_fkey" FOREIGN KEY ("shiftGroupId") REFERENCES "ShiftGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employment" ADD CONSTRAINT "Employment_shiftGroupId_fkey" FOREIGN KEY ("shiftGroupId") REFERENCES "ShiftGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "TenantEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_shiftGroupId_fkey" FOREIGN KEY ("shiftGroupId") REFERENCES "ShiftGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HolidayCalendar" ADD CONSTRAINT "HolidayCalendar_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "TenantEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRecord" ADD CONSTRAINT "OvertimeRecord_overtimeRequestId_fkey" FOREIGN KEY ("overtimeRequestId") REFERENCES "OvertimeRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequisition" ADD CONSTRAINT "JobRequisition_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRequisition" ADD CONSTRAINT "JobRequisition_manpowerPlanItemId_fkey" FOREIGN KEY ("manpowerPlanItemId") REFERENCES "ManpowerPlanItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "JobRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessionPlan" ADD CONSTRAINT "SuccessionPlan_currentEmployeeId_fkey" FOREIGN KEY ("currentEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_recommendedViolationCategoryId_fkey" FOREIGN KEY ("recommendedViolationCategoryId") REFERENCES "ViolationCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndividualDevelopmentPlan" ADD CONSTRAINT "IndividualDevelopmentPlan_reviewCycleId_fkey" FOREIGN KEY ("reviewCycleId") REFERENCES "ReviewCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementRequest" ADD CONSTRAINT "MovementRequest_newPositionId_fkey" FOREIGN KEY ("newPositionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementRequest" ADD CONSTRAINT "MovementRequest_newDepartmentId_fkey" FOREIGN KEY ("newDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementRequest" ADD CONSTRAINT "MovementRequest_newOrganizationId_fkey" FOREIGN KEY ("newOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovementRequest" ADD CONSTRAINT "MovementRequest_performanceReviewRefId_fkey" FOREIGN KEY ("performanceReviewRefId") REFERENCES "FinalScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitEligibilityRule" ADD CONSTRAINT "BenefitEligibilityRule_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitEligibilityRule" ADD CONSTRAINT "BenefitEligibilityRule_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DocumentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
