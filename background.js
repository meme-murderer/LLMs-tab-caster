// Function to send message to a tab with retries
async function sendMessageToTab(tab, message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await chrome.tabs.sendMessage(tab.id, message);
      console.log(`Successfully sent message to tab ${tab.id}`);
      return;
    } catch (error) {
      console.log(`Attempt ${i + 1} failed for tab ${tab.id}:`, error);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.error(`Failed to send message to tab ${tab.id} after ${maxRetries} attempts`);
}

// Function to handle the typing process
async function handleTypingProcess(customText, selectedServices) {
  try {
    // Create new tabs for selected services simultaneously
    const tabs = await Promise.all(
      selectedServices.map(url => chrome.tabs.create({ url: url }))
    );
    
    // Wait longer for pages to load (5 seconds)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Send message to each tab with retry logic
    await Promise.all(tabs.map(tab => 
      sendMessageToTab(tab, {
        action: 'typeText',
        text: customText
      })
    ));
  } catch (error) {
    console.error('Failed to execute extension:', error);
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'startTyping' && message.text && message.services) {
    handleTypingProcess(message.text, message.services);
  }
  return true;
}); 