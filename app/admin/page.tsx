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
  const router = useRouter()

  useEffect(() => {
    cargarUsuarios()
  }, [])

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

  const eliminarUsuario = async (id: string, email: string) => {
    if (!confirm(`¿Eliminar usuario ${email}?`)) return
    await supabase.from('usuarios').delete().eq('id', id)
    cargarUsuarios()
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">E.M. Compañía — Panel Administrador</h1>
        <button onClick={cerrarSesion} className="text-sm bg-blue-900 px-4 py-2 rounded hover:bg-blue-800">
          Cerrar sesión
        </button>
      </nav>

      <div className="max-w-5xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold mb-4 text-gray-800">Crear usuario</h2>
          <form onSubmit={crearUsuario} className="space-y-3">
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Nombre completo" required
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Correo electrónico" type="email" required
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña" type="password" required
              className="w-full border rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={rol} onChange={e => setRol(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="vendedor">Vendedor</option>
              <option value="contable">Contable</option>
              <option value="administrador">Administrador</option>
            </select>
            {mensaje && <p className={`text-sm ${mensaje.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{mensaje}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Creando...' : 'Crear usuario'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold mb-4 text-gray-800">Usuarios registrados</h2>
          <div className="space-y-2">
            {usuarios.map(u => (
              <div key={u.id} className="flex justify-between items-center border rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{u.nombre}</p>
                  <p className="text-xs text-gray-500">{u.email} · <span className="capitalize">{u.rol}</span></p>
                </div>
                <button onClick={() => eliminarUsuario(u.id, u.email)}
                  className="text-red-500 text-xs hover:text-red-700">Eliminar</button>
              </div>
            ))}
            {usuarios.length === 0 && <p className="text-sm text-gray-400">No hay usuarios aún.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}