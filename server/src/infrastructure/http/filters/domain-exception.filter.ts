import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../../../domain/errors/user.errors.js';
import { ForbiddenActionError } from '../../../domain/errors/authorization.errors.js';
import {
  ApplicationError,
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  UserInactiveError,
  UserNotFoundError,
} from '../../../application/errors/application.errors.js';

const STATUS_BY_ERROR = new Map<Function, HttpStatus>([
  [EmailAlreadyRegisteredError, HttpStatus.CONFLICT],
  [InvalidCredentialsError, HttpStatus.UNAUTHORIZED],
  [UserInactiveError, HttpStatus.FORBIDDEN],
  [UserNotFoundError, HttpStatus.NOT_FOUND],
  [ForbiddenActionError, HttpStatus.FORBIDDEN],
]);

@Catch(DomainError, ApplicationError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError | ApplicationError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      STATUS_BY_ERROR.get(exception.constructor) ?? HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}
