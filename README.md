# Luminaxe Dashboard

Dashboard interactivo de inmobiliarias con Supabase realtime. Cambios en tiempo real en todos los dispositivos.

## 🚀 Quick Start - Deploy en Vercel (Gratis)

### Paso 1: Crear un repo en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Crea un repo llamado `luminaxe-dashboard` (público o privado)
3. **NO** inicialices con README

### Paso 2: Clonar y pushear el código

```bash
# En tu máquina
git clone https://github.com/tu-usuario/luminaxe-dashboard.git
cd luminaxe-dashboard

# Copiar todos los archivos de este proyecto

git add .
git commit -m "Initial commit: Luminaxe Dashboard"
git branch -M main
git push -u origin main
```

### Paso 3: Deployar en Vercel

1. Ve a [vercel.com](https://vercel.com) y loguéate
2. Click en "New Project"
3. Selecciona tu repo `luminaxe-dashboard`
4. **Environment Variables**: No necesitas configurar nada (Supabase es pública)
5. Click en "Deploy"

**Listo.** Tu dashboard estará live en una URL como:
```
https://luminaxe-dashboard.vercel.app
```

## 📱 Características

✅ **Tabla interactiva** con búsqueda y filtros  
✅ **Realtime** — cambios se sincronizan en tiempo real  
✅ **Métricas resumen** — total, con vídeo, contactadas, agendadas  
✅ **Panel de detalles** — click en inmobiliaria para ver todo  
✅ **Filtros avanzados** — por provincia y estado  
✅ **Responsive** — funciona en mobile/tablet/desktop  
✅ **Sin créditos** — 100% gratuito  

## 🔄 Cambios en Tiempo Real

El dashboard está conectado directamente a tu BD de Supabase con **realtime subscriptions**. 

Cuando alguien actualiza una inmobiliaria en Supabase:
- **Todos los dispositivos** ven el cambio instantáneamente
- No hay que refrescar la página
- Múltiples usuarios pueden verlo a la vez

## 🛠 Desarrollo Local

```bash
npm install
npm run dev
```

Accede a [http://localhost:3000](http://localhost:3000)

## 📊 Datos de Supabase

El dashboard usa:
- **URL**: `https://aqassltxvrtegatlzkkl.supabase.co`
- **Key**: `sb_publishable_u5A3pcpkyLXqQa6s2x-pxg_Vci2xypW`
- **Tabla**: `inmobiliarias`

Estos datos ya están hardcodeados en el código (la key es pública).

## 📝 Personalización

Edita `components/Dashboard.tsx` para:
- Cambiar colores
- Añadir/quitar columnas
- Modificar filtros
- Cambiar el estilo

## 🚨 Troubleshooting

**No carga datos:**
- Verifica que Supabase esté online
- Comprueba que la tabla `inmobiliarias` existe

**Cambios no aparecen en tiempo real:**
- Recarga la página (Ctrl+F5)
- Verifica la conexión a internet

**Errores en deploy:**
- Asegúrate de que subiste todos los archivos a GitHub
- Verifica que package.json tiene las dependencias correctas

---

**Preguntas:** Mira `package.json` para ver las dependencias usadas.
