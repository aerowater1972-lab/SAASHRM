import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Permissions } from '@common/decorators/permissions.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateInterviewScorecardDto } from '../dto/interview-scorecard.dto';

@ApiTags('Recruitment - Interview Scorecards')
@UseGuards(AuthGuard, PermissionGuard)
@Controller('recruitment/scorecards')
export class InterviewScorecardController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Permissions('recruitment:interview:create')
  @ApiOperation({ summary: 'Create interview scorecard' })
  async create(@Body() dto: CreateInterviewScorecardDto) {
    return this.prisma.interviewScorecard.create({ data: dto });
  }

  @Get()
  @Permissions('recruitment:interview:read')
  @ApiOperation({ summary: 'List interview scorecards' })
  async findAll(@Query('interviewId') interviewId?: string) {
    return this.prisma.interviewScorecard.findMany({
      where: { ...(interviewId && { interviewId }) },
      include: { interview: true },
      orderBy: { score: 'desc' },
    });
  }

  @Get(':id')
  @Permissions('recruitment:interview:read')
  @ApiOperation({ summary: 'Get scorecard by ID' })
  async findOne(@Param('id') id: string) {
    return this.prisma.interviewScorecard.findUnique({
      where: { id },
      include: { interview: true },
    });
  }
}
