import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { formatearFecha } from './generarFactura'

function formatearTotal(total) {
  if (total === null || total === undefined) return ''
  return '$' + Number(total).toFixed(2)
}

function Detalle({ factura, onVolver }) {
  return (
    <div className="detalle">
      <button type="button" className="secundario" onClick={onVolver}>
        ← Volver
      </button>
      <h2>Detalle de factura</h2>
      <dl>
        <dt>Name</dt>
        <dd>{factura.name}</dd>
        <dt>Address</dt>
        <dd>{factura.address}</dd>
        <dt>Fecha</dt>
        <dd>{formatearFecha(factura.fecha)}</dd>
        <dt>Total</dt>
        <dd>{formatearTotal(factura.total)}</dd>
        <dt>Guardada el</dt>
        {/* en-US para que sea mes/día/año, igual que la fecha de la factura */}
        <dd>{factura.creado_en ? new Date(factura.creado_en).toLocaleString('en-US') : ''}</dd>
        <dt>ID</dt>
        <dd className="id">{factura.id}</dd>
      </dl>
    </div>
  )
}

function VerAnteriores() {
  const [facturas, setFacturas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [seleccionada, setSeleccionada] = useState(null)

  useEffect(() => {
    async function cargar() {
      // Más reciente primero; si dos tienen la misma fecha, la última guardada arriba
      const { data, error: errorSupabase } = await supabase
        .from('facturas')
        .select('*')
        .order('fecha', { ascending: false, nullsFirst: false })
        .order('creado_en', { ascending: false })
      if (errorSupabase) {
        console.error(errorSupabase)
        setError('No se pudieron cargar las facturas: ' + errorSupabase.message)
      } else {
        setFacturas(data)
      }
      setCargando(false)
    }
    cargar()
  }, [])

  if (seleccionada) {
    return <Detalle factura={seleccionada} onVolver={() => setSeleccionada(null)} />
  }

  if (cargando) return <p>Cargando facturas...</p>
  if (error) return <p className="error">{error}</p>
  if (facturas.length === 0) return <p>Todavía no hay facturas guardadas.</p>

  return (
    <ul className="lista-facturas">
      {facturas.map((f) => (
        <li key={f.id}>
          <button type="button" onClick={() => setSeleccionada(f)}>
            <span className="fila-arriba">
              <strong>{f.name}</strong>
              <span>{formatearTotal(f.total)}</span>
            </span>
            <span className="fila-abajo">
              <span>{f.address}</span>
              <span>{formatearFecha(f.fecha)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default VerAnteriores
