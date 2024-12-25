// Function to handle the submission
async function handleSubmission() {
  const statusElement = document.getElementById('status');
  const button = document.getElementById('start');
  const customText = document.getElementById('customText').value.trim();
  
  const selectedServices = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
    .map(checkbox => checkbox.value);
  
  if (!customText) {
    statusElement.textContent = 'Please enter some text first';
    return;
  }
  
  if (selectedServices.length === 0) {
    statusElement.textContent = 'Please select at least one service';
    return;
  }
  
  try {
    button.disabled = true;
    statusElement.textContent = 'Opening new tabs...';
    
    await chrome.runtime.sendMessage({ 
      action: 'startTyping',
      text: customText,
      services: selectedServices
    });
    
    statusElement.textContent = 'Process started successfully!';
    setTimeout(() => window.close(), 2000);
  } catch (error) {
    statusElement.textContent = 'Error: ' + error.message;
    button.disabled = false;
  }
}

// Load saved checkbox states when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const checkboxes = document.querySelectorAll('input[type="checkbox"]');
  const result = await chrome.storage.sync.get('selectedServices');
  
  if (result.selectedServices) {
    checkboxes.forEach(checkbox => {
      checkbox.checked = result.selectedServices.includes(checkbox.value);
    });
  }

  // Add enter key support
  document.getElementById('customText').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmission();
    }
  });
});

// Save checkbox states when they change
document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
  checkbox.addEventListener('change', async () => {
    const selectedServices = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
    await chrome.storage.sync.set({ selectedServices });
  });
});

// Button click handler
document.getElementById('start').addEventListener('click', handleSubmission); 