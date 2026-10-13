import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import {
  HelpdeskTicketService,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TicketActor,
} from './helpdesk-ticket.service';
import {
  BulkAssignTicketsDto,
  BulkUpdateTicketStatusDto,
} from './dto/helpdesk-bulk.dto';

@ApiTags('HR Helpdesk')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('helpdesk')
export class HelpdeskController {
  constructor(private readonly helpdesk: HelpdeskTicketService) {}

  /** Terjemahkan req.user (AuthGuard) menjadi TicketActor untuk service. */
  private actor(req: any): TicketActor {
    return {
      userId: req.user.sub,
      employeeId: req.user.employeeId ?? null,
      isAdmin: req.user.permissions?.includes('helpdesk:manage') ?? false,
    };
  }

  // ============================================================
  // EMPLOYEE ENDPOINTS
  // ============================================================

  @Post('tickets')
  @Permissions('helpdesk:create')
  @ApiOperation({ summary: 'Buat ticket helpdesk baru (employee)' })
  createTicket(
    @Req() req: any,
    @Body()
    body: {
      category: (typeof TICKET_CATEGORIES)[number];
      title: string;
      description: string;
      priority?: (typeof TICKET_PRIORITIES)[number];
    },
  ) {
    return this.helpdesk.createTicket(
      req.user.tenantId,
      req.user.employeeId,
      body,
    );
  }

  @Get('my-tickets')
  @Permissions('helpdesk:view')
  @ApiOperation({ summary: 'Daftar ticket milik saya (employee)' })
  listMyTickets(
    @Req() req: any,
    @Query('status') status?: (typeof TICKET_STATUSES)[number],
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.helpdesk.listMyTickets(req.user.tenantId, req.user.employeeId, {
      status: status as any,
      page,
      limit,
    });
  }

  @Get('tickets/:id')
  @Permissions('helpdesk:view')
  @ApiOperation({ summary: 'Detail ticket (employee pemilik atau admin)' })
  getTicket(@Req() req: any, @Param('id') id: string) {
    return this.helpdesk.getTicket(req.user.tenantId, id, this.actor(req));
  }

  @Post('tickets/:id/comments')
  @Permissions('helpdesk:create')
  @ApiOperation({ summary: 'Tambah komentar pada ticket' })
  addComment(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { content: string; attachmentUrl?: string; isInternal?: boolean },
  ) {
    return this.helpdesk.addComment(
      req.user.tenantId,
      id,
      this.actor(req),
      body,
    );
  }

  @Post('tickets/:id/rate')
  @Permissions('helpdesk:create')
  @ApiOperation({ summary: 'Beri rating kepuasan setelah ticket ditutup' })
  rateTicket(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { rating: number },
  ) {
    return this.helpdesk.rateTicket(
      req.user.tenantId,
      id,
      req.user.employeeId,
      body.rating,
    );
  }

  // ============================================================
  // ADMIN ENDPOINTS
  // ============================================================

  @Get('tickets')
  @Permissions('helpdesk:manage')
  @ApiOperation({ summary: 'Queue semua ticket (admin)' })
  listTickets(
    @Req() req: any,
    @Query('status') status?: (typeof TICKET_STATUSES)[number],
    @Query('category') category?: (typeof TICKET_CATEGORIES)[number],
    @Query('priority') priority?: (typeof TICKET_PRIORITIES)[number],
    @Query('assignedToId') assignedToId?: string,
    @Query('unassignedOnly') unassignedOnly?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.helpdesk.listTickets(req.user.tenantId, {
      status: status as any,
      category: category as any,
      priority: priority as any,
      assignedToId,
      unassignedOnly: unassignedOnly === 'true',
      page,
      limit,
    });
  }

  @Patch('tickets/:id/assign')
  @Permissions('helpdesk:manage')
  @ApiOperation({ summary: 'Assign ticket ke admin (admin)' })
  assignTicket(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { assignedToId: string },
  ) {
    return this.helpdesk.assignTicket(req.user.tenantId, id, body.assignedToId);
  }

  @Patch('tickets/:id/status')
  @Permissions('helpdesk:manage')
  @ApiOperation({ summary: 'Ubah status ticket (admin)' })
  updateStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status: (typeof TICKET_STATUSES)[number] },
  ) {
    return this.helpdesk.updateStatus(req.user.tenantId, id, body.status as any);
  }

  @Post('tickets/bulk-assign')
  @Permissions('helpdesk:manage')
  @ApiOperation({ summary: 'Bulk assign ticket ke satu assignee (admin queue, HD-04)' })
  bulkAssign(@Req() req: any, @Body() body: BulkAssignTicketsDto) {
    return this.helpdesk.bulkAssign(req.user.tenantId, body.ids, body.assignedToId);
  }

  @Post('tickets/bulk-status')
  @Permissions('helpdesk:manage')
  @ApiOperation({ summary: 'Bulk ubah status ticket (admin queue, HD-04)' })
  bulkUpdateStatus(@Req() req: any, @Body() body: BulkUpdateTicketStatusDto) {
    return this.helpdesk.bulkUpdateStatus(req.user.tenantId, body.ids, body.status as any);
  }

  @Get('stats')
  @Permissions('helpdesk:manage')
  @ApiOperation({ summary: 'Statistik helpdesk (admin)' })
  getStats(@Req() req: any) {
    return this.helpdesk.getStats(req.user.tenantId);
  }

  @Post('escalate-overdue')
  @Permissions('helpdesk:manage')
  @ApiOperation({ summary: 'Jalankan auto-escalate manual (admin/cron)' })
  escalateOverdue() {
    return this.helpdesk.escalateOverdueTickets();
  }

  // ============================================================
  // KNOWLEDGE BASE
  // ============================================================

  @Get('kb/search')
  @Permissions('helpdesk:view')
  @ApiOperation({ summary: 'Cari artikel knowledge base' })
  searchKb(
    @Req() req: any,
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.helpdesk.searchKnowledgeBase(req.user.tenantId, q, limit);
  }

  @Get('kb/suggest')
  @Permissions('helpdesk:view')
  @ApiOperation({ summary: 'Auto-suggest KB berdasarkan judul ticket' })
  suggestKb(
    @Req() req: any,
    @Query('title') title: string,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit = 5,
  ) {
    return this.helpdesk.suggestKnowledgeBase(req.user.tenantId, title, limit);
  }

  @Get('kb/articles/:id')
  @Permissions('helpdesk:view')
  @ApiOperation({ summary: 'Ambil satu artikel KB' })
  getKbArticle(@Req() req: any, @Param('id') id: string) {
    return this.helpdesk.getKnowledgeBaseArticle(req.user.tenantId, id);
  }

  @Post('kb/articles/:id/rate')
  @Permissions('helpdesk:create')
  @ApiOperation({ summary: 'Vote artikel KB membantu / tidak' })
  rateKbArticle(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { helpful: boolean },
  ) {
    return this.helpdesk.rateKnowledgeBaseArticle(
      req.user.tenantId,
      id,
      body.helpful,
    );
  }

  // ============================================================
  // KNOWLEDGE BASE — ADMIN CRUD (HD-07)
  // ============================================================

  @Get('kb/articles')
  @Permissions('helpdesk:manage')
  @ApiOperation({ summary: 'Daftar artikel KB (admin)' })
  listKbArticles(@Req() req: any, @Query('category') category?: string) {
    return this.helpdesk.listKnowledgeBaseArticles(req.user.tenantId, category);
  }

  @Post('kb/articles')
  @Permissions('helpdesk:manage')
  @ApiOperation({ summary: 'Buat artikel KB (admin)' })
  createKbArticle(
    @Req() req: any,
    @Body()
    body: {
      category?: (typeof TICKET_CATEGORIES)[number];
      title: string;
      content: string;
      tags?: string[];
    },
  ) {
    return this.helpdesk.createKnowledgeBaseArticle(
      req.user.tenantId,
      req.user.sub,
      body,
    );
  }

  @Patch('kb/articles/:id')
  @Permissions('helpdesk:manage')
  @ApiOperation({ summary: 'Ubah artikel KB (admin)' })
  updateKbArticle(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      category?: (typeof TICKET_CATEGORIES)[number];
      title?: string;
      content?: string;
      tags?: string[];
    },
  ) {
    return this.helpdesk.updateKnowledgeBaseArticle(req.user.tenantId, id, body);
  }

  @Post('kb/articles/:id/delete')
  @Permissions('helpdesk:manage')
  @ApiOperation({ summary: 'Hapus artikel KB / soft-delete (admin)' })
  deleteKbArticle(@Req() req: any, @Param('id') id: string) {
    return this.helpdesk.deleteKnowledgeBaseArticle(req.user.tenantId, id);
  }
}

