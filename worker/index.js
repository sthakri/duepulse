self.addEventListener('push', function(event) {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'DuePulse', {
      body: data.body || 'You have an assignment due soon',
      icon: '/icons/icon-192.png',
    })
  )
})
