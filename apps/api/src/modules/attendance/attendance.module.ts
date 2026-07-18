import { Module } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { AttendanceController } from './controllers/attendance.controller';
import { ShiftController } from './controllers/shift.controller';
import { OvertimeController } from './controllers/overtime.controller';
import { OvertimeApiController, OvertimeRecordsApiController } from './controllers/overtime-api.controller';
import { LeaveController } from './controllers/leave.controller';
import { BiometricController } from './controllers/biometric.controller';
import { AttendanceService } from './services/attendance.service';
import { ShiftService } from './services/shift.service';
import { OvertimeService } from './services/overtime.service';
import { LeaveService } from './services/leave.service';
import { BiometricService } from './services/biometric.service';

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
  ],
  providers: [
    AttendanceService,
    ShiftService,
    OvertimeService,
    LeaveService,
    BiometricService,
  ],
  exports: [
    AttendanceService,
    ShiftService,
    OvertimeService,
    LeaveService,
    BiometricService,
  ],
})
export class AttendanceModule {}
