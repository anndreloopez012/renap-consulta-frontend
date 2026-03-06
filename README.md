# RENAP — Consulta de Información

Frontend del sistema de consulta y gestión de información del **Registro Nacional de las Personas de Guatemala**.

## Tecnologías

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Zustand** (estado de autenticación)
- **TanStack Query** (fetching de datos)
- **React Router v6**
- **Framer Motion** (animaciones)

## Requisitos

- Node.js 18+
- npm / pnpm / bun

## Desarrollo local

```sh
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La app corre en `http://localhost:8080`.

## Variables de entorno

Crear un archivo `.env.local` en la raíz:

```env
VITE_API_URL=https://api-info.gts-guatemala.com
```

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción |
| `npm run preview` | Vista previa del build |
| `npm run test` | Ejecutar tests |
| `npm run lint` | Lint del código |
