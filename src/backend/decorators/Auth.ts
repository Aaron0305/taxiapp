/**
 * Decorador conceptual de autenticación.
 * En Next.js App Router se usa como wrapper, no como decorador real de TS.
 */
export function Auth(_roles?: string[]) {
  return function (_target: unknown, _key?: string) {
    // Placeholder — la lógica real está en authGuard.ts
  };
}
