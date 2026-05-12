import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import axios from "axios";
import { CollectionRecord } from "../collection/entities/collection-record.entity";
import { CollectionTemplate } from "../collection/entities/collection-template.entity";
import { ExportTemplate } from "../collection/entities/export-template.entity";
import { CollectionField } from "../collection/entities/collection-field.entity";
import * as fs from "fs";

interface MappingItem {
  fieldId: number;
  cell: string;
}

@Injectable()
export class ExportService {
  private readonly pythonUrl: string;

  constructor(
    @InjectRepository(CollectionRecord)
    private readonly recordRepo: Repository<CollectionRecord>,
    @InjectRepository(CollectionTemplate)
    private readonly templateRepo: Repository<CollectionTemplate>,
    @InjectRepository(ExportTemplate)
    private readonly exportTemplateRepo: Repository<ExportTemplate>,
    @InjectRepository(CollectionField)
    private readonly fieldRepo: Repository<CollectionField>,
  ) {
    this.pythonUrl = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";
  }

  private async resolveExportTemplate(record: CollectionRecord, exportTemplateId?: number): Promise<{ path: string; config: any }> {
    if (exportTemplateId) {
      const et = await this.exportTemplateRepo.findOne({ where: { id: exportTemplateId, templateId: record.templateId } });
      if (!et) { throw new NotFoundException("导出模板不存在"); }
      if (!et.excelPath || !fs.existsSync(et.excelPath)) {
        throw new InternalServerErrorException("导出模板文件不存在");
      }
      return { path: et.excelPath, config: et.excelConfig };
    }
    const template = record.template;
    if (!template.excelTemplatePath || !fs.existsSync(template.excelTemplatePath)) {
      throw new InternalServerErrorException("Excel 模板文件不存在");
    }
    return { path: template.excelTemplatePath, config: template.excelConfig };
  }

  private async normalizeMappings(templateId: number, mappings: MappingItem[]): Promise<{ field_id: string; cell: string }[]> {
    if (!mappings || mappings.length === 0) return [];
    const fields = await this.fieldRepo.find({ where: { templateId } });
    const fieldMap = new Map<number, string>();
    for (const f of fields) { fieldMap.set(f.id, f.name); }
    const result: { field_id: string; cell: string }[] = [];
    for (const m of mappings) {
      const name = fieldMap.get(m.fieldId);
      if (name !== undefined) result.push({ field_id: name, cell: m.cell });
    }
    return result;
  }

  async exportSingle(recordId: number, exportTemplateId?: number) {
    const record = await this.recordRepo.findOne({ where: { id: recordId }, relations: ["template"] });
    if (!record) throw new NotFoundException("记录不存在");
    const et = await this.resolveExportTemplate(record, exportTemplateId);
    const outputName = this.getOutputName(record);
    const nameMappings = await this.normalizeMappings(record.templateId, et.config?.mappings || []);
    const payload = {
      template_path: et.path,
      sheet: et.config?.sheet || "Sheet1",
      mappings: nameMappings,
      record_data: record.data,
      output_name: outputName,
    };
    const response = await axios.post(`${this.pythonUrl}/export/single`, payload);
    return response.data.file_path as string;
  }

  async exportBatch(recordIds: number[], exportTemplateId?: number) {
    if (recordIds.length === 0) throw new BadRequestException("未选择记录");
    if (recordIds.length > 100) throw new BadRequestException("单次最多导出 100 条");
    const records = await this.recordRepo.find({ where: recordIds.map((id) => ({ id })), relations: ["template"] });
    if (records.length === 0) throw new NotFoundException("记录不存在");
    const templateId = records[0].templateId;
    if (records.some((r) => r.templateId !== templateId)) throw new BadRequestException("批量导出必须选择同一模板的记录");
    const et = await this.resolveExportTemplate(records[0], exportTemplateId);
    const outputZipName = `批量导出_${records[0].template.title}_${Date.now()}.zip`;
    const nameMappings = await this.normalizeMappings(templateId, et.config?.mappings || []);
    const payload = {
      template_path: et.path,
      sheet: et.config?.sheet || "Sheet1",
      mappings: nameMappings,
      records: records.map((r) => ({ data: r.data, output_name: this.getOutputName(r) })),
      output_zip_name: outputZipName,
    };
    const response = await axios.post(`${this.pythonUrl}/export/batch`, payload);
    return response.data.file_path as string;
  }

  private getOutputName(record: CollectionRecord): string {
    const data = record.data as Record<string, unknown>;
    const name = String(data["name"] || data["xingming"] || `未命名_${record.id}`);
    return name.replace(/[\\/:*?"<>|]/g, "_") + ".xlsx";
  }
}
