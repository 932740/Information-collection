import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExportTemplate } from './entities/export-template.entity';
import { CollectionTemplate } from './entities/collection-template.entity';
import { CollectionField } from './entities/collection-field.entity';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

@Injectable()
export class ExportTemplateService {
  constructor(
    @InjectRepository(ExportTemplate)
    private readonly exportRepo: Repository<ExportTemplate>,
    @InjectRepository(CollectionTemplate)
    private readonly templateRepo: Repository<CollectionTemplate>,
    @InjectRepository(CollectionField)
    private readonly fieldRepo: Repository<CollectionField>,
  ) {}

  async findByTemplateId(templateId: number) {
    return this.exportRepo.find({
      where: { templateId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(templateId: number, name: string, file?: Express.Multer.File) {
    const template = await this.templateRepo.findOne({ where: { id: templateId } });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }
    const exportTemplate = this.exportRepo.create({
      templateId,
      name,
    });
    if (file) {
      const dir = './data/export-templates';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const ext = path.extname(file.originalname) || '.xlsx';
      const fileName = `${templateId}_${Date.now()}${ext}`;
      const filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, file.buffer);
      exportTemplate.excelPath = filePath;
    }
    return this.exportRepo.save(exportTemplate);
  }

  async updateConfig(
    templateId: number,
    exportId: number,
    config: { sheet: string; mappings: { fieldId: number; cell: string }[] },
  ) {
    const et = await this.exportRepo.findOne({ where: { id: exportId, templateId } });
    if (!et) {
      throw new NotFoundException('导出模板不存在');
    }
    et.excelConfig = config;
    return this.exportRepo.save(et);
  }

  async setDefault(templateId: number, exportId: number) {
    await this.exportRepo.update({ templateId }, { isDefault: false });
    const et = await this.exportRepo.findOne({ where: { id: exportId, templateId } });
    if (!et) {
      throw new NotFoundException('导出模板不存在');
    }
    et.isDefault = true;
    return this.exportRepo.save(et);
  }

  async delete(templateId: number, exportId: number) {
    const et = await this.exportRepo.findOne({ where: { id: exportId, templateId } });
    if (!et) {
      throw new NotFoundException('导出模板不存在');
    }
    if (et.excelPath && fs.existsSync(et.excelPath)) {
      try {
        fs.unlinkSync(et.excelPath);
      } catch {
        // ignore
      }
    }
    await this.exportRepo.remove(et);
  }

  async findById(id: number) {
    const et = await this.exportRepo.findOne({ where: { id } });
    if (!et) {
      throw new NotFoundException('导出模板不存在');
    }
    return et;
  }

  async autoMap(templateId: number, exportId: number) {
    const et = await this.exportRepo.findOne({ where: { id: exportId, templateId } });
    if (!et) {
      throw new NotFoundException('导出模板不存在');
    }
    if (!et.excelPath || !fs.existsSync(et.excelPath)) {
      throw new NotFoundException('导出模板文件不存在');
    }

    const fields = await this.fieldRepo.find({ where: { templateId } });
    const fieldMap = new Map<string, CollectionField>();
    for (const f of fields) {
      fieldMap.set(f.label.trim(), f);
      fieldMap.set(f.name.trim(), f);
    }

    const workbook = xlsx.readFile(et.excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1');

    const mappings: { fieldId: number; cell: string }[] = [];
    const usedFieldIds = new Set<number>();

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const labelCellRef = xlsx.utils.encode_cell({ r: row, c: col });
        const labelCell = sheet[labelCellRef];
        if (!labelCell || !labelCell.v) continue;

        const labelText = String(labelCell.v).trim();
        if (!labelText) continue;

        const matchedField = fieldMap.get(labelText);
        if (matchedField && !usedFieldIds.has(matchedField.id)) {
          mappings.push({ fieldId: matchedField.id, cell: labelCellRef });
          usedFieldIds.add(matchedField.id);
        }
      }
    }

    const config = {
      sheet: sheetName,
      mappings,
    };

    et.excelConfig = config;
    await this.exportRepo.save(et);

    return {
      sheet: sheetName,
      mappings,
      matchedCount: mappings.length,
      totalFields: fields.length,
    };
  }
}
