import { Module } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { AttendanceController } from './controllers/attendance.controller';
import { ShiftController } from './controllers/shift.controller';
import { OvertimeController } from './controllers/overtime.controller';
import { OvertimeApiController, OvertimeRecordsApiController } from './controllers/overtime-api.controller';
import { LeaveController } from './controllers/leave.controller';
import { BiometricController } from './controllers/biometric.controller';
import { LiveTrackingController } from './controllers/live-tracking.controller';
import { ShiftRotationController } from './controllers/shift-rotation.controller';
import { AttendanceService } from './services/attendance.service';
import { ShiftService } from './services/shift.service';
import { OvertimeService } from './services/overtime.service';
import { LeaveService } from './services/leave.service';
import { BiometricService } from './services/biometric.service';
import { LiveTrackingService } from './services/live-tracking.service';
import { ShiftRotationService } from './services/shift-rotation.service';
import { PayrollAdjustmentService } from '@modules/payroll/services/payroll-adjustment.service';

@Module({
  imports: [EmployeeModule],
  controllers: [
    AttendanceController,
    ShiftController,
    OvertimeController,
    OvertimeApiController,
    OvertimeRecordsApiController,
    LeaveController,
    BiometricController,
    LiveTrackingController,
    ShiftRotationController,
  ],
  providers: [
    AttendanceService,
    ShiftService,
    OvertimeService,
    LeaveService,
    BiometricService,
    LiveTrackingService,
    ShiftRotationService,
    PayrollAdjustmentService,
  ],
  exports: [
    AttendanceService,
    ShiftService,
    OvertimeService,
    LeaveService,
    BiometricService,
    LiveTrackingService,
    ShiftRotationService,
  ],
})
export class AttendanceModule {}
