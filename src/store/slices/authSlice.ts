import type { Rol } from '@/types/usuario';

export interface AuthState {
  usuario: {
    id: string;
    nombre: string;
    email: string;
    rol: Rol;
  } | null;
  sesionActiva: boolean;
  cargando: boolean;
}

export type AuthAction =
  | { type: 'SET_USUARIO'; payload: AuthState['usuario'] }
  | { type: 'CERRAR_SESION' }
  | { type: 'SET_CARGANDO'; payload: boolean };

export const authInitialState: AuthState = {
  usuario: null,
  sesionActiva: false,
  cargando: true,
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USUARIO':
      return {
        ...state,
        usuario: action.payload,
        sesionActiva: !!action.payload,
        cargando: false,
      };
    case 'CERRAR_SESION':
      return { ...authInitialState, cargando: false };
    case 'SET_CARGANDO':
      return { ...state, cargando: action.payload };
    default:
      return state;
  }
}
