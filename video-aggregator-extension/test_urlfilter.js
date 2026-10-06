const puppeteer = require('puppeteer');
const path = require('path');
const express = require('express');

const app = express();
app.get('/video.mp4', (req, res) => {
  res.json({ headers: req.headers });
});
const server = app.listen(0, '127.0.0.1');

(async () => {
  const port = server.address().port;
  // use localhost instead of 127.0.0.1 to test subdomain if possible, 
  // actually just use 127.0.0.1
  const url = `http://127.0.0.1:${port}/video.mp4`;
  
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

  try {
    const result = await worker.evaluate(async (url) => {
      try {
        const details = {
          url: url,
          initiator: "https://example.com"
        };
        
        const initiator = details.initiator;
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
              urlFilter: "||" + new URL(details.url).hostname + "/*",
              initiatorDomains: [chrome.runtime.id],
              resourceTypes: ["xmlhttprequest", "media"]
            }
          }]
        });

        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }, url);

    console.log("Evaluation result:", result);

  } catch (err) {
    console.error("Worker evaluation failed", err);
  }

  await browser.close();
  server.close();
})();
