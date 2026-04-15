import { z } from 'zod';

export const registroSchema = z.object({
  nombre: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(50, 'El nombre es demasiado largo')
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras'),
  
  telefono: z
    .string()
    .min(10, 'El teléfono debe tener 10 dígitos')
    .max(10, 'El teléfono debe tener 10 dígitos')
    .regex(/^\d+$/, 'El teléfono solo debe contener números'),
  
  email: z
    .string()
    .email('Correo electrónico no válido'),
  
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe contener al menos una minúscula')
    .regex(/[0-9]/, 'Debe contener al menos un número')
    .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial'),
  
  confirmPassword: z
    .string()
    .min(1, 'Debes confirmar tu contraseña'),

  aceptaTerminos: z.literal(true, {
    errorMap: () => ({ message: 'Debes aceptar los términos y condiciones' }),
  }),
  
  rol: z.enum(['pasajero', 'conductor'], {
    required_error: 'Debes seleccionar un rol',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export type RegistroFormData = z.infer<typeof registroSchema>;
