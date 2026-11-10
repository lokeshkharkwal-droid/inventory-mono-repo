import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/** Health + whoami probes. Integration clients are injected from the global IntegrationModule. */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
