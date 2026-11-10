import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../types/jwt-payload.type';

/**
 * Business JWT strategy (`'jwt'`) — validates kalnostics-new access tokens on
 * protected requests. No DB lookup: the token is self-contained (CLAUDE.md
 * §5.1). The validated payload becomes `req.user`. Uses the shared `JWT_SECRET`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Runs after signature + expiry are verified.
   * @param payload the decoded JWT payload
   * @throws UnauthorizedException if the token is malformed
   */
  validate(payload: JwtPayload): JwtPayload {
    if (!payload.person_id) {
      throw new UnauthorizedException('Malformed token: missing person_id');
    }
    return payload;
  }
}
