import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Authentication module. Registers the business `'jwt'` Passport strategy that
 * validates kalnostics-new access tokens (shared `JWT_SECRET`). Global so the
 * app-level `JwtAuthGuard` resolves the strategy everywhere.
 *
 * There is no login/refresh here — identity is owned by kalnostics-new; this
 * service only verifies the token it receives.
 */
@Global()
@Module({
  imports: [ConfigModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
