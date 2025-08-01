// Ultimate button finder for Yuanbao - finds ALL possible interactive elements
// Run this in Yuanbao console to find the send button

function findAllInteractiveElements() {
    console.log('=== Ultimate Interactive Element Finder ===');
    console.log('URL:', window.location.href);
    
    // Find the input editor first
    const inputEditor = document.querySelector('.ql-editor');
    if (!inputEditor) {
        console.log('ERROR: .ql-editor not found!');
        return;
    }
    
    const inputRect = inputEditor.getBoundingClientRect();
    console.log('Input editor rect:', inputRect);
    
    // Find ALL interactive elements
    const allElements = document.querySelectorAll(`
        button, 
        [role="button"], 
        [onclick], 
        [onmousedown], 
        [onmouseup], 
        div[style*="cursor: pointer"], 
        div[style*="cursor:pointer"],
        span[style*="cursor: pointer"],
        span[style*="cursor:pointer"],
        svg,
        path,
        circle,
        rect,
        polygon
    `);
    
    console.log(`Found ${allElements.length} total interactive elements`);
    
    // Analyze elements by distance from input
    const candidates = [];
    
    allElements.forEach((el, index) => {
        if (el.offsetParent === null) return; // Skip hidden elements
        
        const rect = el.getBoundingClientRect();
        if (rect.width < 3 || rect.height < 3) return; // Skip tiny elements
        
        // Calculate distance from input
        const distance = Math.sqrt(
            Math.pow(rect.left - inputRect.right, 2) + 
            Math.pow(rect.top - inputRect.top, 2)
        );
        
        // Get computed style
        const style = window.getComputedStyle(el);
        
        candidates.push({
            index,
            element: el,
            tag: el.tagName.toLowerCase(),
            className: el.className || '',
            id: el.id || '',
            textContent: (el.textContent || '').trim().substring(0, 50),
            innerHTML: el.innerHTML.substring(0, 100),
            distance: Math.round(distance),
            rect: {
                x: Math.round(rect.x),
                y: Math.round(rect.y), 
                width: Math.round(rect.width),
                height: Math.round(rect.height)
            },
            cursor: style.cursor,
            hasClickListener: !!el.onclick,
            parent: el.parentElement?.tagName || 'unknown'
        });
    });
    
    // Sort by distance from input
    candidates.sort((a, b) => a.distance - b.distance);
    
    console.log('\n=== TOP 20 CANDIDATES BY DISTANCE ===');
    candidates.slice(0, 20).forEach((candidate, i) => {
        console.log(`\n--- Candidate ${i + 1} (Distance: ${candidate.distance}px) ---`);
        console.log('Element:', candidate.element);
        console.log('Tag:', candidate.tag);
        console.log('Class:', candidate.className);
        console.log('ID:', candidate.id);
        console.log('Text:', candidate.textContent);
        console.log('HTML:', candidate.innerHTML);
        console.log('Rect:', candidate.rect);
        console.log('Cursor:', candidate.cursor);
        console.log('Has Click:', candidate.hasClickListener);
        console.log('Parent:', candidate.parent);
        
        // Test if this element is clickable
        if (candidate.cursor === 'pointer' || candidate.hasClickListener || candidate.tag === 'button') {
            console.log('🎯 LIKELY CLICKABLE!');
        }
    });
    
    // Special analysis for buttons
    const buttonLikeElements = candidates.filter(c => 
        c.tag === 'button' || 
        c.cursor === 'pointer' || 
        c.hasClickListener ||
        c.className.includes('btn') ||
        c.className.includes('send') ||
        c.className.includes('submit')
    );
    
    console.log(`\n=== BUTTON-LIKE ELEMENTS (${buttonLikeElements.length}) ===`);
    buttonLikeElements.forEach((btn, i) => {
        console.log(`Button ${i + 1}:`, btn.element, `Distance: ${btn.distance}px`);
    });
    
    // Find elements in input's parent containers
    let parent = inputEditor.parentElement;
    let level = 0;
    while (parent && level < 5) {
        const parentButtons = parent.querySelectorAll('button, [role="button"], [onclick]');
        if (parentButtons.length > 0) {
            console.log(`\n=== BUTTONS IN PARENT LEVEL ${level} ===`);
            parentButtons.forEach((btn, i) => {
                console.log(`Parent Button ${i + 1}:`, btn);
                console.log('Class:', btn.className);
                console.log('Text:', btn.textContent.trim());
            });
        }
        parent = parent.parentElement;
        level++;
    }
    
    console.log('\n=== DONE ===');
    return candidates.slice(0, 10);
}

// Auto-run
const topCandidates = findAllInteractiveElements();

// Export for manual testing
window.findAllInteractiveElements = findAllInteractiveElements;
window.testClick = function(index) {
    if (topCandidates && topCandidates[index]) {
        console.log('Testing click on candidate', index);
        topCandidates[index].element.click();
    }
};