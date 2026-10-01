# Decisiones de producto — PELUDITO

## Qué NO se reconstruyó

Se conservó la arquitectura DGM (`app` / `components` / `services` / `data/mock` / `types`), el design system teal y los módulos base.

## Qué se evolucionó

- De CRUD aislado a **flujos conectados** (cita → consulta → venta → stock → seguimiento).
- Estados operativos de cita (llegó, en consulta, pagada, no-show).
- Caja/POS con métodos peruanos y comprobante DEMO (sin SUNAT real).
- Vacunas, seguimientos, hospitalización, grooming.
- Búsqueda global, selector de sede y vista por rol (sin auth real).
- WhatsApp como placeholder explícito.

## Realismo peruano

- Moneda S/, teléfonos, Yape/Plin, boleta/factura, sedes San Miguel / Miraflores.

## Futuro

Services listos para reemplazar mock por Supabase/API. SENASA y SUNAT quedan como estructura/demo, sin afirmar cumplimiento.
