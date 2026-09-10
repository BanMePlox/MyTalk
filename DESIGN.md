# MyTalk — Sistema de diseño «Papel»

Diseño editorial diurno para chat en tiempo real. Calidez de papel crema, tipografía sobria, un solo acento oliva. **No** competimos visualmente con Discord ni con el estético genérico de apps «AI slop».

---

## Concepto

**Papel** evoca una mesa de trabajo con notas y conversación: fondos crema, bordes finos, jerarquía por peso tipográfico (no por colores chillones). La interfaz debe sentirse como un cuaderno bien editado, no como un panel de control futurista.

---

## Tokens (bloqueados)

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
  --radius: 10px;
  --radius-sm: 6px;
  --font-sans: "IBM Plex Sans", "Source Sans 3", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}
```

Implementación: `resources/css/app.css` (variables) + `tailwind.config.js` (utilidades semánticas).

---

## Reglas anti-slop (obligatorias)

| Prohibido | Alternativa |
|-----------|-------------|
| Gradientes púrpura/azul | Colores sólidos del token |
| Glow, sombras enormes, glassmorphism | Bordes finos `--border` |
| Inter + acento púrpura por defecto | IBM Plex Sans + `--accent` oliva |
| Múltiples acentos compitiendo | Un solo acento para links, botones primarios, unread, focus |
| Colas cómicas en burbujas | `--radius`, sin tail |
| Invertir crema para «dark mode» | Tema oscuro será diseño separado (futuro) |

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

---

## Burbujas de mensaje

| Tipo | Fondo | Borde |
|------|-------|-------|
| Propios (`bubble-me`) | `--bubble-me` | ninguno |
| Ajenos (`bubble-them`) | `--bubble-them` | 1px `--border` |

- Radio: `--radius` (10px). Sin colas.
- Lista densa: gaps de 8–10px entre mensajes.
- Hover de fila: `--bg-muted` suave, no overlay oscuro.

---

## Inputs y focus

- Barra de mensaje: fondo `--bg-elevated`, borde `--border`, radio `--radius`.
- Campos de formulario: misma paleta; placeholder `--text-muted`.
- **Focus:** `outline: 2px solid var(--accent); outline-offset: 2px` — sin box-shadow arcoíris.

Clases utilitarias: `.input-field`, `.chat-input-bar`, `.btn-primary` en `app.css`.

---

## Botones

| Variante | Estilo |
|----------|--------|
| Primario | `bg-accent`, texto blanco/crema claro, sin sombra de color |
| Secundario | borde `--border`, fondo `--bg-elevated` |
| Peligro | `--danger` solo para acciones destructivas |

---

## Componentes clave

| Superficie | Archivo(s) |
|------------|------------|
| Welcome / landing | `resources/js/Pages/Welcome.jsx` |
| Login / Register | `resources/js/Pages/Auth/*.jsx` |
| Layout autenticado | `resources/js/Layouts/AuthenticatedLayout.jsx` |
| Rail + sidebar + canal | `ServerRail.jsx`, `Channels/Show.jsx` |
| Burbujas + input | `Channels/Show.jsx` (inline, clases `.msg-bubble-*`) |
| Tauri title bar | `resources/js/Components/TitleBar.jsx` |

---

## Modo oscuro

**Fuera de alcance actual.** No invertir la paleta crema. Cuando exista, será un `:root[data-theme="dark"]` o `.dark` con tokens propios diseñados desde cero.

---

## Preview local

```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
php artisan migrate --force
npm run build   # o npm run dev
php artisan serve
```

Abrir `/` (welcome), `/login`, y un canal tras autenticarse.
