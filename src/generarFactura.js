import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// Coordenadas medidas en la plantilla con origen ARRIBA-izquierda (en puntos).
// pdf-lib mide "y" desde ABAJO, así que se convierte con: bordeSuperior - y.
// OJO: el MediaBox de esta plantilla no empieza en y=0 sino en y=7.92, así que
// el borde superior es 799.92 y no 792; por eso se lee de la propia página.

// Proporción de la letra que baja de la línea base (descendente) en la fuente
// de la plantilla. Con ella se pasa del borde inferior de la franja de cada
// etiqueta a su línea base, para que el valor quede alineado con la etiqueta.
const DESCENDENTE = 0.35

const CAMPOS = {
  name: { x: 86, yInferior: 220.51, tamano: 9.4 },
  address: { x: 94, yInferior: 238.51, tamano: 9.4 },
  date: { x: 79, yInferior: 256.51, tamano: 9.4 },
  // El "$" ya está impreso en la plantilla (x=172.2 a x=180.1)
  total: { x: 183, yInferior: 510.89, tamano: 12, negrita: true },
}

// Zonas rectangulares, también con origen ARRIBA-izquierda.
// Logo viejo de la plantilla (dice "JUN REMOVAL"): se tapa con blanco y se
// dibuja encima el logo corregido.
const ZONA_LOGO = { x: 278, y: 0, ancho: 312, alto: 130 }
// El rectángulo blanco llega hasta el borde derecho de la página (612): si se
// corta en x=590, queda un pedacito suelto de la franja rosa a la derecha.
const TAPA_LOGO = { x: 278, y: 0, ancho: 612 - 278, alto: 130 }
// Espacio libre bajo "TOTAL AMOUNT DUE", a la derecha de la bolsa que sostiene
// el lobo y por encima de la onda roja del pie de página.
const ZONA_FOTO = { x: 462, y: 512, ancho: 132, alto: 166 }

// Calcula dónde dibujar una imagen para que quepa en la zona sin deformarse,
// centrada, y lo devuelve ya en coordenadas de pdf-lib (y desde abajo).
function encajarEnZona(bordeSuperior, zona, anchoImagen, altoImagen) {
  const escala = Math.min(zona.ancho / anchoImagen, zona.alto / altoImagen)
  const ancho = anchoImagen * escala
  const alto = altoImagen * escala
  const x = zona.x + (zona.ancho - ancho) / 2
  const yArriba = zona.y + (zona.alto - alto) / 2
  return { x, y: bordeSuperior - yArriba - alto, width: ancho, height: alto }
}

function lineaBase(bordeSuperior, { yInferior, tamano }) {
  const desdeArriba = yInferior - tamano * DESCENDENTE
  return bordeSuperior - desdeArriba
}

// "2026-10-03" -> "10/03/2026"
export function formatearFecha(iso) {
  if (!iso) return ''
  const [anio, mes, dia] = iso.split('-')
  return `${mes}/${dia}/${anio}`
}

function formatearMonto(valor) {
  const numero = Number(valor)
  if (valor === '' || Number.isNaN(numero)) return ''
  return numero.toFixed(2)
}

// Recibe los bytes de la plantilla, los del logo corregido (JPEG) y los datos
// del formulario (foto = data URL JPEG o null); devuelve los bytes del PDF final.
export async function rellenarFactura(plantillaBytes, logoBytes, { name, address, date, amount, foto }) {
  const pdf = await PDFDocument.load(plantillaBytes)
  const pagina = pdf.getPage(0)
  const caja = pagina.getMediaBox()
  const bordeSuperior = caja.y + caja.height
  const normal = await pdf.embedFont(StandardFonts.Helvetica)
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold)

  // Logo: rectángulo blanco sobre el viejo y el corregido encima
  pagina.drawRectangle({
    x: TAPA_LOGO.x,
    y: bordeSuperior - TAPA_LOGO.y - TAPA_LOGO.alto,
    width: TAPA_LOGO.ancho,
    height: TAPA_LOGO.alto,
    color: rgb(1, 1, 1),
  })
  const logo = await pdf.embedJpg(logoBytes)
  pagina.drawImage(logo, encajarEnZona(bordeSuperior, ZONA_LOGO, logo.width, logo.height))

  // Foto del trabajo (opcional)
  if (foto) {
    const imagen = await pdf.embedJpg(foto)
    pagina.drawImage(imagen, encajarEnZona(bordeSuperior, ZONA_FOTO, imagen.width, imagen.height))
  }

  const valores = {
    name,
    address,
    date: formatearFecha(date),
    total: formatearMonto(amount),
  }

  for (const [clave, campo] of Object.entries(CAMPOS)) {
    const texto = valores[clave]
    if (!texto) continue
    pagina.drawText(texto, {
      x: campo.x,
      y: lineaBase(bordeSuperior, campo),
      size: campo.tamano,
      font: campo.negrita ? negrita : normal,
      color: rgb(0, 0, 0),
    })
  }

  return pdf.save()
}

export function descargarPdf(bytes, nombreArchivo) {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  enlace.click()
  // Liberar después: si se revoca en el acto, algunos navegadores cancelan la descarga
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
