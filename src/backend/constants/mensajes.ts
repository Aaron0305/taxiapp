export const MENSAJES = {
  // Auth
  AUTH_REQUERIDA: 'Autenticación requerida.',
  SESION_EXPIRADA: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
  CREDENCIALES_INVALIDAS: 'Correo o contraseña incorrectos.',
  REGISTRO_EXITOSO: '¡Registro exitoso! Revisa tu correo para confirmar.',

  // Viajes
  VIAJE_CREADO: 'Viaje solicitado exitosamente.',
  VIAJE_ACEPTADO: 'Un conductor ha aceptado tu viaje.',
  VIAJE_CANCELADO: 'El viaje ha sido cancelado.',
  VIAJE_COMPLETADO: 'Viaje completado. ¡Gracias por viajar con nosotros!',
  SIN_CONDUCTORES: 'No hay conductores disponibles en este momento.',

  // Pagos
  PAGO_EXITOSO: 'Pago procesado exitosamente.',
  PAGO_FALLIDO: 'Error al procesar el pago. Intenta nuevamente.',

  // Errores generales
  ERROR_SERVIDOR: 'Error interno del servidor. Intenta más tarde.',
  ERROR_VALIDACION: 'Datos inválidos. Revisa la información ingresada.',
  NO_ENCONTRADO: 'Recurso no encontrado.',
  SIN_PERMISOS: 'No tienes permisos para realizar esta acción.',
} as const;
