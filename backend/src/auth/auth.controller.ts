import { Controller, Post, Body } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }
}
