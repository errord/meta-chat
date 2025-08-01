// Tencent Yuanbao Chat Content Script
class YuanbaoChatHandler {
    constructor() {
        this.platform = 'yuanbao';
        this.lastResponseText = '';
        this.streamingTimeout = null; // For handling streaming responses
        this.init();
    }

    init() {
        console.log('Yuanbao content script loaded on:', window.location.href);
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
                console.log('Yuanbao: HTTP stream completed, capturing final response...');
                this.onHttpStreamCompleted();
            }
        });
    }

    onHttpStreamCompleted() {
        console.log('Yuanbao: HTTP stream completed, marking for completion check...');
        this.httpStreamCompleted = true;
        
        if (this.isMonitoring) {
            setTimeout(() => {
                if (this.isMonitoring) {
                    console.log('Yuanbao: HTTP completed + timeout, forcing completion...');
                    this.stopStreamingMonitor(true);
                }
            }, 3000);
        }
    }

    sendMessage(message) {
        try {
            // Wait for page to be ready - Yuanbao uses contenteditable div
            this.waitForElement('.ql-editor', 10000).then(input => {
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
                    console.error('Yuanbao: Content editable input not found');
                }
            });
        } catch (error) {
            console.error('Yuanbao: Error sending message:', error);
        }
    }

    simulateTyping(element, text) {
        element.value = text;
        
        // Trigger input events
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        
        element.dispatchEvent(inputEvent);
        element.dispatchEvent(changeEvent);

        // For React-based apps, also trigger additional events
        const reactEvents = ['focus', 'keydown', 'keyup'];
        reactEvents.forEach(eventType => {
            const event = new Event(eventType, { bubbles: true });
            element.dispatchEvent(event);
        });
    }

    simulateContentEditableInput(element, text) {
        // For contenteditable elements like Yuanbao's ql-editor
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
        console.log('Yuanbao: Looking for send button...');
        
        // Strategy 1: Use the exact send button selector found
        const exactSelectors = [
            '#yuanbao-send-btn',                    // Exact ID
            'a#yuanbao-send-btn',                   // More specific
            'a.style__send-btn___ZsLmU',           // Class-based selector
            'a[class*="send-btn"]',                // Partial class match
            '.icon-send',                          // Icon class
            'span.icon-send',                      // Icon span
            '.hyc-common-icon.icon-send'           // Full icon selector
        ];

        for (const selector of exactSelectors) {
            const button = document.querySelector(selector);
            if (button && button.offsetParent !== null) {
                console.log('Yuanbao: Found send button with selector:', selector);
                button.click();
                return;
            }
        }

        // Strategy 2: Look for buttons with send icon
        const iconButtons = document.querySelectorAll('a, button, [role="button"]');
        for (const button of iconButtons) {
            const iconSpan = button.querySelector('.icon-send, .iconfont[class*="send"]');
            if (iconSpan && button.offsetParent !== null) {
                console.log('Yuanbao: Found send button with icon:', button);
                button.click();
                return;
            }
        }

        // Strategy 3: Look for any button near the input
        const inputEditor = document.querySelector('.ql-editor');
        if (inputEditor) {
            const inputRect = inputEditor.getBoundingClientRect();
            
            // Find all clickable elements
            const allElements = document.querySelectorAll('a, button, [role="button"], [onclick]');
            
            for (const element of allElements) {
                if (element.offsetParent === null) continue; // Skip hidden
                
                const rect = element.getBoundingClientRect();
                if (rect.width < 5 || rect.height < 5) continue; // Skip tiny elements
                
                // Calculate distance from input
                const distance = Math.sqrt(
                    Math.pow(rect.left - inputRect.right, 2) + 
                    Math.pow(rect.top - inputRect.top, 2)
                );
                
                // If element is close to input (within 100px)
                if (distance < 100) {
                    const style = window.getComputedStyle(element);
                    
                    // Check if it's likely a send button
                    if (style.cursor === 'pointer' || 
                        element.onclick || 
                        element.tagName === 'BUTTON' ||
                        element.tagName === 'A' ||
                        element.getAttribute('role') === 'button') {
                        
                        console.log('Yuanbao: Trying nearby clickable element:', element);
                        element.click();
                        return;
                    }
                }
            }
            
            // Strategy 4: Try Enter key on input editor
            console.log('Yuanbao: Trying Enter key on input editor');
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                ctrlKey: false,
                shiftKey: false
            });
            inputEditor.dispatchEvent(enterEvent);
            return;
        }
        
        console.log('Yuanbao: No send mechanism found');
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
        console.log('Yuanbao: Starting streaming response monitor...');
        this.isMonitoring = true;
        this.capturedText = '';
        this.hasReceivedContent = false;
        this.httpStreamCompleted = false;
        this.lastUpdateTime = Date.now();
        
        this.streamingInterval = setInterval(() => {
            this.checkForStreamingUpdates();
        }, 300);
        
        setTimeout(() => {
            console.log('Yuanbao: Safety timeout reached, stopping monitor...');
            this.stopStreamingMonitor(true);
        }, 600000);
    }

    extractChatResponseOnly() {
        // Extract latest AI response from Yuanbao
        const responseContainers = document.querySelectorAll('[class*="assistant"], [class*="ai-"], [class*="bot-"], [class*="response"]');
        
        if (responseContainers.length > 0) {
            const latestResponse = responseContainers[responseContainers.length - 1];
            return latestResponse.textContent || latestResponse.innerText;
        }
        
        // Fallback: look in common chat containers
        const chatContainers = document.querySelectorAll('.chat-message, .message, [role="article"]');
        for (let i = chatContainers.length - 1; i >= 0; i--) {
            const container = chatContainers[i];
            const text = container.textContent || container.innerText;
            if (text && text.length > 50 && !text.includes('发送') && !text.includes('输入')) {
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
                console.log('Yuanbao: Streaming update:', newContent.substring(0, 50));
                
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
            console.log('Yuanbao: Long pause detected, checking for completion...');
            this.checkCompletionIndicators();
        }
    }

    checkCompletionIndicators() {
        const completionIndicators = [
            '.send-button:not([disabled])',
            '[class*="action"]',
            '[class*="footer"]'
        ];
        
        let hasCompletionIndicator = false;
        for (const selector of completionIndicators) {
            if (document.querySelector(selector)) {
                console.log('Yuanbao: Found completion indicator:', selector);
                hasCompletionIndicator = true;
                break;
            }
        }
        
        if (hasCompletionIndicator || this.httpStreamCompleted) {
            console.log('Yuanbao: Response appears complete, stopping monitor...');
            this.stopStreamingMonitor(true);
        } else {
            this.lastUpdateTime = Date.now();
            console.log('Yuanbao: No completion indicators found, continuing to monitor...');
        }
    }

    stopStreamingMonitor(isComplete = false) {
        if (!this.isMonitoring) return;
        
        console.log('Yuanbao: Stopping streaming monitor, complete:', isComplete);
        this.isMonitoring = false;
        
        if (this.streamingInterval) {
            clearInterval(this.streamingInterval);
            this.streamingInterval = null;
        }
        
        if (isComplete) {
            const finalText = this.extractChatResponseOnly();
            if (finalText && finalText.length > 20) {
                console.log('Yuanbao: Sending final complete response:', finalText.substring(0, 100));
                console.log('Yuanbao: Final response length:', finalText.length);
                
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
        new YuanbaoChatHandler();
    });
} else {
    new YuanbaoChatHandler();
}