# MyTalk — Sistema de diseño «Papel»

Diseño editorial para chat en tiempo real. Calidez de papel (día) o carbón cálido (noche), tipografía sobria, un solo acento oliva. **No** competimos visualmente con Discord ni con el estético genérico de apps «AI slop».

---

## Concepto

**Papel** evoca una mesa de trabajo con notas y conversación: fondos crema o carbón cálido, bordes finos, jerarquía por peso tipográfico (no por colores chillones). La interfaz debe sentirse como un cuaderno bien editado, no como un panel de control futurista.

---

## Tokens — modo claro (`:root`)

```css
:root {
  --bg: #F4EFE6;
  --bg-elevated: #FAF7F2;
  --bg-muted: #EBE4D8;
  --text: #1C1915;
  --text-secondary: #5C554C;
  --text-muted: #8A8278;
  --border: #DDD5C8;
  --border-strong: #C4BAA8;
  --accent: #3F6F5B; /* único acento: oliva */
  --accent-soft: color-mix(in srgb, var(--accent) 14%, var(--bg-elevated));
  --danger: #A63D3D;
  --success: #3F6F5B;
  --bubble-me: var(--accent-soft);
  --bubble-them: #FFFCF7;
  --text-on-accent: #FFFCF7;
  --overlay: color-mix(in srgb, #1C1915 38%, transparent);
  --radius: 10px;
  --radius-sm: 6px;
  --font-sans: "IBM Plex Sans", "Source Sans 3", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}
```

---

## Tokens — modo oscuro (`html.dark`)

Diseñado desde cero. **No** es una inversión naïve del crema.

```css
html.dark {
  /* Jerarquía: rail (--bg-muted) → sidebar (--bg) → hilo (--bg-elevated) */
  --bg-muted: #120F0C;
  --bg: #1A1611;
  --bg-elevated: #242017;
  --text: #F2EADF;
  --text-secondary: #C8BFB2;
  --text-muted: #6E665C;
  --border: #3A332A;
  --border-strong: #50463C;
  --accent: #7BA894;
  --accent-soft: color-mix(in srgb, var(--accent) 34%, var(--bg-elevated));
  --accent-chip: color-mix(in srgb, var(--accent) 24%, var(--bg));
  --danger: #C45C5C;
  --success: #7BA894;
  --bubble-me: var(--accent-soft);
  --bubble-them: #2C2720;
  --text-on-accent: #F2EADF;
  --overlay: color-mix(in srgb, #120F0C 86%, transparent);
}
```

Logo oscuro: `public/images/logo-dark.svg` (marca geométrica crema/oliva). Favicon: `public/icon-dark.svg`. Componente `AppLogo` intercambia en `html.dark`.

Implementación: `resources/css/app.css` (variables) + `tailwind.config.js` (utilidades semánticas).

**Toggle:** `ThemeContext` añade/quita la clase `dark` en `<html>`. Persiste en `localStorage.theme`. Componente `ThemeToggle` en welcome, login y menú de usuario en chat.

---

## Reglas anti-slop (obligatorias — ambos modos)

| Prohibido | Alternativa |
|-----------|-------------|
| Gradientes púrpura/azul | Colores sólidos del token |
| Glow, sombras enormes, glassmorphism | Bordes finos `--border` |
| Inter + acento púrpura por defecto | IBM Plex Sans + `--accent` oliva |
| Múltiples acentos compitiendo | Un solo acento para links, botones primarios, unread, focus |
| Colas cómicas en burbujas | `--radius`, sin tail |
| `#000` / `#FFF` puros, blurple Discord | Carbón cálido + crema apagada vía tokens |
| Overlays negros puros | `--overlay` / `.overlay-backdrop` |

---

## Tipografía

| Uso | Tamaño | Peso |
|-----|--------|------|
| Cuerpo de chat | 14–15px (`text-sm` / `text-[15px]`) | 400 |
| Metadatos (hora, estado) | 12px | 400, color `--text-muted` |
| Nombre en mensaje | 14px | 600 |
| Títulos de sección | 13px uppercase | 600, `--text-secondary` |
| Empty states | 15–16px | 400, `--text-muted`, espaciado generoso |

Jerarquía por **peso**, no por color saturado.

---

## Superficies y layout

```
┌─────────┬──────────┬─────────────────────┬──────────┐
│  Rail   │ Sidebar  │   Main (elevated)   │ Members  │
│ bg-muted│   bg     │    bg-elevated      │   bg     │
│         │ + border │    + border         │ + border │
└─────────┴──────────┴─────────────────────┴──────────┘
```

- **Sidebar vs main:** `--bg` frente a `--bg-elevated` + borde fino. Sin contraste duro negro/blanco.
- **Rail de servidores:** `--bg-muted`, iconos con acento oliva cuando activos.
- Misma jerarquía en claro y oscuro; solo cambian los valores de token.

---

## Burbujas de mensaje

| Tipo | Claro | Oscuro |
|------|-------|--------|
| Propios (`bubble-me`) | `--accent-soft` sobre crema | `--accent-soft` sobre carbón |
| Ajenos (`bubble-them`) | `#FFFCF7` + borde | `#2A2620` + borde |

- Radio: `--radius` (10px). Sin colas.
- Lista densa: gaps de 8–10px entre mensajes.
- Hover de fila: `--bg-muted` suave.

---

## Inputs y focus

- Barra de mensaje: fondo `--bg-elevated`, borde `--border`, radio `--radius`.
- Campos de formulario: misma paleta; placeholder `--text-muted`.
- **Focus:** `outline: 2px solid var(--accent); outline-offset: 2px` — sin box-shadow arcoíris.

Clases utilitarias: `.input-field`, `.chat-input-bar`, `.btn-primary`, `.overlay-backdrop` en `app.css`.

---

## Botones

| Variante | Estilo |
|----------|--------|
| Primario | `bg-accent`, `--text-on-accent`, sin sombra de color |
| Secundario | borde `--border`, fondo `--bg-elevated` |
| Peligro | `--danger` solo para acciones destructivas |

---

## Componentes clave

| Superficie | Archivo(s) |
|------------|------------|
| Welcome / landing | `resources/js/Pages/Welcome.jsx` |
| Login / Register | `resources/js/Pages/Auth/*.jsx` |
| Brand logo (light/dark) | `resources/js/Components/AppLogo.jsx` |
| Theme toggle | `resources/js/Components/ThemeToggle.jsx` |
| Layout autenticado | `resources/js/Layouts/AuthenticatedLayout.jsx` |
| Rail + sidebar + canal | `ServerRail.jsx`, `Channels/Show.jsx` |
| Burbujas + input | `Channels/Show.jsx` (clases `.msg-bubble-*`) |
| Tauri title bar | `resources/js/Components/TitleBar.jsx` |

---

## Preview local

```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
php artisan migrate --force
npm run build   # o npm run dev
php artisan serve
```

Abrir `/` (welcome), `/login`, y un canal tras autenticarse. Alternar tema con el botón luna/sol o desde el menú de usuario en chat.

Screenshots: `docs/design-preview/` (claro `01–04`, oscuro `05–08`).
