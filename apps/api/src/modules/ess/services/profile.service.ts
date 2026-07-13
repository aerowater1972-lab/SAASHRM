import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EmployeeService } from '@modules/employee/services/employee.service';
import { UpdateProfileDto } from '../dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly employeeService: EmployeeService) {}

  async getProfile(tenantId: string, employeeId: string) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async updateProfile(tenantId: string, employeeId: string, dto: UpdateProfileDto) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    if (dto.email && dto.email !== employee.email) {
      const exists = await this.employeeService.emailExists(tenantId, dto.email, employeeId);
      if (exists) throw new ConflictException('Email already in use');
    }

    return this.employeeService.update(tenantId, employeeId, dto as any);
  }

  async getDocuments(tenantId: string, employeeId: string) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    return this.employeeService.getDocuments(tenantId, employeeId);
  }

  async getEmployment(tenantId: string, employeeId: string) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    return this.employeeService.getEmploymentHistory(tenantId, employeeId);
  }

  async uploadPhoto(tenantId: string, employeeId: string, file: Express.Multer.File) {
    const employee = await this.employeeService.findById(tenantId, employeeId);
    if (!employee) throw new NotFoundException('Employee not found');

    return this.employeeService.setProfilePicture(tenantId, employeeId, file.path || file.filename);
  }
}
