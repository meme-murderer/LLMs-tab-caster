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
        // If contenteditable handling is unified, these are still valid fallbacks
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
      ],
      'www.perplexity.ai': [
        'textarea[placeholder="Ask anything..."]',
        'input[placeholder="Search or ask me anything..."]',
        'textarea[placeholder="Search or ask me anything..."]',
        'input#search-input',
        'textarea'
      ],
      'copilot.cloud.microsoft': [
        // contenteditable approach for Copilot
        'span#m365-chat-editor-target-element[role="textbox"][contenteditable="true"]',
        'span[role="textbox"][contenteditable="true"]',
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Ask"]',
        'textarea'
      ],
      // ---- Added ChatGPT domain below ----
      'chatgpt.com': [
        // Target the exact contenteditable div
        'div#prompt-textarea.ProseMirror[contenteditable="true"]',
        // The <p> inside might also match if you want to be extra sure
        'p[data-placeholder="Message ChatGPT"]'
      ]
    };

    // A default selector to fall back on, if no site-specific selector is found
    const defaultSelector =
      '.relative textarea, ' +
      'textarea[rows="1"], ' +
      'textarea[placeholder*="message"], ' +
      'textarea[placeholder*="Send"], ' +
      'div[contenteditable="true"]';

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
      // Check if the element is contenteditable (e.g., Claude, Copilot, ChatGPT)
      if (element.isContentEditable) {
        // For contenteditable, use textContent + 'input' event
        element.textContent = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.focus();
      } else {
        // Standard input handling for textarea
        element.focus();
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Wait briefly for the UI to update
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
        // Regular Enter key for all other platforms
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
        const success = await this.simulateTyping(element, text);
        if (success) {
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

// We removed hasProcessedMessage to allow multiple messages in one session
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'typeText' && message.text) {
    console.log('Received text to type:', message.text);
    interactor.typeText(message.text);
  }
  return true;
});

// Initial page load handler
window.addEventListener('load', () => {
  console.log('Page loaded, ready to receive text...');
});
