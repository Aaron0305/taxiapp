/**
 * Validaciones reutilizables del servidor.
 */

export function esEmailValido(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function esTelefonoValido(telefono: string): boolean {
  // Acepta formatos mexicanos: 10 dígitos, opcionalmente con +52
  const limpio = telefono.replace(/[\s\-()]/g, '');
  return /^(\+52)?[0-9]{10}$/.test(limpio);
}

export function esPasswordSegura(password: string): boolean {
  return password.length >= 6;
}

export function sanitizarTexto(texto: string): string {
  return texto.trim().replace(/[<>]/g, '');
}
