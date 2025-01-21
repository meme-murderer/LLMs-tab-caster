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
      // We only care about the newly created tab
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        // Stop listening and clear the timeout
        chrome.tabs.onUpdated.removeListener(listener);
        clearTimeout(timeoutId);

        // Resolve the promise with the tab object
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
      console.log(`Successfully sent message to tab ${tabId}`);
      return;
    } catch (error) {
      console.warn(`Attempt ${i + 1} failed for tab ${tabId}:`, error);
      // Wait briefly before trying again
      await new Promise(resolve => setTimeout(resolve, 2000));
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
    await Promise.all(
      createdTabs.map(tab => waitForTabToLoad(tab.id))
    );

    // 3) Send the message to each tab (with retry logic)
    await Promise.all(
      createdTabs.map(tab =>
        sendMessageToTabWithRetries(tab.id, {
          action: 'typeText',
          text: customText
        })
      )
    );

    console.log('All tabs have been messaged successfully.');
  } catch (error) {
    console.error('Failed to execute extension:', error);
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startTyping' && message.text && message.services) {
    handleTypingProcess(message.text, message.services);
  }
  return true; // Keeps the message channel open for async response if needed
});
