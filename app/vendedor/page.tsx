'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Producto {
  id: string
  codigo: string
  descripcion: string
  precio: number
  stock: number
  unidad: string
}

interface ItemCotizacion {
  producto: Producto
  cantidad: number
  subtotal: number
}

export default function VendedorPanel() {
  const [busqueda, setBusqueda] = useState('')
  const [productos, setProductos] = useState<Producto[]>([])
  const [resultados, setResultados] = useState<Producto[]>([])
  const [items, setItems] = useState<ItemCotizacion[]>([])
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteNit, setClienteNit] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    cargarProductos()
  }, [])

  const cargarProductos = async () => {
    const { data } = await supabase.from('productos').select('*').eq('activo', true)
    if (data) setProductos(data)
  }

  const buscarProductos = (termino: string) => {
    setBusqueda(termino)
    if (termino.length < 2) { setResultados([]); return }
    const filtrados = productos.filter(p =>
      p.codigo.toLowerCase().includes(termino.toLowerCase()) ||
      p.descripcion.toLowerCase().includes(termino.toLowerCase())
    )
    setResultados(filtrados.slice(0, 8))
  }

  const agregarItem = (producto: Producto) => {
    const existente = items.find(i => i.producto.id === producto.id)
    if (existente) {
      setItems(items.map(i => i.producto.id === producto.id
        ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.producto.precio }
        : i
      ))
    } else {
      setItems([...items, { producto, cantidad: 1, subtotal: producto.precio }])
    }
    setBusqueda('')
    setResultados([])
  }

  const actualizarCantidad = (id: string, cantidad: number) => {
    if (cantidad < 1) return
    setItems(items.map(i => i.producto.id === id
      ? { ...i, cantidad, subtotal: cantidad * i.producto.precio }
      : i
    ))
  }

  const eliminarItem = (id: string) => {
    setItems(items.filter(i => i.producto.id !== id))
  }

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0)
  const descuentoValor = subtotal * (descuento / 100)
  const total = subtotal - descuentoValor

  const generarPedido = async () => {
    if (!clienteNombre || items.length === 0) {
      setMensaje('Completa el nombre del cliente y agrega productos')
      return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: vendedor } = await supabase
      .from('usuarios').select('id').eq('email', user?.email).single()

    const { data: cotizacion } = await supabase.from('cotizaciones').insert({
      vendedor_id: vendedor?.id,
      cliente_nombre: clienteNombre,
      cliente_nit: clienteNit,
      descuento_porcentaje: descuento,
      subtotal,
      total,
      estado: 'convertida'
    }).select().single()

    if (cotizacion) {
      await supabase.from('cotizacion_items').insert(
        items.map(i => ({
          cotizacion_id: cotizacion.id,
          producto_id: i.producto.id,
          codigo: i.producto.codigo,
          descripcion: i.producto.descripcion,
          cantidad: i.cantidad,
          precio_unitario: i.producto.precio,
          subtotal: i.subtotal
        }))
      )

      await supabase.from('pedidos').insert({
        cotizacion_id: cotizacion.id,
        vendedor_id: vendedor?.id,
        cliente_nombre: clienteNombre,
        cliente_nit: clienteNit,
        total,
        estado: 'pendiente'
      })

      setMensaje('✅ Pedido generado exitosamente')
      setItems([])
      setClienteNombre('')
      setClienteNit('')
      setDescuento(0)
    }
    setLoading(false)
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-green-700 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">E.M. Compañía — Panel Vendedor</h1>
        <button onClick={cerrarSesion} className="text-sm bg-green-900 px-4 py-2 rounded hover:bg-green-800">
          Cerrar sesión
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Buscar producto</h2>
            <div className="relative">
              <input
                value={busqueda}
                onChange={e => buscarProductos(e.target.value)}
                placeholder="Busca por código (ej: 0100178) o descripción (ej: sello mecánico)"
                className="w-full border rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {resultados.length > 0 && (
                <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1">
                  {resultados.map(p => (
                    <button key={p.id} onClick={() => agregarItem(p)}
                      className="w-full text-left px-4 py-3 hover:bg-green-50 border-b last:border-0">
                      <span className="text-xs font-mono text-green-700 mr-2">{p.codigo}</span>
                      <span className="text-sm text-gray-800">{p.descripcion}</span>
                      <span className="text-xs text-gray-500 ml-2">Stock: {p.stock} | ${p.precio.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Datos del cliente</h2>
            <div className="space-y-3">
              <input value={clienteNombre} onChange={e => setClienteNombre(e.target.value)}
                placeholder="Nombre o razón social *"
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
              <input value={clienteNit} onChange={e => setClienteNit(e.target.value)}
                placeholder="NIT (opcional)"
                className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Descuento %:</label>
                <input type="number" value={descuento} onChange={e => setDescuento(Number(e.target.value))}
                  min="0" max="100"
                  className="w-24 border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Cotización</h2>
          {items.length === 0 ? (
            <p className="text-sm text-gray-400">Busca y selecciona productos para agregar.</p>
          ) : (
            <div className="space-y-2">
              {items.map(i => (
                <div key={i.producto.id} className="flex items-center gap-2 border rounded-lg p-2">
                  <div className="flex-1">
                    <p className="text-xs font-mono text-green-700">{i.producto.codigo}</p>
                    <p className="text-sm text-gray-800">{i.producto.descripcion}</p>
                    <p className="text-xs text-gray-500">${i.producto.precio.toLocaleString()} c/u</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => actualizarCantidad(i.producto.id, i.cantidad - 1)}
                      className="w-6 h-6 bg-gray-200 rounded text-sm font-bold">-</button>
                    <span className="w-8 text-center text-sm">{i.cantidad}</span>
                    <button onClick={() => actualizarCantidad(i.producto.id, i.cantidad + 1)}
                      className="w-6 h-6 bg-gray-200 rounded text-sm font-bold">+</button>
                  </div>
                  <p className="text-sm font-medium w-24 text-right">${i.subtotal.toLocaleString()}</p>
                  <button onClick={() => eliminarItem(i.producto.id)}
                    className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              ))}

              <div className="border-t pt-3 mt-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>${subtotal.toLocaleString()}</span>
                </div>
                {descuento > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>Descuento ({descuento}%)</span><span>-${descuentoValor.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-800">
                  <span>Total</span><span>${total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {mensaje && (
            <p className={`text-sm mt-3 ${mensaje.includes('✅') ? 'text-green-600' : 'text-red-500'}`}>{mensaje}</p>
          )}

          <button onClick={generarPedido} disabled={loading || items.length === 0}
            className="w-full mt-4 bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition">
            {loading ? 'Generando pedido...' : 'Generar pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}