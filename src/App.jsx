import { useState } from 'react'
import NuevaFactura from './NuevaFactura'
import VerAnteriores from './VerAnteriores'

function App() {
  const [pantalla, setPantalla] = useState('nueva')

  return (
    <div className="app">
      <h1>ZHAO Jun Removal - Facturas</h1>

      <nav className="navegacion">
        <button
          type="button"
          className={pantalla === 'nueva' ? 'activa' : ''}
          onClick={() => setPantalla('nueva')}
        >
          Nueva factura
        </button>
        <button
          type="button"
          className={pantalla === 'anteriores' ? 'activa' : ''}
          onClick={() => setPantalla('anteriores')}
        >
          Ver anteriores
        </button>
      </nav>

      {/* El formulario se oculta en vez de desmontarse, para no perder lo escrito */}
      <div hidden={pantalla !== 'nueva'}>
        <NuevaFactura />
      </div>
      {/* La lista se monta cada vez que se entra, así siempre se recarga */}
      {pantalla === 'anteriores' && <VerAnteriores />}
    </div>
  )
}

export default App
