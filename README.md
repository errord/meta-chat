# Meta Chat POC - AI Platform Aggregator

A Chrome extension that enables simultaneous communication with multiple AI chat platforms (DeepSeek, Tencent Yuanbao, Kimi) in a unified interface.

## Features

### ✨ Core Functionality
- **Multi-Platform Support**: Communicate with DeepSeek, Tencent Yuanbao, and Kimi simultaneously
- **Unified Interface**: Single input sends messages to all platforms at once
- **Response Aggregation**: View all AI responses in organized cards
- **Tab Management**: Open and manage multiple AI platform tabs
- **Real-time Status**: Monitor connection status for each platform

### 🎯 Key Advantages
- **No Server Required**: Everything runs locally in your browser
- **Privacy Focused**: All data stays on your device
- **Time Efficient**: Get multiple AI perspectives with one query
- **Easy Comparison**: Side-by-side response comparison
- **Export Capability**: Save conversation data as JSON

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder
5. The extension icon should appear in your Chrome toolbar

## Usage

### Getting Started
1. **Open Extension**: Click the Meta Chat icon in Chrome toolbar
2. **Launch Main Window**: Click "Open Main Window" button
3. **Open Platforms**: Click "Open All Platforms" to create tabs for all AI services
4. **Login**: Manually login to each platform in their respective tabs (one-time setup)

### Sending Messages
1. **Enter Message**: Type your question in the input area at the bottom
2. **Send to All**: Click "Send to All" or press Ctrl+Enter
3. **Monitor Responses**: Watch as each platform responds in real-time
4. **View Results**: All responses appear in organized cards

### Managing Responses
- **Clear All**: Remove all current responses
- **Export**: Download conversation data as JSON file
- **Refresh Connections**: Check and reconnect to platform tabs

## Technical Architecture

### New Approach: Tab-Based Architecture
Instead of iframes (which are blocked by most modern AI platforms), we use:

- **Separate Tabs**: Each AI platform opens in its own Chrome tab
- **Content Scripts**: Inject automation scripts into each platform
- **Message Relay**: Background script coordinates communication
- **Main Window**: Unified control interface

### File Structure
```
meta-chat-poc/
├── manifest.json           # Extension configuration
├── popup/                  # Extension popup interface
│   ├── popup.html         # Popup UI
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup logic
├── main/                   # Main application window
│   ├── main.html          # Main interface
│   ├── main.css           # Main styling
│   └── main.js            # Main application logic
└── scripts/                # Content and background scripts
    ├── background.js       # Extension background service
    ├── content-deepseek.js # DeepSeek platform adapter
    ├── content-yuanbao.js  # Yuanbao platform adapter
    └── content-kimi.js     # Kimi platform adapter
```

### Platform Adapters
Each platform has a specialized content script that:
- **Detects Input Elements**: Finds chat input fields automatically
- **Simulates User Input**: Types messages and triggers send buttons
- **Monitors Responses**: Watches for new AI responses
- **Extracts Content**: Captures response text and sends to main window

## Troubleshooting

### Common Issues

1. **"Could not establish connection" Error**
   - **Cause**: Content scripts not loaded or tab closed
   - **Solution**: Click "Refresh Connections" or reopen platforms

2. **Platform Not Responding**
   - **Cause**: Platform UI changes or login required
   - **Solution**: Check if you're logged in to the platform

3. **Send Button Not Working**
   - **Cause**: Platform selector not found
   - **Solution**: Content scripts auto-adapt to common selectors

### Platform-Specific Notes

- **DeepSeek**: Uses textarea and button selectors
- **Yuanbao**: Handles both textarea and contenteditable inputs
- **Kimi**: Supports multiple input field types

## Development

### Adding New Platforms
1. Create new content script: `scripts/content-[platform].js`
2. Add platform to manifest.json content_scripts
3. Update platform list in `main/main.js`
4. Add platform-specific selectors and logic

### Customizing Selectors
Each content script contains platform-specific selectors that can be updated if platforms change their UI:

```javascript
const selectors = [
    'textarea[placeholder*="input"]',
    'button[type="submit"]',
    '.send-button'
];
```

## Security & Privacy

- **Local Processing**: All operations are performed locally
- **No Data Collection**: No user data is sent to external servers
- **Standard Permissions**: Only uses necessary Chrome extension permissions
- **Open Source**: Full source code available for inspection

## Limitations

- **Manual Login**: Users must log in to each platform manually
- **Platform Dependencies**: Functionality depends on platform UI stability
- **Chrome Only**: Currently supports Chrome browser only
- **Rate Limits**: Subject to individual platform rate limits

## Future Enhancements

- [ ] Support for additional AI platforms
- [ ] Enhanced response formatting and markdown support
- [ ] Conversation history management
- [ ] Advanced filtering and search capabilities
- [ ] Custom platform selector configuration
- [ ] Response comparison and analysis tools

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with multiple platforms
5. Submit a pull request

## License

This project is open source and available under the MIT License.