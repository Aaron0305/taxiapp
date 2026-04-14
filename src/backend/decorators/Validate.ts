/**
 * Decorador conceptual de validación.
 * En Next.js App Router se usa como wrapper, no como decorador real de TS.
 */
export function Validate(_schema?: unknown) {
  return function (_target: unknown, _key?: string) {
    // Placeholder — la lógica real se aplica manualmente en cada route
  };
}
