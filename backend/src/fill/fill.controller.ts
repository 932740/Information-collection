import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { TokenGuard } from './guards/token.guard';
import { FillService } from './fill.service';

@Controller('fill')
export class FillController {
  constructor(private readonly fillService: FillService) {}

  @Public()
  @UseGuards(TokenGuard)
  @Get(':token')
  getTemplate(@Request() req) {
    return this.fillService.getTemplateByToken(req.tokenEntity);
  }

  @Public()
  @UseGuards(TokenGuard)
  @Post(':token')
  submitFill(@Request() req, @Body() body: { data: Record<string, unknown> }) {
    return this.fillService.submitFill(req.tokenEntity, body.data);
  }
}
