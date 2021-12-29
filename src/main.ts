/*
TODO
https://github.com/marketplace/actions/chrome-extension-upload-publish
https://github.com/marketplace/actions/chrome-extension-upload-action
https://developer.chrome.com/docs/extensions/mv3/manifest/
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
    chrome.runtime.onMessage.addListener(function listener(url: string) {
        chrome.runtime.onMessage.removeListener(listener)

        // Close the opened dialog
        getCloseDialogButton().click()

        // Create the CSV
        const bytes = fetchWorkdaySpreadsheet(url)
        const workbook = XLSX.read(bytes, { type: 'array' })
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
        downloadCSV(parseWorkdayData(data))
    })
    getExportButton().click()
}

const downloadButtonId = 'com-gsconrad-workday-schedule-exporter'

function addDownloadButton() {
    const downloadButton = document.createElement('button')
    downloadButton.id = downloadButtonId
    downloadButton.appendChild(document.createTextNode('Download Schedule'))
    downloadButton.onclick = downloadScheduleCSV
    downloadButton.style.marginLeft = '24px'
    getExportButton().parentElement?.parentElement?.appendChild(downloadButton)
}

function removeDownloadButton() {
    const downloadButton = document.getElementById(downloadButtonId)
    downloadButton?.parentElement?.removeChild(downloadButton)
}

window.addEventListener('load', () => {
    removeDownloadButton()
    new MutationObserver(() => {
        removeDownloadButton()
        const onViewCoursesPage = document.title.indexOf('View My Courses') === 0
        if (onViewCoursesPage) addDownloadButton()
    }).observe(
        document.querySelector('title')!,
        { subtree: true, characterData: true, childList: true }
    );
})
