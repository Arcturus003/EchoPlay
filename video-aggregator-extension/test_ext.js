const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
  const extensionPath = path.resolve(__dirname);
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  const backgroundPageTarget = await browser.waitForTarget(target => target.type() === 'service_worker' || target.type() === 'background_page');
  const worker = await backgroundPageTarget.worker();

  if (!worker) {
    console.error("No service worker found!");
    process.exit(1);
  }

  try {
    const result = await worker.evaluate(async () => {
      try {
        const details = {
          url: "https://example.com/video.mp4",
          initiator: "https://example.com"
        };
        
        const initiator = details.initiator || new URL(details.url).origin;
        let hash = 0;
        for (let i = 0; i < initiator.length; i++) {
          hash = (hash << 5) - hash + initiator.charCodeAt(i);
          hash |= 0;
        }
        const ruleId = (Math.abs(hash) % 4000) + 1000;
        
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: [ruleId],
          addRules: [{
            id: ruleId,
            priority: 2,
            action: {
              type: "modifyHeaders",
              requestHeaders: [
                { header: "Referer", operation: "set", value: initiator },
                { header: "Origin", operation: "set", value: initiator }
              ]
            },
            condition: {
              requestDomains: [new URL(details.url).hostname],
              initiatorDomains: [chrome.runtime.id],
              resourceTypes: ["xmlhttprequest", "media"]
            }
          }]
        });
        return { success: true, ruleId };
      } catch (err) {
        return { success: false, error: err.message, stack: err.stack };
      }
    });

    console.log("Evaluation result:", result);
    
    // verify the rules
    const rules = await worker.evaluate(async () => {
      return await chrome.declarativeNetRequest.getDynamicRules();
    });
    
    console.log("Dynamic rules:", JSON.stringify(rules, null, 2));

  } catch (err) {
    console.error("Worker evaluation failed", err);
  }

  await browser.close();
})();
