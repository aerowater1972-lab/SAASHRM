import { IsString, IsOptional } from 'class-validator';

export class AiExplainQuery {
  @IsString()
  @IsOptional()
  readonly id: string = '';
}
