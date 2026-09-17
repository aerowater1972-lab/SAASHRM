-- SKB cuti bersama: HolidayType.COLLECTIVE untuk pemotongan cuti tahunan otomatis.
-- Verified applied on dev via db execute before marking applied.
ALTER TYPE "HolidayType" ADD VALUE 'COLLECTIVE';
