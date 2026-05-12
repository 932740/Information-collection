import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionRecord } from '../collection/entities/collection-record.entity';
import { RecordService } from './record.service';
import { RecordController } from './record.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CollectionRecord])],
  providers: [RecordService],
  controllers: [RecordController],
})
export class RecordModule {}
