// Track processed tabs to avoid duplicate messages
const processedTabs = new Set();

// Wait for a newly created tab to finish loading
function waitForTabToLoad(tabId) {
  return new Promise((resolve, reject) => {
    // Fallback timeout (e.g., 30 seconds) in case the site never finishes loading
    const timeoutId = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error(`Tab ${tabId} did not finish loading in time.`));
    }, 30000);

    // Listen for changes to this tab
    function listener(updatedTabId, changeInfo, updatedTab) {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timeoutId);
        resolve(updatedTab);
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Send a message to a tab, retrying if it fails
async function sendMessageToTabWithRetries(tabId, message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await chrome.tabs.sendMessage(tabId, message);
      return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  console.error(`Failed to send message to tab ${tabId} after ${maxRetries} attempts`);
}

// Main function to open all services, wait for load, then send the text
async function handleTypingProcess(customText, selectedServices) {
  try {
    // 1) Create a new tab for each selected service
    const createdTabs = [];
    for (const url of selectedServices) {
      const newTab = await chrome.tabs.create({ url });
      createdTabs.push(newTab);
    }

    // 2) Wait until all tabs are fully loaded (status === 'complete')
    await Promise.all(createdTabs.map((tab) => waitForTabToLoad(tab.id)));

    // 3) Send the message to each tab (with retry logic)
    await Promise.all(
      createdTabs.map(async (tab) => {
        if (!processedTabs.has(tab.id)) {
          processedTabs.add(tab.id); // Mark the tab as processed
          await sendMessageToTabWithRetries(tab.id, {
            action: 'typeText',
            text: customText,
          });
        }
      })
    );
  } catch (error) {
    console.error('Failed to execute extension:', error);
  }
}

// Clean up processed tabs when they are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (processedTabs.has(tabId)) {
    processedTabs.delete(tabId);
  }
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startTyping' && message.text && message.services) {
    handleTypingProcess(message.text, message.services);
  }
  return true; // Keeps the message channel open for async response if needed
});
