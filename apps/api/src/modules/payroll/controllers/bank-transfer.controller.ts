import { Controller, Get, Post, Body, Param, Query, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { BankTransferFormatterService, BankTransferRecord, BankCode } from '../services/bank-transfer-formatter.service';
import { RunService } from '../services/run.service';
import { Employee } from '@prisma/client';
import { format } from 'date-fns';

@ApiTags('Payroll - Bank Transfer')
@Controller('payroll/bank-transfer')
export class BankTransferController {
  constructor(
    private readonly formatter: BankTransferFormatterService,
    private readonly payrollRunService: RunService,
  ) {}

  @Get('banks')
  @ApiOperation({ summary: 'Get list of supported banks for transfer' })
  getSupportedBanks() {
    return this.formatter.getSupportedBanks();
  }

  @Post('preview/:bankCode')
  @ApiOperation({ summary: 'Preview transfer file for a specific bank' })
  @ApiParam({ name: 'bankCode', enum: ['BCA', 'BRI', 'MANDIRI', 'BNI', 'PERMATA', 'CIMB'] })
  async previewTransfer(
    @Param('bankCode') bankCode: BankCode,
    @Body() records: BankTransferRecord[],
    @Query('companyName') companyName: string,
    @Query('companyAccountNumber') companyAccountNumber: string,
    @Query('companyAccountName') companyAccountName: string,
    @Query('transferDate') transferDate: string,
    @Query('batchReference') batchReference: string,
  ) {
    const options = {
      companyName: companyName || 'PT Flexy Indonesia',
      companyAccountNumber: companyAccountNumber || '1234567890',
      companyAccountName: companyAccountName || 'PT Flexy Indonesia',
      transferDate: new Date(transferDate || new Date()),
      batchReference: batchReference || `BATCH-${Date.now()}`,
    };

    // Validate all records
    const validationErrors: string[] = [];
    records.forEach((record, index) => {
      const validation = this.formatter.validateRecord(record);
      if (!validation.valid) {
        validationErrors.push(`Record ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      return {
        valid: false,
        errors: validationErrors,
      };
    }

    const result = this.formatter.generateTransferFile(bankCode, records, options);
    return {
      valid: true,
      preview: result.content.substring(0, 500) + '...',
      recordCount: result.recordCount,
      totalAmount: result.totalAmount,
      filename: result.filename,
    };
  }

  @Post('generate/:bankCode')
  @ApiOperation({ summary: 'Generate and download transfer file' })
  @ApiParam({ name: 'bankCode', enum: ['BCA', 'BRI', 'MANDIRI', 'BNI', 'PERMATA', 'CIMB'] })
  async generateTransfer(
    @Param('bankCode') bankCode: BankCode,
    @Body() records: BankTransferRecord[],
    @Query('companyName') companyName: string,
    @Query('companyAccountNumber') companyAccountNumber: string,
    @Query('companyAccountName') companyAccountName: string,
    @Query('transferDate') transferDate: string,
    @Query('batchReference') batchReference: string,
    @Res() res: Response,
  ) {
    const options = {
      companyName: companyName || 'PT Flexy Indonesia',
      companyAccountNumber: companyAccountNumber || '1234567890',
      companyAccountName: companyAccountName || 'PT Flexy Indonesia',
      transferDate: new Date(transferDate || new Date()),
      batchReference: batchReference || `BATCH-${Date.now()}`,
    };

    // Validate all records
    const validationErrors: string[] = [];
    records.forEach((record, index) => {
      const validation = this.formatter.validateRecord(record);
      if (!validation.valid) {
        validationErrors.push(`Record ${index + 1}: ${validation.errors.join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        valid: false,
        errors: validationErrors,
      });
    }

    const result = this.formatter.generateTransferFile(bankCode, records, options);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }

  @Post('generate-from-payroll/:payrollRunId/:bankCode')
  @ApiOperation({ summary: 'Generate transfer file from payroll run' })
  @ApiParam({ name: 'payrollRunId', description: 'Payroll Run ID' })
  @ApiParam({ name: 'bankCode', enum: ['BCA', 'BRI', 'MANDIRI', 'BNI', 'PERMATA', 'CIMB'] })
  async generateFromPayroll(
    @Param('payrollRunId') payrollRunId: string,
    @Param('bankCode') bankCode: BankCode,
    @Query('companyName') companyName: string,
    @Query('companyAccountNumber') companyAccountNumber: string,
    @Query('companyAccountName') companyAccountName: string,
    @Query('transferDate') transferDate: string,
    @Query('batchReference') batchReference: string,
    @Res() res: Response,
  ) {
    // Get payroll run with payslips
    const payrollRun = await this.payrollRunService.findOne('default', payrollRunId);

    if (!payrollRun) {
      return res.status(HttpStatus.NOT_FOUND).json({ message: 'Payroll run not found' });
    }

    const payslips = (payrollRun as any).payslips || [];

    // Convert to transfer records
    const records: BankTransferRecord[] = payslips.map((payslip: any) => {
      const employee = payslip.employee;
      return {
        employeeName: employee.fullName,
        bankCode: (employee.bankCode as BankCode) || 'BCA',
        bankAccountNumber: employee.bankAccountNumber || '',
        bankAccountName: employee.bankAccountName || employee.fullName,
        amount: payslip.netSalary,
        reference: `GJI-${payrollRunId.slice(0, 8)}-${payslip.id.slice(0, 8)}`,
        description: `Gaji ${format(new Date(), 'MMMM yyyy')}`,
      };
    });

    const options = {
      companyName: companyName || 'PT Flexy Indonesia',
      companyAccountNumber: companyAccountNumber || '1234567890',
      companyAccountName: companyAccountName || 'PT Flexy Indonesia',
      transferDate: new Date(transferDate || new Date()),
      batchReference: batchReference || `GJI-${payrollRunId.slice(0, 8)}`,
    };

    // Validate
    const validationErrors: string[] = [];
    records.forEach((record, index) => {
      const validation = this.formatter.validateRecord(record);
      if (!validation.valid) {
        validationErrors.push(`Record ${index + 1} (${record.employeeName}): ${validation.errors.join(', ')}`);
      }
    });

    if (validationErrors.length > 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        valid: false,
        errors: validationErrors,
      });
    }

    const result = this.formatter.generateTransferFile(bankCode, records, options);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate transfer records without generating file' })
  validateRecords(@Body() records: BankTransferRecord[]) {
    const results = records.map((record, index) => {
      const validation = this.formatter.validateRecord(record);
      return {
        index,
        employeeName: record.employeeName,
        valid: validation.valid,
        errors: validation.errors,
      };
    });

    return {
      total: records.length,
      valid: results.filter((r) => r.valid).length,
      invalid: results.filter((r) => !r.valid).length,
      details: results,
    };
  }
}