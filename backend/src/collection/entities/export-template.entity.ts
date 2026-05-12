import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CollectionTemplate } from './collection-template.entity';

@Entity('export_templates')
export class ExportTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id' })
  templateId: number;

  @Column({ length: 256 })
  name: string;

  @Column({ name: 'excel_path', length: 512, nullable: true })
  excelPath: string;

  @Column({ type: 'simple-json', nullable: true })
  excelConfig: {
    sheet: string;
    mappings: { fieldId: number; cell: string }[];
    totalCell?: string;
  };

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CollectionTemplate, (template) => template.exportTemplates, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: CollectionTemplate;
}
