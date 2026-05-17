export default function DebugLogout() {
  // Clear all Supabase auth keys from localStorage
  Object.keys(localStorage)
    .filter(k => k.startsWith('sb-'))
    .forEach(k => localStorage.removeItem(k))
  localStorage.clear()

  // Clear all cookies
  document.cookie.split(';').forEach(c => {
    document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/'
  })

  window.location.replace('/login')
  return null
}
