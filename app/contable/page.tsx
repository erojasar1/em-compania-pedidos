'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ContablePanel() {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [vendedores, setVendedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    cargarDatos()
    const canal = supabase
      .channel('pedidos-tiempo-real')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pedidos' }, () => {
        cargarDatos()
      })
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [])

  const cargarDatos = async () => {
    const { data: pedidosData } = await supabase
      .from('pedidos')
      .select(`*, usuarios(nombre, email)`)
      .order('creado_en', { ascending: false })
    if (pedidosData) setPedidos(pedidosData)

    const { data: vendedoresData } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('rol', 'vendedor')
    if (vendedoresData) setVendedores(vendedoresData)
    setLoading(false)
  }

  const marcarFacturado = async (id: string) => {
    await supabase.from('pedidos').update({ estado: 'facturado' }).eq('id', id)
    cargarDatos()
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const pedidosFiltrados = filtroVendedor
    ? pedidos.filter(p => p.vendedor_id === filtroVendedor)
    : pedidos

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-700 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">E.M. Compañía — Panel Contable</h1>
        <button onClick={cerrarSesion} className="text-sm bg-indigo-900 px-4 py-2 rounded hover:bg-indigo-800">
          Cerrar sesión
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800">
              Pedidos recibidos
              <span className="ml-2 bg-indigo-100 text-indigo-700 text-sm px-2 py-1 rounded-full">
                {pedidosFiltrados.length}
              </span>
            </h2>
            <select
              value={filtroVendedor}
              onChange={e => setFiltroVendedor(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos los vendedores</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Cargando pedidos...</p>
          ) : pedidosFiltrados.length === 0 ? (
            <p className="text-sm text-gray-400">No hay pedidos aún.</p>
          ) : (
            <div className="space-y-3">
              {pedidosFiltrados.map(p => (
                <div key={p.id} className={`border rounded-xl p-4 ${p.estado === 'facturado' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          p.estado === 'facturado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {p.estado === 'facturado' ? '✅ Facturado' : '⏳ Pendiente'}
                        </span>
                        <span className="text-xs text-gray-400">{formatFecha(p.creado_en)}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{p.cliente_nombre}</p>
                      {p.cliente_nit && <p className="text-xs text-gray-500">NIT: {p.cliente_nit}</p>}
                      <p className="text-xs text-gray-500 mt-1">
                        Vendedor: <span className="font-medium">{p.usuarios?.nombre || 'N/A'}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-800">${p.total?.toLocaleString()}</p>
                      {p.estado === 'pendiente' && (
                        <button
                          onClick={() => marcarFacturado(p.id)}
                          className="mt-2 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition">
                          Marcar como facturado
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}