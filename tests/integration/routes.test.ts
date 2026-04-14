import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/geocodificacion/route';

describe('API /api/geocodificacion', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('retorna 400 en reverse sin lat/lng', async () => {
		const req = new Request('http://localhost/api/geocodificacion?mode=reverse');
		const res = await GET(req as never);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body.error).toBe('lat y lng son requeridos');
	});

	it('retorna lista vacia cuando q es menor a 3 caracteres', async () => {
		const req = new Request('http://localhost/api/geocodificacion?q=ix');
		const res = await GET(req as never);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.resultados).toEqual([]);
	});

	it('usa Nominatim cuando devuelve resultados', async () => {
		const fetchSpy = vi
			.spyOn(globalThis, 'fetch')
			.mockImplementation(async () =>
				new Response(
					JSON.stringify([
						{
							place_id: 1,
							display_name: 'Centro Ixtlahuaca, Estado de Mexico, Mexico',
							lat: '19.568',
							lon: '-99.768',
						},
					]),
					{ status: 200 },
				),
			);

		const req = new Request('http://localhost/api/geocodificacion?q=centro');
		const res = await GET(req as never);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.resultados.length).toBeGreaterThan(0);
		expect(body.resultados[0].nombre).toBe('Centro Ixtlahuaca');
		expect(fetchSpy).toHaveBeenCalled();
	});

	it('cae a fallback local si no hay resultados externos', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
			new Response(JSON.stringify([]), { status: 200 }),
		);

		const req = new Request('http://localhost/api/geocodificacion?q=mercado');
		const res = await GET(req as never);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.resultados.length).toBeGreaterThan(0);
		expect(body.resultados[0].nombre.toLowerCase()).toContain('mercado');
	});

	it('retorna direccion por coordenadas cuando reverse no encuentra direccion', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({}), { status: 200 }),
		);

		const req = new Request('http://localhost/api/geocodificacion?mode=reverse&lat=19.568&lng=-99.768');
		const res = await GET(req as never);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body.direccion).toContain('Lat 19.56800, Lng -99.76800');
	});
});
