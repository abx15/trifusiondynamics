import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
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
import { type Request, type Response, type CookieOptions } from 'express';
import { Throttle } from '@nestjs/throttler';
import * as jwt from 'jsonwebtoken';

// Exchange-code endpoints are public and must be rate-limited to prevent
// token enumeration / abuse. These are separate from the global ThrottlerGuard
// limits and provide additional per-IP protection.
const EXCHANGE_CODE_RATE_LIMIT = 10; // 10 requests per minute
const EXCHANGE_CODE_RATE_TTL = 60000; // 60 seconds

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getIpAndUserAgent(req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return { ip, userAgent };
  }

  private getBearerToken(req: Request): string | undefined {
    const authorization = req.headers.authorization;
    if (!authorization) return undefined;
    const [scheme, token] = authorization.split(' ');
    return scheme === 'Bearer' && token ? token : undefined;
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

    // For production with separate Vercel domains, use lax SameSite and no domain (host-only cookies)
    // This allows cookies to work on the same domain while maintaining security
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax', // Changed from 'none' to 'lax' for better compatibility
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

    const clearOptions: CookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax', // Changed from 'none' to 'lax' for better compatibility
      path: '/',
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    // Clear cookies with multiple path and sameSite options to ensure complete removal
    res.clearCookie('access_token', clearOptions);
    res.clearCookie('access_token', {
      ...clearOptions,
      sameSite: 'strict',
    });
    res.clearCookie('access_token', { ...clearOptions, path: '/' });

    res.clearCookie('refresh_token', clearOptions);
    res.clearCookie('refresh_token', {
      ...clearOptions,
      sameSite: 'strict',
    });
    res.clearCookie('refresh_token', { ...clearOptions, path: '/' });
  }

  @ApiOperation({
    summary: 'Login',
    description:
      'Authenticate with email + password. Sets HttpOnly access_token and refresh_token cookies.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Authenticated successfully. Returns user profile + tokens.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded (10 req/min).',
  })
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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

  @ApiOperation({
    summary: 'Register new user',
    description:
      'Create a new account. Rate-limited to 5 req/min to prevent spam.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'Account created. Returns user + tokens.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or email already in use.',
  })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded.' })
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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

  @ApiOperation({
    summary: 'Logout',
    description: 'Revoke refresh token and clear auth cookies.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshTokenString = req.cookies?.refresh_token;
    const accessTokenString =
      this.getBearerToken(req) || req.cookies?.access_token;

    await this.authService.logout(refreshTokenString, accessTokenString);

    this.clearAuthCookies(res);

    return { success: true, message: 'Logged out successfully' };
  }

  @ApiOperation({
    summary: 'Refresh tokens',
    description:
      'Exchange a valid refresh_token (cookie or body) for new access + refresh tokens.',
  })
  @ApiBody({ type: RefreshDto, required: false })
  @ApiResponse({ status: 200, description: 'New tokens issued.' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalid or expired.',
  })
  @Post('refresh')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
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
      const decoded = jwt.decode(tokens.accessToken) as { sub: string } | null;
      if (!decoded?.sub) {
        throw new UnauthorizedException('Invalid token payload');
      }
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

  @ApiOperation({
    summary: 'Change password',
    description: "Change the authenticated user's password.",
  })
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed.' })
  @ApiResponse({ status: 401, description: 'Current password incorrect.' })
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, dto);
  }

  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the full user profile for the authenticated session.',
  })
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiResponse({ status: 200, description: 'User profile returned.' })
  @ApiResponse({ status: 401, description: 'Not authenticated.' })
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload) {
    const userProfile = await this.authService.getUserProfile(user.sub);
    return { user: userProfile };
  }

  @ApiOperation({ summary: 'Get user activity log' })
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiResponse({ status: 200, description: 'List of recent auth events.' })
  @Get('me/activity')
  @UseGuards(JwtAuthGuard)
  getMeActivity(@CurrentUser() user: JwtPayload): Promise<any[]> {
    return this.authService.getUserActivity(user.sub);
  }

  // Exchange Code Pattern for Cross-Domain Auth
  @ApiOperation({
    summary: 'Generate cross-domain exchange code',
    description:
      'Creates a short-lived one-time code to transfer session across subdomains.',
  })
  @ApiBearerAuth()
  @ApiCookieAuth('access_token')
  @ApiResponse({
    status: 201,
    description: 'Exchange code + redirect URL returned.',
  })
  @Post('generate-exchange-code')
  @UseGuards(JwtAuthGuard)
  @Throttle({
    default: { limit: EXCHANGE_CODE_RATE_LIMIT, ttl: EXCHANGE_CODE_RATE_TTL },
  })
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

  @ApiOperation({
    summary: 'Exchange code for session',
    description:
      'Exchanges a short-lived code (from generate-exchange-code) for access + refresh tokens.',
  })
  @ApiBody({ type: ExchangeCodeDto })
  @ApiResponse({ status: 200, description: 'Tokens returned.' })
  @ApiResponse({ status: 401, description: 'Code invalid or expired.' })
  @Post('exchange')
  @Throttle({
    default: { limit: EXCHANGE_CODE_RATE_LIMIT, ttl: EXCHANGE_CODE_RATE_TTL },
  })
  async exchangeCode(@Body() dto: ExchangeCodeDto) {
    return this.authService.exchangeCode(dto.code);
  }
}
