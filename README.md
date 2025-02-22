# LLMs Tab Caster

A Chrome extension that allows you to send the same message to multiple AI chat services simultaneously. Perfect for comparing responses across different language models.


![Screenshot 2025-01-21 001511](https://github.com/user-attachments/assets/a6bb54e9-0cba-4a60-bdce-314263bb533b)


## Supported AI Chat Services

- ChatGPT (OpenAI)
- Claude (Anthropic)
- CoPilot
- PerplexityAI
- Gemini
- Google AI Studio
- Mistral AI
- Deepseek Chat
- QwQ-32B (Hugging Face)
- Llama3.3 (Hugging Face)
- CohereForAI (Hugging Face)

## Features

- Send identical messages to multiple AI chat services with one click
- Clean and intuitive user interface
- Remembers your selected services between sessions
- Supports keyboard shortcuts (Enter to send)
- Automatic text input simulation for each service
- Robust error handling and retry mechanisms

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the directory containing the extension files

## Usage

1. Click the extension icon in your Chrome toolbar
2. Enter your message in the text area
3. Select the AI services you want to send the message to
4. Click "Start Typing" or press Enter
5. The extension will open new tabs for each selected service and automatically input your message

## Requirements

- Google Chrome browser
- Active accounts/access to the AI services you want to use

## Technical Details

The extension consists of:
- `manifest.json`: Extension configuration and permissions
- `popup.html/js`: User interface and interaction handling
- `content.js`: Handles text input simulation on AI service pages
- `background.js`: Manages tab creation and message routing

## Notes

- Some services may require you to be logged in
- The extension respects each service's rate limits and usage policies
- Text input simulation is designed to work with the current UI of each service (as of 2024)

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## License

This project is licensed under the MIT License. 
