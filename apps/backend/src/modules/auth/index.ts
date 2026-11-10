export { AuthModule } from './auth.module';
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { Public, IS_PUBLIC_KEY } from './decorators/public.decorator';
export { CurrentUser } from './decorators/current-user.decorator';
export { CurrentTenant } from './decorators/current-tenant.decorator';
export { CurrentProfile } from './decorators/current-profile.decorator';
export type { ActiveProfile } from './decorators/current-profile.decorator';
export type {
  JwtPayload,
  JwtProfileEntry,
  AuthenticatedRequest,
} from './types/jwt-payload.type';
