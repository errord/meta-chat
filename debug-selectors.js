// Debug tool to find correct selectors for each platform
// Run this in the browser console on each AI platform page

function debugSelectors() {
    console.log('=== AI Platform Selector Debug Tool ===');
    console.log('Current URL:', window.location.href);
    
    // Find potential input elements
    console.log('\n--- Input Elements ---');
    const inputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
    inputs.forEach((el, i) => {
        console.log(`Input ${i + 1}:`, {
            tag: el.tagName.toLowerCase(),
            type: el.type || 'N/A',
            placeholder: el.placeholder || 'N/A',
            id: el.id || 'N/A',
            class: el.className || 'N/A',
            'data-testid': el.getAttribute('data-testid') || 'N/A',
            visible: el.offsetParent !== null,
            element: el
        });
    });
    
    // Find potential send buttons
    console.log('\n--- Button Elements ---');
    const buttons = document.querySelectorAll('button, [role="button"], div[onclick]');
    const sendButtons = Array.from(buttons).filter(btn => {
        const text = btn.textContent.toLowerCase();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        const className = (btn.className || '').toLowerCase();
        const testId = (btn.getAttribute('data-testid') || '').toLowerCase();
        
        return text.includes('send') || text.includes('发送') || text.includes('提交') ||
               ariaLabel.includes('send') || ariaLabel.includes('发送') ||
               className.includes('send') || testId.includes('send');
    });
    
    sendButtons.forEach((btn, i) => {
        console.log(`Send Button ${i + 1}:`, {
            tag: btn.tagName.toLowerCase(),
            text: btn.textContent.trim(),
            'aria-label': btn.getAttribute('aria-label') || 'N/A',
            class: btn.className || 'N/A',
            'data-testid': btn.getAttribute('data-testid') || 'N/A',
            disabled: btn.disabled,
            visible: btn.offsetParent !== null,
            element: btn
        });
    });
    
    // Find potential response containers
    console.log('\n--- Response Containers ---');
    const responseSelectors = [
        '.message',
        '.chat-message', 
        '.response',
        '[role="article"]',
        '[data-role="assistant"]',
        '.ai-message',
        '.bot-message'
    ];
    
    responseSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            console.log(`Found ${elements.length} elements for selector: ${selector}`);
            elements.forEach((el, i) => {
                if (i < 3) { // Show first 3 elements
                    console.log(`  ${i + 1}:`, {
                        text: el.textContent.slice(0, 100) + '...',
                        class: el.className,
                        element: el
                    });
                }
            });
        }
    });
    
    console.log('\n=== Debug Complete ===');
    console.log('Copy the relevant selectors to update the content scripts.');
}

// Auto-run debug
debugSelectors();

// Export for manual use
window.debugSelectors = debugSelectors;