import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MasterSettingController } from './master-setting.controller';
import { MasterSettingService } from './master-setting.service';

/**
 * SiteAdmin-managed inventory master settings — a platform-level singleton JSON
 * blob keyed by setting name.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MasterSettingController],
  providers: [MasterSettingService],
  exports: [MasterSettingService],
})
export class MasterSettingModule {}
