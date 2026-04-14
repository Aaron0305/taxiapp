import { describe, expect, it } from 'vitest';

import { calcularDistanciaKm } from '@/backend/utils/distancia';
import { calcularPrecioEstimado, formatearPrecioMXN } from '@/backend/utils/precio';
import {
	formatearMoneda,
	formatearTelefono,
} from '@/utils/formateo';
import {
	validarEmail,
	validarNombre,
	validarPassword,
	validarTelefono,
} from '@/utils/validacion';

describe('Utilidades de negocio', () => {
	it('calcula distancia 0 para mismo punto', () => {
		const distancia = calcularDistanciaKm(19.568, -99.768, 19.568, -99.768);
		expect(distancia).toBe(0);
	});

	it('calcula distancia aproximada entre dos puntos', () => {
		const distancia = calcularDistanciaKm(19.568, -99.768, 19.57, -99.765);
		expect(distancia).toBeGreaterThan(0.3);
		expect(distancia).toBeLessThan(0.5);
	});

	it('calcula tarifa minima cuando el viaje es corto', () => {
		expect(calcularPrecioEstimado(0, 0)).toBe(35);
	});

	it('calcula tarifa con distancia y tiempo', () => {
		expect(calcularPrecioEstimado(5, 10)).toBe(110);
	});
});

describe('Formateadores y validaciones', () => {
	it('formatea telefono mexicano de 10 digitos', () => {
		expect(formatearTelefono('7221234567')).toBe('72 2123 4567');
	});

	it('formatea moneda en MXN', () => {
		const valor = formatearMoneda(1250);
		expect(valor).toContain('$');
		expect(valor).toContain('1,250');
	});

	it('formatea precio MXN para backend', () => {
		const valor = formatearPrecioMXN(99.5);
		expect(valor).toContain('$');
		expect(valor).toContain('99.50');
	});

	it('valida email, nombre y password', () => {
		expect(validarEmail('')).toBe('El correo es requerido.');
		expect(validarEmail('a@a.com')).toBeNull();
		expect(validarNombre('A')).toBe('Mínimo 2 caracteres.');
		expect(validarNombre('Ana')).toBeNull();
		expect(validarPassword('123')).toBe('Mínimo 6 caracteres.');
		expect(validarPassword('123456')).toBeNull();
	});

	it('valida telefono con y sin prefijo +52', () => {
		expect(validarTelefono('7221234567')).toBeNull();
		expect(validarTelefono('+527221234567')).toBeNull();
		expect(validarTelefono('999')).toBe('Número de teléfono inválido.');
	});
});
