# Reparar vídeo D-Link

Aplicación web estática para intentar abrir grabaciones de cámaras que tienen el contenedor, las marcas de tiempo o el formato dañados. Funciona completamente en el navegador con FFmpeg WebAssembly.

## Qué hace

- **Reparación rápida:** vuelve a empaquetar los flujos originales en MP4, regenera marcas de tiempo e ignora partes corruptas que FFmpeg pueda reconocer. No recodifica ni pierde calidad.
- **Compatibilidad iPad:** recodifica el vídeo a H.264 y el audio a AAC dentro de un MP4 optimizado para reproducción web.
- **Privacidad:** el archivo seleccionado no se envía a un servidor. El navegador descarga el motor de procesamiento y trabaja en la memoria del dispositivo.

No puede reconstruir fotogramas que no existan, descifrar grabaciones protegidas ni recuperar un archivo totalmente truncado. Los vídeos grandes pueden superar la memoria disponible en iPadOS; se recomienda empezar con archivos inferiores a 300 MB.

## Desarrollo

Requiere Node.js 18 o posterior.

```bash
npm install
npm run dev
```

Las pruebas y la compilación de producción se ejecutan con:

```bash
npm test
npm run build
```

El script de precompilación copia el núcleo monohilo de FFmpeg a `public/vendor`. Se usa la versión monohilo para no depender de cabeceras de aislamiento entre orígenes que GitHub Pages no permite configurar.

## Publicación

El flujo `.github/workflows/pages.yml` prueba, compila y publica `dist` en GitHub Pages al actualizar `main`. La fuente de Pages debe estar configurada como **GitHub Actions**.

Sitio previsto: <https://rvh1973.github.io/Dlink/>

## Licencias

El código de esta interfaz se distribuye bajo licencia MIT. El motor `@ffmpeg/core` se distribuye bajo GPL-2.0-or-later; consulta los paquetes originales para sus avisos y código fuente: <https://github.com/ffmpegwasm/ffmpeg.wasm>.

“D-Link” pertenece a sus titulares. Este proyecto es una herramienta independiente y no está afiliado a D-Link.
