import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CollectionRecord } from '../collection/entities/collection-record.entity';

@Injectable()
export class RecordService {
  constructor(
    @InjectRepository(CollectionRecord)
    private readonly recordRepo: Repository<CollectionRecord>,
  ) {}

  async findAll(query: {
    templateId?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
    limit?: string;
  }) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const where: Record<string, unknown> = {};
    if (query.templateId) {
      where.templateId = parseInt(query.templateId, 10);
    }
    if (query.startDate && query.endDate) {
      where.createdAt = Between(new Date(query.startDate), new Date(query.endDate));
    } else if (query.startDate) {
      where.createdAt = Between(new Date(query.startDate), new Date());
    } else if (query.endDate) {
      where.createdAt = Between(new Date('1970-01-01'), new Date(query.endDate));
    }
    const [items, total] = await this.recordRepo.findAndCount({
      where,
      relations: ['template'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const flatItems = items.map((item: any) => ({
      id: item.id,
      templateId: item.templateId,
      templateTitle: item.template?.title || '',
      tokenId: item.tokenId,
      data: item.data,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
    return { items: flatItems, total, page, limit };
  }

  private async findEntityById(id: number): Promise<CollectionRecord> {
    const record = await this.recordRepo.findOne({
      where: { id },
      relations: ['template', 'template.fields', 'token'],
    });
    if (!record) {
      throw new NotFoundException('记录不存在');
    }
    return record;
  }

  async findById(id: number) {
    const record = await this.findEntityById(id);
    return {
      id: record.id,
      templateId: record.templateId,
      templateTitle: record.template?.title || '',
      tokenId: record.tokenId,
      data: record.data,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      fields: (record.template?.fields || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        label: f.label,
        type: f.type,
        options: f.options,
        required: f.required,
      })),
    };
  }

  async update(id: number, data: Record<string, unknown>) {
    const record = await this.findEntityById(id);
    record.data = data;
    return this.recordRepo.save(record);
  }

  async remove(id: number) {
    const record = await this.findEntityById(id);
    await this.recordRepo.remove(record);
  }
}
