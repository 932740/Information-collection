import { IsString, IsArray, IsNumber } from 'class-validator';

class MappingDto {
  @IsNumber()
  fieldId: number;

  @IsString()
  cell: string;
}

export class SaveExcelConfigDto {
  @IsString()
  sheet: string;

  @IsArray()
  mappings: MappingDto[];
}
