import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionTemplate } from './entities/collection-template.entity';
import { CollectionField } from './entities/collection-field.entity';
import { CollectionToken } from './entities/collection-token.entity';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { SaveExcelConfigDto } from './dto/save-excel-config.dto';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as xlsx from 'xlsx';

@Injectable()
export class CollectionService {
  constructor(
    @InjectRepository(CollectionTemplate)
    private readonly templateRepo: Repository<CollectionTemplate>,
    @InjectRepository(CollectionField)
    private readonly fieldRepo: Repository<CollectionField>,
    @InjectRepository(CollectionToken)
    private readonly tokenRepo: Repository<CollectionToken>,
  ) {}

  findAllTemplates() {
    return this.templateRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findTemplateById(id: number) {
    const template = await this.templateRepo.findOne({
      where: { id },
      relations: ['fields', 'tokens'],
    });
    if (!template) {
      throw new NotFoundException('模板不存在');
    }
    return template;
  }

  async createTemplate(dto: CreateTemplateDto) {
    const template = this.templateRepo.create({
      title: dto.title,
      description: dto.description,
      status: dto.status,
    });
    if (dto.fields && dto.fields.length > 0) {
      template.fields = dto.fields.map((f) => this.fieldRepo.create(f));
    }
    return this.templateRepo.save(template);
  }

  async updateTemplate(id: number, dto: UpdateTemplateDto) {
    const template = await this.findTemplateById(id);
    if (dto.title !== undefined) template.title = dto.title;
    if (dto.description !== undefined) template.description = dto.description;
    if (dto.status !== undefined) template.status = dto.status;
    return this.templateRepo.save(template);
  }

  async deleteTemplate(id: number) {
    const template = await this.findTemplateById(id);
    if (template.excelTemplatePath) {
      try {
        fs.unlinkSync(template.excelTemplatePath);
      } catch {
        // ignore
      }
    }
    await this.templateRepo.remove(template);
  }

  async addField(templateId: number, dto: CreateFieldDto) {
    const template = await this.findTemplateById(templateId);
    const field = this.fieldRepo.create({ ...dto, templateId: template.id });
    return this.fieldRepo.save(field);
  }

  async updateField(templateId: number, fieldId: number, dto: UpdateFieldDto) {
    await this.findTemplateById(templateId);
    const field = await this.fieldRepo.findOne({ where: { id: fieldId, templateId } });
    if (!field) {
      throw new NotFoundException('字段不存在');
    }
    Object.assign(field, dto);
    return this.fieldRepo.save(field);
  }

  async deleteField(templateId: number, fieldId: number) {
    await this.findTemplateById(templateId);
    const field = await this.fieldRepo.findOne({ where: { id: fieldId, templateId } });
    if (!field) {
      throw new NotFoundException('字段不存在');
    }
    await this.fieldRepo.remove(field);
  }

  async saveExcelConfig(templateId: number, dto: SaveExcelConfigDto) {
    const template = await this.findTemplateById(templateId);
    template.excelConfig = { sheet: dto.sheet, mappings: dto.mappings };
    return this.templateRepo.save(template);
  }

  async createToken(templateId: number) {
    const template = await this.findTemplateById(templateId);
    const token = this.tokenRepo.create({
      templateId: template.id,
      token: uuidv4(),
    });
    return this.tokenRepo.save(token);
  }

  async findTokensByTemplate(templateId: number) {
    await this.findTemplateById(templateId);
    return this.tokenRepo.find({
      where: { templateId },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteToken(templateId: number, tokenId: number) {
    await this.findTemplateById(templateId);
    const token = await this.tokenRepo.findOne({ where: { id: tokenId, templateId } });
    if (!token) {
      throw new NotFoundException('Token 不存在');
    }
    await this.tokenRepo.remove(token);
  }

  async saveExcelTemplate(templateId: number, file: Express.Multer.File) {
    const dir = './data/templates';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, `${templateId}.xlsx`);
    fs.writeFileSync(filePath, file.buffer);
    const template = await this.findTemplateById(templateId);
    template.excelTemplatePath = filePath;
    await this.templateRepo.save(template);
    return filePath;
  }

  extractFieldCandidates(filePath: string): string[] {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const range = xlsx.utils.decode_range(sheet['!ref'] || 'A1');
    const candidates: string[] = [];
    for (let row = range.s.r; row <= range.e.r; row++) {
      const cellRef = xlsx.utils.encode_cell({ r: row, c: 0 });
      const cell = sheet[cellRef];
      if (cell && cell.v) {
        const text = String(cell.v).trim();
        if (text) {
          candidates.push(text);
        }
      }
    }
    return candidates;
  }
}
