import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener mínimo 6 caracteres' }, { status: 400 })
  }

  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  const user = users.users.find(u => u.email === email)

  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}