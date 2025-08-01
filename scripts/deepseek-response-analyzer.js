// DeepSeek Response Analyzer
// Run this in DeepSeek console to analyze response structure

function analyzeDeepSeekResponses() {
    console.log('=== DeepSeek Response Structure Analyzer ===');
    console.log('URL:', window.location.href);
    
    // Look for markdown response elements (the actual response content)
    const markdownElements = document.querySelectorAll('.ds-markdown.ds-markdown--block');
    console.log(`Found ${markdownElements.length} markdown response blocks:`);
    
    markdownElements.forEach((el, i) => {
        console.log(`Markdown Block ${i + 1}:`, {
            element: el,
            text: el.textContent.substring(0, 200) + '...',
            textLength: el.textContent.length,
            className: el.className
        });
    });
    
    // Look for response wrapper containers
    const responseWrappers = document.querySelectorAll('._4f9bf79');
    console.log(`Found ${responseWrappers.length} response wrapper containers:`);
    
    responseWrappers.forEach((el, i) => {
        const markdown = el.querySelector('.ds-markdown.ds-markdown--block');
        if (markdown) {
            console.log(`Response Wrapper ${i + 1} with markdown:`, {
                element: el,
                markdownText: markdown.textContent.substring(0, 200) + '...',
                textLength: markdown.textContent.length
            });
        }
    });
    
    // Look for thinking indicators
    const thinkingElements = document.querySelectorAll('*');
    const thinkingIndicators = [];
    
    thinkingElements.forEach(el => {
        const text = el.textContent || '';
        if (text.includes('已深度思考') && text.includes('用时')) {
            thinkingIndicators.push({
                element: el,
                text: text.substring(0, 100) + '...',
                nextSibling: el.nextElementSibling,
                parentElement: el.parentElement
            });
        }
    });
    
    console.log(`Found ${thinkingIndicators.length} thinking indicators:`);
    thinkingIndicators.forEach((item, i) => {
        console.log(`Thinking Indicator ${i + 1}:`, item);
    });
    
    // Monitor for new markdown content
    console.log('\n--- Starting Real-time Monitoring for Markdown Content ---');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if it's a markdown block
                        if (node.matches && node.matches('.ds-markdown.ds-markdown--block')) {
                            console.log('🆕 New markdown block detected:', {
                                element: node,
                                text: node.textContent.substring(0, 100) + '...',
                                textLength: node.textContent.length
                            });
                        }
                        
                        // Check if it contains markdown blocks
                        const markdownBlocks = node.querySelectorAll ? node.querySelectorAll('.ds-markdown.ds-markdown--block') : [];
                        if (markdownBlocks.length > 0) {
                            console.log(`🆕 Element with ${markdownBlocks.length} markdown blocks added:`, {
                                element: node,
                                markdownBlocks: Array.from(markdownBlocks).map(mb => mb.textContent.substring(0, 50) + '...')
                            });
                        }
                    }
                });
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    return () => {
        observer.disconnect();
        console.log('❌ Monitoring stopped.');
    };
}

// Auto-run
const stopAnalyzing = analyzeDeepSeekResponses();

// Export
window.analyzeDeepSeekResponses = analyzeDeepSeekResponses;
window.stopDeepSeekAnalysis = stopAnalyzing;

console.log('DeepSeek Response Analyzer loaded. Use stopDeepSeekAnalysis() to stop monitoring.');