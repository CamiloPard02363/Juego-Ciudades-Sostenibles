import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UpdateUserProfileUseCase } from '../../../application/use-cases/update-user-profile.use-case.js';
import { ChangeUserPasswordUseCase } from '../../../application/use-cases/change-user-password.use-case.js';
import { GetUserByIdUseCase } from '../../../application/use-cases/get-user-by-id.use-case.js';
import { DeactivateUserUseCase } from '../../../application/use-cases/deactivate-user.use-case.js';
import { ReactivateUserUseCase } from '../../../application/use-cases/reactivate-user.use-case.js';
import { VerifyUserEmailUseCase } from '../../../application/use-cases/verify-user-email.use-case.js';
import { ListUsersUseCase } from '../../../application/use-cases/list-users.use-case.js';
import { ChangeUserRoleUseCase } from '../../../application/use-cases/change-user-role.use-case.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { CurrentUserId } from '../decorators/current-user-id.decorator.js';
import { UpdateUserProfileDto } from '../dtos/update-user-profile.dto.js';
import { ChangeUserPasswordDto } from '../dtos/change-user-password.dto.js';
import { ChangeUserRoleDto } from '../dtos/change-user-role.dto.js';
import { ListUsersQueryDto } from '../dtos/list-users-query.dto.js';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserProfileUseCase: UpdateUserProfileUseCase,
    private readonly changeUserPasswordUseCase: ChangeUserPasswordUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase,
    private readonly reactivateUserUseCase: ReactivateUserUseCase,
    private readonly verifyUserEmailUseCase: VerifyUserEmailUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly changeUserRoleUseCase: ChangeUserRoleUseCase,
  ) {}

  @Get('me')
  getMe(@CurrentUserId() userId: string) {
    return this.getUserByIdUseCase.execute({ userId, requestingUserId: userId });
  }

  @Get()
  list(@CurrentUserId() requestingUserId: string, @Query() query: ListUsersQueryDto) {
    return this.listUsersUseCase.execute({
      requestingUserId,
      role: query.role,
      isActive: query.isActive,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':id')
  getById(@CurrentUserId() requestingUserId: string, @Param('id') userId: string) {
    return this.getUserByIdUseCase.execute({ userId, requestingUserId });
  }

  @Patch('me/profile')
  updateProfile(@CurrentUserId() userId: string, @Body() dto: UpdateUserProfileDto) {
    return this.updateUserProfileUseCase.execute({ userId, ...dto });
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@CurrentUserId() userId: string, @Body() dto: ChangeUserPasswordDto) {
    return this.changeUserPasswordUseCase.execute({ userId, ...dto });
  }

  @Post('me/verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  verifyEmail(@CurrentUserId() userId: string) {
    return this.verifyUserEmailUseCase.execute({ userId });
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivate(@CurrentUserId() requestingUserId: string, @Param('id') userId: string) {
    return this.deactivateUserUseCase.execute({ requestingUserId, userId });
  }

  @Patch(':id/reactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  reactivate(@CurrentUserId() requestingUserId: string, @Param('id') userId: string) {
    return this.reactivateUserUseCase.execute({ requestingUserId, userId });
  }

  @Patch(':id/role')
  changeRole(
    @CurrentUserId() requestingUserId: string,
    @Param('id') targetUserId: string,
    @Body() dto: ChangeUserRoleDto,
  ) {
    return this.changeUserRoleUseCase.execute({
      requestingUserId,
      targetUserId,
      newRole: dto.newRole,
    });
  }
}
