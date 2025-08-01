document.addEventListener('DOMContentLoaded', function() {
    const openMainWindowBtn = document.getElementById('openMainWindow');
    
    openMainWindowBtn.addEventListener('click', function() {
        chrome.windows.create({
            url: chrome.runtime.getURL('main/main.html'),
            type: 'popup',
            width: 1400,
            height: 900,
            left: 100,
            top: 100
        }, function(window) {
            console.log('Main window created:', window.id);
        });
    });

    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "showPopup") {
            console.log("Popup requested");
        }
    });

    console.log("Popup loaded");
});