# Meta Chat POC - AI Platform Aggregator

A Chrome extension that enables simultaneous communication with multiple AI chat platforms (DeepSeek, Tencent Yuanbao, Kimi) in a unified interface. Send one message and get responses from all AI platforms at once.

## Features

### ✨ Core Functionality
- **Multi-Platform Support**: Communicate with DeepSeek, Tencent Yuanbao, and Kimi simultaneously
- **Unified Interface**: Single input sends messages to all platforms at once
- **Real-time Response Streaming**: Watch AI responses stream in real-time with live updates
- **Smart Response Detection**: Advanced HTTP stream monitoring and DOM analysis for accurate response capture
- **Tab Management**: Automated opening and management of multiple AI platform tabs
- **Connection Monitoring**: Real-time status tracking for each platform with automatic reconnection
- **Response Cards**: Organized display of all AI responses with status indicators

### 🎯 Key Advantages
- **No Server Required**: Everything runs locally in your browser
- **Privacy Focused**: All data stays on your device, no external data collection
- **Time Efficient**: Get multiple AI perspectives with one query
- **Easy Comparison**: Side-by-side response comparison in organized cards
- **Export Capability**: Save conversation data as JSON for later analysis
- **Streaming Support**: Real-time response updates as AI platforms generate content
- **Automatic Retry**: Smart error handling and connection recovery

## Installation

1. Clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project folder
5. The extension icon should appear in your Chrome toolbar

## Usage

### Getting Started
1. **Open Extension**: Click the Meta Chat icon in Chrome toolbar
2. **Launch Main Window**: Click "Open Main Window" button to open the unified interface
3. **Open Platforms**: Click "Open All Platforms" to automatically create tabs for all AI services
4. **Login**: Manually login to each platform in their respective tabs (one-time setup per browser session)

### Sending Messages
1. **Enter Message**: Type your question in the input textarea at the bottom
2. **Send to All**: Click "Send to All" or press Ctrl+Enter to send simultaneously to all platforms
3. **Watch Real-time Responses**: Monitor as AI responses stream in real-time in separate cards
4. **View Complete Results**: Each platform's complete response appears in its dedicated card

### Managing Responses
- **Real-time Status**: Monitor connection status with color-coded indicators (green=connected, red=error, yellow=connecting)
- **Clear All**: Remove all current responses to start fresh
- **Export**: Download complete conversation data as JSON file for analysis
- **Refresh Connections**: Check and reconnect to platform tabs if needed
- **Streaming Updates**: Responses update in real-time as AI platforms generate content

### Response Features
- **Status Indicators**: Each response card shows current status (Sending, Receiving, Complete, Error)
- **Auto-scroll**: Response text automatically scrolls to show latest content during streaming
- **Platform Icons**: Visual indicators for each AI platform (🤖 DeepSeek, 💎 Yuanbao, 🚀 Kimi)

## Technical Architecture

### Advanced Tab-Based Architecture
Instead of iframes (which are blocked by most modern AI platforms), we use a sophisticated multi-layer approach:

- **Separate Platform Tabs**: Each AI platform opens in its own Chrome tab for full functionality
- **Intelligent Content Scripts**: Advanced automation scripts injected into each platform with platform-specific selectors
- **HTTP Stream Monitoring**: Background service monitors HTTP requests to detect response completion
- **Real-time Message Relay**: Background script coordinates bi-directional communication between tabs and main window
- **Unified Control Interface**: Main window provides centralized control and response aggregation
- **Streaming Response Handler**: Real-time response monitoring with DOM mutation observers and HTTP completion detection

### File Structure
```
meta-chat-poc/
├── manifest.json           # Extension configuration with permissions and content scripts
├── popup/                  # Extension popup interface (entry point)
│   ├── popup.html         # Popup UI with main window launcher
│   ├── popup.css          # Popup styling
│   └── popup.js           # Popup logic and main window creation
├── main/                   # Main application window (unified interface)
│   ├── main.html          # Main interface with response cards and controls
│   ├── main.css           # Main styling with responsive grid layout
│   └── main.js            # Main application logic with tab management and streaming
└── scripts/                # Content and background scripts
    ├── background.js       # Background service with HTTP monitoring and message relay
    ├── content-deepseek.js # DeepSeek platform adapter with streaming support
    ├── content-yuanbao.js  # Yuanbao platform adapter with contenteditable handling
    ├── content-kimi.js     # Kimi platform adapter with advanced selectors
    └── [debug tools]       # Additional debugging and analysis scripts
```

### Advanced Platform Adapters
Each platform has a sophisticated content script that implements:

#### Input Handling
- **Smart Element Detection**: Platform-specific selectors for input fields (textarea, contenteditable)
- **Event Simulation**: Comprehensive event triggering for different input types
- **Send Button Discovery**: Multiple fallback strategies for finding and triggering send buttons

#### Response Monitoring  
- **Real-time Streaming**: Monitors DOM changes for streaming response content
- **HTTP Completion Detection**: Coordinates with background script for response completion
- **Content Extraction**: Precise extraction of AI responses while filtering UI elements

#### Platform-Specific Features
- **DeepSeek**: Uses `#chat-input` textarea and `.ds-markdown` response containers
- **Yuanbao**: Handles `.ql-editor` contenteditable with comprehensive event simulation
- **Kimi**: Supports `.chat-input-editor` with multiple input field types and selectors

#### Error Handling
- **Connection Recovery**: Automatic retry logic for failed connections
- **Element Waiting**: Smart waiting for dynamic content loading
- **Fallback Strategies**: Multiple approaches for send button detection and input handling

## Troubleshooting

### Common Issues

1. **"Could not establish connection" Error**
   - **Cause**: Content scripts not loaded or tab closed
   - **Solution**: Click "Refresh Connections" or reopen platforms using "Open All Platforms"
   - **Debug**: Check if you're logged in to the platform and the page has fully loaded

2. **Platform Not Responding to Messages**
   - **Cause**: Platform UI changes, login required, or selector mismatch
   - **Solution**: Ensure you're logged in to each platform, refresh the platform tab
   - **Advanced**: Use the debug button to analyze current page selectors

3. **Streaming Responses Cut Off or Incomplete**
   - **Cause**: HTTP stream completion not properly detected
   - **Solution**: Wait for the full response to complete; the system has safety timeouts
   - **Note**: Large responses may take time to fully stream

4. **Send Button Not Working**
   - **Cause**: Platform UI update changed button selectors
   - **Solution**: Content scripts use multiple fallback strategies including Enter key
   - **Debug**: Open browser console to see which selectors are being tried

### Platform-Specific Notes

- **DeepSeek**: Uses `#chat-input` textarea with `.ds-markdown` response extraction
- **Yuanbao**: Requires `.ql-editor` contenteditable with complex event simulation
- **Kimi**: Supports `.chat-input-editor` with multiple fallback selectors
- **All Platforms**: Include HTTP stream monitoring for accurate response completion detection

## Development

### Adding New Platforms
1. **Create Content Script**: Copy `scripts/content-[existing].js` as template for `scripts/content-[newplatform].js`
2. **Update Manifest**: Add platform URL patterns and script reference to `manifest.json`
3. **Update Main Application**: Add platform to `platforms` array in `main/main.js`
4. **Add Platform Configuration**: Update URL mapping, icons, and display names
5. **Implement Platform-Specific Logic**: 
   - Input field selectors (textarea, contenteditable, etc.)
   - Send button detection strategies
   - Response container selectors
   - Platform-specific event handling

### Customizing Platform Selectors
Each content script uses multiple selector strategies for robustness:

```javascript
// Input field detection
const inputSelectors = [
    '#chat-input',              // Primary selector
    '.ql-editor',              // Contenteditable
    'textarea[placeholder*="input"]', // Fallback
    '.chat-input-editor'       // Alternative
];

// Send button detection
const sendSelectors = [
    'button[type="submit"]',
    '#send-button', 
    '.send-button',
    'button[aria-label*="Send"]'
];

// Response extraction
const responseSelectors = [
    '.ds-markdown.ds-markdown--block', // Platform-specific
    '[class*="assistant"]',           // Generic patterns
    '[class*="response"]'
];
```

### Debug Tools
The extension includes several debugging utilities:
- **Debug Selectors Button**: Analyze current page DOM structure and available selectors
- **Browser Console Logging**: Detailed logs of selector attempts and response detection
- **HTTP Stream Monitoring**: Background script logs for request/response tracking

## Security & Privacy

- **Local Processing**: All operations are performed locally in your browser
- **No Data Collection**: No user data is sent to external servers beyond the original AI platforms
- **Minimal Permissions**: Only uses necessary Chrome extension permissions (tabs, scripting, webRequest)
- **Open Source**: Full source code available for inspection and modification
- **No Network Bypass**: Extension respects each platform's existing authentication and security
- **Data Isolation**: Each platform tab operates independently with no cross-contamination

## Limitations

- **Manual Login Required**: Users must log in to each platform manually (session-based)
- **Platform UI Dependencies**: Functionality depends on platform UI stability; major UI changes may require selector updates
- **Chrome Only**: Currently supports Chrome browser only (Manifest V3)
- **Rate Limits**: Subject to individual platform rate limits and usage policies
- **Streaming Accuracy**: Complex responses with mixed content may require fine-tuning of extraction logic
- **No Conversation History**: Currently focuses on single message exchanges; no persistent conversation storage

## Future Enhancements

- [ ] **Additional AI Platforms**: Support for Claude, ChatGPT, Bard, and other major AI platforms
- [ ] **Enhanced Response Formatting**: Markdown rendering, syntax highlighting, and rich text display
- [ ] **Conversation History**: Persistent storage and management of conversation sessions
- [ ] **Advanced Analytics**: Response comparison tools, sentiment analysis, and quality metrics
- [ ] **Custom Configuration**: User-configurable platform selectors and response extraction rules
- [ ] **Bulk Operations**: Send different messages to different platforms simultaneously
- [ ] **Response Templates**: Save and reuse common message templates
- [ ] **Export Formats**: Additional export options (PDF, HTML, CSV) beyond JSON
- [ ] **Notification System**: Desktop notifications for response completion
- [ ] **Performance Optimization**: Faster response detection and reduced resource usage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with multiple platforms
5. Submit a pull request

## License

This project is open source and available under the MIT License.
