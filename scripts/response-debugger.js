// Response Detection Debugger
// Run this in each platform's console to see what response elements exist

function debugResponseElements() {
    console.log('=== Response Element Debugger ===');
    console.log('URL:', window.location.href);
    
    // Common response-related selectors
    const responseSelectors = [
        '.message',
        '.chat-message',
        '.response',
        '.assistant',
        '.ai-message',
        '.bot-message',
        '[data-role="assistant"]',
        '[class*="message"]',
        '[class*="response"]',
        '[class*="assistant"]',
        '[class*="ai-"]',
        '[class*="bot-"]'
    ];
    
    console.log('\n--- Looking for response elements ---');
    
    responseSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`\nFound ${elements.length} elements for selector: ${selector}`);
            elements.forEach((el, i) => {
                if (i < 3) { // Show first 3
                    console.log(`  ${i + 1}:`, {
                        element: el,
                        text: el.textContent.substring(0, 100) + '...',
                        className: el.className,
                        innerHTML: el.innerHTML.substring(0, 150) + '...'
                    });
                }
            });
        }
    });
    
    // Look for any elements with substantial text content
    console.log('\n--- Elements with substantial text (possible responses) ---');
    const allElements = document.querySelectorAll('*');
    const textElements = [];
    
    allElements.forEach(el => {
        const text = el.textContent || '';
        if (text.length > 100 && 
            el.children.length < 10 && // Not a container with many children
            !el.tagName.match(/^(SCRIPT|STYLE|HEAD)$/)) {
            
            textElements.push({
                element: el,
                tag: el.tagName.toLowerCase(),
                className: el.className,
                textLength: text.length,
                text: text.substring(0, 200) + '...'
            });
        }
    });
    
    // Sort by text length
    textElements.sort((a, b) => b.textLength - a.textLength);
    
    console.log(`Found ${textElements.length} elements with substantial text:`);
    textElements.slice(0, 10).forEach((item, i) => {
        console.log(`\nText Element ${i + 1}:`, {
            element: item.element,
            tag: item.tag,
            className: item.className,
            textLength: item.textLength,
            text: item.text
        });
    });
    
    // Monitor for new elements
    console.log('\n--- Starting live monitoring ---');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE && node.textContent.length > 50) {
                        console.log('🆕 New element with text detected:', {
                            element: node,
                            tag: node.tagName,
                            className: node.className,
                            text: node.textContent.substring(0, 100) + '...'
                        });
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    console.log('✅ Monitoring started. New text elements will be logged above.');
    
    // Return a function to stop monitoring
    return () => {
        observer.disconnect();
        console.log('❌ Monitoring stopped.');
    };
}

// Auto-run
const stopMonitoring = debugResponseElements();

// Export for manual use
window.debugResponseElements = debugResponseElements;
window.stopResponseMonitoring = stopMonitoring;