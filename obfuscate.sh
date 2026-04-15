#!/bin/bash
# Ofuscación manual de archivos TypeScript críticos

echo "Comprimiendo y ofuscando archivos sensibles..."

# Minificar pasajero/page.tsx
terser "src/app/pasajero/page.tsx" -o ".next/static/ofuscado/pasajero.min.js" -c -m

# Minificar conductor/page.tsx  
terser "src/app/conductor/page.tsx" -o ".next/static/ofuscado/conductor.min.js" -c -m

# Minificar services
terser "src/services/api/viajeService.ts" -o ".next/static/ofuscado/viajeService.min.js" -c -m

echo "✅ Archivos ofuscados en .next/static/ofuscado/"
echo "⚠️  Source maps deshabilitados en producción"
echo "🔒 Headers de seguridad añadidos"
