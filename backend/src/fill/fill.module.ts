import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectionToken } from '../collection/entities/collection-token.entity';
import { CollectionRecord } from '../collection/entities/collection-record.entity';
import { FillService } from './fill.service';
import { FillController } from './fill.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CollectionToken, CollectionRecord])],
  providers: [FillService],
  controllers: [FillController],
})
export class FillModule {}
