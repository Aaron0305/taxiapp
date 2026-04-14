// Definición del modelo Usuario para la capa de datos
export const TABLA_USUARIOS = 'usuarios';

export const COLUMNAS_USUARIO = [
  'id',
  'nombre',
  'email',
  'telefono',
  'rol',
  'avatar_url',
  'activo',
  'created_at',
  'updated_at',
] as const;

export const USUARIO_SELECT = COLUMNAS_USUARIO.join(', ');
