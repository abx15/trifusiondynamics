import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  ExchangeCodeDto,
  GenerateExchangeCodeDto,
} from './dto/exchange-code.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { type JwtPayload } from '@agency-os/types';
import { type Request, type Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getIpAndUserAgent(req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return { ip, userAgent };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd && !cookieDomain ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    res.cookie('access_token', accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.cookie('refresh_token', refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

    const clearOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd && !cookieDomain ? 'none' : 'lax') as 'none' | 'lax',
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    // Clear cookies with multiple path and sameSite options to ensure complete removal
    res.clearCookie('access_token', clearOptions);
    res.clearCookie('access_token', { ...clearOptions, sameSite: 'strict' as const });
    res.clearCookie('access_token', { ...clearOptions, path: '/' });
    
    res.clearCookie('refresh_token', clearOptions);
    res.clearCookie('refresh_token', { ...clearOptions, sameSite: 'strict' as const });
    res.clearCookie('refresh_token', { ...clearOptions, path: '/' });
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { ip, userAgent } = this.getIpAndUserAgent(req);
    const authRes = await this.authService.login(dto, ip, userAgent);

    this.setAuthCookies(res, authRes.accessToken, authRes.refreshToken);

    return {
      user: authRes.user,
      accessToken: authRes.accessToken,
      refreshToken: authRes.refreshToken,
    };
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { ip, userAgent } = this.getIpAndUserAgent(req);
    const authRes = await this.authService.register(dto);

    this.setAuthCookies(res, authRes.accessToken, authRes.refreshToken);

    return {
      user: authRes.user,
      accessToken: authRes.accessToken,
      refreshToken: authRes.refreshToken,
    };
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: RefreshDto,
  ) {
    const refreshTokenString = req.cookies?.refresh_token || dto?.refreshToken;

    if (refreshTokenString) {
      await this.authService.logout(refreshTokenString);
    }

    this.clearAuthCookies(res);

    return { success: true, message: 'Logged out successfully' };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto?: RefreshDto,
  ) {
    const refreshTokenString = req.cookies?.refresh_token || dto?.refreshToken;

    if (!refreshTokenString) {
      this.clearAuthCookies(res);
      return { success: false, message: 'No refresh token provided' };
    }

    try {
      const { ip, userAgent } = this.getIpAndUserAgent(req);
      const tokens = await this.authService.refresh(
        { refreshToken: refreshTokenString },
        ip,
        userAgent,
      );

      this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      // Also fetch updated user profile
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(tokens.accessToken);
      const userProfile = await this.authService.getUserProfile(decoded.sub);

      return {
        user: userProfile,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (err) {
      this.clearAuthCookies(res);
      throw err;
    }
  }


  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload) {
    const userProfile = await this.authService.getUserProfile(user.sub);
    return { user: userProfile };
  }

  @Get('me/activity')
  @UseGuards(JwtAuthGuard)
  getMeActivity(@CurrentUser() user: JwtPayload): Promise<any[]> {
    return this.authService.getUserActivity(user.sub);
  }

  // Exchange Code Pattern for Cross-Domain Auth
  @Post('generate-exchange-code')
  @UseGuards(JwtAuthGuard)
  async generateExchangeCode(
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateExchangeCodeDto,
  ) {
    const code = await this.authService.generateExchangeCode(
      user.sub,
      user.orgId,
    );
    return {
      code,
      redirectUrl: `${dto.redirectUrl}?code=${code}`,
    };
  }

  @Post('exchange')
  async exchangeCode(@Body() dto: ExchangeCodeDto) {
    return this.authService.exchangeCode(dto.code);
  }
}
