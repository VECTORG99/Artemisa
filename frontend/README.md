# @artemisa/frontend

Frontend de Artemisa construido con Next.js 16.

## Desarrollo

```bash
npm ci
npm run dev
```

Variables de entorno: ver `.env.example` en la raiz del proyecto. `NEXT_PUBLIC_API_URL` apunta al backend.

## Comandos

| Comando            | Funcion                              |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Servidor de desarrollo con Turbopack |
| `npm run build`    | Build de produccion                  |
| `npm test`         | Tests unitarios con Vitest           |
| `npm run test:e2e` | Tests E2E con Playwright             |
