import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
export class UploadPhotoDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file!: Express.Multer.File;
}
