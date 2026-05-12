import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';

@Injectable()
export class AuthService {
  private readonly adminUsername: string;
  private readonly adminPasswordHash: string;

  constructor(private readonly jwtService: JwtService) {
    this.adminUsername = process.env.ADMIN_USERNAME || 'admin';
    this.adminPasswordHash =
      process.env.ADMIN_PASSWORD_HASH ||
      createHash('sha256').update('admin123').digest('hex');
  }

  login(username: string, password: string) {
    if (username !== this.adminUsername) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const hash = createHash('sha256').update(password).digest('hex');
    if (hash !== this.adminPasswordHash) {
      throw new UnauthorizedException('用户名或密码错误');
    }
    const payload = { sub: 1, username };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
