-- Status COMPLETED (offboarding selesai, beda dari CANCELLED) + tipe config BPJS per program
-- Postgres 12+ mendukung ALTER TYPE ... ADD VALUE di dalam transaksi migrasi.
ALTER TYPE "RequestStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "BpjsType" ADD VALUE 'JKK';
ALTER TYPE "BpjsType" ADD VALUE 'JKM';
ALTER TYPE "BpjsType" ADD VALUE 'JHT';
ALTER TYPE "BpjsType" ADD VALUE 'JP';
