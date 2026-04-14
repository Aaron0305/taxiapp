import { logger } from '@/backend/logger/logger';

/**
 * Servicio de envío de correos (placeholder).
 * TODO: Integrar con servicio real (Resend, SendGrid, etc.)
 */
export async function enviarCorreo(
  destinatario: string,
  asunto: string,
  contenidoHtml: string
): Promise<boolean> {
  // En desarrollo, solo loguear
  logger.info('Correo simulado enviado', {
    destinatario,
    asunto,
    preview: contenidoHtml.substring(0, 100),
  });

  // TODO: Implementar envío real
  return true;
}

export async function enviarCorreoBienvenida(email: string, nombre: string): Promise<boolean> {
  return enviarCorreo(
    email,
    '¡Bienvenido a TaxiApp!',
    `<h1>Hola ${nombre}</h1><p>Gracias por unirte a TaxiApp Ixtlahuaca.</p>`
  );
}

export async function enviarCorreoViajeCompletado(
  email: string,
  nombre: string,
  monto: number
): Promise<boolean> {
  return enviarCorreo(
    email,
    'Viaje completado - TaxiApp',
    `<h1>¡Viaje completado!</h1><p>Hola ${nombre}, tu viaje por $${monto} ha sido completado.</p>`
  );
}
