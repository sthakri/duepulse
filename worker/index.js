self.addEventListener('push', function(event) {
  let data = {}
  try {
    data = event.data?.json() ?? {}
  } catch {
    // Non-JSON or empty payload — fall back to default text instead of crashing
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'DuePulse', {
      body: data.body || 'You have an assignment due soon',
      icon: '/icons/icon-192.png',
    })
  )
})
