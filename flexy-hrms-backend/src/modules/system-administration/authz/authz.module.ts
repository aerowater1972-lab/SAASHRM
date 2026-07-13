import { Module } from '@nestjs/common';
import { AUTHZ_SERVICE } from '@common/guards/authz.guard';
import { AuthzService } from './authz.service';
import { AuthzController } from './authz.controller';

@Module({
  controllers: [AuthzController],
  providers: [
    AuthzService,
    // Binding token abstrak (dipakai AuthzGuard di common/) ke implementasi
    // konkret di modul ini — menghindari circular dependency common <-> modules.
    { provide: AUTHZ_SERVICE, useExisting: AuthzService },
  ],
  exports: [AuthzService, AUTHZ_SERVICE],
})
export class AuthzModule {}
