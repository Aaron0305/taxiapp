export class HttpException extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'HttpException';
  }
}

export class NotFoundException extends HttpException {
  constructor(message = 'Recurso no encontrado') {
    super(404, message);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'No autorizado') {
    super(401, message);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Acceso denegado') {
    super(403, message);
  }
}

export class BadRequestException extends HttpException {
  constructor(message = 'Solicitud inválida', details?: unknown) {
    super(400, message, details);
  }
}
