'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPanel() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('vendedor')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [cambioPass, setCambioPass] = useState<Record<string, string>>({})
  const [cambioVisible, setCambioVisible] = useState<Record<string, boolean>>({})
  const [cambioLoading, setCambioLoading] = useState<Record<string, boolean>>({})
  const [cambioMensaje, setCambioMensaje] = useState<Record<string, { text: string; ok: boolean }>>({})
  const router = useRouter()

  useEffect(() => { cargarUsuarios() }, [])

  const cargarUsuarios = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('creado_en', { ascending: false })
    if (data) setUsuarios(data)
  }

  const crearUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMensaje('')
    const res = await fetch('/api/crear-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nombre, rol }),
    })
    const result = await res.json()
    if (result.error) {
      setMensaje('Error: ' + result.error)
    } else {
      setMensaje('Usuario creado exitosamente')
      setNombre(''); setEmail(''); setPassword(''); setRol('vendedor')
      cargarUsuarios()
    }
    setLoading(false)
  }

  const eliminarUsuario = async (id: string, emailU: string) => {
    if (!confirm(`¿Eliminar usuario ${emailU}?`)) return
    await supabase.from('usuarios').delete().eq('id', id)
    cargarUsuarios()
  }

  const toggleCambioPass = (id: string) => {
    setCambioVisible(prev => ({ ...prev, [id]: !prev[id] }))
    setCambioPass(prev => ({ ...prev, [id]: '' }))
    setCambioMensaje(prev => ({ ...prev, [id]: { text: '', ok: false } }))
  }

  const cambiarContrasena = async (id: string, emailU: string) => {
    const nuevaPass = cambioPass[id]
    if (!nuevaPass || nuevaPass.length < 6) {
      setCambioMensaje(prev => ({ ...prev, [id]: { text: 'Mínimo 6 caracteres', ok: false } }))
      return
    }
    setCambioLoading(prev => ({ ...prev, [id]: true }))
    const res = await fetch('/api/cambiar-contrasena', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailU, password: nuevaPass }),
    })
    const result = await res.json()
    if (result.error) {
      setCambioMensaje(prev => ({ ...prev, [id]: { text: 'Error al cambiar contraseña', ok: false } }))
    } else {
      setCambioMensaje(prev => ({ ...prev, [id]: { text: '✅ Contraseña actualizada', ok: true } }))
      setCambioPass(prev => ({ ...prev, [id]: '' }))
      setTimeout(() => {
        setCambioVisible(prev => ({ ...prev, [id]: false }))
        setCambioMensaje(prev => ({ ...prev, [id]: { text: '', ok: false } }))
      }, 2000)
    }
    setCambioLoading(prev => ({ ...prev, [id]: false }))
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const rolColors: Record<string, { bg: string; color: string }> = {
    vendedor:      { bg: '#E8F0FE', color: '#1A56B0' },
    contable:      { bg: '#FEF3CD', color: '#92610A' },
    administrador: { bg: '#F3E8FF', color: '#6B21A8' },
  }

  const rolIconos: Record<string, string> = {
    vendedor: '🛒',
    contable: '🧾',
    administrador: '⚙️',
  }

  const totalVendedores = usuarios.filter(u => u.rol === 'vendedor').length
  const totalContables = usuarios.filter(u => u.rol === 'contable').length
  const totalAdmins = usuarios.filter(u => u.rol === 'administrador').length

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <aside style={{
        width: '220px', minHeight: '100vh', background: '#0F2244',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{
            width: '36px', height: '36px', background: '#D4A017', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '800', color: '#0F2244', marginBottom: '12px',
          }}>EM</div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>E.M. Compañía</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>Panel Administrador</div>
        </div>

        <nav style={{ padding: '16px 10px', flex: 1 }}>
          {[
            { icon: '👥', label: 'Usuarios', active: true },
            { icon: '📊', label: 'Actividad', active: false },
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

      <main style={{ flex: 1, background: '#F5F6FA', padding: '28px', minHeight: '100vh' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0F2244', margin: 0 }}>
            Gestión de usuarios
          </h1>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            Control de acceso por roles al sistema
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Vendedores', value: totalVendedores, icon: '🛒', color: '#1A56B0', bg: '#E8F0FE' },
            { label: 'Contables', value: totalContables, icon: '🧾', color: '#92610A', bg: '#FEF3CD' },
            { label: 'Administradores', value: totalAdmins, icon: '⚙️', color: '#6B21A8', bg: '#F3E8FF' },
          ].map(stat => (
            <div key={stat.label} style={{
              background: '#fff', borderRadius: '10px', padding: '14px 16px',
              border: '0.5px solid #E0E3EC',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#999', marginBottom: '6px' }}>{stat.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: '700', color: '#0F2244' }}>{stat.value}</div>
                </div>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: stat.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '16px',
                }}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px', alignItems: 'start' }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '22px', border: '0.5px solid #E0E3EC' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0F2244', marginBottom: '18px' }}>
              Crear nuevo usuario
            </h2>
            <form onSubmit={crearUsuario}>
              {[
                { label: 'Nombre completo', value: nombre, set: setNombre, type: 'text', placeholder: 'Ej. Carlos Martínez' },
                { label: 'Correo electrónico', value: email, set: setEmail, type: 'email', placeholder: 'carlos@emcompania.com' },
                { label: 'Contraseña', value: password, set: setPassword, type: 'password', placeholder: '••••••••' },
              ].map(field => (
                <div key={field.label} style={{ marginBottom: '14px' }}>
                  <label style={{
                    display: 'block', fontSize: '11px', fontWeight: '500',
                    color: '#666', marginBottom: '6px',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={e => field.set(e.target.value)}
                    placeholder={field.placeholder}
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      border: '0.5px solid #E0E3EC', borderRadius: '8px',
                      padding: '10px 12px', fontSize: '13px', color: '#0F2244',
                      outline: 'none', background: '#FAFAFA',
                    }}
                    onFocus={e => e.target.style.borderColor = '#D4A017'}
                    onBlur={e => e.target.style.borderColor = '#E0E3EC'}
                  />
                </div>
              ))}

              <div style={{ marginBottom: '18px' }}>
                <label style={{
                  display: 'block', fontSize: '11px', fontWeight: '500',
                  color: '#666', marginBottom: '6px',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  Rol
                </label>
                <select value={rol} onChange={e => setRol(e.target.value)}
                  style={{
                    width: '100%', border: '0.5px solid #E0E3EC', borderRadius: '8px',
                    padding: '10px 12px', fontSize: '13px', color: '#0F2244',
                    outline: 'none', background: '#FAFAFA',
                  }}>
                  <option value="vendedor">🛒 Vendedor</option>
                  <option value="contable">🧾 Contable</option>
                  <option value="administrador">⚙️ Administrador</option>
                </select>
              </div>

              {mensaje && (
                <div style={{
                  padding: '10px 12px', borderRadius: '8px', fontSize: '12px', marginBottom: '14px',
                  background: mensaje.includes('Error') ? '#FEE2E2' : '#D4EDDA',
                  color: mensaje.includes('Error') ? '#991B1B' : '#1A6B35',
                  border: `0.5px solid ${mensaje.includes('Error') ? '#FCA5A5' : '#B8DFC8'}`,
                }}>
                  {mensaje.includes('Error') ? '⚠ ' : '✅ '}{mensaje}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '11px',
                background: loading ? 'rgba(15,34,68,0.5)' : '#0F2244',
                color: '#fff', border: 'none', borderRadius: '8px',
                fontSize: '13px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? 'Creando...' : '+ Crear usuario'}
              </button>
            </form>
          </div>

          <div style={{ background: '#fff', borderRadius: '12px', padding: '22px', border: '0.5px solid #E0E3EC' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#0F2244', marginBottom: '18px' }}>
              Usuarios registrados
              <span style={{
                marginLeft: '8px', fontSize: '11px', fontWeight: '500',
                background: '#EEF0F8', color: '#0F2244',
                padding: '2px 8px', borderRadius: '10px',
              }}>
                {usuarios.length}
              </span>
            </h2>

            {usuarios.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#bbb', textAlign: 'center', padding: '24px 0' }}>
                No hay usuarios registrados aún.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {usuarios.map(u => {
                  const rc = rolColors[u.rol] || { bg: '#f0f0f0', color: '#555' }
                  const passVisible = cambioVisible[u.id]
                  const msg = cambioMensaje[u.id]

                  return (
                    <div key={u.id} style={{
                      border: `0.5px solid ${passVisible ? '#D4A017' : '#E0E3EC'}`,
                      borderRadius: '10px', overflow: 'hidden',
                      transition: 'border-color 0.2s',
                    }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px',
                        background: passVisible ? '#FFFBF0' : '#fff',
                        transition: 'background 0.2s',
                      }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: rc.bg, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: '15px', flexShrink: 0,
                        }}>
                          {rolIconos[u.rol] || '👤'}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F2244' }}>{u.nombre}</div>
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.email}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '10px', fontWeight: '500',
                          background: rc.bg, color: rc.color,
                          padding: '3px 8px', borderRadius: '10px',
                          textTransform: 'capitalize', flexShrink: 0,
                        }}>
                          {u.rol}
                        </span>

                        <button
                          onClick={() => toggleCambioPass(u.id)}
                          title="Cambiar contraseña"
                          style={{
                            background: passVisible ? '#D4A017' : '#F5F6FA',
                            border: `0.5px solid ${passVisible ? '#D4A017' : '#E0E3EC'}`,
                            borderRadius: '6px', cursor: 'pointer',
                            color: passVisible ? '#0F2244' : '#888',
                            fontSize: '14px', padding: '5px 8px',
                            flexShrink: 0, transition: 'all 0.15s',
                          }}
                          onMouseOver={e => { if (!passVisible) { e.currentTarget.style.background = '#FEF3CD'; e.currentTarget.style.borderColor = '#D4A017'; e.currentTarget.style.color = '#92610A' }}}
                          onMouseOut={e => { if (!passVisible) { e.currentTarget.style.background = '#F5F6FA'; e.currentTarget.style.borderColor = '#E0E3EC'; e.currentTarget.style.color = '#888' }}}
                        >
                          🔑
                        </button>

                        <button
                          onClick={() => eliminarUsuario(u.id, u.email)}
                          title="Eliminar usuario"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: '#ddd', fontSize: '14px', padding: '4px',
                            flexShrink: 0, transition: 'color 0.15s',
                          }}
                          onMouseOver={e => (e.currentTarget.style.color = '#E53E3E')}
                          onMouseOut={e => (e.currentTarget.style.color = '#ddd')}
                        >
                          🗑
                        </button>
                      </div>

                      {passVisible && (
                        <div style={{
                          padding: '14px 16px',
                          background: '#FFFDF5',
                          borderTop: '1px dashed #F0D080',
                          display: 'flex', alignItems: 'center', gap: '10px',
                        }}>
                          <div style={{ flex: 1 }}>
                            <label style={{
                              display: 'block', fontSize: '10px', fontWeight: '600',
                              color: '#92610A', marginBottom: '6px',
                              textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}>
                              🔑 Nueva contraseña para {u.nombre.split(' ')[0]}
                            </label>
                            <input
                              type="password"
                              value={cambioPass[u.id] || ''}
                              onChange={e => setCambioPass(prev => ({ ...prev, [u.id]: e.target.value }))}
                              placeholder="Mínimo 6 caracteres"
                              autoFocus
                              style={{
                                width: '100%', boxSizing: 'border-box',
                                border: '1px solid #F0D080', borderRadius: '7px',
                                padding: '9px 12px', fontSize: '13px', color: '#0F2244',
                                outline: 'none', background: '#fff',
                              }}
                              onFocus={e => e.target.style.borderColor = '#D4A017'}
                              onBlur={e => e.target.style.borderColor = '#F0D080'}
                              onKeyDown={e => { if (e.key === 'Enter') cambiarContrasena(u.id, u.email) }}
                            />
                            {msg?.text && (
                              <div style={{
                                marginTop: '6px', fontSize: '11px',
                                color: msg.ok ? '#1A6B35' : '#991B1B',
                                fontWeight: '500',
                              }}>
                                {msg.text}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignSelf: 'flex-end', paddingBottom: '2px' }}>
                            <button
                              onClick={() => cambiarContrasena(u.id, u.email)}
                              disabled={cambioLoading[u.id]}
                              style={{
                                background: '#D4A017', color: '#0F2244',
                                border: 'none', borderRadius: '7px',
                                padding: '9px 16px', fontSize: '12px',
                                fontWeight: '700', cursor: cambioLoading[u.id] ? 'not-allowed' : 'pointer',
                                opacity: cambioLoading[u.id] ? 0.6 : 1,
                              }}>
                              {cambioLoading[u.id] ? 'Guardando...' : 'Guardar'}
                            </button>
                            <button
                              onClick={() => toggleCambioPass(u.id)}
                              style={{
                                background: '#F5F6FA', color: '#888',
                                border: '0.5px solid #E0E3EC', borderRadius: '7px',
                                padding: '9px 12px', fontSize: '12px', cursor: 'pointer',
                              }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}