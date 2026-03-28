# MAYA Coach

MAYA Coach is a modular coaching app with:

- adaptive workout generation,
- athlete profile personalization (`name`, `age`, `weight`),
- local evolution tracking and weight snapshots,
- nutrition recommendations tied to training load,
- recovery modules,
- optional cloud AI configuration,
- local notifications and a lightweight sync backend for development.

## Run locally

```bash
cd "/Users/yohannbouah/Desktop/code app/coach"
python3 -m http.server 8080
```

Open [http://localhost:8080/index.html](http://localhost:8080/index.html).

## Optional local services

See [`api/README.md`](./api/README.md) for:

- the OpenAI proxy,
- the sync backend,
- health endpoints and local magic-link auth.
