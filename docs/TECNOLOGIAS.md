# Stack Tecnológico — MyTalk

## Backend

| Tecnología | Versión | Uso |
|---|---|---|
| PHP | 8.2+ | Lenguaje del servidor |
| Laravel | 12 | Framework principal (routing, ORM, eventos, broadcasting) |
| Laravel Reverb | 1.8 | Servidor WebSocket propio (tiempo real) |
| Laravel Sanctum | 4.0 | Autenticación de API y gestión de sesiones |
| Laravel Breeze | 2.4 | Scaffolding de autenticación (login, registro, perfil) |
| Inertia.js (Laravel) | 2.0 | Puente entre Laravel y React sin API REST explícita |
| Ziggy | 2.0 | Exposición de rutas Laravel al frontend (`route()`) |
| SQLite | — | Base de datos (fichero local, sin servidor) |
| Laravel Tinker | 2.10 | REPL interactivo para consola |

## Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 18 | Librería de UI (componentes, estado, efectos) |
| Inertia.js (React) | 2.0 | Navegación SPA integrada con Laravel |
| Tailwind CSS | 3 | Estilos mediante clases utilitarias |
| Headless UI | 2.0 | Componentes accesibles sin estilos predefinidos |
| Axios | 1.11 | Cliente HTTP para peticiones AJAX |
| Laravel Echo | 2.3 | Cliente WebSocket para escuchar canales de Reverb |
| Pusher JS | 8.4 | Driver de transporte usado por Echo |

## Tooling

| Tecnología | Versión | Uso |
|---|---|---|
| Vite | 7 | Bundler y servidor de desarrollo frontend |
| laravel-vite-plugin | 2.0 | Integración entre Vite y Laravel (hot reload, manifesto) |
| @vitejs/plugin-react | 4.2 | Soporte de JSX y React Fast Refresh en Vite |
| PostCSS + Autoprefixer | — | Procesado y compatibilidad de CSS |
| Concurrently | 9.0 | Ejecución paralela de múltiples procesos en desarrollo |
| Laravel Pint | 1.24 | Formateador de código PHP (PSR-12) |
| PHPUnit | 11.5 | Framework de testing para PHP |

## Arquitectura de tiempo real

MyTalk usa un modelo de broadcasting basado en canales:

- **Canales públicos** — sin autenticación (no usados actualmente)
- **Canales privados** (`private-*`) — autenticados por usuario; usados para menciones (`App.Models.User.{id}`), DMs (`conversation.{id}`)
- **Canales de presencia** (`presence-*`) — extienden los privados y permiten saber qué usuarios están conectados; usados para estado online/ausente/dnd (`presence-server.{id}`)
- **Whispers** — mensajes cliente a cliente sin pasar por el servidor; usados para el indicador "X está escribiendo..."
