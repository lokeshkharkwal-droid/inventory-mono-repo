import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { SiteAdminJwtStrategy } from './strategies/siteadmin-jwt.strategy';

/**
 * Authentication module. Registers the business `'jwt'` Passport strategy that
 * validates kalnostics-new access tokens (shared `JWT_SECRET`) and the
 * `'jwt-siteadmin'` strategy used to guard SiteAdmin-only routes (the global
 * master-product catalogue). Global so the app-level guards resolve both
 * strategies everywhere.
 *
 * There is no login/refresh here — identity is owned by kalnostics-new; this
 * service only verifies the tokens it receives.
 */
@Global()
@Module({
  imports: [ConfigModule, PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [JwtStrategy, SiteAdminJwtStrategy],
  exports: [PassportModule],
})
export class AuthModule {}
