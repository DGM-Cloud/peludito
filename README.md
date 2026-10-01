# PELUDITO

**Gestión para veterinarias** — by [DGM Cloud](https://dgmcloud.dev)

PELUDITO es una **demo comercial SaaS** para veterinarias. No es el producto final de cada cliente: es la demostración vertical con la que DGM Cloud muestra cómo podría verse un sistema de gestión veterinaria profesional.

```text
DGM Cloud → Demo PELUDITO → Veterinaria interesada → Discovery → Personalización → Backend real
```

URL objetivo: [https://peludito.dgmcloud.dev](https://peludito.dgmcloud.dev)

---

## Objetivo

Entregar una demo convincente (frontend + datos mock + interacciones locales) que se sienta como un SaaS real: citas, pacientes, clientes, historias clínicas, inventario y reportes.

---

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Lucide React
- Recharts

---

## Instalación

```bash
npm install
```

Copia variables de entorno:

```bash
cp .env.example .env.local
```

---

## Desarrollo local

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) (redirige a `/dashboard`).

---

## Build

```bash
npm run build
npm start
```

---

## Deploy (Netlify)

El proyecto incluye `netlify.toml` con `@netlify/plugin-nextjs`.

Variables recomendadas:

| Variable | Ejemplo |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | `https://peludito.dgmcloud.dev` |
| `NEXT_PUBLIC_DGM_URL` | `https://dgmcloud.dev` |

---

## Estructura de carpetas (Arquitectura DGM)

```text
src/
├── app/                 # Rutas, layouts, metadata
├── components/
│   ├── ui/              # Componentes reutilizables (sin dominio)
│   ├── layout/          # Sidebar, Header, shell
│   └── [feature]/      # Módulos de negocio
├── data/
│   ├── mock/            # Datos ficticios
│   └── constants/
├── hooks/
├── lib/                 # Placeholders (Supabase/API futuros)
├── services/            # Capa de acceso a datos (hoy: mock)
├── types/
├── utils/
├── config/
└── styles/
```

Esta misma arquitectura debe reutilizarse en futuros SaaS DGM (FIADITO, CHELERO, VECINO).

---

## Mock data

Toda la información es ficticia y vive en `src/data/mock/`. Los servicios en `src/services/` la consumen; las páginas no deben embeber arrays grandes.

La UI interactúa con estado local (creación de citas, pacientes, productos, etc.) para que la demo se sienta funcional.

---

## Futuro backend

La capa `services/` está preparada para migrar a:

1. **Fase 2:** Supabase / PostgreSQL  
2. **Fase 3:** Backend API + integraciones (auth, pagos, WhatsApp, Calendar, etc.)

Sin acoplar la UI directamente a una base de datos.

---

## Licencia / uso

Proyecto demostrativo de **DGM Cloud**. Contacto comercial: [https://dgmcloud.dev](https://dgmcloud.dev)
