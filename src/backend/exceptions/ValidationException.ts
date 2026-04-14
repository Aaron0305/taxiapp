import { HttpException } from './HttpException';

export class ValidationException extends HttpException {
  public readonly errores: Record<string, string>;

  constructor(errores: Record<string, string>) {
    super(422, 'Error de validación', errores);
    this.errores = errores;
    this.name = 'ValidationException';
  }
}
