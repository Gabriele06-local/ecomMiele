// Componente AI Chatbot
export class AIChatbot {
  constructor(options = {}) {
    this.options = {
      endpoint: 'ai-assistant', // Supabase Edge Function
      maxMessages: 50,
      autoScroll: true,
      placeholder: 'Chiedi qualcosa sui nostri mieli...',
      welcomeMessage: 'Ciao! Sono il tuo assistente AI per il miele. Posso aiutarti a scegliere il prodotto perfetto per te! 🍯',
      ...options
    }
    
    this.messages = []
    this.isOpen = false
    this.isTyping = false
    this.initializeElements()
  }

  // Inizializza gli elementi DOM
  initializeElements() {
    this.chatbot = document.getElementById('aiChatbot')
    this.toggleBtn = document.getElementById('aiAssistantToggle')
    this.closeBtn = document.getElementById('chatbotClose')
    this.sendBtn = document.getElementById('chatbotSend')
    this.input = document.getElementById('chatbotInput')
    this.messagesContainer = document.getElementById('chatbotMessages')
    
    if (!this.chatbot) {
      console.error('Elemento chatbot non trovato')
      return
    }

    this.setupEventListeners()
    this.addWelcomeMessage()
  }

  // Configura i listener degli eventi
  setupEventListeners() {
    // Toggle chatbot
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle())
    }

    // Chiudi chatbot
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close())
    }

    // Invio messaggio
    if (this.sendBtn) {
      this.sendBtn.addEventListener('click', () => this.sendMessage())
    }

    // Invio con Enter
    if (this.input) {
      this.input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          this.sendMessage()
        }
      })

      // Auto-resize dell'input
      this.input.addEventListener('input', () => {
        this.input.style.height = 'auto'
        this.input.style.height = this.input.scrollHeight + 'px'
      })
    }

    // Chiudi con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close()
      }
    })

    // Chiudi cliccando fuori
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.chatbot.contains(e.target) && !this.toggleBtn?.contains(e.target)) {
        this.close()
      }
    })
  }

  // Aggiunge il messaggio di benvenuto
  addWelcomeMessage() {
    if (this.messagesContainer && this.messages.length === 0) {
      this.addMessage('assistant', this.options.welcomeMessage)
    }
  }

  // Apre il chatbot
  open() {
    if (this.chatbot) {
      this.chatbot.classList.add('active')
      this.isOpen = true
      
      // Focus sull'input
      setTimeout(() => {
        if (this.input) {
          this.input.focus()
        }
      }, 100)
      
      this.scrollToBottom()
    }
  }

  // Chiude il chatbot
  close() {
    if (this.chatbot) {
      this.chatbot.classList.remove('active')
      this.isOpen = false
    }
  }

  // Toggle dello stato del chatbot
  toggle() {
    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  // Invia un messaggio
  async sendMessage() {
    if (!this.input || this.isTyping) return

    const message = this.input.value.trim()
    if (!message) return

    // Aggiungi il messaggio utente
    this.addMessage('user', message)
    
    // Pulisci l'input
    this.input.value = ''
    this.input.style.height = 'auto'

    // Mostra indicatore di typing
    this.showTypingIndicator()

    try {
      // Invia il messaggio all'AI
      const response = await this.sendToAI(message)
      this.hideTypingIndicator()
      
      if (response) {
        this.addMessage('assistant', response)
      } else {
        this.addMessage('assistant', 'Mi dispiace, si è verificato un errore. Riprova più tardi.')
      }
    } catch (error) {
      console.error('Errore invio messaggio AI:', error)
      this.hideTypingIndicator()
      this.addMessage('assistant', 'Mi dispiace, si è verificato un errore di connessione. Riprova più tardi.')
    }
  }

  // Invia il messaggio all'AI
  async sendToAI(message) {
    try {
      const response = await fetch(this.options.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message,
          context: this.getContext()
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.response || data.message
    } catch (error) {
      console.error('Errore chiamata AI:', error)
      throw error
    }
  }

  // Ottiene il contesto per l'AI
  getContext() {
    const context = {
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      userAgent: navigator.userAgent
    }

    // Aggiungi informazioni sui prodotti se disponibili
    if (window.currentProducts) {
      context.availableProducts = window.currentProducts.slice(0, 10) // Limita per non sovraccaricare
    }

    // Aggiungi informazioni sul carrello se disponibili
    if (window.cartService) {
      context.cartItems = window.cartService.getItemCount()
    }

    return context
  }

  // Aggiunge un messaggio alla chat
  addMessage(type, content) {
    if (!this.messagesContainer) return

    // Limita il numero di messaggi
    if (this.messages.length >= this.options.maxMessages) {
      this.messages.shift()
      const firstMessage = this.messagesContainer.querySelector('.message')
      if (firstMessage) {
        firstMessage.remove()
      }
    }

    const message = {
      type,
      content,
      timestamp: new Date().toISOString()
    }

    this.messages.push(message)
    this.renderMessage(message)
    
    if (this.options.autoScroll) {
      this.scrollToBottom()
    }
  }

  // Renderizza un singolo messaggio
  renderMessage(message) {
    const messageDiv = document.createElement('div')
    messageDiv.className = `message ${message.type}-message`
    
    const avatar = document.createElement('div')
    avatar.className = 'message-avatar'
    avatar.innerHTML = message.type === 'user' 
      ? '<i class="fas fa-user"></i>' 
      : '<i class="fas fa-robot"></i>'

    const content = document.createElement('div')
    content.className = 'message-content'
    
    // Formatta il contenuto del messaggio
    const formattedContent = this.formatMessageContent(message.content)
    content.innerHTML = `<p>${formattedContent}</p>`

    messageDiv.appendChild(avatar)
    messageDiv.appendChild(content)
    
    this.messagesContainer.appendChild(messageDiv)
  }

  // Formatta il contenuto del messaggio
  formatMessageContent(content) {
    // Escape HTML
    let formatted = content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    
    // Converti emoji
    formatted = this.convertEmojis(formatted)
    
    // Converti link
    formatted = this.convertLinks(formatted)
    
    // Converti line breaks
    formatted = formatted.replace(/\n/g, '<br>')
    
    return formatted
  }

  // Converte le emoji
  convertEmojis(text) {
    const emojiMap = {
      ':)': '😊',
      ':(': '😢',
      ':D': '😃',
      ':P': '😛',
      ';)': '😉',
      '<3': '❤️',
      ':heart:': '❤️',
      ':thumbsup:': '👍',
      ':thumbsdown:': '👎'
    }

    Object.entries(emojiMap).forEach(([code, emoji]) => {
      text = text.replace(new RegExp(code, 'g'), emoji)
    })

    return text
  }

  // Converte i link
  convertLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>')
  }

  // Mostra l'indicatore di typing
  showTypingIndicator() {
    if (!this.messagesContainer || this.isTyping) return

    this.isTyping = true
    
    const typingDiv = document.createElement('div')
    typingDiv.className = 'message assistant-message typing-indicator'
    typingDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fas fa-robot"></i>
      </div>
      <div class="message-content">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `

    // Aggiungi gli stili per l'indicatore di typing se non esistono
    if (!document.getElementById('typing-styles')) {
      const styles = document.createElement('style')
      styles.id = 'typing-styles'
      styles.textContent = `
        .typing-dots {
          display: flex;
          gap: 4px;
          padding: 8px 0;
        }
        
        .typing-dots span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--text-light);
          animation: typing 1.4s infinite ease-in-out;
        }
        
        .typing-dots span:nth-child(1) {
          animation-delay: -0.32s;
        }
        
        .typing-dots span:nth-child(2) {
          animation-delay: -0.16s;
        }
        
        @keyframes typing {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `
      document.head.appendChild(styles)
    }

    this.messagesContainer.appendChild(typingDiv)
    this.scrollToBottom()
  }

  // Nasconde l'indicatore di typing
  hideTypingIndicator() {
    if (!this.isTyping) return

    const typingIndicator = this.messagesContainer.querySelector('.typing-indicator')
    if (typingIndicator) {
      typingIndicator.remove()
    }

    this.isTyping = false
  }

  // Scrolla in fondo alla chat
  scrollToBottom() {
    if (this.messagesContainer) {
      setTimeout(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight
      }, 100)
    }
  }

  // Pulisce la chat
  clearChat() {
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = ''
      this.messages = []
      this.addWelcomeMessage()
    }
  }

  // Ottiene la cronologia dei messaggi
  getMessageHistory() {
    return [...this.messages]
  }

  // Imposta la cronologia dei messaggi
  setMessageHistory(messages) {
    this.messages = [...messages]
    
    if (this.messagesContainer) {
      this.messagesContainer.innerHTML = ''
      this.messages.forEach(message => this.renderMessage(message))
      this.scrollToBottom()
    }
  }

  // Distrugge il componente
  destroy() {
    // Rimuovi i listener degli eventi
    document.removeEventListener('keydown', this.handleEscapeKey)
    document.removeEventListener('click', this.handleOutsideClick)
    
    // Pulisci i messaggi
    this.clearChat()
    
    // Pulisci le variabili
    this.messages = []
    this.isOpen = false
    this.isTyping = false
  }
}

// Funzione helper per inizializzare il chatbot
export function initializeAIChatbot(options = {}) {
  return new AIChatbot(options)
}

// Esportazione predefinita
export default AIChatbot
