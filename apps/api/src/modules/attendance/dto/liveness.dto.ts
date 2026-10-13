import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

export class LivenessEventDto {
  @ApiProperty({ enum: ['BLINK', 'TURN_HEAD'], description: 'Gerakan yang diselesaikan' })
  @IsIn(['BLINK', 'TURN_HEAD'])
  action!: 'BLINK' | 'TURN_HEAD';

  @ApiProperty({ description: 'Epoch ms saat gerakan selesai', example: 1760371200000 })
  @IsNumber()
  at!: number;
}

export class VerifyLivenessDto {
  @ApiProperty({ description: 'Challenge id dari POST liveness/challenge' })
  @IsString()
  challengeId!: string;

  @ApiProperty({
    description: 'Urutan gerakan yang diselesaikan (harus sama dengan challenge)',
    type: [LivenessEventDto],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LivenessEventDto)
  events!: LivenessEventDto[];
}
