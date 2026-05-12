import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { CollectionRecord } from '../collection/entities/collection-record.entity';
import { CollectionTemplate } from '../collection/entities/collection-template.entity';
import { ExportTemplate } from '../collection/entities/export-template.entity';
import { CollectionField } from '../collection/entities/collection-field.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CollectionRecord, CollectionTemplate, ExportTemplate, CollectionField])],
  providers: [ExportService],
  controllers: [ExportController],
})
export class ExportModule {}
