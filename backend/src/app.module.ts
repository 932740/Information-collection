import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { CollectionModule } from './collection/collection.module';
import { FillModule } from './fill/fill.module';
import { RecordModule } from './record/record.module';
import { ExportModule } from './export/export.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { CollectionTemplate } from './collection/entities/collection-template.entity';
import { CollectionField } from './collection/entities/collection-field.entity';
import { CollectionToken } from './collection/entities/collection-token.entity';
import { CollectionRecord } from './collection/entities/collection-record.entity';
import { ExportTemplate } from './collection/entities/export-template.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || './info-collection.db',
      entities: [
        CollectionTemplate,
        CollectionField,
        CollectionToken,
        CollectionRecord,
        ExportTemplate,
      ],
      synchronize: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
      exclude: ["/api/(.*)"],
      serveStaticOptions: {
        maxAge: 0,
        setHeaders: (res: any) => {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        },
      },
    }),
    CommonModule,
    AuthModule,
    CollectionModule,
    FillModule,
    RecordModule,
    ExportModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
