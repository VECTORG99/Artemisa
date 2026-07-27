# Troubleshooting

> Artemisa only generates configuration files. Problems related to executing the generated agent, connecting to external services or persisting state are **not part of the product** and are not covered here.

---

## Creator no carga catálogo ni workflow

**Síntoma:** La página `/agents/new` muestra un error de conexión o una lista vacía de preguntas.

**Causa probable:** `NEXT_PUBLIC_API_URL` no está configurada o el backend no está corriendo.

**Solución:**

1. Verifica que el backend responde:
   ```bash
   curl http://localhost:3001/api/health
   ```
2. Verifica `NEXT_PUBLIC_API_URL` en el frontend:
   - **Local dev:** `http://localhost:3001`
   - **Docker Compose:** `http://backend:3001` (set in `docker/docker-compose.yml`)
   - **Producción:** la URL de tu backend desplegado
3. `NEXT_PUBLIC_API_URL` se bakea en el bundle en build time. Si la cambias, necesitas un rebuild:
   ```bash
   cd frontend && npm run build
   ```

---

## 401 al hacer preview o generate

**Síntoma:** `POST /api/v1/creator/preview` devuelve 401.

**Causa:** `AUTH_REQUIRED=true` y no se envió una API key válida.

**Solución:**

1. Verifica que `ARTEMISA_API_KEYS` esté configurada en el backend.
2. Envía la key en el header:
   ```
   Authorization: Bearer <tu-key>
   ```
   o
   ```
   X-API-Key: <tu-key>
   ```
3. Si usas el frontend, configura la key en el cliente (próxima feature — por ahora usa curl o el endpoint público `/agent/generate`).

---

## 429 Rate limited mid-flow

**Síntoma:** Después de varias preguntas, el Creator devuelve 429.

**Causa:** El Creator hace ~35 requests en Auto-largo (un `/evaluate` por paso). El rate limit por defecto es 120 rpm para `/api/v1/creator/*`.

**Solución:**

- Sube `RATE_LIMIT_CREATOR` si tu entorno lo permite:
  ```bash
  RATE_LIMIT_CREATOR=200
  ```
- El modo Auto-corto hace solo 8 requests y es menos propenso a esto.
- Los endpoints públicos `/agent/*` tienen un límite separado de 30 rpm (`RATE_LIMIT_AGENT`).

---

## 409 Versión de workflow obsoleta

**Síntoma:** `POST /evaluate` devuelve 409 con un mensaje de versión.

**Causa:** El backend cambió de versión de workflow o catálogo y el cliente está enviando una versión anterior.

**Solución:**

1. Vuelve a cargar `GET /api/v1/creator/workflow` y `GET /api/v1/creator/catalog` para obtener las versiones actuales.
2. Reinicia el borrador en el frontend (botón "Reiniciar borrador").
3. Si persiste, limpia `sessionStorage` del navegador.

---

## 422 Bundle inseguro o árbol incompleto

**Síntoma:** `POST /preview` o `/generate` devuelve 422.

**Causas posibles:**

| Mensaje                   | Causa                                                                             |
| ------------------------- | --------------------------------------------------------------------------------- |
| "Tree incomplete"         | Faltan respuestas a preguntas obligatorias                                        |
| "Literal secret detected" | Una respuesta contiene un token o clave privada                                   |
| "Unsafe bundle"           | El generador detectó una combinación de respuestas que produce un bundle inseguro |

**Solución:**

- Completa todas las preguntas obligatorias (el progreso debe mostrar `complete: true`).
- Nunca pegues secretos reales en las respuestas. Usa referencias como `${GITHUB_TOKEN}`.
- Revisa las advertencias (`warnings[]`) en la respuesta de `/evaluate` — indican qué falta.

---

## Opciones `custom:` generan advertencia

**Síntoma:** Al usar `custom:mi-framework`, el Creator muestra "adaptador pendiente".

**Causa:** Las opciones custom no tienen un generador de artefactos específico. El blueprint las conserva, pero los archivos generados no incluyen configuración para esa tecnología.

**Solución:**

- La advertencia es esperada y no bloquea la generación.
- `WHY.md` documenta las decisiones custom en sus secciones explicativas.
- Tendrás que escribir manualmente la configuración para la tecnología custom en tu proyecto.

---

## CORS bloqueado

**Síntoma:** El frontend desplegado no puede llamar al backend; error de CORS en la consola del navegador.

**Causa:** El origen del frontend no está en `CORS_ALLOWED_ORIGINS`.

**Solución:**

```bash
CORS_ALLOWED_ORIGINS=https://tu-frontend.com,https://www.tu-frontend.com
```

Reinicia el backend después de cambiar esta variable.

---

## El ZIP no se descarga

**Síntoma:** El botón "Descargar todo (.zip)" no produce un archivo.

**Causas posibles:**

- El navegador bloqueó la descarga (popup blocker).
- Error al generar el ZIP en el cliente (memoria insuficiente para bundles muy grandes).

**Solución:**

- Permite popups/descargas para el sitio.
- Usa "Descargar bundle (JSON)" como alternativa y desempaqueta manualmente.
- O descarga los artefactos individualmente desde la pestaña "Archivos".
