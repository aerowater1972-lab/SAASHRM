import { ApiProperty } from '@nestjs/swagger';
export class ApiResponse<T = any> {
  @ApiProperty()
  success!: boolean;
  @ApiProperty()
  message!: string;
  @ApiProperty()
  data!: T;
  @ApiProperty({ required: false })
  meta?: PaginationMeta;
  @ApiProperty({ required: false })
  error?: string;
  static ok<T>(data: T, message = 'Success', meta?: PaginationMeta): ApiResponse<T> {
    return { success: true, message, data, meta };
  }
  static fail(message: string, error?: string): ApiResponse<null> {
    return { success: false, message, data: null, error };
  }
}
export class PaginationMeta {
  @ApiProperty()
  total!: number;
  @ApiProperty()
  page!: number;
  @ApiProperty()
  limit!: number;
  @ApiProperty()
  totalPages!: number;
}
