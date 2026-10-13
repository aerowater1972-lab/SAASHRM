import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TenantId } from '@common/decorators/tenant.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Permissions } from '@common/decorators/permissions.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { WebhookService } from '../services/webhook.service';
import {
  CreateWebhookEndpointDto,
  UpdateWebhookEndpointDto,
  WebhookDeliveryQueryDto,
} from '../dto/webhook.dto';

@ApiTags('Integrations - Webhooks')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('integrations/webhooks')
export class WebhookController {
  constructor(private readonly service: WebhookService) {}

  @Get('events')
  @Permissions('integrations:webhook:read')
  @ApiOperation({ summary: 'List subscribable domain event names' })
  listEvents() {
    return { events: SUBSCRIBABLE_EVENTS };
  }

  @Post()
  @Permissions('integrations:webhook:manage')
  @ApiOperation({ summary: 'Register a webhook endpoint (signing secret returned once)' })
  create(
    @TenantId() tenantId: string,
    @Body() dto: CreateWebhookEndpointDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.create(tenantId, dto, actorId);
  }

  @Get()
  @Permissions('integrations:webhook:read')
  @ApiOperation({ summary: 'List webhook endpoints for the tenant' })
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @Permissions('integrations:webhook:read')
  @ApiOperation({ summary: 'Get a webhook endpoint' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Put(':id')
  @Permissions('integrations:webhook:manage')
  @ApiOperation({ summary: 'Update a webhook endpoint' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookEndpointDto,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.update(tenantId, id, dto, actorId);
  }

  @Delete(':id')
  @Permissions('integrations:webhook:manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  remove(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.remove(tenantId, id, actorId);
  }

  @Post(':id/rotate-secret')
  @Permissions('integrations:webhook:manage')
  @ApiOperation({ summary: 'Rotate the signing secret (new secret returned once)' })
  rotateSecret(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') actorId: string,
  ) {
    return this.service.rotateSecret(tenantId, id, actorId);
  }

  @Post(':id/test')
  @Permissions('integrations:webhook:manage')
  @ApiOperation({ summary: 'Send a test event to the endpoint' })
  test(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.testEndpoint(tenantId, id);
  }

  @Get(':id/deliveries')
  @Permissions('integrations:webhook:read')
  @ApiOperation({ summary: 'Delivery log for an endpoint' })
  deliveries(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Query() query: WebhookDeliveryQueryDto,
  ) {
    return this.service.listDeliveries(tenantId, id, query);
  }

  @Patch('deliveries/:deliveryId/retry')
  @Permissions('integrations:webhook:manage')
  @ApiOperation({ summary: 'Re-queue a delivery for another attempt' })
  retryDelivery(@TenantId() tenantId: string, @Param('deliveryId') deliveryId: string) {
    return this.service.retryDelivery(tenantId, deliveryId);
  }
}

/** Event names tenants can subscribe to (mirrors DomainEventType). */
const SUBSCRIBABLE_EVENTS = [
  'attendance.period.closed',
  'expense.claim.approved',
  'loan.installment.due',
  'employee.benefit.changed',
  'application.offer.accepted',
  'employee.grade.changed',
  'performance.score.finalized',
  'resignation.effective',
  'leave.approved',
  'leave.rejected',
  'leave.requested',
  'overtime.approved',
  'payslip.generated',
  'payroll.run.approved',
  'payroll.run.locked',
  'candidate.converted',
  'review_cycle.finalized',
  'training.completed',
  '*',
];
