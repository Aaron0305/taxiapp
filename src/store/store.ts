/**
 * Store ligero para el estado global de la app.
 * Usa React Context en lugar de Redux para mantener la simplicidad.
 * TODO: Escalar a Zustand o Redux Toolkit si la app crece.
 */

export interface AppState {
  auth: {
    usuario: {
      id: string;
      nombre: string;
      email: string;
      rol: string;
    } | null;
    sesionActiva: boolean;
    cargando: boolean;
  };
  viaje: {
    viajeActivo: unknown | null;
    historial: unknown[];
    cargando: boolean;
  };
}

export const initialState: AppState = {
  auth: {
    usuario: null,
    sesionActiva: false,
    cargando: true,
  },
  viaje: {
    viajeActivo: null,
    historial: [],
    cargando: false,
  },
};
