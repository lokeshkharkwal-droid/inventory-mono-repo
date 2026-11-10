import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KalnosticsCommsClient } from './kalnostics-comms.client';
import { KalnosticsUserClient } from './kalnostics-user.client';

/**
 * Integration layer — typed clients over the kalnostics-new API (the single
 * seam for all cross-app coupling): the communication client (document email
 * via the Exchange gateway) and the user client (staff picker for role
 * assignment).
 */
@Module({
  imports: [ConfigModule],
  providers: [KalnosticsCommsClient, KalnosticsUserClient],
  exports: [KalnosticsCommsClient, KalnosticsUserClient],
})
export class IntegrationModule {}
