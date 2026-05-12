import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionTemplate } from './entities/collection-template.entity';
import { CollectionField } from './entities/collection-field.entity';
import { CollectionToken } from './entities/collection-token.entity';
import { ExportTemplate } from './entities/export-template.entity';
import { CollectionService } from './collection.service';
import { CollectionController } from './collection.controller';
import { ExportTemplateService } from './export-template.service';
import { ExportTemplateController } from './export-template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CollectionTemplate, CollectionField, CollectionToken, ExportTemplate])],
  providers: [CollectionService, ExportTemplateService],
  controllers: [CollectionController, ExportTemplateController],
  exports: [CollectionService, ExportTemplateService],
})
export class CollectionModule {}
