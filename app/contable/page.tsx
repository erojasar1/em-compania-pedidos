'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ContablePanel() {
  const [pedidos, setPedidos] = useState<any[]>([])
  const [vendedores, setVendedores] = useState<any[]>([])
  const [filtroVendedor, setFiltroVendedor] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
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
      .select('*, usuarios(nombre, email)')
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

  let pedidosFiltrados = filtroVendedor
    ? pedidos.filter(p => p.vendedor_id === filtroVendedor)
    : pedidos
  if (filtroEstado) {
    pedidosFiltrados = pedidosFiltrados.filter(p => p.estado === filtroEstado)
  }

  const totalPedidos = pedidos.length
  const pendientes = pedidos.filter(p => p.estado === 'pendiente').length
  const facturados = pedidos.filter(p => p.estado === 'facturado').length

  const formatFecha = (fecha: string) =>
    new Date(fecha).toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  const formatMoney = (n: number) =>
    '$' + (n || 0).toLocaleString('es-CO')

  const sidebarStyle: React.CSSProperties = {
    width: '220px', minHeight: '100vh', background: '#0F2244',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
  }
  const mainStyle: React.CSSProperties = {
    flex: 1, background: '#F5F6FA', minHeight: '100vh',
    padding: '28px', overflowY: 'auto',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* SIDEBAR */}
      <aside style={sidebarStyle}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{
            width: '36px', height: '36px', background: '#D4A017', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '800', color: '#0F2244', marginBottom: '12px',
          }}>EM</div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', lineHeight: 1.3 }}>
            E.M. Compañía
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>
            Panel Contable
          </div>
        </div>

        <nav style={{ padding: '16px 10px', flex: 1 }}>
          {[
            { icon: '📋', label: 'Pedidos', active: true },
            { icon: '👥', label: 'Vendedores', active: false },
          ].map(item => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
              background: item.active ? 'rgba(255,255,255,0.09)' : 'transparent',
              color: item.active ? '#fff' : 'rgba(255,255,255,0.4)',
              fontSize: '13px', cursor: 'pointer',
            }}>
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              {item.label}
              {item.active && (
                <span style={{
                  marginLeft: 'auto', width: '7px', height: '7px',
                  borderRadius: '50%', background: '#D4A017',
                }} />
              )}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={cerrarSesion} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.3)', fontSize: '12px', padding: '8px 12px', width: '100%',
          }}>
            🚪 Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={mainStyle}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0F2244', margin: 0 }}>
            Pedidos recibidos
          </h1>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            Actualización en tiempo real · {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total pedidos', value: totalPedidos, badge: null, color: '#0F2244' },
            { label: 'Pendientes', value: pendientes, badge: 'Por facturar', badgeColor: '#92610A', badgeBg: '#FEF3CD', color: '#92610A' },
            { label: 'Facturados', value: facturados, badge: 'Completados', badgeColor: '#1A6B35', badgeBg: '#D4EDDA', color: '#1A6B35' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#fff', borderRadius: '10px', padding: '14px 16px',
              border: '0.5px solid #E0E3EC',
            }}>
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>{stat.label}</div>
              <div style={{ fontSize: '26px', fontWeight: '700', color: stat.color }}>{stat.value}</div>
              {stat.badge && (
                <span style={{
                  display: 'inline-block', marginTop: '6px',
                  fontSize: '10px', fontWeight: '500',
                  background: stat.badgeBg, color: stat.badgeColor,
                  padding: '2px 8px', borderRadius: '10px',
                }}>
                  {stat.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{
          background: '#fff', borderRadius: '10px', padding: '14px 16px',
          border: '0.5px solid #E0E3EC', marginBottom: '16px',
          display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <span style={{ fontSize: '12px', color: '#999', fontWeight: '500' }}>Filtrar por:</span>
          <select
            value={filtroVendedor}
            onChange={e => setFiltroVendedor(e.target.value)}
            style={{
              border: '0.5px solid #E0E3EC', borderRadius: '6px',
              padding: '6px 10px', fontSize: '12px', color: '#0F2244',
              background: '#fff', outline: 'none',
            }}>
            <option value="">Todos los vendedores</option>
            {vendedores.map(v => (
              <option key={v.id} value={v.id}>{v.nombre}</option>
            ))}
          </select>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            style={{
              border: '0.5px solid #E0E3EC', borderRadius: '6px',
              padding: '6px 10px', fontSize: '12px', color: '#0F2244',
              background: '#fff', outline: 'none',
            }}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="facturado">Facturados</option>
          </select>
          <span style={{
            marginLeft: 'auto', fontSize: '12px', fontWeight: '600',
            background: '#EEF0F8', color: '#0F2244',
            padding: '4px 12px', borderRadius: '20px',
          }}>
            {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#bbb', fontSize: '14px' }}>
            Cargando pedidos...
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: '10px', padding: '48px',
            border: '0.5px solid #E0E3EC', textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
            <div style={{ fontSize: '14px', color: '#999' }}>No hay pedidos con estos filtros.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pedidosFiltrados.map(p => (
              <div key={p.id} style={{
                background: '#fff',
                border: `0.5px solid ${p.estado === 'facturado' ? '#B8DFC8' : '#E0E3EC'}`,
                borderRadius: '10px', padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: '0',
                transition: 'box-shadow 0.15s',
              }}>
                {/* Línea de acento */}
                <div style={{
                  width: '4px', alignSelf: 'stretch', borderRadius: '4px',
                  background: p.estado === 'facturado' ? '#1A6B35' : '#D4A017',
                  marginRight: '16px', flexShrink: 0,
                }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '11px', fontWeight: '500', padding: '3px 9px', borderRadius: '10px',
                      background: p.estado === 'facturado' ? '#D4EDDA' : '#FEF3CD',
                      color: p.estado === 'facturado' ? '#1A6B35' : '#92610A',
                    }}>
                      {p.estado === 'facturado' ? '✅ Facturado' : '⏳ Pendiente'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#bbb' }}>{formatFecha(p.creado_en)}</span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F2244' }}>
                    {p.cliente_nombre}
                  </div>
                  {p.cliente_nit && (
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                      NIT: {p.cliente_nit}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    Vendedor: <span style={{ fontWeight: '500', color: '#555' }}>
                      {p.usuarios?.nombre || p.usuarios?.email || 'Sin asignar'}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#0F2244' }}>
                    {formatMoney(p.total)}
                  </div>
                  {p.estado === 'pendiente' && (
                    <button
                      onClick={() => marcarFacturado(p.id)}
                      style={{
                        marginTop: '8px', background: '#0F2244', color: '#fff',
                        border: 'none', borderRadius: '6px', padding: '6px 14px',
                        fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = '#1a3a6b')}
                      onMouseOut={e => (e.currentTarget.style.background = '#0F2244')}
                    >
                      Marcar facturado
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
