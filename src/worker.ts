chrome.webRequest.onCompleted.addListener(async ({ url }) => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        chrome.tabs.sendMessage(tab.id!, url)
    } catch (exception) {
        console.log('Failed to notify the current tab of the request url', exception)
    }
}, { urls: ["https://wd5.myworkday.com/*"] })

// The service worker doesn't wake up like it is supposed to for webRequest
// See https://bugs.chromium.org/p/chromium/issues/detail?id=1024211
// This message listener is to force the service worker to wake up when needed
chrome.runtime.onMessage.addListener(console.log)
