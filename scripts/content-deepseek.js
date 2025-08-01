// DeepSeek Chat Content Script
class DeepSeekChatHandler {
    constructor() {
        this.platform = 'deepseek';
        this.lastResponseText = '';
        this.streamingTimeout = null; // For handling streaming responses
        this.init();
    }

    init() {
        console.log('DeepSeek content script loaded on:', window.location.href);
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
                // HTTP stream completed, capture final response
                console.log('DeepSeek: HTTP stream completed, capturing final response...');
                this.onHttpStreamCompleted();
            }
        });
    }

    onHttpStreamCompleted() {
        // HTTP tells us the stream is done - mark this but don't stop immediately
        console.log('DeepSeek: HTTP stream completed, marking for completion check...');
        this.httpStreamCompleted = true;
        
        // Don't stop immediately - let DOM monitoring continue for a bit
        // This ensures we capture any final content that might still be rendering
        if (this.isMonitoring) {
            // Set a shorter timeout now that HTTP is complete
            setTimeout(() => {
                if (this.isMonitoring) {
                    console.log('DeepSeek: HTTP completed + timeout, forcing completion...');
                    this.stopStreamingMonitor(true);
                }
            }, 3000); // 3 seconds after HTTP completion
        }
    }

    extractChatResponseOnly() {
        // Extract only the latest AI response from DeepSeek
        const responseContainers = document.querySelectorAll('.ds-markdown.ds-markdown--block');
        
        if (responseContainers.length > 0) {
            // Get the last (most recent) response
            const latestResponse = responseContainers[responseContainers.length - 1];
            return latestResponse.textContent || latestResponse.innerText;
        }
        
        // Fallback: look for the assistant response container
        const assistantMessages = document.querySelectorAll('._4f9bf79');
        if (assistantMessages.length > 0) {
            const latestMessage = assistantMessages[assistantMessages.length - 1];
            const markdown = latestMessage.querySelector('.ds-markdown.ds-markdown--block');
            if (markdown) {
                return markdown.textContent || markdown.innerText;
            }
        }
        
        return '';
    }

    sendMessage(message) {
        try {
            // Wait for page to be ready - use specific DeepSeek selector
            this.waitForElement('#chat-input', 10000).then(textarea => {
                if (textarea) {
                    // Clear existing text and input new message
                    textarea.value = '';
                    textarea.focus();
                    
                    // Simulate typing
                    this.simulateTyping(textarea, message);
                    
                    // Start streaming monitoring BEFORE clicking send
                    setTimeout(() => {
                        this.startStreamingMonitor();
                        this.clickSendButton();
                    }, 500);
                } else {
                    console.error('DeepSeek: Chat input not found');
                }
            });
        } catch (error) {
            console.error('DeepSeek: Error sending message:', error);
        }
    }

    simulateTyping(element, text) {
        element.value = text;
        
        // Trigger input events
        const inputEvent = new Event('input', { bubbles: true });
        const changeEvent = new Event('change', { bubbles: true });
        
        element.dispatchEvent(inputEvent);
        element.dispatchEvent(changeEvent);
    }

    clickSendButton() {
        // Common selectors for DeepSeek send button
        const selectors = [
            'button[type="submit"]',
            'button[data-testid="send-button"]',
            'button[aria-label*="Send"]',
            'button[aria-label*="发送"]',
            '.send-button',
            'button.send',
            '[data-testid="chat-input-send-button"]'
        ];

        for (const selector of selectors) {
            const button = document.querySelector(selector);
            if (button && !button.disabled) {
                button.click();
                console.log('DeepSeek: Send button clicked');
                return;
            }
        }

        // If no button found, try Enter key
        const textarea = document.querySelector('textarea');
        if (textarea) {
            const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true
            });
            textarea.dispatchEvent(enterEvent);
            console.log('DeepSeek: Enter key pressed');
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
        console.log('DeepSeek: Starting streaming response monitor...');
        this.isMonitoring = true;
        this.capturedText = '';
        this.lastSentLength = 0;
        this.hasReceivedContent = false;
        this.httpStreamCompleted = false;
        this.lastUpdateTime = Date.now();
        
        // Start monitoring with higher frequency for real-time updates
        this.streamingInterval = setInterval(() => {
            this.checkForStreamingUpdates();
        }, 300); // Check every 300ms to reduce noise
        
        // Safety timeout to stop monitoring after 10 minutes
        setTimeout(() => {
            console.log('DeepSeek: Safety timeout reached, stopping monitor...');
            this.stopStreamingMonitor(true);
        }, 600000);
    }

    extractPageText() {
        // Focus only on the chat conversation area for DeepSeek
        const chatContainer = document.querySelector('._765a5cd') || 
                             document.querySelector('._3919b83') || 
                             document.querySelector('[class*="_7"]');  // DeepSeek's conversation container
        
        if (chatContainer) {
            // Extract text only from the conversation area
            return this.extractTextFromContainer(chatContainer);
        } else {
            // Fallback: extract from main content area only
            const mainContent = document.querySelector('#root') || 
                               document.querySelector('.ds-theme') ||
                               document.querySelector('main') ||
                               document.body;
            return this.extractTextFromContainer(mainContent);
        }
    }

    extractTextFromContainer(container) {
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    
                    // Skip hidden elements
                    const style = window.getComputedStyle(parent);
                    if (style.display === 'none' || style.visibility === 'hidden') {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Skip non-content elements
                    const tagName = parent.tagName.toLowerCase();
                    if (['script', 'style', 'noscript', 'meta', 'link', 'svg'].includes(tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Skip elements that are likely UI chrome (not content)
                    const parentClasses = parent.className || '';
                    const textContent = node.textContent.trim();
                    
                    // Filter out common UI text and disclaimers
                    if (textContent.includes('AI 生成，请仔细甄别') ||
                        textContent.includes('DeepSeek') ||
                        textContent.includes('开启新对话') ||
                        textContent.includes('联网搜索内容由') ||
                        textContent === '今天' ||
                        textContent.length < 2) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Skip navigation and UI elements
                    if (parentClasses.includes('nav') || 
                        parentClasses.includes('header') ||
                        parentClasses.includes('sidebar') ||
                        parentClasses.includes('footer') ||
                        parentClasses.includes('menu') ||
                        parent.closest('nav') ||
                        parent.closest('header') ||
                        parent.closest('.sidebar')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        
        let text = '';
        let node;
        while (node = walker.nextNode()) {
            const nodeText = node.textContent.trim();
            if (nodeText && nodeText.length > 1) {
                text += nodeText + ' ';
            }
        }
        
        return text.trim();
    }

    checkForStreamingUpdates() {
        if (!this.isMonitoring) return;
        
        const currentText = this.extractChatResponseOnly(); // Use precise extraction method
        
        // Compare with what we've captured so far
        if (currentText.length > this.capturedText.length) {
            const newContent = currentText.substring(this.capturedText.length);
            
            if (newContent.trim().length > 0) {
                console.log('DeepSeek: Streaming update:', newContent.substring(0, 50));
                
                // Send incremental update
                chrome.runtime.sendMessage({
                    action: 'streamingUpdate',
                    platform: this.platform,
                    content: newContent,
                    isComplete: false
                });
                
                this.capturedText = currentText; // Update our captured content
                this.lastUpdateTime = Date.now();
                this.hasReceivedContent = true;
            }
        }
        
        // Only stop if:
        // 1. We've received some content AND
        // 2. No updates for a longer period (10 seconds) AND 
        // 3. We detect completion indicators
        const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
        if (this.hasReceivedContent && timeSinceLastUpdate > 10000) {
            console.log('DeepSeek: Long pause detected, checking for completion indicators...');
            this.checkCompletionIndicators();
        }
    }

    checkCompletionIndicators() {
        // Look for UI elements that indicate response completion
        const completionIndicators = [
            '.ds-flex .ds-icon-button', // Action buttons appear after completion
            '[class*="response-actions"]',
            '.response-footer'
        ];
        
        let hasCompletionIndicator = false;
        for (const selector of completionIndicators) {
            if (document.querySelector(selector)) {
                console.log('DeepSeek: Found completion indicator:', selector);
                hasCompletionIndicator = true;
                break;
            }
        }
        
        // If we have completion indicators OR HTTP has confirmed completion
        if (hasCompletionIndicator || this.httpStreamCompleted) {
            console.log('DeepSeek: Response appears complete, stopping monitor...');
            this.stopStreamingMonitor(true);
        } else {
            // Reset timer for another check
            this.lastUpdateTime = Date.now();
            console.log('DeepSeek: No completion indicators found, continuing to monitor...');
        }
    }

    stopStreamingMonitor(isComplete = false) {
        if (!this.isMonitoring) return;
        
        console.log('DeepSeek: Stopping streaming monitor, complete:', isComplete);
        this.isMonitoring = false;
        
        if (this.streamingInterval) {
            clearInterval(this.streamingInterval);
            this.streamingInterval = null;
        }
        
        if (isComplete) {
            // Send the final complete response
            const finalText = this.extractChatResponseOnly();
            if (finalText && finalText.length > 20) {
                console.log('DeepSeek: Sending final complete response:', finalText.substring(0, 100));
                console.log('DeepSeek: Final response length:', finalText.length);
                
                chrome.runtime.sendMessage({
                    action: 'responseReceived',
                    platform: this.platform,
                    response: finalText
                });
            }
            
            // Send completion signal
            chrome.runtime.sendMessage({
                action: 'streamingComplete',
                platform: this.platform
            });
        }
    }

    checkForNewResponse(element) {
        // This method is now replaced by the streaming monitor approach
        // Keeping it for compatibility but main logic moved to startStreamingMonitor
    }

    isOldResponse(text) {
        // Prevent sending the same response multiple times
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
        new DeepSeekChatHandler();
    });
} else {
    new DeepSeekChatHandler();
}