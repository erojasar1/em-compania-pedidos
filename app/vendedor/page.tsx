'use client'

import { useState, useEffect, useRef } from 'react'
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

interface ItemCarrito extends Producto {
  cantidad: number
}

export default function VendedorPanel() {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<Producto[]>([])
  const [carrito, setCarrito] = useState<ItemCarrito[]>([])
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteNit, setClienteNit] = useState('')
  const [descuento, setDescuento] = useState(0)
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [usuarioNombre, setUsuarioNombre] = useState('')
  const [pedidosHistorial, setPedidosHistorial] = useState<any[]>([])
  const [vistaActiva, setVistaActiva] = useState<'nueva' | 'historial'>('nueva')
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    obtenerUsuario()
    cargarHistorial()
  }, [])

  const obtenerUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('usuarios')
        .select('nombre')
        .eq('email', user.email)
        .single()
      if (data?.nombre) setUsuarioNombre(data.nombre)
    }
  }

  const cargarHistorial = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: usuarioData } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', user.email)
      .single()
    if (!usuarioData) return
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('vendedor_id', usuarioData.id)
      .order('creado_en', { ascending: false })
      .limit(20)
    if (data) setPedidosHistorial(data)
  }

  useEffect(() => {
    const buscar = async () => {
      if (busqueda.length < 2) { setResultados([]); setShowDropdown(false); return }
      const { data } = await supabase
        .from('productos')
        .select('*')
        .or(`codigo.ilike.%${busqueda}%,descripcion.ilike.%${busqueda}%`)
        .eq('activo', true)
        .limit(8)
      if (data) { setResultados(data); setShowDropdown(true) }
    }
    const t = setTimeout(buscar, 250)
    return () => clearTimeout(t)
  }, [busqueda])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const agregarProducto = (p: Producto) => {
    setCarrito(prev => {
      const existe = prev.find(i => i.id === p.id)
      if (existe) return prev.map(i => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i)
      return [...prev, { ...p, cantidad: 1 }]
    })
    setBusqueda('')
    setShowDropdown(false)
  }

  const cambiarCantidad = (id: string, delta: number) => {
    setCarrito(prev =>
      prev.map(i => i.id === id ? { ...i, cantidad: Math.max(1, i.cantidad + delta) } : i)
    )
  }

  const quitarItem = (id: string) => setCarrito(prev => prev.filter(i => i.id !== id))

  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0)
  const descuentoMonto = subtotal * (descuento / 100)
  const total = subtotal - descuentoMonto
  const formatMoney = (n: number) => '$' + Math.round(n).toLocaleString('es-CO')

  const generarPedido = async () => {
    if (!clienteNombre || carrito.length === 0) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    let vendedorId: string | null = null
    let vendedorNombreReal = usuarioNombre
    if (user) {
      const { data: uData } = await supabase.from('usuarios').select('id, nombre').eq('email', user.email).single()
      if (uData) { vendedorId = uData.id; vendedorNombreReal = uData.nombre }
    }
    const { data: cotizacion } = await supabase.from('cotizaciones').insert({
      vendedor_id: vendedorId, cliente_nombre: clienteNombre, cliente_nit: clienteNit,
      descuento_porcentaje: descuento, subtotal, total, estado: 'convertida',
    }).select().single()
    if (!cotizacion) { setLoading(false); return }
    await supabase.from('cotizacion_items').insert(
      carrito.map(i => ({
        cotizacion_id: cotizacion.id, producto_id: i.id, codigo: i.codigo,
        descripcion: i.descripcion, cantidad: i.cantidad, precio_unitario: i.precio,
        subtotal: i.precio * i.cantidad,
      }))
    )
    const { data: pedido } = await supabase.from('pedidos').insert({
      cotizacion_id: cotizacion.id, vendedor_id: vendedorId,
      cliente_nombre: clienteNombre, cliente_nit: clienteNit, total, estado: 'pendiente',
    }).select().single()
    await fetch('/api/notificar-pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pedidoId: pedido?.id, clienteNombre, clienteNit, vendedorNombre: vendedorNombreReal, items: carrito, total }),
    })
    setExito(true)
    setCarrito([]); setClienteNombre(''); setClienteNit(''); setDescuento(0)
    cargarHistorial()
    setTimeout(() => setExito(false), 4000)
    setLoading(false)
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Contenido compartido PC y móvil
  const contenidoNuevaCotizacion = (
    <>
      {exito && (
        <div style={{ background: '#D4EDDA', border: '0.5px solid #B8DFC8', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', fontSize: '14px', color: '#1A6B35', fontWeight: '500' }}>
          ✅ Pedido generado exitosamente — el área contable fue notificada por email.
        </div>
      )}
      <div className="vendedor-cotizacion-grid">
        {/* Columna izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '0.5px solid #E0E3EC' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#0F2244', marginBottom: '14px' }}>Datos del cliente</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Nombre / Razón social *', value: clienteNombre, set: setClienteNombre, placeholder: 'Refrigeración Industrial Ltda.' },
                { label: 'NIT (opcional)', value: clienteNit, set: setClienteNit, placeholder: '900.123.456-1' },
              ].map(field => (
                <div key={field.label}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{field.label}</label>
                  <input value={field.value} onChange={e => field.set(e.target.value)} placeholder={field.placeholder}
                    style={{ width: '100%', boxSizing: 'border-box', border: '0.5px solid #E0E3EC', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#0F2244', outline: 'none', background: '#FAFAFA', WebkitAppearance: 'none' as any }}
                    onFocus={e => e.target.style.borderColor = '#D4A017'}
                    onBlur={e => e.target.style.borderColor = '#E0E3EC'} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '0.5px solid #E0E3EC' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#0F2244', marginBottom: '14px' }}>Buscar productos</h2>
            <div ref={searchRef} style={{ position: 'relative' }}>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Código o descripción del producto..."
                style={{ width: '100%', boxSizing: 'border-box', border: '0.5px solid #E0E3EC', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#0F2244', outline: 'none', background: '#FAFAFA', WebkitAppearance: 'none' as any }}
                onFocus={e => { e.target.style.borderColor = '#D4A017'; if (resultados.length) setShowDropdown(true) }}
                onBlur={e => e.target.style.borderColor = '#E0E3EC'} />
              {showDropdown && resultados.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '0.5px solid #E0E3EC', borderRadius: '10px', marginTop: '6px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                  {resultados.map(p => (
                    <div key={p.id} onMouseDown={() => agregarProducto(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', cursor: 'pointer', borderBottom: '0.5px solid #F0F0F0', WebkitTapHighlightColor: 'transparent' as any }}
                      onMouseOver={e => (e.currentTarget.style.background = '#F5F6FA')}
                      onMouseOut={e => (e.currentTarget.style.background = '#fff')}>
                      <span style={{ fontSize: '10px', fontWeight: '700', background: '#EEF0F8', color: '#0F2244', padding: '3px 7px', borderRadius: '5px', flexShrink: 0 }}>{p.codigo}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: '#0F2244', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.descripcion}</div>
                        <div style={{ fontSize: '10px', color: '#999', marginTop: '1px' }}>Stock: {p.stock} · {formatMoney(p.precio)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {carrito.length === 0 && (
              <div style={{ marginTop: '16px', padding: '20px', textAlign: 'center', border: '1px dashed #E0E3EC', borderRadius: '8px' }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔍</div>
                <div style={{ fontSize: '12px', color: '#bbb' }}>Escribe al menos 2 caracteres para buscar</div>
              </div>
            )}
            {carrito.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {carrito.map(item => (
                  <div key={item.id} style={{ border: '0.5px solid #E0E3EC', borderRadius: '8px', padding: '10px 12px', background: '#FAFAFA' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#0F2244' }}>{item.codigo}</div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.descripcion}</div>
                      </div>
                      <button onClick={() => quitarItem(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '18px', padding: '0', flexShrink: 0 }}>×</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => cambiarCantidad(item.id, -1)} style={{ width: '32px', height: '32px', borderRadius: '7px', background: '#0F2244', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#0F2244', minWidth: '24px', textAlign: 'center' }}>{item.cantidad}</span>
                        <button onClick={() => cambiarCantidad(item.id, 1)} style={{ width: '32px', height: '32px', borderRadius: '7px', background: '#0F2244', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F2244' }}>{formatMoney(item.precio * item.cantidad)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Resumen derecha */}
        <div className="vendedor-resumen">
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '0.5px solid #E0E3EC' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#0F2244', marginBottom: '16px' }}>Resumen del pedido</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descuento %</label>
              <input type="number" min="0" max="100" value={descuento} onChange={e => setDescuento(Number(e.target.value))}
                style={{ width: '100%', boxSizing: 'border-box', border: '0.5px solid #E0E3EC', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#0F2244', outline: 'none', background: '#FAFAFA', WebkitAppearance: 'none' as any }}
                onFocus={e => e.target.style.borderColor = '#D4A017'}
                onBlur={e => e.target.style.borderColor = '#E0E3EC'} />
            </div>
            <div style={{ borderTop: '0.5px solid #F0F0F0', paddingTop: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#999' }}>Subtotal</span>
                <span style={{ fontSize: '12px', color: '#555' }}>{formatMoney(subtotal)}</span>
              </div>
              {descuento > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#999' }}>Descuento ({descuento}%)</span>
                  <span style={{ fontSize: '12px', color: '#1A6B35' }}>−{formatMoney(descuentoMonto)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '0.5px solid #F0F0F0' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', color: '#0F2244' }}>Total</span>
                <span style={{ fontSize: '18px', fontWeight: '800', color: '#0F2244' }}>{formatMoney(total)}</span>
              </div>
            </div>
            <div style={{ background: '#F5F6FA', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
              <span>Productos en el pedido</span>
              <span style={{ fontWeight: '600', color: '#0F2244' }}>{carrito.reduce((s, i) => s + i.cantidad, 0)} unidades</span>
            </div>
            <button onClick={generarPedido} disabled={loading || !clienteNombre || carrito.length === 0}
              className="vendedor-btn-generar"
              style={{ width: '100%', background: loading || !clienteNombre || carrito.length === 0 ? 'rgba(212,160,23,0.4)' : '#D4A017', color: '#0F2244', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: loading || !clienteNombre || carrito.length === 0 ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Generando pedido...' : '🚀 Generar pedido'}
            </button>
            {(!clienteNombre || carrito.length === 0) && (
              <p style={{ fontSize: '11px', color: '#bbb', textAlign: 'center', marginTop: '8px' }}>
                {!clienteNombre ? 'Ingresa el nombre del cliente' : 'Agrega al menos un producto'}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )

  const contenidoHistorial = (
    <>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0F2244', margin: 0 }}>Mis pedidos</h1>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Historial de los últimos 20 pedidos generados</p>
      </div>
      {pedidosHistorial.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '48px', border: '0.5px solid #E0E3EC', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
          <div style={{ fontSize: '14px', color: '#999' }}>Aún no has generado pedidos.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {pedidosHistorial.map(p => (
            <div key={p.id} style={{ background: '#fff', border: '0.5px solid #E0E3EC', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '4px', alignSelf: 'stretch', borderRadius: '4px', background: p.estado === 'facturado' ? '#1A6B35' : '#D4A017', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0F2244' }}>{p.cliente_nombre}</div>
                {p.cliente_nit && <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>NIT: {p.cliente_nit}</div>}
                <div style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>
                  {new Date(p.creado_en).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ display: 'inline-flex', fontSize: '10px', fontWeight: '500', padding: '3px 8px', borderRadius: '10px', background: p.estado === 'facturado' ? '#D4EDDA' : '#FEF3CD', color: p.estado === 'facturado' ? '#1A6B35' : '#92610A', marginBottom: '4px' }}>
                  {p.estado === 'facturado' ? '✅ Facturado' : '⏳ Pendiente'}
                </span>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#0F2244' }}>{formatMoney(p.total)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* NAVBAR MÓVIL (oculto en PC via CSS) */}
      <nav className="vendedor-navbar-mobile" style={{
        background: '#0F2244', padding: '0 16px',
        alignItems: 'center', justifyContent: 'space-between',
        height: '56px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', background: '#D4A017', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#0F2244' }}>EM</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>E.M. Compañía</div>
            {usuarioNombre && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{usuarioNombre}</div>}
          </div>
        </div>
        <button onClick={cerrarSesion} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '12px', padding: '6px 12px', borderRadius: '6px' }}>
          🚪 Salir
        </button>
      </nav>

      {/* TABS MÓVIL (ocultos en PC via CSS) */}
      <div className="vendedor-tabs-mobile" style={{ background: '#0F2244', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {[
          { label: '📝 Nueva cotización', vista: 'nueva' as const },
          { label: '📦 Mis pedidos', vista: 'historial' as const },
        ].map(item => (
          <button key={item.vista} onClick={() => setVistaActiva(item.vista)} style={{
            flex: 1, background: 'transparent', border: 'none', cursor: 'pointer',
            color: vistaActiva === item.vista ? '#D4A017' : 'rgba(255,255,255,0.4)',
            fontSize: '13px', padding: '12px 8px',
            borderBottom: vistaActiva === item.vista ? '2px solid #D4A017' : '2px solid transparent',
            fontWeight: vistaActiva === item.vista ? '600' : '400',
          }}>
            {item.label}
          </button>
        ))}
      </div>

      {/* LAYOUT PC: sidebar + contenido (oculto en móvil via CSS) */}
      <div className="vendedor-grid" style={{ background: '#F5F6FA' }}>
        <aside className="vendedor-sidebar" style={{ background: '#0F2244', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ width: '36px', height: '36px', background: '#D4A017', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', color: '#0F2244', marginBottom: '12px' }}>EM</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>E.M. Compañía</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>Panel Vendedor</div>
          </div>
          <nav style={{ padding: '16px 10px', flex: 1 }}>
            {[
              { icon: '📝', label: 'Nueva cotización', vista: 'nueva' as const },
              { icon: '📦', label: 'Mis pedidos', vista: 'historial' as const },
            ].map(item => (
              <div key={item.vista} onClick={() => setVistaActiva(item.vista)} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
                background: vistaActiva === item.vista ? 'rgba(255,255,255,0.09)' : 'transparent',
                color: vistaActiva === item.vista ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: '13px', cursor: 'pointer',
              }}>
                <span style={{ fontSize: '14px' }}>{item.icon}</span>
                {item.label}
                {vistaActiva === item.vista && <span style={{ marginLeft: 'auto', width: '7px', height: '7px', borderRadius: '50%', background: '#D4A017' }} />}
              </div>
            ))}
          </nav>
          {usuarioNombre && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px' }}>Conectado como</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>{usuarioNombre}</div>
            </div>
          )}
          <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button onClick={cerrarSesion} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '12px', padding: '8px 12px', width: '100%' }}>
              🚪 Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="vendedor-main" style={{ minHeight: '100vh' }}>
          {vistaActiva === 'nueva' && (
            <>
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0F2244', margin: 0 }}>Nueva cotización</h1>
                <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>Busca productos, arma el pedido y genera la orden</p>
              </div>
              {contenidoNuevaCotizacion}
            </>
          )}
          {vistaActiva === 'historial' && contenidoHistorial}
        </main>
      </div>

      {/* CONTENIDO MÓVIL (oculto en PC via CSS) */}
      <div className="vendedor-tabs-mobile" style={{ flexDirection: 'column' }}>
        <main className="vendedor-main" style={{ background: '#F5F6FA', minHeight: '60vh' }}>
          {vistaActiva === 'nueva' && contenidoNuevaCotizacion}
          {vistaActiva === 'historial' && contenidoHistorial}
        </main>
      </div>

    </div>
  )
}