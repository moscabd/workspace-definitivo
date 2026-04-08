// ─── CONFIGURAÇÃO ───────────────────────────────────────
// Preencha com seus dados do Supabase após configurar
const SUPABASE_URL = 'https://dpuqurchrhmibkzmskdr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdXF1cmNocmhtaWJrem1za2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NTM4NTcsImV4cCI6MjA5MTIyOTg1N30.we9ui-K1_cXXD5UYYjtrc-Hrr1U2qKQwaO1qgUF-WX4'
// ────────────────────────────────────────────────────────

const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkSession() {
  try {
    const { data: { session } } = await db.auth.getSession()
    if (session) window.location.href = '/app.html'
  } catch(e) {
    console.log('Supabase not configured yet')
  }
}

async function loginWithGoogle() {
  const btn = document.getElementById('loginBtn')
  const spin = document.getElementById('spinner')
  const status = document.getElementById('status')

  btn.disabled = true
  spin.style.display = 'block'
  status.textContent = 'Redirecionando para o Google...'
  status.className = 'status'

  const { error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/app.html' }
  })

  if (error) {
    spin.style.display = 'none'
    btn.disabled = false
    status.className = 'status error'
    status.textContent = '✕ ' + error.message
  }
}

checkSession()