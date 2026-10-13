import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { ForumService, ForumActor } from '../services/forum.service';
import { AddForumCommentDto, CastForumVoteDto, CreateForumThreadDto, ReportForumContentDto, ReviewForumReportDto, ToggleForumReactionDto, UpdateForumThreadDto } from '../dto/forum.dto';

@ApiTags('Internal Communication Hub / Forum (GAP-03)')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('forum')
export class ForumController {
  constructor(private readonly forum: ForumService) {}

  private actor(req: any): ForumActor {
    return { userId: req.user.sub, employeeId: req.user.employeeId ?? null,
      isAdmin: req.user.permissions?.includes('forum:manage') ?? false };
  }

  @Get('threads')
  @Permissions('forum:view')
  @ApiOperation({ summary: 'Feed thread (pinned + kronologis, filter type/department/q)' })
  listThreads(@Req() req: any, @Query('type') type?: string, @Query('departmentId') departmentId?: string,
    @Query('q') q?: string, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20) {
    return this.forum.listThreads(req.user.tenantId, { type, departmentId, q, page, limit });
  }

  @Get('threads/:id')
  @Permissions('forum:view')
  @ApiOperation({ summary: 'Detail thread + nested comments + reactions' })
  getThread(@Req() req: any, @Param('id') id: string) {
    return this.forum.getThread(req.user.tenantId, id);
  }

  @Post('threads')
  @Permissions('forum:create')
  @ApiOperation({ summary: 'Buat thread (DISCUSSION/POLL/EVENT; ANNOUNCEMENT admin-only)' })
  createThread(@Req() req: any, @Body() dto: CreateForumThreadDto) {
    return this.forum.createThread(req.user.tenantId, this.actor(req), dto);
  }

  @Patch('threads/:id')
  @Permissions('forum:create')
  @ApiOperation({ summary: 'Ubah thread (penulis/admin; pin/lock admin-only)' })
  updateThread(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateForumThreadDto) {
    return this.forum.updateThread(req.user.tenantId, this.actor(req), id, dto);
  }

  @Delete('threads/:id')
  @Permissions('forum:create')
  @ApiOperation({ summary: 'Hapus thread / soft-delete (penulis/admin)' })
  deleteThread(@Req() req: any, @Param('id') id: string) {
    return this.forum.deleteThread(req.user.tenantId, this.actor(req), id);
  }

  @Post('threads/:id/comments')
  @Permissions('forum:create')
  @ApiOperation({ summary: 'Tambah komentar / nested reply (maks 3 level)' })
  addComment(@Req() req: any, @Param('id') id: string, @Body() dto: AddForumCommentDto) {
    return this.forum.addComment(req.user.tenantId, this.actor(req), id, dto);
  }

  @Delete('threads/:threadId/comments/:commentId')
  @Permissions('forum:create')
  @ApiOperation({ summary: 'Hapus komentar (penulis/admin)' })
  deleteComment(@Req() req: any, @Param('threadId') threadId: string, @Param('commentId') commentId: string) {
    return this.forum.deleteComment(req.user.tenantId, this.actor(req), threadId, commentId);
  }

  @Post('threads/:id/reactions')
  @Permissions('forum:view')
  @ApiOperation({ summary: 'Toggle reaction pada thread' })
  reactThread(@Req() req: any, @Param('id') id: string, @Body() dto: ToggleForumReactionDto) {
    return this.forum.toggleReaction(req.user.tenantId, this.actor(req), { threadId: id, reactionType: dto.reactionType });
  }

  @Post('comments/:id/reactions')
  @Permissions('forum:view')
  @ApiOperation({ summary: 'Toggle reaction pada komentar' })
  reactComment(@Req() req: any, @Param('id') id: string, @Body() dto: ToggleForumReactionDto) {
    return this.forum.toggleReaction(req.user.tenantId, this.actor(req), { commentId: id, reactionType: dto.reactionType });
  }

  @Post('threads/:id/vote')
  @Permissions('forum:view')
  @ApiOperation({ summary: 'Vote opsi polling' })
  votePoll(@Req() req: any, @Param('id') id: string, @Body() dto: CastForumVoteDto) {
    return this.forum.votePoll(req.user.tenantId, id, dto.optionIndex);
  }

  @Post('threads/:id/report')
  @Permissions('forum:view')
  @ApiOperation({ summary: 'Laporkan thread ke antrian moderasi' })
  reportThread(@Req() req: any, @Param('id') id: string, @Body() dto: ReportForumContentDto) {
    return this.forum.reportContent(req.user.tenantId, this.actor(req), { threadId: id }, dto);
  }

  @Post('comments/:id/report')
  @Permissions('forum:view')
  @ApiOperation({ summary: 'Laporkan komentar ke antrian moderasi' })
  reportComment(@Req() req: any, @Param('id') id: string, @Body() dto: ReportForumContentDto) {
    return this.forum.reportContent(req.user.tenantId, this.actor(req), { commentId: id }, dto);
  }

  @Get('reports')
  @Permissions('forum:manage')
  @ApiOperation({ summary: 'Antrian moderasi laporan (admin)' })
  listReports(@Req() req: any, @Query('status') status?: string) {
    return this.forum.listReports(req.user.tenantId, status);
  }

  @Patch('reports/:id')
  @Permissions('forum:manage')
  @ApiOperation({ summary: 'Review laporan moderasi (admin)' })
  reviewReport(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewForumReportDto) {
    return this.forum.reviewReport(req.user.tenantId, this.actor(req), id, dto);
  }
}
