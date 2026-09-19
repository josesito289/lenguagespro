# Ruta de Inglés

App de seguimiento diario para un plan de inglés de 4 meses (Anki, BBC Learning
English, ChatGPT y práctica escrita). Es una PWA: se puede instalar en el
teléfono como una app con ícono propio, y todo el progreso se guarda
localmente en el navegador, sin servidor ni cuenta.

## Estructura del proyecto

```
index.html
manifest.json      ← metadatos de la app instalable (nombre, íconos, colores)
sw.js               ← service worker (permite abrir la app sin conexión)
css/styles.css
js/app.js
icons/
  icon-192.png
  icon-512.png
  icon-maskable-512.png
  apple-touch-icon.png
  favicon-32.png
```

Todas las rutas dentro del proyecto son relativas a propósito, así que
funciona sin cambios sin importar el nombre del repositorio.

## Publicar con GitHub Pages

1. Crea un repositorio nuevo en GitHub (puede ser público o privado si tienes
   GitHub Pro; Pages gratuito requiere repo público).
2. Sube estos archivos conservando la misma estructura de carpetas
   (`css/`, `js/`, `icons/` tal cual).
3. Ve a **Settings → Pages**, en "Source" elige la rama (`main`) y la carpeta
   raíz (`/`). Guarda.
4. Espera uno o dos minutos y GitHub te dará un enlace del tipo
   `https://tu-usuario.github.io/nombre-del-repo/`.

## Instalar en el Galaxy S21 como app

1. Abre ese enlace en Chrome, en el teléfono.
2. Toca el menú (⋮) → **Instalar app** (o **Añadir a pantalla de inicio**,
   según la versión de Chrome).
3. Confirma. Te quedará un ícono propio en el cajón de aplicaciones, y se
   abrirá en su propia ventana, sin la barra de Chrome — igual que antes.

## Notas

- Los datos (progreso, fecha de inicio, tema) se guardan solo en el
  almacenamiento local del navegador de ese dispositivo. Si cambias de
  teléfono, usa **Ajustes → Copia de seguridad** dentro de la app para
  exportar/restaurar tu progreso como texto.
- El service worker cachea los archivos propios de la app (HTML, CSS, JS,
  íconos) para que abra sin conexión. Las tipografías de Google Fonts se
  cargan desde internet; si no hay conexión, el texto usa las fuentes del
  sistema como respaldo — la app sigue siendo completamente usable.
- Si editas `css/styles.css` o `js/app.js` más adelante, sube el cambio a
  GitHub y también incrementa `CACHE_NAME` en `sw.js` (por ejemplo
  `ruta-ingles-v2`); si no, algunos teléfonos seguirán viendo la versión
  cacheada anterior por un tiempo.
