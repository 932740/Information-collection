import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CollectionTemplate } from './collection-template.entity';

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  RATING = 'rating',
}

@Entity('collection_fields')
export class CollectionField {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id' })
  templateId: number;

  @Column({ length: 64 })
  name: string;

  @Column({ length: 128 })
  label: string;

  @Column({
    type: 'simple-enum',
    enum: FieldType,
    default: FieldType.TEXT,
  })
  type: FieldType;

  @Column({ type: 'simple-json', nullable: true })
  options: Record<string, unknown>;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ default: false })
  required: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => CollectionTemplate, (template) => template.fields, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: CollectionTemplate;
}
