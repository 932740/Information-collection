import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { CollectionField } from './collection-field.entity';
import { CollectionToken } from './collection-token.entity';
import { CollectionRecord } from './collection-record.entity';
import { ExportTemplate } from './export-template.entity';

export enum TemplateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('collection_templates')
export class CollectionTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 256 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'simple-enum',
    enum: TemplateStatus,
    default: TemplateStatus.ACTIVE,
  })
  status: TemplateStatus;

  @Column({ name: 'excel_template_path', length: 512, nullable: true })
  excelTemplatePath: string;

  @Column({ type: 'simple-json', nullable: true })
  excelConfig: { sheet: string; mappings: { fieldId: number; cell: string }[] };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => CollectionField, (field) => field.template, {
    cascade: true,
  })
  fields: CollectionField[];

  @OneToMany(() => CollectionToken, (token) => token.template, {
    cascade: true,
  })
  tokens: CollectionToken[];

  @OneToMany(() => CollectionRecord, (record) => record.template, {
    cascade: true,
  })
  records: CollectionRecord[];

  @OneToMany(() => ExportTemplate, (et) => et.template, {
    cascade: true,
  })
  exportTemplates: ExportTemplate[];
}
