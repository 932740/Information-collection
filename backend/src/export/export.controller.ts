import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Query,
  Body,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { ExportService } from "./export.service";
import * as fs from "fs";

@Controller("exports")
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get("single/:recordId")
  async exportSingle(
    @Param("recordId", ParseIntPipe) recordId: number,
    @Query("exportTemplateId") exportTemplateId?: string,
    @Res() res?: Response,
  ) {
    const etId = exportTemplateId ? Number(exportTemplateId) : undefined;
    const filePath = await this.exportService.exportSingle(recordId, etId);
    const name = filePath.split(/[/\\\\]/).pop() || "export.xlsx";
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(name)}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on("close", () => {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
    });
  }

  @Post("batch")
  async exportBatch(
    @Body() body: { recordIds: number[]; exportTemplateId?: number },
    @Res() res: Response,
  ) {
    const filePath = await this.exportService.exportBatch(body.recordIds, body.exportTemplateId);
    const name = filePath.split(/[/\\\\]/).pop() || "batch.zip";
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(name)}"`);
    res.setHeader("Content-Type", "application/zip");
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    stream.on("close", () => {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
    });
  }
}
