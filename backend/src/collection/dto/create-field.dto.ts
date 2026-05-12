import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsObject } from 'class-validator';
import { FieldType } from '../entities/collection-field.entity';

export class CreateFieldDto {
  @IsString()
  name: string;

  @IsString()
  label: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}
