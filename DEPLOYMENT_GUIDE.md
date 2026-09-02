# 🚀 Guía de Deploy - Luminaxe Dashboard

## Resumen en 5 pasos:

1. **Descargar** el código
2. **Crear repo** en GitHub
3. **Subir código** a GitHub
4. **Conectar** a Vercel
5. **Deploy** automático

---

## PASO 1️⃣ Descargar el código

El archivo `luminaxe-dashboard.tar.gz` contiene todo lo que necesitas.

**Opción A: En Mac/Linux**
```bash
tar -xzf luminaxe-dashboard.tar.gz
cd luminaxe-dashboard
```

**Opción B: En Windows**
- Descarga [7-Zip](https://www.7-zip.org/) o WinRAR
- Click derecho en `luminaxe-dashboard.tar.gz` → "Extract Here"
- Abre la carpeta `luminaxe-dashboard`

---

## PASO 2️⃣ Crear un repo en GitHub

1. Ve a **[github.com](https://github.com)** (loguéate o crea cuenta gratis)
2. Click en tu **avatar** (arriba derecha) → **"Your repositories"**
3. Click en **"New"** (botón verde)
4. **Repository name**: `luminaxe-dashboard`
5. **Visibility**: Elige "Public" o "Private"
6. **NO marques** "Initialize this repository with a README" (ya tiene uno)
7. Click **"Create repository"**

Te mostrará una URL como: `https://github.com/tu-usuario/luminaxe-dashboard`

---

## PASO 3️⃣ Subir el código a GitHub

Abre **Terminal** (Mac/Linux) o **PowerShell** (Windows) en la carpeta `luminaxe-dashboard`:

```bash
git init
git add .
git commit -m "Initial commit: Luminaxe Dashboard"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/luminaxe-dashboard.git
git push -u origin main
```

**Reemplaza `TU-USUARIO`** con tu usuario de GitHub.

Si te pide contraseña:
- En GitHub: ve a Settings → Developer settings → Personal access tokens
- Crea un token (marcar "repo")
- Usa ese token como contraseña

---

## PASO 4️⃣ Deploy en Vercel (1 minuto)

1. Ve a **[vercel.com](https://vercel.com)**
2. Click **"Sign Up"** (o loguéate si tienes cuenta)
3. Loguéate con GitHub (recomendado)
4. En tu dashboard, click **"New Project"**
5. **Select a Git Repository**: Busca y selecciona `luminaxe-dashboard`
6. **Configure Project**: Déjalo como está (no necesitas variables de entorno)
7. Click **"Deploy"**

Vercel empezará a buildear. En **~1-2 minutos** tu dashboard estará live.

---

## ✅ Listo

Tu URL será algo como:
```
https://luminaxe-dashboard.vercel.app
```

**Comparte esta URL** con tu equipo. Todos pueden:
- Ver los datos
- Buscar y filtrar
- Ver cambios en **tiempo real** desde cualquier dispositivo

---

## 🔄 Cómo actualizar después

Si cambias algo en el código (en tu máquina):

```bash
git add .
git commit -m "Cambio: descripción breve"
git push
```

Vercel se enterará automáticamente y hará deploy en ~2 minutos.

---

## ❓ Troubleshooting

**"fatal: not a git repository"**
- Asegúrate de estar en la carpeta correcta:
```bash
cd luminaxe-dashboard
```

**GitHub pide 2FA (dos factores)**
- Sigue las instrucciones en la pantalla
- O usa un Personal Access Token (ver Paso 3)

**Vercel dice "Build failed"**
- Haz scroll en los logs para ver el error
- Comprueba que copiaste TODOS los archivos
- Intenta hacer "Redeploy" desde el dashboard de Vercel

**El dashboard no carga datos**
- Recarga la página (Ctrl+F5)
- Verifica que Supabase está online
- Abre DevTools (F12) → Console para ver errores

---

## 🎯 ¿Qué sale al final?

- **URL live**: Tu dashboard online 24/7
- **Realtime**: Cambios sincronizados en todos los dispositivos
- **Gratis**: Sin créditos, sin costes
- **Rápido**: Métricas, filtros, búsqueda instantánea

¡A disfrutar! 🚀
