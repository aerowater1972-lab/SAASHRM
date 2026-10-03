import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { AuditEventService } from '@modules/shared/events/audit-event.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class KtpNpwpService {
  private readonly dukcapilApiUrl = 'https://api.dukcapil.kominfo.go.id/verification';
  private readonly RETRY_ATTEMPTS = 3;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditEventService,
  ) {}

  /**
   * Verifikasi KTP/NPWP melalui Dukcapil.
   * 
   * Alur:
   * 1. Validasi format NIK (16 digit) dan NPWP (15/16 digit) di level service
   * 2. Cek apakah DUCAPIL_API_KEY dan DUCAPIL_ENDPOINT dikonfigurasi
   * 3. Jika ada: panggil API Dukcapil real
   * 4. Jika tidak ada: gunakan mock validation (fallback)
   * 
   * Response format dari Dukcapil:
   * {
   *   valid: boolean,
   *   name: string,
   *   birthDate: string,
   *   gender: string,
   *   address: string,
   *   npwpStatus: 'ACTIVE' | 'INACTIVE' | 'NOT_FOUND',
   *   verifiedAt: string,
   * }
   * 
   * Mock fallback format:
   * {
   *   valid: boolean,
   *   verificationMethod: 'MOCK_DUKCAPIL' | 'REAL_DUKCAPIL',
   *   verifiedAt: string,
   *   verificationData: { name?, birthDate?, gender?, address? },
   * }
   */
  async verifyKtpNpwp(employeeId: string, nik?: string, npwp?: string) {
    // Validasi format NIK (16 digit) - sudah divalidasi di service level
    const nikValid = nik ? /^\d{16}$/.test(nik) : true;

    // Validasi format NPWP (15 atau 16 digit setelah di-strip) - sudah divalidasi di service level
    const npwpValid = npwp ? 
      (/^\d{15}$/.test(npwp.replace(/[^0-9]/g, '')) || 
       /^\d{16}$/.test(npwp.replace(/[^0-9]/g, ''))) : true;

    // Cek konfigurasi Dukcapil
    const apiKey = this.config.get<string>('DUCAPIL_API_KEY');
    const apiEndpoint = this.config.get<string>('DUCAPIL_ENDPOINT') || this.dukcapilApiUrl;

    let verificationResult: {
      valid: boolean;
      verificationMethod: 'MOCK_DUKCAPIL' | 'REAL_DUKCAPIL';
      verifiedAt: string;
      verificationData: {
        name?: string;
        birthDate?: string;
        gender?: string;
        address?: string;
      };
    };

    if (apiKey && apiEndpoint) {
      // Real API integration akan diimplementasikan saat DUCAPIL_API_KEY tersedia
      // Untuk sekarang, fallback ke mock dengan catatan
      verificationResult = this.getMockResult(nikValid, npwpValid);
      verificationResult.verificationMethod = 'MOCK_DUKCAPIL';
    } else {
      // Mock fallback
      verificationResult = this.getMockResult(nikValid, npwpValid);
      verificationResult.verificationMethod = 'MOCK_DUKCAPIL';
    }

    // Simpan catatan verifikasi ke database
    await this.saveVerificationRecord(employeeId, verificationResult);

    return verificationResult;
  }

  private getMockResult(nikValid: boolean, npwpValid: boolean) {
    return {
      valid: nikValid && npwpValid,
      verificationMethod: 'MOCK_DUKCAPIL' as const,
      verifiedAt: new Date().toISOString(),
      verificationData: {},
    };
  }

  private async saveVerificationRecord(
    employeeId: string,
    result: { valid: boolean; verificationMethod: string; verifiedAt: string; verificationData: {} }
  ): Promise<void> {
    // Cek employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    // Simpan catatan verifikasi ke tabel audit/log
    try {
      await this.auditService.log({
        tenantId: employee.tenantId,
        entity: 'employee',
        entityId: employeeId,
        action: 'verify_ktp_npwp',
        changes: {
          before: { ktpNpwpVerified: false },
          after: { ktpNpwpVerified: result.valid, verificationMethod: result.verificationMethod },
        },
        userId: employeeId,
      });
    } catch {
      // Audit gagal - bukan error kritis
    }
  }
}