import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationModule } from '../integration/integration.module';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

/**
 * Permissions module — the inventory RBAC catalogue + resolution endpoints +
 * runtime per-tenant role management (built-in overrides, custom roles, and
 * user→role assignments). The PermissionGuard is registered globally in
 * AppModule (APP_GUARD).
 */
@Module({
  imports: [PrismaModule, IntegrationModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
