import browser from "webextension-polyfill"
import * as XLSX from "xlsx"
import { Message } from "./message"

// A service worker will not unload with an open port,
//   so it is safe to store these variables here
let port: browser.Runtime.Port | undefined = undefined
let alreadyProcessedRequest = false // prevents a webRequest.onCompleted loop

browser.runtime.onConnect.addListener(p => {
    alreadyProcessedRequest = false
    port = p
})

browser.webRequest.onCompleted.addListener(async ({ url }) => {
    if (alreadyProcessedRequest) return;
    alreadyProcessedRequest = true

    try {
        port!.postMessage(<Message>{ type: 'initialRequestCompleted' })
        const workbook = await fetchWorkdaySpreadsheet(url)
        port!.postMessage(<Message>{ type: 'spreadsheet', data: workbook })
    } catch (exception) {
        console.log('Failed to send the data to the port: ', exception)
        port?.postMessage(<Message>{ type: 'error', data: `${exception}` })
    } finally {
        port?.disconnect()
        port = undefined
    }
}, { urls: ["https://wd5.myworkday.com/*"] })

/**
 * Jumps through hoops to fetch the actual excel file Workday exports
 * 
 * @param url the url used by Workday to request the excel spreadsheet
 * @returns the excel spreadsheet
 */
function fetchWorkdaySpreadsheet(url: string) {
    return fetch(url)
        .then(response => response.json())
        .then(json => json.docReadyUri)
        .then(path => new URL(url).origin + path)
        .then(resourceLocation => fetch(resourceLocation))
        .then(response => response.arrayBuffer())
        .then(bytes => XLSX.read(bytes, { type: 'array' }))
}
