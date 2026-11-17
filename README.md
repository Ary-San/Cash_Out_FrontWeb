# Cash-Out · Web

Plataforma de finanzas personales para jóvenes: registra lo que entra y sale (en soles), ponle metas a tu ahorro y practica invertir con **fichas** sobre precios reales, sin arriesgar dinero. Es el cliente web del proyecto Cash-Out (CS2031 · Desarrollo Basado en Plataformas, UTEC).

- **Producción:** https://cash-out-front-web.vercel.app
- **API:** `/api/v1` en el mismo dominio (Vercel reenvía a un backend Spring Boot en AWS ECS)

## Qué hace

| Sección | Funciones |
|---|---|
| Portada | Seda animada en WebGL, propuesta de valor, preguntas frecuentes, política de privacidad |
| Cuenta | Registro, login, verificación de correo, "Continuar con Google" |
| Resumen | Disponible, fichas, gastos del mes por categoría, metas y últimos movimientos |
| Movimientos | Todos, gastos e ingresos con **paginación del backend**, búsqueda, filtros y orden en la URL; detalle y edición; registro con una frase |
| Metas | Crear, aportar, pronóstico y detalle por meta |
| Proyección | Interés simple vs compuesto, tasas de referencia, escenarios guardados y comparación con una meta |
| Portafolio | Mercado, activo con gráfico, órdenes con fichas, noticias y favoritos |
| Minijuegos | ¿Sube o baja?, Arma tu portafolio y la carrera, con salas en vivo (SSE) y pantalla para proyectar |
| Perfil | Datos, foto, contraseña, tema, correos del banco (Gmail) y token del atajo de iPhone |
| Admin | Usuarios, activos, minijuegos y casos de ¿Sube o baja? (solo rol ADMIN) |

## Tecnologías

- **React 19** · **TypeScript** · **Vite 8**
- **React Router 8**: configuración centralizada, rutas protegidas por sesión y rol, rutas dinámicas (`:id`, `:code`), query params, **lazy loading** por página, 404 y pantalla de error de ruta
- **Tailwind CSS 4** + componentes **shadcn/ui** sobre **Radix UI** · `class-variance-authority` · `tw-animate-css`
- **Tipografía:** Geist e Instrument Serif (`@fontsource`) · **Íconos:** lucide-react
- **Recharts** (gráficos) · **sonner** (toasts) · **qrcode.react** (QR de las salas)
- **axios** con cliente central: `baseURL`, interceptores de autenticación, renovación del token y errores globales, cancelación con `AbortController`
- **react-hook-form** + **zod**: validación en tiempo real con las reglas del backend; botones deshabilitados durante el envío
- **Context + hooks propios:** `useAuth`, `useApiQuery`, `useListParams`, `useLiveRoom`, `useLivePrices`, `useTheme`, `useDebouncedValue`…
- **Pruebas:** Vitest + Testing Library (jsdom), con 68 archivos de prueba

## Arquitectura

```
src/
  api/          cliente axios, errores, sesión
  services/     una capa por recurso del backend
  hooks/        lógica reutilizable (datos, listas paginadas, salas en vivo, tema)
  contexts/     sesión y tema
  routes/       router centralizado y guardas
  pages/        una carpeta por sección (contenedores)
  components/   componentes presentacionales por dominio y ui/ (shadcn)
  lib/          reglas puras (montos, fechas, proyecciones, validación)
  types/        tipos de las respuestas del backend
```

## Seguridad

- El access token vive en memoria; el **refresh token va en una cookie HttpOnly, Secure y SameSite=Strict**. Por eso la API se sirve en el mismo dominio (proxy `/api` de Vercel en producción y de Vite en local).
- `vercel.json` agrega **CSP**, **HSTS**, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.
- Manejo diferenciado de 400, 401, 403, 404, 409, 429 y 5xx, error boundaries y reintento en errores recuperables.
- Sin secretos en el frontend: las variables `VITE_` son públicas.

## Correr en local

```bash
npm install
cp .env.example .env    # VITE_API_URL=/api/v1, VITE_DEV_API_TARGET=http://localhost:8080
npm run dev
```

```bash
npm test           # pruebas
npm run lint       # ESLint
npm run typecheck  # tipos
npm run build      # build de producción
```

## Variables

| Variable | Uso |
|---|---|
| `VITE_API_URL` | Siempre relativa (`/api/v1`) para que la cookie de sesión funcione |
| `VITE_GOOGLE_CLIENT_ID` | Client ID web de Google (público). Vacío, el botón de Google no aparece |
| `VITE_DEV_API_TARGET` | Solo en desarrollo: adónde reenvía Vite las peticiones `/api` |

## Despliegue

- **Vercel**, desde `main`: cada push redespliega.
- `vercel.json` reescribe `/api/*` al balanceador del backend en AWS y sirve la SPA (todo lo que no es `/assets/*` va a `index.html`).
- Si cambia el balanceador del backend, se actualiza el destino en `vercel.json`.
