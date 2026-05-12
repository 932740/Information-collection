import {
  Controller, Get, Post, Put, Delete, Param, ParseIntPipe, Body,
  UseInterceptors, UploadedFile, Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExportTemplateService } from './export-template.service';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('templates/:templateId/export-templates')
export class ExportTemplateController {
  constructor(private readonly exportTemplateService: ExportTemplateService) {}

  @Get()
  findAll(@Param('templateId', ParseIntPipe) templateId: number) {
    return this.exportTemplateService.findByTemplateId(templateId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Param('templateId', ParseIntPipe) templateId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
  ) {
    if (!name) { name = file?.originalname || '未命名模板'; }
    return this.exportTemplateService.create(templateId, name, file);
  }

  @Get(':exportId/download')
  async download(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('exportId', ParseIntPipe) exportId: number,
    @Res() res: Response,
  ) {
    const et = await this.exportTemplateService.findByTemplateId(templateId);
    const item = et.find((e) => e.id === exportId);
    if (!item || !item.excelPath || !fs.existsSync(item.excelPath)) {
      return res.status(404).send('File not found');
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(item.name)}.xlsx"`);
    const stream = fs.createReadStream(item.excelPath);
    stream.pipe(res);
  }

  @Put(':exportId/config')
  async updateConfig(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('exportId', ParseIntPipe) exportId: number,
    @Body() body: { sheet: string; mappings: { fieldId: number; cell: string }[] },
  ) {
    return this.exportTemplateService.updateConfig(templateId, exportId, body);
  }

  @Post(':exportId/auto-map')
  async autoMap(
    @Param('templateId', ParseIntPipe) templateId: number,
    @Param('exportId', ParseIntPipe) exportId: number,
  ) {
    return this.exportTemplateService.autoMap(templateId, exportId);
  }

  @Put(':exportId/default')
  async setDefault(@Param('templateId', ParseIntPipe) templateId: number, @Param('exportId', ParseIntPipe) exportId: number) {
    return this.exportTemplateService.setDefault(templateId, exportId);
  }

  @Delete(':exportId')
  async remove(@Param('templateId', ParseIntPipe) templateId: number, @Param('exportId', ParseIntPipe) exportId: number) {
    return this.exportTemplateService.delete(templateId, exportId);
  }
}
