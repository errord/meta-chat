// Kimi Chat Content Script
class KimiChatHandler {
    constructor() {
        this.platform = 'kimi';
        this.lastResponseText = '';
        this.streamingTimeout = null; // For handling streaming responses
        this.init();
    }

    init() {
        console.log('Kimi content script loaded on:', window.location.href);
        this.setupMessageListener();
        this.observeResponses();
        
        // Notify that script is ready
        chrome.runtime.sendMessage({
            action: 'contentScriptReady',
            platform: this.platform,
            url: window.location.href
        }).catch(() => {
            // Ignore errors if popup is not open
        });
    }

    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'ping') {
                sendResponse({ success: true, platform: this.platform });
            } else if (request.action === 'sendMessage' && request.platform === this.platform) {
                this.sendMessage(request.message);
                sendResponse({ success: true });
            } else if (request.action === 'httpStreamCompleted' && request.platform === this.platform) {
                console.log('Kimi: HTTP stream completed, capturing final response...');
                this.onHttpStreamCompleted();
            }
        });
    }

    onHttpStreamCompleted() {
        console.log('Kimi: HTTP stream completed, marking for completion check...');
        this.httpStreamCompleted = true;
        
        if (this.isMonitoring) {
            setTimeout(() => {
                if (this.isMonitoring) {
                    console.log('Kimi: HTTP completed + timeout, forcing completion...');
                    this.stopStreamingMonitor(true);
                }
            }, 3000);
        }
    }

    sendMessage(message) {
        try {
            // Wait for page to be ready - Kimi uses .chat-input-editor
            this.waitForElement('.chat-input-editor', 10000).then(input => {
                if (input) {
                    // Clear existing text and input new message
                    input.innerHTML = '';
                    input.textContent = '';
                    input.focus();
                    
                    // For contenteditable div, set text content
                    input.textContent = message;
                    
                    // Simulate input events for contenteditable
                    this.simulateContentEditableInput(input, message);
                    
                    // Find and click send button
                    setTimeout(() => {
                        this.startStreamingMonitor();
                        this.clickSendButton();
                    }, 500);
                } else {
                    console.error('Kimi: Chat input editor not found');
                }
            });
        } catch (error) {
            console.error('Kimi: Error sending message:', error);
        }
    }

    simulateTyping(element, text) {
        element.value = text;
        
        // Trigger input events
        const events = ['input', 'change', 'keyup', 'keydown'];
        events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            element.dispatchEvent(event);
        });
    }

    simulateContentEditableInput(element, text) {
        // For contenteditable elements like Kimi's chat-input-editor
        element.textContent = text;
        
        // Trigger comprehensive events for contenteditable
        const events = [
            'focus',
            'input', 
            'textInput',
            'keydown',
            'keyup', 
            'change',
            'blur'
        ];
        
        events.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            element.dispatchEvent(event);
        });

        // Also try InputEvent for modern browsers
        try {
            const inputEvent = new InputEvent('input', {
                bubbles: true,
                inputType: 'insertText',
                data: text
            });
            element.dispatchEvent(inputEvent);
        } catch (e) {
            // Fallback for older browsers
            console.log('InputEvent not supported, using fallback');
        }
    }

    clickSendButton() {
        // Common selectors for Kimi send button
        const selectors = [
            'button[type="submit"]',
            'button[data-testid="send-button"]',
            'button[aria-label*="发送"]',
            'button[aria-label*="Send"]',
            '.send-button',
            '.submit-button',
            'button.send',
            'button[class*="send"]',
            'div[role="button"][class*="send"]',
            '[data-testid="chat-input-send"]'
        ];

        for (const selector of selectors) {
            let button;
            if (selector.includes(':contains')) {
                // Handle :contains pseudo-selector
                const text = selector.match(/:contains\("([^"]+)"\)/)[1];
                button = Array.from(document.querySelectorAll('button')).find(btn => 
                    btn.textContent.includes(text)
                );
            } else {
                button = document.querySelector(selector);
            }

            if (button && !button.disabled) {
                button.click();
                console.log('Kimi: Send button clicked');
                return;
            }
        }

        // If no button found, try Enter key on input
        const input = document.querySelector('textarea, .input-area');
        if (input) {
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
            });
            input.dispatchEvent(enterEvent);
            console.log('Kimi: Enter key pressed');
        }
    }

    observeResponses() {
        // Observe for new messages/responses
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.checkForNewResponse(node);
                        }
                    });
                }
            });
        });

        // Start observing
        const targetNode = document.body;
        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });
    }

    startStreamingMonitor() {
        console.log('Kimi: Starting streaming response monitor...');
        this.isMonitoring = true;
        this.capturedText = '';
        this.hasReceivedContent = false;
        this.httpStreamCompleted = false;
        this.lastUpdateTime = Date.now();
        
        this.streamingInterval = setInterval(() => {
            this.checkForStreamingUpdates();
        }, 300);
        
        setTimeout(() => {
            console.log('Kimi: Safety timeout reached, stopping monitor...');
            this.stopStreamingMonitor(true);
        }, 600000);
    }

    extractChatResponseOnly() {
        // Extract latest AI response from Kimi
        const responseContainers = document.querySelectorAll('[class*="assistant"], [class*="ai-"], [class*="bot-"], [class*="response"]');
        
        if (responseContainers.length > 0) {
            const latestResponse = responseContainers[responseContainers.length - 1];
            return latestResponse.textContent || latestResponse.innerText;
        }
        
        // Kimi-specific fallback
        const chatContainers = document.querySelectorAll('[class*="message"], [class*="chat"]');
        for (let i = chatContainers.length - 1; i >= 0; i--) {
            const container = chatContainers[i];
            const text = container.textContent || container.innerText;
            if (text && text.length > 50 && !text.includes('发送') && !text.includes('输入') && !text.includes('kimi')) {
                return text;
            }
        }
        
        return '';
    }

    checkForStreamingUpdates() {
        if (!this.isMonitoring) return;
        
        const currentText = this.extractChatResponseOnly();
        
        if (currentText.length > this.capturedText.length) {
            const newContent = currentText.substring(this.capturedText.length);
            
            if (newContent.trim().length > 0) {
                console.log('Kimi: Streaming update:', newContent.substring(0, 50));
                
                chrome.runtime.sendMessage({
                    action: 'streamingUpdate',
                    platform: this.platform,
                    content: newContent,
                    isComplete: false
                });
                
                this.capturedText = currentText;
                this.lastUpdateTime = Date.now();
                this.hasReceivedContent = true;
            }
        }
        
        const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
        if (this.hasReceivedContent && timeSinceLastUpdate > 10000) {
            console.log('Kimi: Long pause detected, checking for completion...');
            this.checkCompletionIndicators();
        }
    }

    checkCompletionIndicators() {
        const completionIndicators = [
            'button:not([disabled])',
            '[class*="action"]',
            '[class*="footer"]'
        ];
        
        let hasCompletionIndicator = false;
        for (const selector of completionIndicators) {
            if (document.querySelector(selector)) {
                console.log('Kimi: Found completion indicator:', selector);
                hasCompletionIndicator = true;
                break;
            }
        }
        
        if (hasCompletionIndicator || this.httpStreamCompleted) {
            console.log('Kimi: Response appears complete, stopping monitor...');
            this.stopStreamingMonitor(true);
        } else {
            this.lastUpdateTime = Date.now();
            console.log('Kimi: No completion indicators found, continuing to monitor...');
        }
    }

    stopStreamingMonitor(isComplete = false) {
        if (!this.isMonitoring) return;
        
        console.log('Kimi: Stopping streaming monitor, complete:', isComplete);
        this.isMonitoring = false;
        
        if (this.streamingInterval) {
            clearInterval(this.streamingInterval);
            this.streamingInterval = null;
        }
        
        if (isComplete) {
            const finalText = this.extractChatResponseOnly();
            if (finalText && finalText.length > 20) {
                console.log('Kimi: Sending final complete response:', finalText.substring(0, 100));
                console.log('Kimi: Final response length:', finalText.length);
                
                chrome.runtime.sendMessage({
                    action: 'responseReceived',
                    platform: this.platform,
                    response: finalText
                });
            }
            
            chrome.runtime.sendMessage({
                action: 'streamingComplete',
                platform: this.platform
            });
        }
    }

    checkForNewResponse(element) {
        // This method is now replaced by the streaming monitor approach
    }

    isOldResponse(text) {
        return this.lastResponseText && this.lastResponseText.includes(text.substring(0, 50));
    }

    sendResponseToMain(response) {
        chrome.runtime.sendMessage({
            action: 'responseReceived',
            platform: this.platform,
            response: response
        });
    }

    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new KimiChatHandler();
    });
} else {
    new KimiChatHandler();
}