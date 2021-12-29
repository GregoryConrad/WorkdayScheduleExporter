/*
TODO
https://github.com/marketplace/actions/chrome-extension-upload-publish
https://github.com/marketplace/actions/chrome-extension-upload-action
https://developer.chrome.com/docs/extensions/mv3/manifest/
Add vs code task for build
*/

import * as XLSX from "xlsx"

function getExportButton() {
    return document.querySelector('div[title="Export to Excel"]') as HTMLElement
}

function getCloseDialogButton() {
    return document.querySelector('div[aria-label="Close"]') as HTMLElement
}

function fetchWorkdaySpreadsheet(url: string) {
    return fetch(url)
        .then(response => response.json())
        .then(json => json.docReadyUri)
        .then(path => window.location.origin + path)
        .then(resourceLocation => fetch(resourceLocation))
        .then(response => response.arrayBuffer())
}

function downloadCSV(text: string) {
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text)
    a.download = 'schedule.csv'
    a.style.display = 'none'
    a.click()
}

function parseWorkdayData(data: any[]) {
    // TODO implement
    return JSON.stringify(data)
}

function downloadScheduleCSV() {
    const requestCompletedCallback = ({ url }: chrome.webRequest.WebResponseCacheDetails) => {

        // Remove this listener
        chrome.webRequest.onCompleted.removeListener(requestCompletedCallback)

        // Close the opened dialog
        getCloseDialogButton().click()

        // Create the CSV
        const bytes = fetchWorkdaySpreadsheet(url)
        const workbook = XLSX.read(bytes, { type: 'binary' })
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
        downloadCSV(parseWorkdayData(data))
    }
    chrome.webRequest.onCompleted.addListener(requestCompletedCallback, { urls: ["<all_urls>"] })
    getExportButton().click()
}

const exportButtonId = 'com-gsconrad-workday-schedule-exporter'

function addDownloadButton() {
    const downloadButton = document.createElement('button')
    downloadButton.id = exportButtonId
    downloadButton.appendChild(document.createTextNode('Download Schedule'))
    downloadButton.onclick = downloadScheduleCSV
    downloadButton.style.marginLeft = '24px'
    getExportButton().parentElement?.parentElement?.appendChild(downloadButton)
}

function removeDownloadButtonIfNeeded() {
    const downloadButton = document.getElementById(exportButtonId)
    downloadButton?.parentElement?.removeChild(downloadButton)
}

window.addEventListener('load', () => {
    removeDownloadButtonIfNeeded()
    new MutationObserver(() => {
        removeDownloadButtonIfNeeded()
        const onViewCoursesPage = document.title.indexOf('View My Courses') === 0
        if (onViewCoursesPage) addDownloadButton()
    }).observe(
        document.querySelector('title')!,
        { subtree: true, characterData: true, childList: true }
    );
})