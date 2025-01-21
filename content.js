class ElementInteractor {
  constructor() {
    this.retryAttempts = 30; // Maximum retries to find elements
    this.retryDelay = 1000; // Delay between retries in milliseconds
    this.isProcessing = false; // Prevent concurrent processing
  }

  getElement() {
    const url = window.location.hostname;

    // Selectors for each platform
    const selectors = {
      'chat.mistral.ai': [
        'textarea[placeholder="Ask le Chat or @mention an agent"]',
        'textarea[placeholder*="message"]',
      ],
      'claude.ai': [
        'div[contenteditable="true"][translate="no"]',
        'div[contenteditable="true"]',
      ],
      'chat.openai.com': [
        'textarea[placeholder*="Send a message"]',
        'textarea[data-id="root"]',
        'textarea',
      ],
      'chat.deepseek.com': [
        '#chat-input',
        'textarea[placeholder*="Send a message"]',
        'textarea',
      ],
      'aistudio.google.com': [
        'textarea[placeholder="Type something"]',
        'textarea[placeholder*="message"]',
        'textarea',
      ],
      'huggingface.co': [
        'textarea[placeholder="Ask anything"]',
        'textarea[enterkeyhint="enter"]',
        'textarea.scrollbar-custom',
      ],
      'www.perplexity.ai': [
        'textarea[placeholder="Ask anything..."]',
        'input[placeholder="Search or ask me anything..."]',
        'textarea[placeholder="Search or ask me anything..."]',
        'input#search-input',
        'textarea',
      ],
      'outlook.office.com': [
        // The Copilot editor element
        'span#m365-chat-editor-target-element[role="textbox"][contenteditable="true"]',
      ],
      'chatgpt.com': [
        'div#prompt-textarea.ProseMirror[contenteditable="true"]',
        'p[data-placeholder="Message ChatGPT"]',
      ],
    };

    const defaultSelector =
      '.relative textarea, ' +
      'textarea[rows="1"], ' +
      'textarea[placeholder*="message"], ' +
      'textarea[placeholder*="Send"], ' +
      'div[contenteditable="true"], ' +
      'span[contenteditable="true"]';

    // Try domain-specific selectors first
    if (selectors[url]) {
      for (const selector of selectors[url]) {
        const element = document.querySelector(selector);
        if (element) return element;
      }
    }

// Fall back to default selector
return document.querySelector(defaultSelector);
}

async waitForElement() {
  return new Promise((resolve, reject) => {
    let attempts = this.retryAttempts;

    const checkElement = () => {
      const element = this.getElement();
      if (element && element.isConnected) {
        resolve(element);
      } else {
        attempts--;
        if (attempts <= 0) {
          console.error('Input element not found after retries.');
          reject(new Error('Input element not found.'));
        } else {
          setTimeout(checkElement, this.retryDelay);
        }
      }
    };

    checkElement();
  });
}


  async simulateTyping(element, text) {
    const url = window.location.hostname;
  
    try {
      if (!element) {
        console.error('Input element not found for domain:', url);
        return false;
      }
  
      if (url.includes('outlook.office.com')) {
         element.focus();
      
        // Simulate the compositionstart event
        element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      
        // Set the text directly into the editor
        element.innerHTML = `<p><span data-lexical-text="true">${text}</span></p>`;

        // Simulate the compositionupdate and compositionend events
        element.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true }));
        element.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));

        // Locate the "Send" button
        const sendButton = document.querySelector('button[aria-label="Send"]');
        if (sendButton && !sendButton.disabled) {
          sendButton.click();
        } else {
          console.error('Copilot: Submit button not found or disabled.');
        }
      
        return true;
      } else if (url.includes('huggingface.co')) {
        // Hugging Face-specific logic
        element.focus();
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
  
        // Wait for the submit button to become enabled
        const submitButtonSelector = 'button[aria-label="Send message"]';
        let submitButton = document.querySelector(submitButtonSelector);
  
        for (let i = 0; i < 10; i++) {
          if (submitButton && !submitButton.disabled) {
            submitButton.click();
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
          submitButton = document.querySelector(submitButtonSelector);
        }
      } else if (element.isContentEditable) {
        // General contenteditable logic
        element.textContent = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.focus();
      } else {
        // Standard textarea logic
        element.focus();
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
  
      // Wait briefly for the UI to update
      await new Promise((resolve) => setTimeout(resolve, 1000));
  
      // Handle manual Enter for Google AI Studio or fallback
      if (url === 'aistudio.google.com') {
        element.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            ctrlKey: true,
            bubbles: true,
          })
        );
      } else {
        element.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
          })
        );
      }
  
      return true;
    } catch (error) {
      console.error('Error during typing simulation:', error);
      return false;
    }
  }
  

  async typeText(text) {
    if (this.isProcessing) {
      return;
    }
  
    this.isProcessing = true;
    try {
      const element = await this.waitForElement();
  
      for (let i = 0; i < 3; i++) {
        const success = await this.simulateTyping(element, text);
        if (success) {
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
  
      throw new Error('Failed to type text after multiple attempts.');
    } catch (error) {
      console.error('Failed to type text:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

// Initialize the interactor and listen for messages
const interactor = new ElementInteractor();
let isTyping = false; // Guard to prevent duplicate message handling

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'typeText' && message.text) {
    // Prevent processing if a message is already being typed
    if (isTyping) {
      return false;
    }

    // Set the guard to indicate processing
    isTyping = true;


    // Process the message
    interactor.typeText(message.text).then(() => {
      // Reset the guard after processing is complete
      isTyping = false;

    }).catch((error) => {
      // Ensure the guard is reset even if an error occurs
      isTyping = false;
      console.error('Error during message processing:', error);
    });
  }
  return true; // Keep the message channel open for asynchronous responses
});


window.addEventListener('load', () => {
  console.log('Page loaded. Ready to receive text.');
});
