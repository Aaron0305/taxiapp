/**
 * Formatea una fecha ISO a formato legible en español.
 */
export function formatearFecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formatea una fecha con hora.
 */
export function formatearFechaHora(fechaISO: string): string {
  return new Date(fechaISO).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatea precio como moneda MXN.
 */
export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(monto);
}

/**
 * Formatea un número de teléfono mexicano.
 */
export function formatearTelefono(telefono: string): string {
  const limpio = telefono.replace(/\D/g, '');
  if (limpio.length === 10) {
    return `${limpio.slice(0, 2)} ${limpio.slice(2, 6)} ${limpio.slice(6)}`;
  }
  return telefono;
}
