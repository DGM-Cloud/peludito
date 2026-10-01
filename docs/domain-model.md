# Domain model — PELUDITO

```text
Clinic (sede)
 ├── Users / Roles (demo: recepción, veterinario, caja, admin)
 ├── CatalogService
 └── Veterinarian

Client
 └── Patient[]
      ├── Appointment[]
      │    ├── MedicalRecord?
      │    └── Sale?
      ├── Vaccination[] → FollowUp
      ├── Medication[]
      ├── Hospitalization[]
      ├── GroomingAppointment[]
      └── Sale[]

Product
 ├── InventoryBatch[] (lote, vencimiento)
 ├── InventoryMovement[]
 └── SaleItem (tipo producto)

Sale
 ├── SaleItem[] (servicio | producto)
 ├── PaymentMethod (efectivo, yape, plin, tarjeta)
 └── VoucherType (boleta | factura | ninguno) — DEMO SUNAT
```

Relaciones clave del escenario comercial:

**María Torres (cli-1) → Luna (pat-1) + Simba (pat-8)**  
Citas, historias, vacunas, hospitalización (Luna), ventas y seguimientos compartidos.
