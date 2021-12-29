// This should be a service worker, but:
// https://bugs.chromium.org/p/chromium/issues/detail?id=1024211
chrome.webRequest.onCompleted.addListener(async ({ url }) => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
        chrome.tabs.sendMessage(tab.id!, url)
    } catch (exception) {
        console.log('Failed to notify the curent tab of the request url', exception)
    }
}, { urls: ["https://wd5.myworkday.com/*"] })