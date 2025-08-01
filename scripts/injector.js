// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "FILL_AND_SUBMIT") {
      fillPrompt(request.prompt);
    }
  });
  
  // 自动填充+提交函数
  function fillPrompt(prompt) {
    // 根据不同网站适配选择器（需手动调整）
    const siteConfig = {
      'deepseek.com': {
        input: 'textarea[placeholder*="输入消息"]',
        submit: 'button:has(svg[aria-label="发送"])'
      },
      'kimi.moonshot.cn': {
        input: 'textarea#prompt-textarea',
        submit: 'button[aria-label="发送"]'
      }
    };
  
    const host = window.location.host;
    const config = Object.entries(siteConfig).find(([domain]) => host.includes(domain))?.[1];
  
    if (config) {
      // 填充提示词
      const inputEl = document.querySelector(config.input);
      if (inputEl) {
        inputEl.value = prompt;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        
        // 点击发送按钮
        document.querySelector(config.submit)?.click();
        
        // 监听回复（示例）
        new MutationObserver(() => {
          const response = document.querySelector('.ai-response') || 
                           document.querySelector('.markdown-body');
          if (response) {
            chrome.runtime.sendMessage({
              type: "RESULT_READY",
              text: response.innerText,
              source: host
            });
          }
        }).observe(document.body, { subtree: true, childList: true });
      }
    }
  }
  
  // 暴露函数到全局（供executeScript调用）
  window.metaChatInjector = { fillPrompt };