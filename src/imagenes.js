// Procesa la foto del trabajo antes de guardarla (mismo método que el cotizador).
//
// La cámara/galería de un celular puede entregar cualquier cosa (HEIC en
// iPhone, WebP, PNG de varios MB...), y pdf-lib solo sabe dibujar JPG y PNG.
// Así que aquí se decodifica lo que sea, se redibuja en un <canvas> a un
// tamaño razonable y se exporta SIEMPRE como JPEG: así el PDF siempre puede
// dibujarla y el archivo pesa mucho menos.

const LADO_MAXIMO = 1000
const CALIDAD_JPEG = 0.7

// Convierte un File de imagen a un data URL JPEG, redimensionado para que ni
// el ancho ni el alto superen LADO_MAXIMO. Si el navegador no puede
// decodificarlo, lanza un Error con un mensaje para mostrarlo tal cual.
export async function archivoAJpegDataUrl(archivo) {
  const fuente = await decodificarImagen(archivo)
  try {
    const anchoOriginal = fuente.naturalWidth || fuente.width
    const altoOriginal = fuente.naturalHeight || fuente.height

    if (!anchoOriginal || !altoOriginal) {
      throw new Error('La imagen se abrió pero no tiene contenido visible.')
    }

    const escala = Math.min(1, LADO_MAXIMO / Math.max(anchoOriginal, altoOriginal))
    const ancho = Math.max(1, Math.round(anchoOriginal * escala))
    const alto = Math.max(1, Math.round(altoOriginal * escala))

    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('El navegador no pudo preparar el lienzo para procesar la imagen.')
    }
    // Fondo blanco: si el origen tiene transparencia (PNG/WebP), un JPEG no
    // la soporta y quedaría negro sin esto.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, ancho, alto)
    ctx.drawImage(fuente, 0, 0, ancho, alto)

    const dataUrl = canvas.toDataURL('image/jpeg', CALIDAD_JPEG)
    if (!dataUrl || !dataUrl.startsWith('data:image/jpeg')) {
      throw new Error('El navegador no pudo exportar la imagen como JPEG.')
    }
    return dataUrl
  } finally {
    fuente.close?.() // libera memoria si es un ImageBitmap
  }
}

async function decodificarImagen(archivo) {
  // createImageBitmap es la vía más directa y la que mejor soporta formatos
  // como WebP. Si no está disponible o falla, se intenta con <img> como
  // respaldo (por ejemplo formatos raros o navegadores viejos).
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(archivo)
    } catch {
      // sigue con el respaldo de abajo
    }
  }

  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(
        new Error(
          `El navegador no pudo abrir este archivo como imagen (${archivo.type || 'formato desconocido'}).`,
        ),
      )
    }
    img.src = url
  })
}
