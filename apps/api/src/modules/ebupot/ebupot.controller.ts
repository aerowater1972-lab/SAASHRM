import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@common/guards/auth.guard';
import { PermissionGuard } from '@common/guards/permission.guard';
import { Permissions } from '@common/decorators/permissions.decorator';
import { EbupotService } from './services/ebupot.service';
import {
  BulkEbupotActionDto,
  EbupotQueryDto,
  GenerateEbupotDto,
} from './dto/ebupot.dto';

@ApiTags('e-Bupot PPh 21')
@ApiBearerAuth()
@UseGuards(AuthGuard, PermissionGuard)
@Controller('tax/ebupot')
export class EbupotController {
  constructor(private readonly ebupot: EbupotService) {}

  @Post('generate')
  @Permissions('ebupot:manage')
  @ApiOperation({ summary: 'Generate e-Bupot dari payroll APPROVED (GAP-05)' })
  generate(@Req() req: any, @Body() body: GenerateEbupotDto) {
    return this.ebupot.generate(req.user.tenantId, body);
  }

  @Get()
  @Permissions('ebupot:view')
  @ApiOperation({ summary: 'Daftar submission e-Bupot per masa pajak' })
  list(@Req() req: any, @Query() query: EbupotQueryDto) {
    return this.ebupot.list(req.user.tenantId, query);
  }

  @Get('stats')
  @Permissions('ebupot:view')
  @ApiOperation({ summary: 'Statistik submission e-Bupot' })
  getStats(@Req() req: any) {
    return this.ebupot.getStats(req.user.tenantId);
  }

  @Post('submit')
  @Permissions('ebupot:manage')
  @ApiOperation({ summary: 'Submit e-Bupot satu masa pajak ke Coretax' })
  submit(
    @Req() req: any,
    @Body() body: { taxYear: number; taxMonth: number },
  ) {
    return this.ebupot.submit(
      req.user.tenantId,
      body.taxYear,
      body.taxMonth,
      req.user.sub,
    );
  }

  @Post(':id/retry')
  @Permissions('ebupot:manage')
  @ApiOperation({ summary: 'Retry submission e-Bupot yang gagal' })
  retry(@Req() req: any, @Param('id') id: string) {
    return this.ebupot.retry(req.user.tenantId, id);
  }

  @Post('bulk-retry')
  @Permissions('ebupot:manage')
  @ApiOperation({ summary: 'Retry massal submission e-Bupot yang FAILED' })
  bulkRetry(@Req() req: any, @Body() body: BulkEbupotActionDto) {
    return this.ebupot.bulkRetry(req.user.tenantId, body.ids);
  }

  @Get('export.xml')
  @Permissions('ebupot:view')
  @Header('Content-Type', 'application/xml')
  @ApiOperation({ summary: 'Export XML e-Bupot untuk unggah ke Coretax' })
  exportXml(
    @Req() req: any,
    @Query('taxYear') taxYear: number,
    @Query('taxMonth') taxMonth: number,
  ): Promise<string> {
    return this.ebupot.exportXml(req.user.tenantId, taxYear, taxMonth);
  }

  @Get('export.csv')
  @Permissions('ebupot:view')
  @Header('Content-Type', 'text/csv')
  @ApiOperation({ summary: 'Export CSV e-Bupot untuk verifikasi' })
  exportCsv(
    @Req() req: any,
    @Query('taxYear') taxYear: number,
    @Query('taxMonth') taxMonth: number,
  ): Promise<string> {
    return this.ebupot.exportCsv(req.user.tenantId, taxYear, taxMonth);
  }
}
