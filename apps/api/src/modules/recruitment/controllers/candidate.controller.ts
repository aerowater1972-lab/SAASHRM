import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards} from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CandidateService } from '../services/candidate.service';
import { CreateCandidateDto } from '../dto/create-candidate.dto';
import { CandidateListQueryDto } from '../dto/candidate-list-query.dto';
import { CandidateStatus } from '@prisma/client';

@ApiTags('Recruitment - Candidates')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('recruitment/candidates')
export class CandidateController {
  constructor(private readonly candidateService: CandidateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new candidate' })
  create(@TenantId() tenantId: string, @Body() dto: CreateCandidateDto) {
    return this.candidateService.create(tenantId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all candidates with filters' })
  @ApiQuery({ name: 'status', required: false, enum: CandidateStatus })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @TenantId() tenantId: string,
    @Query() filters: CandidateListQueryDto,
  ) {
    return this.candidateService.findAll(tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get candidate by ID' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.candidateService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update candidate' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateCandidateDto>,
  ) {
    return this.candidateService.update(tenantId, id, dto);
  }

  @Post(':id/apply')
  @ApiOperation({ summary: 'Apply candidate to a job posting' })
  @ApiQuery({ name: 'jobPostingId', required: true, type: String })
  @ApiQuery({ name: 'expectedSalary', required: false, type: Number })
  apply(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query('jobPostingId') jobPostingId: string,
    @Query('expectedSalary') expectedSalary?: number,
  ) {
    return this.candidateService.apply(tenantId, id, jobPostingId, expectedSalary);
  }

  @Post('purge/expired')
  @ApiOperation({
    summary: 'BR-05: purge PII of rejected candidates whose retention window elapsed',
  })
  purgeExpired(@TenantId() _tenantId: string) {
    return this.candidateService.purgeExpiredCandidates();
  }
}
