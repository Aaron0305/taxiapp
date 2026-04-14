# Reporte de Calidad y Testing - Fase 4

Fecha: 14 de abril de 2026  
Proyecto: taxiapp

## 1) Objetivo de la fase
Ejecutar la estrategia de calidad del proyecto mediante:
- Pruebas unitarias
- Pruebas de integracion
- Deteccion y correccion de bugs
- Medicion de cobertura de codigo
- Validacion con usuarios simulados

## 2) Alcance implementado
Se configuro e integro Vitest como framework de pruebas con cobertura V8 en el proyecto.

Cambios realizados:
- Scripts de testing en package.json
- Configuracion de cobertura en vitest.config.ts
- Pruebas unitarias en tests/unit/services.test.ts
- Pruebas de integracion en tests/integration/routes.test.ts

## 3) Pruebas unitarias ejecutadas
Archivo: tests/unit/services.test.ts

Casos cubiertos:
- Distancia GPS (Haversine):
  - mismo punto -> distancia 0
  - distancia aproximada entre dos coordenadas
- Precios:
  - respeta tarifa minima
  - calcula tarifa con distancia y tiempo
- Formateadores:
  - telefono MX de 10 digitos
  - moneda MXN en frontend
  - precio MXN en backend
- Validaciones:
  - email
  - nombre
  - password
  - telefono con y sin prefijo +52

Resultado:
- 9 pruebas unitarias aprobadas

## 4) Pruebas de integracion ejecutadas
Archivo: tests/integration/routes.test.ts

API validada: /api/geocodificacion

Casos cubiertos:
- reverse sin parametros requeridos -> 400
- consulta corta (q < 3) -> resultados vacios
- busqueda exitosa usando Nominatim
- fallback local cuando servicios externos no devuelven resultados
- reverse con direccion no encontrada -> respuesta por coordenadas

Resultado:
- 5 pruebas de integracion aprobadas

## 5) Bugs detectados y corregidos
Durante la ejecucion se detectaron fallos en pruebas de integracion por supuestos de test, no por bug funcional del endpoint:

1. Mock de fetch insuficiente para multiples llamadas
- Problema: el test asumia una sola llamada a Nominatim.
- Correccion: se adapto el mock para responder en todas las llamadas necesarias y se ajusto la asercion.

2. Reutilizacion de un objeto Response consumido
- Problema: el mock de fallback reutilizaba la misma instancia de Response en multiples llamadas.
- Correccion: se cambio el mock a factory (nueva Response por invocacion).

Estado final:
- Suite estable y repetible
- 14/14 pruebas en verde

## 6) Cobertura de codigo
Comando ejecutado:
- pnpm test:coverage

Resumen global:
- Statements: 46.81%
- Branches: 42.34%
- Functions: 55.55%
- Lines: 47.31%

Cobertura destacada:
- src/app/api/geocodificacion/route.ts
  - Lines: 82.05%
  - Branches: 58.92%
- src/backend/utils/distancia.ts
  - Lines: 100%
- src/backend/utils/precio.ts
  - Lines: 100%

Observacion:
- El porcentaje global baja porque tambien se incluyen endpoints sin pruebas aun (conductores, usuarios, viajes).

## 7) Validacion con usuarios reales o simulados
Se realizo validacion simulada basada en escenarios de uso real:
- Usuario pasajero con busqueda corta
- Usuario pasajero con busqueda normal
- Usuario pasajero con fallback local
- Flujo reverse geocodificacion con coordenadas validas e invalidas

Resultado de validacion simulada:
- Comportamiento consistente con reglas funcionales esperadas
- Manejo correcto de errores de entrada y degradacion controlada

Pendiente recomendado para cierre total:
- Ejecutar UAT con al menos 3 usuarios reales (1 conductor, 2 pasajeros) y registrar:
  - tiempo de respuesta percibido
  - precision de direccion
  - claridad de mensajes de error

## 8) Evidencia de ejecucion
Ultima corrida:
- Test files: 2 passed
- Tests: 14 passed
- Errores: 0

## 9) Criterio de aceptacion de Fase 4
Estado: COMPLETADA PARCIALMENTE (tecnico) / EN CURSO (UAT real)

- Pruebas unitarias: Cumplido
- Pruebas de integracion: Cumplido
- Deteccion/correccion de bugs: Cumplido
- Cobertura medida: Cumplido
- Validacion usuarios simulados: Cumplido
- Validacion con usuarios reales: Pendiente recomendado

## 10) Como ejecutar en local
- pnpm test
- pnpm test:unit
- pnpm test:integration
- pnpm test:coverage
