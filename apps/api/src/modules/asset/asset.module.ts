import { Module } from '@nestjs/common';
import { EmployeeModule } from '@modules/employee/employee.module';
import { AssetController } from './controllers/asset.controller';
import { AssetService } from './services/asset.service';

@Module({
  imports: [EmployeeModule],
  controllers: [AssetController],
  providers: [AssetService],
  exports: [AssetService],
})
export class AssetModule {}
