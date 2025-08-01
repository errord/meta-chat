chrome.runtime.onInstalled.addListener(() => {
    console.log('Meta Chat Extension installed');
});

// HTTP Request Monitor for detecting AI response completion
class HTTPStreamMonitor {
    constructor() {
        this.activeStreams = new Map();
        this.setupWebRequestListeners();
    }
    
    setupWebRequestListeners() {
        // Monitor chat API requests
        chrome.webRequest.onBeforeRequest.addListener(
            (details) => {
                if (this.isChatAPI(details.url)) {
                    console.log('Chat stream started:', details.requestId, details.url);
                    this.activeStreams.set(details.requestId, {
                        url: details.url,
                        startTime: Date.now(),
                        platform: this.detectPlatform(details.url),
                        tabId: details.tabId
                    });
                }
            },
            { urls: ["<all_urls>"] },
            ["requestBody"]
        );
        
        // Monitor when requests complete
        chrome.webRequest.onCompleted.addListener(
            (details) => {
                if (this.activeStreams.has(details.requestId)) {
                    const stream = this.activeStreams.get(details.requestId);
                    console.log('Chat stream completed:', stream.platform, details.requestId);
                    
                    // Notify content script that stream is complete
                    chrome.tabs.sendMessage(details.tabId, {
                        action: 'httpStreamCompleted',
                        platform: stream.platform,
                        requestId: details.requestId
                    }).catch(() => {
                        console.log('Failed to notify tab, tab may be closed');
                    });
                    
                    this.activeStreams.delete(details.requestId);
                }
            },
            { urls: ["<all_urls>"] }
        );
        
        // Monitor when requests fail
        chrome.webRequest.onErrorOccurred.addListener(
            (details) => {
                if (this.activeStreams.has(details.requestId)) {
                    console.log('Chat stream failed:', details.requestId);
                    this.activeStreams.delete(details.requestId);
                }
            },
            { urls: ["<all_urls>"] }
        );
    }
    
    isChatAPI(url) {
        const chatPatterns = [
            '/api/chat',
            '/stream',
            '/v1/chat/completions',
            '/conversation',
            '/api/v1/chat',
            '/chat/completions',
            '/api/inference'
        ];
        return chatPatterns.some(pattern => url.includes(pattern));
    }
    
    detectPlatform(url) {
        if (url.includes('deepseek.com')) return 'deepseek';
        if (url.includes('tencent.com')) return 'yuanbao';
        if (url.includes('kimi.com') || url.includes('moonshot.cn')) return 'kimi';
        return 'unknown';
    }
}

// Initialize HTTP monitor
const httpMonitor = new HTTPStreamMonitor();

// Handle messages between content scripts and main window
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    if (request.action === 'responseReceived') {
        console.log(`Background forwarding response from ${request.platform}`);
        // Forward response to all extension contexts (including main window)
        chrome.runtime.sendMessage(request).catch(err => {
            console.log('No receivers for message, this is normal if popup is closed');
        });
    } else if (request.action === 'platformStatus') {
        // Forward status update to main window
        chrome.runtime.sendMessage(request).catch(err => {
            console.log('No receivers for status message');
        });
    } else if (request.action === 'contentScriptReady') {
        console.log(`Content script ready: ${request.platform}`);
        chrome.runtime.sendMessage(request).catch(err => {
            console.log('No receivers for ready message');
        });
    }
});

// Handle tab updates for iframe monitoring
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // Check if this is one of our target chat platforms
        const platforms = [
            'chat.deepseek.com',
            'yuanbao.tencent.com',
            'kimi.moonshot.cn'
        ];
        
        const isTargetPlatform = platforms.some(platform => 
            tab.url && tab.url.includes(platform)
        );
        
        if (isTargetPlatform) {
            console.log(`Target platform loaded: ${tab.url}`);
        }
    }
});