class ElementInteractor {
  constructor() {
    this.retryAttempts = 30;
    this.retryDelay = 1000;
    this.isProcessing = false;
  }

  getElement() {
    const url = window.location.hostname;
    
    // Updated selectors for each platform
    const selectors = {
      'chat.mistral.ai': [
        'textarea[placeholder="Ask le Chat or @mention an agent"]',
        'textarea[placeholder*="message"]'
      ],
      'claude.ai': [
        'div[contenteditable="true"][translate="no"]',
        'div[contenteditable="true"]'
      ],
      'chat.openai.com': [
        'textarea[placeholder*="Send a message"]',
        'textarea[data-id="root"]',
        'textarea'
      ],
      'chat.deepseek.com': [
        '#chat-input',
        'textarea[placeholder*="Send a message"]',
        'textarea'
      ],
      'aistudio.google.com': [
        'textarea[placeholder="Type something"]',
        'textarea[placeholder*="message"]',
        'textarea'
      ],
      'huggingface.co': [
        'textarea[placeholder="Ask anything"]',
        'textarea[enterkeyhint="enter"]',
        'textarea.scrollbar-custom'
      ]
    };

    const defaultSelector = '.relative textarea, textarea[rows="1"], textarea[placeholder*="message"], textarea[placeholder*="Send"]';
    
    // Try platform-specific selectors first
    if (selectors[url]) {
      for (const selector of selectors[url]) {
        const element = document.querySelector(selector);
        if (element) return element;
      }
    }
    
    // Fall back to default selector
    return document.querySelector(defaultSelector);
  }

  async simulateTyping(element, text) {
    const url = window.location.hostname;
    
    try {
      if (url === 'claude.ai') {
        // Special handling for contenteditable divs (Claude)
        element.textContent = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.focus();
      } else {
        // Standard input handling for textarea elements
        element.focus();
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
      
      // Wait for the UI to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Special handling for Google AI Studio (Ctrl+Enter)
      if (url === 'aistudio.google.com') {
        element.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          ctrlKey: true,
          bubbles: true
        }));
      } else {
        // Regular Enter key for other platforms
        element.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        }));
      }
      
      return true;
    } catch (error) {
      console.error('Error during typing simulation:', error);
      return false;
    }
  }

  async waitForElement() {
    return new Promise((resolve, reject) => {
      let attempts = this.retryAttempts;
      
      const checkElement = () => {
        const element = this.getElement();
        if (element && element.isConnected) {
          console.log('Found input element:', element);
          resolve(element);
        } else {
          attempts--;
          if (attempts <= 0) {
            reject(new Error('Chat input element not found after multiple attempts'));
            return;
          }
          setTimeout(checkElement, this.retryDelay);
        }
      };
      
      checkElement();
    });
  }

  async typeText(text) {
    if (this.isProcessing) {
      console.log('Already processing a message, skipping...');
      return;
    }

    this.isProcessing = true;
    try {
      console.log('Waiting for chat input to be available...');
      const element = await this.waitForElement();
      console.log('Chat input found, starting to type...');
      
      // Retry typing up to 3 times if it fails
      for (let i = 0; i < 3; i++) {
        if (await this.simulateTyping(element, text)) {
          console.log('Successfully typed text');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      throw new Error('Failed to type text after multiple attempts');
    } catch (error) {
      console.error('Failed to type text:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// Initialize and listen for messages
const interactor = new ElementInteractor();
let hasProcessedMessage = false;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'typeText' && message.text && !hasProcessedMessage) {
    console.log('Received text to type:', message.text);
    hasProcessedMessage = true;
    interactor.typeText(message.text);
  }
  return true;
});

// Initial page load handler
window.addEventListener('load', () => {
  console.log('Page loaded, ready to receive text...');
}); 