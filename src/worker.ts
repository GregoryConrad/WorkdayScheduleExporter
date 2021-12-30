chrome.webRequest.onCompleted.addListener(async ({ url }) => {
    try {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
            chrome.tabs.sendMessage(tab.id!, url)
        })
    } catch (exception) {
        console.log('Failed to notify the current tab of the request url', exception)
    }
}, { urls: ["https://wd5.myworkday.com/*"] })