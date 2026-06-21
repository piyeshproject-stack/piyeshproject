// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((registration) => {
            console.log('SW registered with scope:', registration.scope);
        }).catch((err) => {
            console.log('SW registration failed:', err);
        });
    });
}

// Function to show a toast message (assuming showToast exists, or fallback)
function showOfflineToast(message, type) {
    if (typeof showToast === 'function') {
        showToast(message, type);
    } else {
        // Fallback UI if showToast is not loaded
        let toast = document.getElementById('offline-fallback-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'offline-fallback-toast';
            toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:12px 24px;border-radius:30px;font-size:14px;z-index:99999;font-family:sans-serif;box-shadow:0 10px 30px rgba(0,0,0,0.5);transition:opacity 0.3s;';
            document.body.appendChild(toast);
        }
        toast.innerHTML = type === 'success' ? '🟢 ' + message : '🔴 ' + message;
        toast.style.opacity = '1';
        setTimeout(() => { toast.style.opacity = '0'; }, 3000);
    }
}

// Global Online/Offline Event Listeners
window.addEventListener('offline', () => {
    // Notify the user they are offline, but let Service Worker handle caching
    showOfflineToast('You are currently offline. Browsing in offline mode.', 'warning');
});

window.addEventListener('online', () => {
    if (window.location.pathname.includes('/offline.html')) {
        // If they are literally on the offline fallback page, redirect them back or to root
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect') || '/';
        window.location.href = redirectUrl;
    } else {
        showOfflineToast('Back online! Syncing data...', 'success');
        // Optionally refresh the page slightly delayed to fetch fresh data if needed,
        // but since SW is Network-First, next actions will naturally be fresh.
    }
});

// Optional 'Go Offline' manual simulator
function simulateOfflineMode() {
    window.location.href = '/offline.html#simulate';
}
