import { IsInt, Min, Max, IsOptional } from 'class-validator';

export class AiReadinessQuery {
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  readonly limit = 20;
}
