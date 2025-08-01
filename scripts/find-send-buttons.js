// Enhanced debug script to find send buttons more precisely
// Run this on each platform to find the exact send button selectors

function findSendButtons() {
    console.log('=== Enhanced Send Button Finder ===');
    console.log('URL:', window.location.href);
    
    // Find all buttons and potential send elements
    const allButtons = document.querySelectorAll('button, [role="button"], div[onclick], span[onclick], a[onclick]');
    console.log(`Total interactive elements found: ${allButtons.length}`);
    
    // Look for send-related elements
    const sendElements = [];
    
    allButtons.forEach((el, index) => {
        const text = (el.textContent || '').trim().toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const className = (el.className || '').toLowerCase();
        const dataTestId = (el.getAttribute('data-testid') || '').toLowerCase();
        const title = (el.getAttribute('title') || '').toLowerCase();
        
        // Check for send-related keywords
        const keywords = ['send', '发送', 'submit', '提交', 'enter', '回车'];
        const isSendRelated = keywords.some(keyword => 
            text.includes(keyword) || 
            ariaLabel.includes(keyword) || 
            className.includes(keyword) || 
            dataTestId.includes(keyword) ||
            title.includes(keyword)
        );
        
        if (isSendRelated || el.type === 'submit') {
            sendElements.push({
                index,
                element: el,
                tag: el.tagName.toLowerCase(),
                type: el.type || 'N/A',
                text: text || 'N/A',
                ariaLabel: ariaLabel || 'N/A',
                className: className || 'N/A',
                dataTestId: dataTestId || 'N/A',
                title: title || 'N/A',
                id: el.id || 'N/A',
                disabled: el.disabled || false,
                visible: el.offsetParent !== null,
                rect: el.getBoundingClientRect()
            });
        }
    });
    
    console.log(`\nFound ${sendElements.length} potential send buttons:`);
    sendElements.forEach((btn, i) => {
        console.log(`\n--- Send Button ${i + 1} ---`);
        console.log('Element:', btn.element);
        console.log('Tag:', btn.tag);
        console.log('Type:', btn.type);
        console.log('Text:', btn.text);
        console.log('Aria Label:', btn.ariaLabel);
        console.log('Class:', btn.className);
        console.log('Data TestID:', btn.dataTestId);
        console.log('Title:', btn.title);
        console.log('ID:', btn.id);
        console.log('Disabled:', btn.disabled);
        console.log('Visible:', btn.visible);
        console.log('Position:', `${btn.rect.width}x${btn.rect.height} at (${btn.rect.x}, ${btn.rect.y})`);
        
        // Generate possible selectors
        const selectors = [];
        if (btn.id) selectors.push(`#${btn.id}`);
        if (btn.dataTestId) selectors.push(`[data-testid="${btn.dataTestId}"]`);
        if (btn.className) selectors.push(`.${btn.className.split(' ')[0]}`);
        if (btn.type === 'submit') selectors.push('button[type="submit"]');
        if (btn.ariaLabel) selectors.push(`[aria-label="${btn.ariaLabel}"]`);
        
        console.log('Suggested selectors:', selectors);
    });
    
    // Also look for SVG icons that might be send buttons
    const svgButtons = document.querySelectorAll('svg, use');
    const sendSvgs = [];
    
    svgButtons.forEach(svg => {
        const parent = svg.closest('button, [role="button"], div[onclick]');
        if (parent && !sendElements.find(btn => btn.element === parent)) {
            const svgContent = svg.outerHTML.toLowerCase();
            if (svgContent.includes('send') || svgContent.includes('arrow') || svgContent.includes('plane')) {
                sendSvgs.push({
                    svg,
                    parent,
                    content: svgContent.substring(0, 200)
                });
            }
        }
    });
    
    if (sendSvgs.length > 0) {
        console.log(`\nFound ${sendSvgs.length} potential SVG send buttons:`);
        sendSvgs.forEach((item, i) => {
            console.log(`SVG Button ${i + 1}:`, item.parent);
            console.log('SVG Content:', item.content);
        });
    }
    
    console.log('\n=== Analysis Complete ===');
}

// Auto-run
findSendButtons();

// Export for manual use
window.findSendButtons = findSendButtons;