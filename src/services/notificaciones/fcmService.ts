/**
 * Servicio de notificaciones push (placeholder).
 * TODO: Integrar con Firebase Cloud Messaging o Web Push API.
 */

export async function enviarNotificacionPush(
  _token: string,
  titulo: string,
  _mensaje: string
): Promise<boolean> {
  // Placeholder — en desarrollo usar console.log
  console.log(`[Push Notification] ${titulo}`);
  return true;
}

export async function solicitarPermisoNotificaciones(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  if (!('Notification' in window)) {
    console.warn('Este navegador no soporta notificaciones push.');
    return false;
  }

  const permiso = await Notification.requestPermission();
  return permiso === 'granted';
}
