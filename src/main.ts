import browser from "webextension-polyfill"
import { Message } from "./message"
import { WorkBook } from "xlsx"
import { exportSchedule } from "./parser"

/**
 * @returns the export excel spreadsheet button on Workday
 */
function getExportButton() {
    return document.querySelector('div[title="Export to Excel"]') as HTMLElement
}

/**
 * @returns the Workday dialog close button
 */
function getCloseDialogButton() {
    return document.querySelector('div[aria-label="Close"]') as HTMLElement | undefined
}

/**
 * Starts the download of the schedule
 * This is meant for the onclick of the download schedule button
 * 
 * Workday can't be simple, so we:
 * - Manually tell workday to download the excel spreadsheet
 * - Listen to the outbound network request Workday makes and replicate it
 *   - This occurs over in worker.ts
 * - Perform some clean up work
 * - Process the returned spreadsheet and create the schedule
 */
function startScheduleDownload() {
    browser.runtime.connect().onMessage.addListener((message: Message) => {
        switch (message.type) {
            case 'initialRequestCompleted':
                getCloseDialogButton()?.click()
                break
            case 'spreadsheet':
                const workbook = message.data as WorkBook
                exportSchedule(workbook.Sheets[workbook.SheetNames[0]])
                break
            case 'error':
                alert(`Error Encountered
Often this error will correct itself if you try clicking the "Download Schedule" button again
Error Details: ${message.data}`)
                break
        }
    })
    getExportButton().click()
}

// The static id of the download schedule button so we can access it
const downloadButtonId = 'com-gsconrad-workday-schedule-exporter'

/**
 * Adds the download schedule button to the "View My Courses" page
 */
function addDownloadButton() {
    const downloadButton = document.createElement('button')
    downloadButton.id = downloadButtonId
    downloadButton.appendChild(document.createTextNode('Download Schedule'))
    downloadButton.onclick = startScheduleDownload
    downloadButton.style.marginLeft = '24px'
    getExportButton().parentElement?.parentElement?.appendChild(downloadButton)
}

/**
 * Removes the download schedule button from the current page if it is there
 */
function removeDownloadButtonIfPresent() {
    const downloadButton = document.getElementById(downloadButtonId)
    downloadButton?.parentElement?.removeChild(downloadButton)
}

/**
 * Adds the "Download Schedule" button if we are on the "View My Courses" page
 */
function setUpPage() {
    removeDownloadButtonIfPresent()
    const onViewCoursesPage = document.title.indexOf('View My Courses') === 0
    if (onViewCoursesPage) addDownloadButton()
}

// Inject the download button if we are on the right page
// Workday sucks so we also have to listen for mutations of the document title
// (The document title is a placeholder until the page fully loads)
setUpPage()
new MutationObserver(setUpPage).observe(
    document.querySelector('title')!,
    { subtree: true, characterData: true, childList: true }
)
