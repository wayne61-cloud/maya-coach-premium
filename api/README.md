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

## 2. Start the lightweight sync backend

```bash
cd "/Users/yohannbouah/Desktop/code app/coach"
export MAYA_DEV_TOKEN="maya-dev-token"
node api/maya-coach-backend.mjs
```

Available endpoints:

- `POST /api/auth/magic-link`
- `GET /api/sync/pull`
- `POST /api/sync/push`
- `PUT /api/profile`
- `GET /api/health`

This backend is intentionally lightweight:

- it prepares cloud sync for history, favoris, profil, évolution du poids, nutrition, IA et notifications,
- it simulates a magic-link flow for local development,
- it does not yet wire real Google / Apple / email providers.

## 3. Serve the frontend over HTTP

```bash
cd "/Users/yohannbouah/Desktop/code app/coach"
python3 -m http.server 8080
```

Open:

```text
http://localhost:8080/index.html
```
