import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CollectionService } from './collection.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { SaveExcelConfigDto } from './dto/save-excel-config.dto';

@Controller('templates')
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  findAll() {
    return this.collectionService.findAllTemplates();
  }

  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.collectionService.createTemplate(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.collectionService.findTemplateById(id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateDto) {
    return this.collectionService.updateTemplate(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.collectionService.deleteTemplate(id);
  }

  @Post(':id/fields')
  addField(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateFieldDto) {
    return this.collectionService.addField(id, dto);
  }

  @Put(':id/fields/:fieldId')
  updateField(
    @Param('id', ParseIntPipe) id: number,
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @Body() dto: UpdateFieldDto,
  ) {
    return this.collectionService.updateField(id, fieldId, dto);
  }

  @Delete(':id/fields/:fieldId')
  removeField(
    @Param('id', ParseIntPipe) id: number,
    @Param('fieldId', ParseIntPipe) fieldId: number,
  ) {
    return this.collectionService.deleteField(id, fieldId);
  }

  @Post(':id/upload-excel')
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcel(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const filePath = await this.collectionService.saveExcelTemplate(id, file);
    const candidates = this.collectionService.extractFieldCandidates(filePath);
    return { filePath, candidates };
  }

  @Post(':id/excel-config')
  saveExcelConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveExcelConfigDto,
  ) {
    return this.collectionService.saveExcelConfig(id, dto);
  }

  @Post(':id/tokens')
  createToken(@Param('id', ParseIntPipe) id: number) {
    return this.collectionService.createToken(id);
  }

  @Get(':id/tokens')
  findTokens(@Param('id', ParseIntPipe) id: number) {
    return this.collectionService.findTokensByTemplate(id);
  }

  @Delete(':id/tokens/:tokenId')
  removeToken(
    @Param('id', ParseIntPipe) id: number,
    @Param('tokenId', ParseIntPipe) tokenId: number,
  ) {
    return this.collectionService.deleteToken(id, tokenId);
  }
}
