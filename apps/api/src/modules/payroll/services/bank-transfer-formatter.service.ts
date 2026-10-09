import { Injectable, BadRequestException } from '@nestjs/common';
import { BankTransferBatch, PayrollRun, Employee } from '@prisma/client';
import { format } from 'date-fns';

export type BankCode =
  | 'BCA'
  | 'BRI'
  | 'MANDIRI'
  | 'BNI'
  | 'PERMATA'
  | 'CIMB'
  | 'DANAMON'
  | 'BUKOPIN'
  | 'MAYBANK'
  | 'HSBC'
  | 'STANDARD_CHARTERED'
  | 'CITIBANK'
  | 'UOB'
  | 'OCBC'
  | 'COMMONWEALTH'
  | 'PANIN'
  | 'MEGA'
  | 'SINARMAS'
  | 'BJB'
  | 'JATIM'
  | 'JATENG'
  | 'JABAR'
  | 'DKI'
  | 'NTB'
  | 'NTP'
  | 'BENGKULU'
  | 'LAMPUNG'
  | 'Riau'
  | 'SUMUT'
  | 'SUMSEL'
  | 'KALSEL'
  | 'KALTIM'
  | 'KALBAR'
  | 'KALTENG'
  | 'SULSEL'
  | 'SULTENG'
  | 'SULTRA'
  | 'GORONTALO'
  | 'MALUKU'
  | 'PAPUA'
  | 'PAPUA_BARAT';

export interface BankTransferRecord {
  employeeName: string;
  bankCode: BankCode;
  bankAccountNumber: string;
  bankAccountName: string;
  amount: number;
  reference: string;
  description?: string;
}

export interface BankTransferFormatResult {
  content: string;
  filename: string;
  mimeType: string;
  recordCount: number;
  totalAmount: number;
}

@Injectable()
export class BankTransferFormatterService {
  private static readonly BANK_CODES: Record<BankCode, string> = {
    BCA: '014',
    BRI: '002',
    MANDIRI: '008',
    BNI: '009',
    PERMATA: '013',
    CIMB: '022',
    DANAMON: '011',
    BUKOPIN: '441',
    MAYBANK: '016',
    HSBC: '087',
    STANDARD_CHARTERED: '050',
    CITIBANK: '031',
    UOB: '023',
    OCBC: '028',
    COMMONWEALTH: '033',
    PANIN: '019',
    MEGA: '426',
    SINARMAS: '153',
    BJB: '110',
    JATIM: '111',
    JATENG: '115',
    JABAR: '113',
    DKI: '114',
    NTB: '117',
    NTP: '118',
    BENGKULU: '119',
    LAMPUNG: '120',
    Riau: '121',
    SUMUT: '122',
    SUMSEL: '123',
    KALSEL: '124',
    KALTIM: '125',
    KALBAR: '126',
    KALTENG: '127',
    SULSEL: '128',
    SULTENG: '129',
    SULTRA: '130',
    GORONTALO: '131',
    MALUKU: '132',
    PAPUA: '133',
    PAPUA_BARAT: '134',
  };

  generateTransferFile(
    bankCode: BankCode,
    records: BankTransferRecord[],
    options: {
      companyName: string;
      companyAccountNumber: string;
      companyAccountName: string;
      transferDate: Date;
      batchReference: string;
      description?: string;
    }
  ): BankTransferFormatResult {
    const formatter = this.getFormatter(bankCode);
    return formatter(records, options);
  }

  private getFormatter(bankCode: BankCode) {
    const formatters: Record<BankCode, typeof this.formatBCA> = {
      BCA: this.formatBCA.bind(this),
      BRI: this.formatBRI.bind(this),
      MANDIRI: this.formatMandiri.bind(this),
      BNI: this.formatBNI.bind(this),
      PERMATA: this.formatPermata.bind(this),
      CIMB: this.formatCIMB.bind(this),
      DANAMON: this.formatDanamon.bind(this),
      BUKOPIN: this.formatBukopin.bind(this),
      MAYBANK: this.formatMaybank.bind(this),
      HSBC: this.formatHSBC.bind(this),
      STANDARD_CHARTERED: this.formatStandardChartered.bind(this),
      CITIBANK: this.formatCitibank.bind(this),
      UOB: this.formatUOB.bind(this),
      OCBC: this.formatOCBC.bind(this),
      COMMONWEALTH: this.formatCommonwealth.bind(this),
      PANIN: this.formatPanin.bind(this),
      MEGA: this.formatMega.bind(this),
      SINARMAS: this.formatSinarmas.bind(this),
      BJB: this.formatBJB.bind(this),
      JATIM: this.formatJATIM.bind(this),
      JATENG: this.formatJATENG.bind(this),
      JABAR: this.formatJABAR.bind(this),
      DKI: this.formatDKI.bind(this),
      NTB: this.formatNTB.bind(this),
      NTP: this.formatNTP.bind(this),
      BENGKULU: this.formatBengkulu.bind(this),
      LAMPUNG: this.formatLampung.bind(this),
      Riau: this.formatRiau.bind(this),
      SUMUT: this.formatSUMUT.bind(this),
      SUMSEL: this.formatSUMSEL.bind(this),
      KALSEL: this.formatKALSEL.bind(this),
      KALTIM: this.formatKALTIM.bind(this),
      KALBAR: this.formatKALBAR.bind(this),
      KALTENG: this.formatKALTENG.bind(this),
      SULSEL: this.formatSULSEL.bind(this),
      SULTENG: this.formatSULTENG.bind(this),
      SULTRA: this.formatSULTRA.bind(this),
      GORONTALO: this.formatGorontalo.bind(this),
      MALUKU: this.formatMaluku.bind(this),
      PAPUA: this.formatPapua.bind(this),
      PAPUA_BARAT: this.formatPapuaBarat.bind(this),
    };

    return formatters[bankCode] || this.formatGeneric.bind(this);
  }

  private formatBCA(
    records: BankTransferRecord[],
    options: any
  ): BankTransferFormatResult {
    const lines: string[] = [];
    const dateStr = format(options.transferDate, 'ddMMyyyy');
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    // Header
    lines.push(
      `H${'BCA'.padEnd(3, ' ')}` +
        `${options.companyAccountNumber.padStart(20, '0')}` +
        `${options.companyAccountName.padEnd(40, ' ')}` +
        `${dateStr}` +
        `${options.batchReference.padEnd(20, ' ')}` +
        `${totalAmount.toString().padStart(15, '0')}` +
        `${records.length.toString().padStart(6, '0')}` +
        `${' '.repeat(100)}`
    );

    // Details
    records.forEach((record, index) => {
      const bankCode = BankTransferFormatterService.BANK_CODES[record.bankCode] || '000';
      lines.push(
        `D${bankCode}` +
          `${record.bankAccountNumber.padStart(20, '0')}` +
          `${record.bankAccountName.padEnd(40, ' ')}` +
          `${record.amount.toString().padStart(15, '0')}` +
          `${record.reference.padEnd(20, ' ')}` +
          `${(record.description || 'Gaji').padEnd(40, ' ')}` +
          `${' '.repeat(40)}`
      );
    });

    // Trailer
    lines.push(
      `T${' '.repeat(3)}` +
        `${totalAmount.toString().padStart(15, '0')}` +
        `${records.length.toString().padStart(6, '0')}` +
        `${' '.repeat(190)}`
);

    const result: BankTransferFormatResult = {
      content: lines.join('\r\n'),
      filename: `TRANSFER_${format(options.transferDate, 'yyyyMMdd')}_${options.batchReference}.csv`,
      mimeType: 'text/csv',
      recordCount: records.length,
      totalAmount,
    };
    return result;
  }

  private formatBRI(
    records: BankTransferRecord[],
    options: any
  ): BankTransferFormatResult {
    const lines: string[] = [];
    const dateStr = format(options.transferDate, 'ddMMyyyy');
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    // Header BRI
    lines.push(
      `1` +
        `${options.companyAccountNumber.padStart(15, '0')}` +
        `${options.companyAccountName.padEnd(40, ' ')}` +
        `${dateStr}` +
        `${totalAmount.toString().padStart(15, '0')}` +
        `${records.length.toString().padStart(6, '0')}` +
        `${options.batchReference.padEnd(20, ' ')}` +
        `${' '.repeat(100)}`
    );

    records.forEach((record) => {
      const bankCode = BankTransferFormatterService.BANK_CODES[record.bankCode] || '000';
      lines.push(
        `2` +
          `${bankCode}` +
          `${record.bankAccountNumber.padStart(15, '0')}` +
          `${record.bankAccountName.padEnd(40, ' ')}` +
          `${record.amount.toString().padStart(15, '0')}` +
          `${record.reference.padEnd(20, ' ')}` +
          `${(record.description || 'Gaji').padEnd(40, ' ')}` +
          `${' '.repeat(40)}`
      );
    });

    lines.push(
      `9` +
        `${totalAmount.toString().padStart(15, '0')}` +
        `${records.length.toString().padStart(6, '0')}` +
        `${' '.repeat(180)}`
    );

    return {
      content: lines.join('\r\n'),
      filename: `BRI_Transfer_${format(options.transferDate, 'yyyyMMdd')}_${options.batchReference}.txt`,
      mimeType: 'text/plain',
      recordCount: records.length,
      totalAmount,
    };
  }

  private formatMandiri(
    records: BankTransferRecord[],
    options: any
  ): BankTransferFormatResult {
    const lines: string[] = [];
    const dateStr = format(options.transferDate, 'ddMMyyyy');
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    // Mandiri uses CSV format
    lines.push('KODE BANK TUJUAN,NO REKENING TUJUAN,NAMA REKENING TUJUAN,JUMLAH,BERITA,REFERENSI');
    records.forEach((record) => {
      const bankCode = BankTransferFormatterService.BANK_CODES[record.bankCode] || '000';
      lines.push(
        `${bankCode},${record.bankAccountNumber},${record.bankAccountName},${record.amount},${record.description || 'Gaji'},${record.reference}`
      );
    });

    return {
      content: lines.join('\r\n'),
      filename: `MANDIRI_Transfer_${format(options.transferDate, 'yyyyMMdd')}_${options.batchReference}.csv`,
      mimeType: 'text/csv',
      recordCount: records.length,
      totalAmount,
    };
  }

  private formatBNI(
    records: BankTransferRecord[],
    options: any
  ): BankTransferFormatResult {
    const lines: string[] = [];
    const dateStr = format(options.transferDate, 'ddMMyyyy');
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    // Header BNI
    lines.push(
      `1` +
        `${options.companyAccountNumber.padStart(20, '0')}` +
        `${options.companyAccountName.padEnd(40, ' ')}` +
        `${dateStr}` +
        `${totalAmount.toString().padStart(15, '0')}` +
        `${records.length.toString().padStart(6, '0')}` +
        `${' '.repeat(150)}`
    );

    records.forEach((record) => {
      const bankCode = BankTransferFormatterService.BANK_CODES[record.bankCode] || '000';
      lines.push(
        `2` +
          `${bankCode}` +
          `${record.bankAccountNumber.padStart(20, '0')}` +
          `${record.bankAccountName.padEnd(40, ' ')}` +
          `${record.amount.toString().padStart(15, '0')}` +
          `${record.reference.padEnd(20, ' ')}` +
          `${(record.description || 'Gaji').padEnd(40, ' ')}` +
          `${' '.repeat(50)}`
      );
    });

    lines.push(
      `9` +
        `${totalAmount.toString().padStart(15, '0')}` +
        `${records.length.toString().padStart(6, '0')}` +
        `${' '.repeat(180)}`
    );

    return {
      content: lines.join('\r\n'),
      filename: `BNI_Transfer_${format(options.transferDate, 'yyyyMMdd')}_${options.batchReference}.txt`,
      mimeType: 'text/plain',
      recordCount: records.length,
      totalAmount,
    };
  }

  private formatPermata(
    records: BankTransferRecord[],
    options: any
  ): BankTransferFormatResult {
    const lines: string[] = [];
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    // Permata CSV format
    lines.push('BANK_CODE,ACCOUNT_NUMBER,ACCOUNT_NAME,AMOUNT,REFERENCE,DESCRIPTION');
    records.forEach((record) => {
      const bankCode = BankTransferFormatterService.BANK_CODES[record.bankCode] || '000';
      lines.push(
        `${bankCode},${record.bankAccountNumber},${record.bankAccountName},${record.amount},${record.reference},${record.description || 'Gaji'}`
      );
    });

    return {
      content: lines.join('\r\n'),
      filename: `PERMATA_Transfer_${format(options.transferDate, 'yyyyMMdd')}_${options.batchReference}.csv`,
      mimeType: 'text/csv',
      recordCount: records.length,
      totalAmount,
    };
  }

  private formatCIMB(
    records: BankTransferRecord[],
    options: any
  ): BankTransferFormatResult {
    const lines: string[] = [];
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    // CIMB format
    lines.push('RECEIVER_BANK,RECEIVER_ACCOUNT,RECEIVER_NAME,AMOUNT,REFERENCE,REMARKS');
    records.forEach((record) => {
      const bankCode = BankTransferFormatterService.BANK_CODES[record.bankCode] || '000';
      lines.push(
        `${bankCode},${record.bankAccountNumber},${record.bankAccountName},${record.amount},${record.reference},${record.description || 'Gaji'}`
      );
    });

    return {
      content: lines.join('\r\n'),
      filename: `CIMB_Transfer_${format(options.transferDate, 'yyyyMMdd')}_${options.batchReference}.csv`,
      mimeType: 'text/csv',
      recordCount: records.length,
      totalAmount,
    };
  }

  private formatGeneric(
    records: BankTransferRecord[],
    options: any
  ): BankTransferFormatResult {
    const lines: string[] = [];
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

    // Generic CSV format compatible with most banks
    lines.push('BANK_CODE,ACCOUNT_NUMBER,ACCOUNT_NAME,AMOUNT,REFERENCE,DESCRIPTION');
    records.forEach((record) => {
      const bankCode = BankTransferFormatterService.BANK_CODES[record.bankCode] || '000';
      lines.push(
        `${bankCode},${record.bankAccountNumber},${record.bankAccountName},${record.amount},${record.reference},${record.description || 'Gaji'}`
      );
    });

    return {
      content: lines.join('\r\n'),
      filename: `TRANSFER_${format(options.transferDate, 'yyyyMMdd')}_${options.batchReference}.csv`,
      mimeType: 'text/csv',
      recordCount: records.length,
      totalAmount,
    };
  }

  // Placeholder formatters for other banks
  private formatDanamon = this.formatGeneric.bind(this);
  private formatBukopin = this.formatGeneric.bind(this);
  private formatMaybank = this.formatGeneric.bind(this);
  private formatHSBC = this.formatGeneric.bind(this);
  private formatStandardChartered = this.formatGeneric.bind(this);
  private formatCitibank = this.formatGeneric.bind(this);
  private formatUOB = this.formatGeneric.bind(this);
  private formatOCBC = this.formatGeneric.bind(this);
  private formatCommonwealth = this.formatGeneric.bind(this);
  private formatPanin = this.formatGeneric.bind(this);
  private formatMega = this.formatGeneric.bind(this);
  private formatSinarmas = this.formatGeneric.bind(this);
  private formatBJB = this.formatGeneric.bind(this);
  private formatJATIM = this.formatGeneric.bind(this);
  private formatJATENG = this.formatGeneric.bind(this);
  private formatJABAR = this.formatGeneric.bind(this);
  private formatDKI = this.formatGeneric.bind(this);
  private formatNTB = this.formatGeneric.bind(this);
  private formatNTP = this.formatGeneric.bind(this);
  private formatBengkulu = this.formatGeneric.bind(this);
  private formatLampung = this.formatGeneric.bind(this);
  private formatRiau = this.formatGeneric.bind(this);
  private formatSUMUT = this.formatGeneric.bind(this);
  private formatSUMSEL = this.formatGeneric.bind(this);
  private formatKALSEL = this.formatGeneric.bind(this);
  private formatKALTIM = this.formatGeneric.bind(this);
  private formatKALBAR = this.formatGeneric.bind(this);
  private formatKALTENG = this.formatGeneric.bind(this);
  private formatSULSEL = this.formatGeneric.bind(this);
  private formatSULTENG = this.formatGeneric.bind(this);
  private formatSULTRA = this.formatGeneric.bind(this);
  private formatGorontalo = this.formatGeneric.bind(this);
  private formatMaluku = this.formatGeneric.bind(this);
  private formatPapua = this.formatGeneric.bind(this);
  private formatPapuaBarat = this.formatGeneric.bind(this);

  validateRecord(record: BankTransferRecord): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!record.employeeName || record.employeeName.trim().length === 0) {
      errors.push('Nama karyawan tidak boleh kosong');
    }

    if (!record.bankAccountNumber || record.bankAccountNumber.trim().length === 0) {
      errors.push('Nomor rekening tidak boleh kosong');
    }

    if (!record.bankAccountName || record.bankAccountName.trim().length === 0) {
      errors.push('Nama rekening tidak boleh kosong');
    }

    if (record.amount <= 0) {
      errors.push('Jumlah transfer harus lebih dari 0');
    }

    if (!BankTransferFormatterService.BANK_CODES[record.bankCode]) {
      errors.push(`Kode bank ${record.bankCode} tidak didukung`);
    }

    if (record.amount > 9999999999) {
      errors.push('Jumlah transfer melebihi batas maksimum');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  getSupportedBanks(): { code: BankCode; name: string; clearingCode: string }[] {
    const bankNames: Record<BankCode, string> = {
      BCA: 'Bank Central Asia',
      BRI: 'Bank Rakyat Indonesia',
      MANDIRI: 'Bank Mandiri',
      BNI: 'Bank Negara Indonesia',
      PERMATA: 'Bank Permata',
      CIMB: 'CIMB Niaga',
      DANAMON: 'Bank Danamon',
      BUKOPIN: 'Bank Bukopin',
      MAYBANK: 'Maybank Indonesia',
      HSBC: 'HSBC Indonesia',
      STANDARD_CHARTERED: 'Standard Chartered',
      CITIBANK: 'Citibank',
      UOB: 'UOB Indonesia',
      OCBC: 'OCBC NISP',
      COMMONWEALTH: 'Commonwealth Bank',
      PANIN: 'Bank Panin',
      MEGA: 'Bank Mega',
      SINARMAS: 'Bank Sinarmas',
      BJB: 'Bank Jabar Banten',
      JATIM: 'Bank Jatim',
      JATENG: 'Bank Jateng',
      JABAR: 'Bank Jabar',
      DKI: 'Bank DKI',
      NTB: 'Bank NTB',
      NTP: 'Bank NTP',
      BENGKULU: 'Bank Bengkulu',
      LAMPUNG: 'Bank Lampung',
      Riau: 'Bank Riau',
      SUMUT: 'Bank Sumut',
      SUMSEL: 'Bank Sumsel',
      KALSEL: 'Bank Kalsel',
      KALTIM: 'Bank Kaltim',
      KALBAR: 'Bank Kalbar',
      KALTENG: 'Bank Kalteng',
      SULSEL: 'Bank Sulsel',
      SULTENG: 'Bank Sulteng',
      SULTRA: 'Bank Sulut',
      GORONTALO: 'Bank Gorontalo',
      MALUKU: 'Bank Maluku',
      PAPUA: 'Bank Papua',
      PAPUA_BARAT: 'Bank Papua Barat',
    };

    return Object.entries(BankTransferFormatterService.BANK_CODES).map(([code, clearingCode]) => ({
      code: code as BankCode,
      name: bankNames[code as BankCode] || code,
      clearingCode,
    }));
  }
}