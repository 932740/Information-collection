import { CanActivate, ExecutionContext, GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectionToken, TokenStatus } from '../../collection/entities/collection-token.entity';

@Injectable()
export class TokenGuard implements CanActivate {
  constructor(
    @InjectRepository(CollectionToken)
    private readonly tokenRepo: Repository<CollectionToken>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tokenValue = request.params.token;
    const tokenEntity = await this.tokenRepo.findOne({
      where: { token: tokenValue },
      relations: ['template', 'template.fields'],
    });
    if (!tokenEntity) {
      throw new NotFoundException('链接无效');
    }
    if (tokenEntity.status === TokenStatus.FILLED) {
      throw new GoneException('该链接已填写');
    }
    request.tokenEntity = tokenEntity;
    return true;
  }
}
