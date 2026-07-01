'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    const { data: userData } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('email', email)
      .single()

    if (userData?.rol === 'vendedor') router.push('/vendedor')
    else if (userData?.rol === 'contable') router.push('/contable')
    else if (userData?.rol === 'administrador') router.push('/admin')
    else router.push('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F2244',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '24px',
    }}>
      {/* Fondo con patrón sutil */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'rgba(212,160,23,0.04)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.02)',
        }} />
      </div>

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        {/* Logo / Marca */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: '#D4A017',
            borderRadius: '14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '22px', fontWeight: '800', color: '#0F2244',
            letterSpacing: '-1px',
          }}>
            EM
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', margin: 0 }}>
            E.M. Compañía S.A.S
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
            Sistema de cotizaciones y pedidos
          </p>
        </div>

        {/* Tarjeta de login */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          padding: '32px',
        }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: '500',
                color: 'rgba(255,255,255,0.5)', marginBottom: '8px',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@emcompania.com"
                required
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', padding: '11px 14px',
                  fontSize: '14px', color: '#fff',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(212,160,23,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: '500',
                color: 'rgba(255,255,255,0.5)', marginBottom: '8px',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', padding: '11px 14px',
                  fontSize: '14px', color: '#fff',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(212,160,23,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(220,53,69,0.15)',
                border: '1px solid rgba(220,53,69,0.3)',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '13px', color: '#ff8080',
                marginBottom: '18px',
              }}>
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: loading ? 'rgba(212,160,23,0.5)' : '#D4A017',
                color: '#0F2244', border: 'none',
                borderRadius: '8px', fontSize: '14px',
                fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.02em', transition: 'all 0.15s',
              }}
            >
              {loading ? 'Verificando...' : 'Ingresar al sistema'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center', marginTop: '24px',
          fontSize: '11px', color: 'rgba(255,255,255,0.2)',
        }}>
          E.M. Compañía S.A.S · 40 años de experiencia industrial
        </p>
      </div>
    </div>
  )
}
