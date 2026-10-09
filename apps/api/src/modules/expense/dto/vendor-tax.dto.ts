import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVendorDto {
  @IsString() name!: string;
  @IsOptional() @IsString() npwp?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsBoolean() isForeign?: boolean;
  @IsOptional() @IsNumber() treatyRate?: number;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccount?: string;
}

export class CreateVendorInvoiceDto {
  @IsString() vendorId!: string;
  @IsString() invoiceNo!: string;
  @IsDateString() invoiceDate!: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() description?: string;
  @Type(() => Number) @IsNumber() @Min(0) grossAmount!: number;
  @IsOptional() @IsEnum(['NONE','PPH23_JASA','PPH23_SEWA','PPH23_DIVIDEN','PPH23_BUNGA_ROYALTI','PPH23_HADIAH','PPH26'] as any) taxType?: string;
  @IsOptional() @IsBoolean() grossUp?: boolean;
}

export class UpdateVendorInvoiceDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() invoiceNo?: string;
}
