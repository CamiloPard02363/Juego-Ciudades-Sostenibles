import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Socket } from 'socket.io';

/**
 * `@SubscribeMessage` no propaga excepciones al cliente como lo hace un
 * controller HTTP — sin este filtro, un `throw` en el gateway solo aparece
 * en logs del server y el cliente se queda esperando en silencio.
 */
@Catch()
export class WsExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const socket = host.switchToWs().getClient<Socket>();
    const message = exception instanceof Error ? exception.message : 'Error inesperado en la sala.';
    socket.emit('room:error', { message });
  }
}
