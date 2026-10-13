import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsUUID } from 'class-validator';
import { TICKET_STATUSES } from '../helpdesk-ticket.service';

export class BulkAssignTicketsDto {
  @ApiProperty({ description: 'Daftar ID ticket (maks 100)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ description: 'ID user assignee' })
  @IsUUID('4')
  assignedToId!: string;
}

export class BulkUpdateTicketStatusDto {
  @ApiProperty({ description: 'Daftar ID ticket (maks 100)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids!: string[];

  @ApiProperty({ description: 'Status tujuan', enum: TICKET_STATUSES })
  @IsIn(TICKET_STATUSES as unknown as string[])
  status!: (typeof TICKET_STATUSES)[number];
}
