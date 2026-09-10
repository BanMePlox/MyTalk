# Papel UI — design preview screenshots

Captured from a running local instance (`php8.4 artisan serve` + `npm run dev`) on branch `cursor/papel-ui-redesign-56ed`.

Run `node scripts/capture-design-preview.mjs` to regenerate.

## Core surfaces (light + dark)

| File | Screen |
|------|--------|
| `welcome-light.png` / `welcome-dark.png` | Landing `/` |
| `login-light.png` / `login-dark.png` | Login `/login` |
| `chat-layout-light.png` / `chat-layout-dark.png` | Main chat `/channels/1` |
| `friends-light.png` / `friends-dark.png` | Friends `/friends` |
| `dm-light.png` / `dm-dark.png` | Direct message `/conversations/1` |
| `settings-light.png` / `settings-dark.png` | Server settings modal |
| `profile-modal-light.png` / `profile-modal-dark.png` | Profile modal |
| `legal-light.png` / `legal-dark.png` | Terms `/terms` |

## Legacy numbered set (earlier pass)

| File | Screen |
|------|--------|
| `01-welcome.png` … `08-chat-messages-dark.png` | Initial welcome/login/chat captures |

Demo data: server **Estudio Papel**, channel **#general**, DM with **Ana García**, login `test@example.com` / `password`.

Dark captures use `localStorage.theme = 'dark'` (same as the in-app theme toggle).
