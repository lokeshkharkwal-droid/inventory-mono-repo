import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KalnosticsHttpService } from './kalnostics-http.service';
import { KalnosticsBranchClient } from './clients/kalnostics-branch.client';
import { IntegrationController } from './integration.controller';

/**
 * Integration module — the single runtime seam to kalnostics-new. Hosts the base
 * HTTP service and the typed API clients (Branch first; Patient/Order/Referral/
 * Document clients are added as later phases need them). Global so any feature
 * module can inject a client without re-importing.
 *
 * This replaces the legacy `Yii_session` coupling to the EzHealthTrack PHP app.
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [IntegrationController],
  providers: [KalnosticsHttpService, KalnosticsBranchClient],
  exports: [KalnosticsHttpService, KalnosticsBranchClient],
})
export class IntegrationModule {}
