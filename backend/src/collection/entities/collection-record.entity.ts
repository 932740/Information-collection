import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { CollectionTemplate } from './collection-template.entity';
import { CollectionToken } from './collection-token.entity';

@Entity('collection_records')
export class CollectionRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_id' })
  templateId: number;

  @Column({ name: 'token_id', unique: true })
  tokenId: number;

  @Column({ type: 'simple-json' })
  data: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => CollectionTemplate, (template) => template.records, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: CollectionTemplate;

  @OneToOne(() => CollectionToken, (token) => token.record)
  @JoinColumn({ name: 'token_id' })
  token: CollectionToken;
}
