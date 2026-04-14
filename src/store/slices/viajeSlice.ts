import type { Viaje } from '@/types/viaje';

export interface ViajeState {
  viajeActivo: Viaje | null;
  historial: Viaje[];
  cargando: boolean;
}

export type ViajeAction =
  | { type: 'SET_VIAJE_ACTIVO'; payload: Viaje | null }
  | { type: 'SET_HISTORIAL'; payload: Viaje[] }
  | { type: 'SET_CARGANDO'; payload: boolean }
  | { type: 'CANCELAR_VIAJE' };

export const viajeInitialState: ViajeState = {
  viajeActivo: null,
  historial: [],
  cargando: false,
};

export function viajeReducer(state: ViajeState, action: ViajeAction): ViajeState {
  switch (action.type) {
    case 'SET_VIAJE_ACTIVO':
      return { ...state, viajeActivo: action.payload };
    case 'SET_HISTORIAL':
      return { ...state, historial: action.payload };
    case 'SET_CARGANDO':
      return { ...state, cargando: action.payload };
    case 'CANCELAR_VIAJE':
      return { ...state, viajeActivo: null };
    default:
      return state;
  }
}
