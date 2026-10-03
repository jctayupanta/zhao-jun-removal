import { useState } from 'react'
import plantillaUrl from './assets/zhao-plantilla-factura.pdf?url'
import logoUrl from './assets/zhao-logo-corregido.jpeg?url'
import { archivoAJpegDataUrl } from './imagenes'
import { rellenarFactura, descargarPdf } from './generarFactura'
import { supabase } from './supabaseClient'

// Fecha local en formato YYYY-MM-DD (toISOString usaría UTC y podría dar otro día)
function hoy() {
  const d = new Date()
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mes}-${dia}`
}

function NuevaFactura() {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [date, setDate] = useState(hoy())
  const [amount, setAmount] = useState('')
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const [guardado, setGuardado] = useState('')
  const [foto, setFoto] = useState(null)
  const [fotoCargando, setFotoCargando] = useState(false)
  const [fotoError, setFotoError] = useState('')

  // Decodifica la foto elegida (cualquier formato), la reduce a máximo 1000px
  // y la deja como JPEG en base64. Nunca falla en silencio: si algo sale mal,
  // queda un mensaje visible.
  async function elegirFoto(archivo, inputEl) {
    if (!archivo) return
    setFotoError('')
    setFotoCargando(true)
    try {
      setFoto(await archivoAJpegDataUrl(archivo))
    } catch (err) {
      console.error(err)
      setFotoError(err && err.message ? err.message : String(err))
    } finally {
      setFotoCargando(false)
      if (inputEl) inputEl.value = ''
    }
  }

  function quitarFoto() {
    setFoto(null)
    setFotoError('')
  }

  async function generarFactura(e) {
    e.preventDefault()
    setGenerando(true)
    setError('')
    setGuardado('')
    try {
      // 1) Primero el PDF: se descarga pase lo que pase después con Supabase
      try {
        const [plantilla, logo] = await Promise.all([
          fetch(plantillaUrl).then((r) => r.arrayBuffer()),
          fetch(logoUrl).then((r) => r.arrayBuffer()),
        ])
        const bytes = await rellenarFactura(plantilla, logo, { name, address, date, amount, foto })
        descargarPdf(bytes, `factura-${date}.pdf`)
      } catch (err) {
        console.error(err)
        setError('No se pudo generar la factura: ' + err.message)
        return
      }

      // 2) Después, el registro en la tabla "facturas"
      const { error: errorSupabase } = await supabase.from('facturas').insert({
        name,
        address,
        fecha: date || null,
        total: amount === '' ? null : Number(amount),
        foto: foto || null,
      })
      if (errorSupabase) {
        console.error(errorSupabase)
        setError('El PDF se descargó, pero no se pudo guardar en Supabase: ' + errorSupabase.message)
      } else {
        setGuardado('Factura guardada')
      }
    } catch (err) {
      console.error(err)
      setError('El PDF se descargó, pero no se pudo guardar en Supabase: ' + err.message)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <>
      <form onSubmit={generarFactura}>
        <label>
          Name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Address
          <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Total Amount Due
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <div className="foto-trabajo">
          <span className="foto-seccion-titulo">Foto del trabajo (opcional)</span>
          {foto ? (
            <div className="foto-preview">
              <img src={foto} alt="Vista previa de la foto del trabajo" />
              <button type="button" className="secundario" onClick={quitarFoto}>
                Quitar foto
              </button>
            </div>
          ) : (
            <div className="foto-botones">
              {/* Inputs de archivo REALES y VISIBLES (sin <label> ni `hidden` +
                  click() por JS): el toque cae directo sobre el input, así
                  ningún navegador (Android o iPhone/Safari) tiene que "adivinar".
                  El texto del botón nativo lo pone el navegador; el título de
                  arriba dice cuál es cuál. */}
              <div className="foto-opcion">
                <span className="foto-opcion-titulo">Tomar foto</span>
                {/* Con `capture`: abre directo la cámara. */}
                <input
                  type="file"
                  className="foto-input"
                  accept="image/*"
                  capture="environment"
                  aria-label="Tomar foto"
                  disabled={fotoCargando}
                  onChange={(e) => elegirFoto(e.target.files[0], e.target)}
                />
              </div>
              <div className="foto-opcion">
                <span className="foto-opcion-titulo">Elegir de galería</span>
                {/* Sin `capture`: abre el selector de archivos/galería. */}
                <input
                  type="file"
                  className="foto-input"
                  accept="image/*"
                  aria-label="Elegir de galería"
                  disabled={fotoCargando}
                  onChange={(e) => elegirFoto(e.target.files[0], e.target)}
                />
              </div>
            </div>
          )}

          {fotoCargando && <p className="foto-cargando">Cargando foto...</p>}

          {fotoError && (
            <p className="foto-error" role="status">
              No se pudo procesar la foto
              <br />
              <span className="foto-error-detalle">{fotoError}</span>
            </p>
          )}
        </div>

        <button type="submit" disabled={generando || fotoCargando}>
          {generando ? 'Generando...' : 'Generar factura'}
        </button>
        {guardado && <p className="exito">{guardado}</p>}
        {error && <p className="error">{error}</p>}
      </form>

      <div className="vista-previa">
        <h2>Vista previa</h2>
        <p><strong>Name:</strong> {name}</p>
        <p><strong>Address:</strong> {address}</p>
        <p><strong>Date:</strong> {date}</p>
        <p><strong>Total Amount Due:</strong> {amount}</p>
      </div>
    </>
  )
}

export default NuevaFactura
