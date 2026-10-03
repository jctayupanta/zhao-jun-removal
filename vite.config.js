import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages sirve el sitio dentro de una subcarpeta con el nombre del
// repositorio: https://USUARIO.github.io/NOMBRE-REPO/
// Por eso 'base' debe ser '/NOMBRE-REPO/'. El workflow de GitHub Actions
// pasa esa ruta en la variable VITE_BASE al hacer el build.
// En local (npm run dev / npm run build) VITE_BASE no existe y queda en '/'.
function normalizarBase(valor) {
  if (!valor || valor === '/') return '/'
  const conInicio = valor.startsWith('/') ? valor : `/${valor}`
  return conInicio.endsWith('/') ? conInicio : `${conInicio}/`
}

// https://vite.dev/config/
export default defineConfig({
  base: normalizarBase(process.env.VITE_BASE),
  plugins: [react()],
})
