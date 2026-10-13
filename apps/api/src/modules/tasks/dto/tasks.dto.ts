import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

/** Harus sinkron dengan enum di packages/database/schema.prisma (bagian TASK & PROJECT MANAGEMENT). */
export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] as const;
export const PROJECT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export const PROJECT_MEMBER_ROLES = ['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'] as const;
export const TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export class CreateProjectDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(50)
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(PROJECT_STATUSES)
  @IsOptional()
  status?: string;

  @IsIn(PROJECT_PRIORITIES)
  @IsOptional()
  priority?: string;

  @IsString()
  ownerUserId!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class UpdateProjectDto {
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(PROJECT_STATUSES) status?: string;
  @IsOptional() @IsIn(PROJECT_PRIORITIES) priority?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsString() startDate?: string;
  @IsOptional() @IsString() endDate?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
}

export class AddProjectMemberDto {
  @IsString()
  employeeId!: string;

  @IsIn(PROJECT_MEMBER_ROLES)
  @IsOptional()
  role?: string;
}

export class CreateTaskDto {
  @IsString()
  @MaxLength(300)
  title!: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsIn(TASK_STATUSES) status?: string;
  @IsOptional() @IsIn(TASK_PRIORITIES) priority?: string;
  @IsOptional() @IsString() assigneeEmployeeId?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1000) estimateHours?: number;
  @IsOptional() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() parentTaskId?: string;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MaxLength(300) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() projectId?: string;
  @IsOptional() @IsIn(TASK_STATUSES) status?: string;
  @IsOptional() @IsIn(TASK_PRIORITIES) priority?: string;
  @IsOptional() @IsString() assigneeEmployeeId?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1000) estimateHours?: number;
  @IsOptional() @IsString({ each: true }) tags?: string[];
  @IsOptional() @IsString() parentTaskId?: string;
}

export class AddTaskCommentDto {
  @IsString()
  @MaxLength(5000)
  content!: string;
}

export class LogTaskHoursDto {
  @IsNumber()
  @Min(0.25)
  @Max(24)
  hours!: number;
}

export const TASK_DEPENDENCY_TYPES = ['FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH'] as const;

export class AddTaskDependencyDto {
  @IsString()
  dependsOnTaskId!: string;

  @IsOptional()
  @IsIn(TASK_DEPENDENCY_TYPES)
  type?: string;
}

