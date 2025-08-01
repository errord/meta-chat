class MetaChat {
    constructor() {
        this.platforms = ['deepseek', 'yuanbao', 'kimi'];
        this.platformTabs = {};
        this.responses = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupMessageListener();
        this.updateConnectionStatus();
        console.log('MetaChat initialized');
    }

    setupEventListeners() {
        // Platform tab buttons
        document.querySelectorAll('.tab-btn[data-platform]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const platform = e.currentTarget.dataset.platform;
                this.openPlatformTab(platform);
            });
        });

        // Open all platforms
        document.getElementById('openAllTabs').addEventListener('click', () => {
            this.openAllPlatforms();
        });

        // Refresh connections
        document.getElementById('refreshTabs').addEventListener('click', () => {
            this.refreshConnections();
        });

        // Send message
        document.getElementById('sendToAll').addEventListener('click', () => {
            this.sendToAllPlatforms();
        });

        // Clear input
        document.getElementById('clearInput').addEventListener('click', () => {
            document.getElementById('messageInput').value = '';
        });

        // Clear responses
        document.getElementById('clearResponses').addEventListener('click', () => {
            this.clearAllResponses();
        });

        // Export responses
        document.getElementById('exportResponses').addEventListener('click', () => {
            this.exportResponses();
        });

        // Debug button (development only)
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'Debug Selectors';
        debugBtn.className = 'debug-btn';
        debugBtn.addEventListener('click', () => {
            this.debugPlatformSelectors();
        });
        document.querySelector('.response-controls').appendChild(debugBtn);

        // Auto-send on Enter (Ctrl+Enter)
        document.getElementById('messageInput').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.sendToAllPlatforms();
            }
        });
    }

    setupMessageListener() {
        // Listen for messages from content scripts
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Message received in main window:', request);
            
            if (request.action === 'responseReceived') {
                console.log(`Response received from ${request.platform}:`, request.response.substring(0, 100));
                this.handleResponse(request.platform, request.response);
            } else if (request.action === 'streamingUpdate') {
                console.log(`Streaming update from ${request.platform}:`, request.content.substring(0, 50));
                this.handleStreamingUpdate(request.platform, request.content, request.isComplete);
            } else if (request.action === 'streamingComplete') {
                console.log(`Streaming complete from ${request.platform}`);
                this.handleStreamingComplete(request.platform);
            } else if (request.action === 'platformStatus') {
                this.updatePlatformStatus(request.platform, request.status);
            } else if (request.action === 'contentScriptReady') {
                console.log(`Content script ready notification from ${request.platform} at ${request.url}`);
                this.updateTabStatus(request.platform, 'connected');
            }
        });
    }

    async openPlatformTab(platform) {
        // Check if tab already exists and is still alive
        if (this.platformTabs[platform]) {
            try {
                await chrome.tabs.get(this.platformTabs[platform]);
                console.log(`${platform} tab already exists:`, this.platformTabs[platform]);
                this.updateTabStatus(platform, 'connected');
                return this.platformTabs[platform];
            } catch (error) {
                // Tab doesn't exist anymore, remove from tracking
                delete this.platformTabs[platform];
            }
        }

        const urls = {
            deepseek: 'https://chat.deepseek.com',
            yuanbao: 'https://yuanbao.tencent.com',
            kimi: 'https://www.kimi.com'
        };

        try {
            const tab = await chrome.tabs.create({
                url: urls[platform],
                active: false
            });
            
            this.platformTabs[platform] = tab.id;
            this.updateTabStatus(platform, 'connecting');
            
            console.log(`${platform} tab opened:`, tab.id);
            
            // Wait for content script to load
            await this.waitForContentScript(platform, tab.id);
            
            return tab.id;
        } catch (error) {
            console.error(`Error opening ${platform} tab:`, error);
            this.updateTabStatus(platform, 'error');
            throw error;
        }
    }

    async openAllPlatforms() {
        const openBtn = document.getElementById('openAllTabs');
        openBtn.disabled = true;
        openBtn.textContent = 'Opening...';

        for (const platform of this.platforms) {
            await this.openPlatformTab(platform);
            // Small delay between opening tabs
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        openBtn.disabled = false;
        openBtn.textContent = 'Refresh All';
    }

    async refreshConnections() {
        // Check which tabs are still alive
        for (const [platform, tabId] of Object.entries(this.platformTabs)) {
            try {
                await chrome.tabs.get(tabId);
                this.updateTabStatus(platform, 'connected');
            } catch (error) {
                // Tab no longer exists
                delete this.platformTabs[platform];
                this.updateTabStatus(platform, 'error');
            }
        }
    }

    updateTabStatus(platform, status) {
        const tabBtn = document.getElementById(`${platform}-tab`);
        const statusIndicator = document.getElementById(`${platform}-status`);
        
        // Remove all status classes
        tabBtn.classList.remove('connected', 'error', 'connecting');
        statusIndicator.classList.remove('connected', 'error', 'connecting');
        
        // Add new status
        if (status === 'connected') {
            tabBtn.classList.add('connected');
            statusIndicator.classList.add('connected');
        } else if (status === 'error') {
            tabBtn.classList.add('error');
            statusIndicator.classList.add('error');
        } else if (status === 'connecting') {
            tabBtn.classList.add('connecting');
            statusIndicator.classList.add('connecting');
        }
    }

    async waitForContentScript(platform, tabId, maxWaitTime = 15000) {
        const startTime = Date.now();
        console.log(`Waiting for content script to load for ${platform}...`);
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                // Check if tab is still loading
                const tab = await chrome.tabs.get(tabId);
                console.log(`Tab ${platform} status: ${tab.status}, URL: ${tab.url}`);
                
                if (tab.status === 'loading') {
                    console.log(`Tab ${platform} still loading, waiting...`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                // Try to ping content script
                const response = await this.sendMessageWithTimeout(tabId, { action: 'ping' }, 3000);
                console.log(`Content script ready for ${platform}:`, response);
                this.updateTabStatus(platform, 'connected');
                return true;
            } catch (error) {
                console.log(`Ping failed for ${platform}:`, error.message);
                // Content script not ready yet, wait a bit
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.error(`Content script not ready for ${platform} after ${maxWaitTime}ms`);
        
        // Try manual injection as fallback
        try {
            console.log(`Attempting manual script injection for ${platform}...`);
            const scriptFiles = {
                deepseek: 'scripts/content-deepseek.js',
                yuanbao: 'scripts/content-yuanbao.js', 
                kimi: 'scripts/content-kimi.js'
            };
            
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: [scriptFiles[platform]]
            });
            
            // Wait a bit and try ping again
            await new Promise(resolve => setTimeout(resolve, 2000));
            await this.sendMessageWithTimeout(tabId, { action: 'ping' }, 3000);
            
            console.log(`Manual injection successful for ${platform}`);
            this.updateTabStatus(platform, 'connected');
            return true;
        } catch (injectionError) {
            console.error(`Manual injection failed for ${platform}:`, injectionError);
            this.updateTabStatus(platform, 'error');
            throw new Error(`Content script failed to load for ${platform}`);
        }
    }

    async sendMessageWithTimeout(tabId, message, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Message timeout'));
            }, timeout);

            chrome.tabs.sendMessage(tabId, message, (response) => {
                clearTimeout(timeoutId);
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    async sendToAllPlatforms() {
        const message = document.getElementById('messageInput').value.trim();
        if (!message) {
            alert('Please enter a message');
            return;
        }

        const sendBtn = document.getElementById('sendToAll');
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';

        // Clear previous responses
        this.responses = {};
        this.clearAllResponses();

        // Send to each platform
        for (const platform of this.platforms) {
            try {
                this.updateResponseStatus(platform, 'loading');
                await this.sendToPlatform(platform, message);
            } catch (error) {
                console.error(`Error sending to ${platform}:`, error);
                this.updateResponseStatus(platform, 'error');
                
                // Show error in response card
                const responseCard = document.getElementById(`${platform}-response`);
                const responseText = responseCard.querySelector('.response-text');
                if (responseText) {
                    responseText.textContent = `Error: ${error.message}`;
                }
            }
        }

        sendBtn.disabled = false;
        sendBtn.textContent = 'Send to All';

        // Clear input if auto-clear is enabled
        if (document.getElementById('autoSend').checked) {
            // Don't clear immediately, wait for responses
        }
    }

    async sendToPlatform(platform, message) {
        let tabId = this.platformTabs[platform];
        
        // If no tab exists, open one first
        if (!tabId) {
            console.log(`Opening new tab for ${platform}`);
            tabId = await this.openPlatformTab(platform);
        }

        try {
            // Check if tab still exists
            await chrome.tabs.get(tabId);
            
            // Send message to content script with timeout
            await this.sendMessageWithTimeout(tabId, {
                action: 'sendMessage',
                message: message,
                platform: platform
            }, 10000);
            
            console.log(`Message sent to ${platform}`);
        } catch (error) {
            console.error(`Error sending message to ${platform}:`, error);
            
            if (error.message.includes('Could not establish connection')) {
                // Content script not ready, wait and retry once
                console.log(`Content script not ready for ${platform}, waiting...`);
                this.updateTabStatus(platform, 'connecting');
                
                try {
                    await this.waitForContentScript(platform, tabId);
                    await this.sendMessageWithTimeout(tabId, {
                        action: 'sendMessage',
                        message: message,
                        platform: platform
                    }, 10000);
                    console.log(`Retry successful for ${platform}`);
                } catch (retryError) {
                    console.error(`Retry failed for ${platform}:`, retryError);
                    this.updateTabStatus(platform, 'error');
                    throw retryError;
                }
            } else {
                // Tab might be closed, remove from tracking
                delete this.platformTabs[platform];
                this.updateTabStatus(platform, 'error');
                throw error;
            }
        }
    }

    handleResponse(platform, response) {
        this.responses[platform] = response;
        this.updateResponseDisplay(platform, response);
        this.updateResponseStatus(platform, 'received');
    }

    handleStreamingUpdate(platform, content, isComplete) {
        // Initialize streaming response if not exists
        if (!this.streamingResponses) {
            this.streamingResponses = {};
        }
        
        if (!this.streamingResponses[platform]) {
            this.streamingResponses[platform] = '';
        }
        
        // Append new content
        this.streamingResponses[platform] += content;
        
        // Update display with current streaming content
        this.updateResponseDisplay(platform, this.streamingResponses[platform]);
        this.updateResponseStatus(platform, 'streaming');
        
        console.log(`Streaming ${platform}: ${this.streamingResponses[platform].length} chars total`);
    }

    handleStreamingComplete(platform) {
        if (this.streamingResponses && this.streamingResponses[platform]) {
            // Final update with complete response
            this.updateResponseDisplay(platform, this.streamingResponses[platform]);
            this.updateResponseStatus(platform, 'received');
            
            console.log(`Streaming complete ${platform}: ${this.streamingResponses[platform].length} chars`);
        }
    }

    updateResponseDisplay(platform, response) {
        const responseCard = document.getElementById(`${platform}-response`);
        const responseText = responseCard.querySelector('.response-text');
        const responseStatus = responseCard.querySelector('.response-status');
        
        if (responseText) {
            responseText.textContent = response || 'No response received';
            
            // Auto-scroll to bottom to follow the latest text
            responseText.scrollTop = responseText.scrollHeight;
        }
        
        if (responseStatus) {
            responseStatus.textContent = 'Response Received';
            responseStatus.className = 'response-status received';
        }
    }

    updateResponseStatus(platform, status) {
        const responseCard = document.getElementById(`${platform}-response`);
        const responseStatus = responseCard.querySelector('.response-status');
        
        if (responseStatus) {
            responseStatus.className = `response-status ${status}`;
            
            switch (status) {
                case 'sending':
                    responseStatus.textContent = 'Sending...';
                    break;
                case 'waiting':
                    responseStatus.textContent = 'Waiting for response...';
                    break;
                case 'streaming':
                    responseStatus.textContent = 'Receiving response...';
                    break;
                case 'received':
                    responseStatus.textContent = 'Response received';
                    break;
                case 'error':
                    responseStatus.textContent = 'Error occurred';
                    break;
                default:
                    responseStatus.textContent = 'Ready';
            }
        }
    }

    clearAllResponses() {
        this.responses = {};
        this.platforms.forEach(platform => {
            const responseCard = document.getElementById(`${platform}-response`);
            const responseText = responseCard.querySelector('.response-text');
            const responseStatus = responseCard.querySelector('.response-status');
            
            if (responseText) {
                responseText.textContent = 'Ready for new message...';
            }
            
            if (responseStatus) {
                responseStatus.textContent = 'Ready';
                responseStatus.className = 'response-status';
            }
        });
    }

    exportResponses() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const data = {
            timestamp: new Date().toISOString(),
            query: document.getElementById('messageInput').value,
            responses: this.responses
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `meta-chat-responses-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    updatePlatformStatus(platform, status) {
        const statusElement = document.getElementById(`status-${platform}`);
        if (!statusElement) return;
        
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('span:last-child');

        // Remove all status classes
        if (dot) dot.classList.remove('loading', 'error');

        switch (status) {
            case 'ready':
                if (text) text.textContent = `${this.getPlatformName(platform)}: Ready`;
                break;
            case 'sending':
                if (dot) dot.classList.add('loading');
                if (text) text.textContent = `${this.getPlatformName(platform)}: Sending...`;
                break;
            case 'received':
                if (text) text.textContent = `${this.getPlatformName(platform)}: Response received`;
                break;
            case 'error':
                if (dot) dot.classList.add('error');
                if (text) text.textContent = `${this.getPlatformName(platform)}: Error`;
                break;
        }
    }

    getPlatformName(platform) {
        const names = {
            deepseek: 'DeepSeek',
            yuanbao: 'Yuanbao',
            kimi: 'Kimi'
        };
        return names[platform] || platform;
    }

    updateConnectionStatus() {
        const statusElement = document.getElementById('connectionStatus');
        statusElement.textContent = 'Connected - Ready to chat';
    }

    async debugPlatformSelectors() {
        console.log('=== Platform Selector Debug ===');
        
        for (const [platform, tabId] of Object.entries(this.platformTabs)) {
            if (!tabId) continue;
            
            try {
                console.log(`\n--- Debugging ${platform} ---`);
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        // Debug function to run in the platform tab
                        console.log('Current URL:', window.location.href);
                        
                        // Find inputs
                        const inputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
                        console.log(`Found ${inputs.length} input elements:`);
                        inputs.forEach((el, i) => {
                            console.log(`Input ${i + 1}:`, {
                                tag: el.tagName,
                                placeholder: el.placeholder,
                                id: el.id,
                                className: el.className,
                                visible: el.offsetParent !== null
                            });
                        });
                        
                        // Find send buttons
                        const buttons = document.querySelectorAll('button, [role="button"]');
                        const sendButtons = Array.from(buttons).filter(btn => {
                            const text = btn.textContent.toLowerCase();
                            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
                            return text.includes('send') || text.includes('发送') || 
                                   ariaLabel.includes('send') || ariaLabel.includes('发送');
                        });
                        console.log(`Found ${sendButtons.length} potential send buttons:`);
                        sendButtons.forEach((btn, i) => {
                            console.log(`Button ${i + 1}:`, {
                                text: btn.textContent.trim(),
                                ariaLabel: btn.getAttribute('aria-label'),
                                className: btn.className,
                                disabled: btn.disabled,
                                visible: btn.offsetParent !== null
                            });
                        });
                    }
                });
            } catch (error) {
                console.error(`Debug failed for ${platform}:`, error);
            }
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MetaChat();
});