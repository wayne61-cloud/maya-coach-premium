# MAYA Coach Servers

## 1. Start the OpenAI proxy

```bash
cd "/Users/yohannbouah/Desktop/code app/coach"
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4.1-mini" # optional
node api/maya-coach-proxy.mjs
```

Proxy endpoint:

```text
http://localhost:8787/api/maya-coach
```

Health check:

```text
http://localhost:8787/api/maya-coach/health
```

## In the app

- IA page -> `Mode = Proxy sécurisé`
- Endpoint = `http://localhost:8787/api/maya-coach`
- Optionnel: active `Recherche web` dans l'app pour autoriser un coach cloud connecté à internet
- Save config
- Test connection

If proxy fails, the app falls back automatically to the local generator.

## 2. Start the private backend

```bash
cd "/Users/yohannbouah/Desktop/code app/coach"
export MAYA_ADMIN_EMAILS="admin@maya.fitness"
export MAYA_ADMIN_PASSWORD="ChangeThisNow123!"
export MAYA_ADMIN_DISPLAY_NAME="MAYA Admin"
export MAYA_ALLOWED_ORIGINS="http://localhost:8080"
node api/maya-coach-backend.mjs
```

Available endpoints:

- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/auth/signout`
- `GET /api/auth/session`
- `GET /api/sync/pull`
- `POST /api/sync/push`
- `PUT /api/profile`
- `GET /api/admin/dashboard`
- `PATCH /api/admin/users/:id/status`
- `DELETE /api/admin/photos/:id`
- `DELETE /api/admin/users/:id/photos`
- `GET /api/health`

This backend is now a real product backend:

- it uses SQLite for persistent users, sessions and synced state,
- it supports real email/password auth,
- it seeds a protected admin account from environment variables,
- it moderates new signups by default with `pending` status,
- it exposes admin moderation and photo review endpoints.

## 3. Serve the frontend over HTTP

```bash
cd "/Users/yohannbouah/Desktop/code app/coach"
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080/index.html
```

Create `config.json` at the project root with:

```json
{
  "auth": {
    "previewEnabled": true,
    "adminEmails": ["admin@maya.fitness"]
  },
  "services": {
    "backend": {
      "enabled": true,
      "url": "http://localhost:8788"
    },
    "flowise": {
      "enabled": false,
      "apiHost": "",
      "chatflowId": "",
      "version": "latest"
    }
  }
}
```
