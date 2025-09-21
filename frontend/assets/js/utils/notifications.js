// Sistema di notifiche per l'applicazione

// Funzione per mostrare notifiche
export function showNotification(message, type = 'info', duration = 5000) {
    // Rimuovi notifiche esistenti
    const existingNotifications = document.querySelectorAll('.notification')
    existingNotifications.forEach(notification => notification.remove())
    
    // Crea la notifica
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    
    // Icona basata sul tipo
    let icon = ''
    switch (type) {
        case 'success':
            icon = '✅'
            break
        case 'error':
            icon = '❌'
            break
        case 'warning':
            icon = '⚠️'
            break
        case 'info':
        default:
            icon = 'ℹ️'
            break
    }
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${icon}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `
    
    // Stili inline per la notifica
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        font-family: 'Inter', sans-serif;
        font-size: 14px;
        line-height: 1.4;
        transform: translateX(100%);
        transition: transform 0.3s ease-in-out;
        ${getNotificationStyles(type)}
    `
    
    // Aggiungi al DOM
    document.body.appendChild(notification)
    
    // Animazione di entrata
    setTimeout(() => {
        notification.style.transform = 'translateX(0)'
    }, 100)
    
    // Rimuovi automaticamente
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.transform = 'translateX(100%)'
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove()
                }
            }, 300)
        }
    }, duration)
}

function getNotificationStyles(type) {
    switch (type) {
        case 'success':
            return `
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                border-left: 4px solid #047857;
            `
        case 'error':
            return `
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                border-left: 4px solid #b91c1c;
            `
        case 'warning':
            return `
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
                border-left: 4px solid #b45309;
            `
        case 'info':
        default:
            return `
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
                border-left: 4px solid #1d4ed8;
            `
    }
}

// Funzione per mostrare loading
export function showLoading(message = 'Caricamento...') {
    const loading = document.createElement('div')
    loading.id = 'loading-overlay'
    loading.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p class="loading-message">${message}</p>
        </div>
    `
    
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        font-family: 'Inter', sans-serif;
    `
    
    // Stili per il contenuto del loading
    const style = document.createElement('style')
    style.textContent = `
        .loading-content {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f4f6;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        
        .loading-message {
            margin: 0;
            color: #374151;
            font-size: 16px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `
    
    document.head.appendChild(style)
    document.body.appendChild(loading)
}

// Funzione per nascondere loading
export function hideLoading() {
    const loading = document.getElementById('loading-overlay')
    if (loading) {
        loading.remove()
    }
}
