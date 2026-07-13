import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
export class RosterEntryItem {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;
  @ApiProperty()
  @IsUUID()
  shiftId!: string;
  @ApiProperty()
  @IsDateString()
  date!: string;
}
export class RosterEntryDto {
  @ApiProperty({ type: [RosterEntryItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RosterEntryItem)
  entries!: RosterEntryItem[];
}
