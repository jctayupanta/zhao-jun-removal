import { useState } from 'react'
import plantillaUrl from './assets/zhao-plantilla-factura.pdf?url'
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

  async function generarFactura(e) {
    e.preventDefault()
    setGenerando(true)
    setError('')
    setGuardado('')
    try {
      // 1) Primero el PDF: se descarga pase lo que pase después con Supabase
      try {
        const plantilla = await fetch(plantillaUrl).then((r) => r.arrayBuffer())
        const bytes = await rellenarFactura(plantilla, { name, address, date, amount })
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
        <button type="submit" disabled={generando}>
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
