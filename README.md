# BetSync

PWA de análisis pre-partido de fútbol para apuestas deportivas. Compartida entre dispositivos vía Vercel KV (Redis). Sin build step — HTML puro + serverless functions.

---

## Despliegue paso a paso

### 1. Crear repo en GitHub

Ve a [github.com/new](https://github.com/new) y crea un repositorio **vacío** (sin README, sin .gitignore). Llámalo `betsync`.

### 2. Subir el código

```bash
cd betsync
git remote add origin https://github.com/TU_USUARIO/betsync.git
git push -u origin main
```

### 3. Importar en Vercel

1. Ve a [vercel.com](https://vercel.com) → **Add New Project**
2. Importa el repo `betsync` desde GitHub
3. En la configuración del proyecto:
   - **Framework Preset**: `Other`
   - **Output Directory**: `.` (un punto)
4. Haz clic en **Deploy**

### 4. Crear KV Store (Redis compartido)

1. En tu proyecto de Vercel → pestaña **Storage**
2. **Create** → selecciona **KV**
3. Ponle un nombre (ej. `betsync-kv`) y sigue los pasos
4. Una vez creado, haz clic en **Connect to Project** y selecciona `betsync`
5. Esto inyecta automáticamente las variables `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc.

### 5. Añadir la API key de Anthropic

1. Proyecto en Vercel → **Settings** → **Environment Variables**
2. Añade:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: `sk-ant-...` (tu clave de [console.anthropic.com](https://console.anthropic.com))
   - **Environments**: Production, Preview, Development
3. Guarda

### 6. Redeploy

En Vercel → **Deployments** → haz clic en los tres puntos del último deploy → **Redeploy**.

### 7. Instalar en el móvil como PWA

1. Abre la URL del proyecto en **Safari** (iOS) o **Chrome** (Android)
2. iOS: botón compartir → **Añadir a pantalla de inicio**
3. Android: menú ⋮ → **Instalar aplicación**

---

## Estructura del proyecto

```
betsync/
├── api/
│   ├── analyze.js   ← Proxy a Claude API + guarda análisis en KV
│   ├── cache.js     ← Comprueba si un partido ya está analizado
│   └── saved.js     ← Lista todos los análisis guardados
├── index.html       ← Frontend completo (React 18 CDN, sin build)
├── package.json
├── vercel.json
└── README.md
```

## Variables de entorno necesarias

| Variable | Origen | Descripción |
|---|---|---|
| `ANTHROPIC_API_KEY` | Manual en Vercel | Clave de la API de Claude |
| `KV_REST_API_URL` | Auto por Vercel KV | URL del store Redis |
| `KV_REST_API_TOKEN` | Auto por Vercel KV | Token de autenticación |

> **Nota**: Nunca crees un archivo `.env`. Las variables se configuran exclusivamente en el dashboard de Vercel.

## Funcionamiento

- Los análisis se guardan en Redis con TTL de 24 horas
- La clave de cada partido es `match:equipoa|equipob` (ordenado alfabéticamente)
- Cualquier dispositivo que abra la app ve los mismos análisis guardados
- Los próximos partidos se cargan al abrir la app vía Claude
- Si un partido ya está en caché, se muestra instantáneamente sin llamar de nuevo a la API
