import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { CollectionTemplate } from './collection-template.entity';
import { CollectionRecord } from './collection-record.entity';

export enum TokenStatus {
  PENDING = 'pending',
  FILLED = 'filled',
}

@Entity('collection_tokens')
export class CollectionToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id' })
  templateId: number;

  @Column({ length: 36, unique: true })
  token: string;

  @Column({
    type: 'simple-enum',
    enum: TokenStatus,
    default: TokenStatus.PENDING,
  })
  status: TokenStatus;

  @Column({ name: 'record_id', nullable: true })
  recordId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'filled_at', nullable: true })
  filledAt: Date;

  @ManyToOne(() => CollectionTemplate, (template) => template.tokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: CollectionTemplate;

  @OneToOne(() => CollectionRecord, (record) => record.token)
  record: CollectionRecord;
}
