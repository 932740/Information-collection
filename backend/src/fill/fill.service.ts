import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionToken, TokenStatus } from '../collection/entities/collection-token.entity';
import { CollectionRecord } from '../collection/entities/collection-record.entity';
import { FieldType } from '../collection/entities/collection-field.entity';

@Injectable()
export class FillService {
  constructor(
    @InjectRepository(CollectionToken)
    private readonly tokenRepo: Repository<CollectionToken>,
    @InjectRepository(CollectionRecord)
    private readonly recordRepo: Repository<CollectionRecord>,
  ) {}

  getTemplateByToken(tokenEntity: CollectionToken) {
    const template = tokenEntity.template;
    const fields = (template.fields || []).sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      title: template.title,
      fields: fields.map((f) => ({
        id: f.id,
        name: f.name,
        label: f.label,
        type: f.type,
        options: f.options,
        required: f.required,
        sortOrder: f.sortOrder,
      })),
    };
  }

  async submitFill(tokenEntity: CollectionToken, data: Record<string, unknown>) {
    if (tokenEntity.status !== TokenStatus.PENDING) {
      throw new BadRequestException('该链接已填写');
    }
    const fields = tokenEntity.template.fields || [];
    for (const field of fields) {
      const value = data[field.name];
      if (field.required && (value === undefined || value === null || value === '')) {
        throw new BadRequestException(`字段 ${field.label} 为必填项`);
      }
      if (value !== undefined && value !== null && value !== '') {
        this.validateFieldValue(field.type, field.options, value, field.label);
      }
    }
    const record = this.recordRepo.create({
      templateId: tokenEntity.templateId,
      tokenId: tokenEntity.id,
      data,
    });
    const saved = await this.recordRepo.save(record);
    tokenEntity.status = TokenStatus.FILLED;
    tokenEntity.filledAt = new Date();
    tokenEntity.recordId = saved.id;
    await this.tokenRepo.save(tokenEntity);
    return { success: true, message: '提交成功' };
  }

  private validateFieldValue(
    type: FieldType,
    options: Record<string, unknown> | null,
    value: unknown,
    label: string,
  ) {
    switch (type) {
      case FieldType.NUMBER:
        if (typeof value !== 'number' && isNaN(Number(value))) {
          throw new BadRequestException(`字段 ${label} 必须为数字`);
        }
        break;
      case FieldType.DATE:
        if (isNaN(Date.parse(String(value)))) {
          throw new BadRequestException(`字段 ${label} 必须为有效日期`);
        }
        break;
      case FieldType.SELECT:
        if (options?.options && Array.isArray(options.options)) {
          if (!options.options.includes(value)) {
            throw new BadRequestException(`字段 ${label} 选项无效`);
          }
        }
        break;
      case FieldType.MULTI_SELECT:
        if (!Array.isArray(value)) {
          throw new BadRequestException(`字段 ${label} 必须为数组`);
        }
        if (options?.options && Array.isArray(options.options)) {
          for (const v of value) {
            if (!options.options.includes(v)) {
              throw new BadRequestException(`字段 ${label} 选项无效`);
            }
          }
        }
        break;
      case FieldType.RATING:
        {
          const num = Number(value);
          const max = Number(options?.max || 5);
          if (!Number.isInteger(num) || num < 1 || num > max) {
            throw new BadRequestException(`字段 ${label} 评分必须在 1-${max} 之间`);
          }
        }
        break;
    }
  }
}
