// Unified PWA Support & Online/Offline Listener for CA Inter 2026 Study Tracker

if (typeof window !== 'undefined') {
  // Listen to standard connection status
  window.addEventListener('online', () => {
    console.log('[Connection Status] Device went online. Firestore will automatically sync.');
  });
  window.addEventListener('offline', () => {
    console.log('[Connection Status] Device went offline. Using Local IndexedDB Persistence.');
  });

  // Register service worker if supported for PWA installability
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA Service Worker] Registered successfully with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('[PWA Service Worker] Registration failed:', err);
        });
    });
  }
}
