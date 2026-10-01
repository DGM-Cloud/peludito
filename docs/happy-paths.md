# Happy Paths — PELUDITO

Fecha demo: **2026-09-22**. Datos coherentes alrededor de **María Torres → Luna**.

## HP-01 — Nuevo cliente hasta cita

Precondición: veterinaria operativa.

1. Abrir Clientes → Nuevo cliente.
2. Completar datos (si hay duplicado, ver advertencia).
3. Abrir Pacientes → Nuevo paciente → seleccionar propietario.
4. Abrir Citas → Nueva cita → cliente → mascota → servicio → vet → confirmar.

Resultado: cliente, mascota y cita visibles; dashboard refleja agenda.

## HP-02 — Cita → llegada → consulta → historia

1. Agenda del día → cita Confirmada.
2. Marcar → Llegó (check-in).
3. Abrir consulta → estado En consulta + historia abierta.
4. Completar / ver historia en Historias clínicas o perfil paciente.

## HP-03 — Consulta → tratamiento → medicamento → inventario

1. Desde paciente, ver tratamientos activos.
2. En Caja, agregar producto medicamento.
3. Confirmar venta → stock disminuye (Inventario / movimientos).

## HP-04 — Consulta → servicio → venta → pago

1. Cita Atendida → Cobrar.
2. Caja: agregar servicio + método (Yape/Plin/efectivo/tarjeta).
3. Confirmar → caja del día actualizada.

## HP-05 — Venta → stock → alerta

1. Vender producto con stock cerca del mínimo.
2. Inventario muestra Bajo/Crítico.
3. Dashboard alerta “productos con stock bajo”.

## HP-06 — Vacuna → próxima dosis → seguimiento

1. Vacunas → Registrar vacuna (lote, lab, próxima).
2. Aparece en paciente y en Seguimientos.
3. Filtro Próximas / Vencidas.

## HP-07 — Paciente → historial → nueva consulta

1. Buscar Luna → abrir perfil.
2. Tab Historia → timeline.
3. Nueva consulta desde acciones rápidas.

## HP-08 — Cliente → múltiples mascotas

1. Abrir María Torres.
2. Ver Luna y Simba.
3. Entrar a cada mascota.

## HP-09 — Cancelar cita → liberar horario

1. Agenda → Cancelar en cita programada/confirmada.
2. Mismo horario disponible para nuevo booking (validación de slot).

## HP-10 — No-show → seguimiento

1. Marcar No asistió.
2. Seguimientos crea ítem de reprogramación.

## HP-11 — Inventario lote → vencimiento → alerta

1. Inventario → sección lotes próximos a vencer.
2. Dashboard alerta de vencimientos.

## HP-12 — Hospitalizado → evolución → alta

1. Hospitalización → seleccionar Luna/Max.
2. Agregar nota de evolución.
3. Dar de alta.

## HP-13 — Grooming → agenda → cobro

1. Grooming → nueva reserva.
2. Iniciar → Marcar lista → Cobrar / Avisar WA (demo).

## HP-14 — Venta → comprobante DEMO

1. Caja → boleta o factura.
2. Confirmar → modal “SUNAT no conectada”.

## HP-15 — Dashboard → alerta → acción

1. Dashboard → alerta con CTA.
2. Navega a vacunas / inventario / agenda / caja / seguimientos.
