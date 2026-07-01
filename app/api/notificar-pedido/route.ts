import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { clienteNombre, clienteNit, total, vendedor, items } = await req.json()

  const itemsHTML = items.map((i: any) => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd;font-family:Arial">${i.codigo}</td>
      <td style="padding:8px;border:1px solid #ddd;font-family:Arial">${i.descripcion}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center;font-family:Arial">${i.cantidad}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right;font-family:Arial">$${i.subtotal.toLocaleString()}</td>
    </tr>
  `).join('')

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: process.env.CONTABLE_EMAIL!,
    subject: `🛒 Nuevo pedido — ${clienteNombre} — $${total.toLocaleString()} COP`,
    html: `
      <div style="font-family:Arial;max-width:600px;margin:0 auto">
        <div style="background:#1F4E79;padding:24px;text-align:center">
          <h1 style="color:white;margin:0;font-size:22px">E.M. Compañía S.A.S</h1>
          <p style="color:#90CAF9;margin:8px 0 0">Nuevo pedido recibido</p>
        </div>
        <div style="padding:24px;background:#f9f9f9">
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <tr>
              <td style="padding:8px;font-weight:bold">Cliente:</td>
              <td style="padding:8px">${clienteNombre}</td>
            </tr>
            ${clienteNit ? `<tr><td style="padding:8px;font-weight:bold">NIT:</td><td style="padding:8px">${clienteNit}</td></tr>` : ''}
            <tr>
              <td style="padding:8px;font-weight:bold">Vendedor:</td>
              <td style="padding:8px">${vendedor}</td>
            </tr>
          </table>
          <h3 style="color:#1F4E79">Productos</h3>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#1F4E79;color:white">
                <th style="padding:8px;text-align:left">Código</th>
                <th style="padding:8px;text-align:left">Descripción</th>
                <th style="padding:8px;text-align:center">Cant.</th>
                <th style="padding:8px;text-align:right">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>
          <div style="text-align:right;margin-top:16px;padding:16px;background:#1F4E79;border-radius:8px">
            <span style="color:white;font-size:20px;font-weight:bold">Total: $${total.toLocaleString()} COP</span>
          </div>
          <div style="margin-top:24px;text-align:center">
            <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://em-compania-pedidos.vercel.app/contable' : '#'}" 
               style="background:#2E75B6;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold">
              Ver en plataforma →
            </a>
          </div>
        </div>
        <div style="padding:16px;text-align:center;color:#999;font-size:12px">
          E.M. Compañía S.A.S · Sistema de Cotizaciones y Pedidos
        </div>
      </div>
    `
  })

  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json({ success: true })
}