import * as XLSX from "xlsx"
import { ics } from "./ics"

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
    return document.querySelector('div[aria-label="Close"]') as HTMLElement
}

/**
 * Jumps through hoops to fetch the actual excel file Workday exports
 * 
 * @param url the url used by Workday to request the excel spreadsheet
 * @returns the bytes of the excel spreadsheet
 */
function fetchWorkdaySpreadsheet(url: string) {
    return fetch(url)
        .then(response => response.json())
        .then(json => json.docReadyUri)
        .then(path => window.location.origin + path)
        .then(resourceLocation => fetch(resourceLocation))
        .then(response => response.arrayBuffer())
}

/**
 * Represents a row in the Workday excel spreadsheet
 */
interface WorkdayDataRow {
    ''?: string
    'Course Listing'?: string
    'Credits'?: string
    'Grading Basis'?: string
    'Section'?: string
    'Instructional Format'?: string
    'Delivery Mode'?: string
    'Meeting Patterns'?: string
    'Registration Status'?: string
    'Instructor'?: string
    'Start Date'?: string
    'End Date'?: string
}

/**
 * Converts Workday day format to ics day format
 * @param workdayFormat the Workday "Meeting Patterns" list of days
 * @returns array of days in ics format
 */
function convertDayOfWeekFormat(workdayFormat: string) {
    const conversion: { [key: string]: string } = {
        'M': 'MO',
        'T': 'TU',
        'W': 'WE',
        'R': 'TH',
        'F': 'FR',
        'S': 'SA',
        'U': 'SU',
    }
    return [...workdayFormat].filter(c => conversion.hasOwnProperty(c)).map(c => conversion[c])
}

/**
 * Creates and downloads the schedule based on the given Workday spreadsheet
 * @param sheet the Workday spreadsheet to convert into a schedule
 */
function createSchedule(sheet: XLSX.WorkSheet) {
    const meetingPatternsRegex = /([MTWRFSU-]*) \| (.*) - (.*) \| ?(.*)/
    const schedule = ics()!
    XLSX.utils
        .sheet_to_json<WorkdayDataRow>(sheet, {
            raw: false,
            range: 'A1:L50',
            header: [
                '', 'Course Listing', 'Credits', 'Grading Basis', 'Section',
                'Instructional Format', 'Delivery Mode', 'Meeting Patterns',
                'Registration Status', 'Instructor', 'Start Date', 'End Date',
            ],
        })
        .filter(row => meetingPatternsRegex.test(row['Meeting Patterns'] ?? ''))
        .forEach(row => {
            const [days, startTime, endTime, location] =
                meetingPatternsRegex.exec(row['Meeting Patterns'] ?? '')!.slice(1)
            schedule.addEvent(
                row['Course Listing']!,
                `${row['Section']} with ${row['Instructor']}`,
                location,
                `${row['Start Date']} ${startTime}`,
                `${row['Start Date']} ${endTime}`,
                {
                    freq: 'WEEKLY',
                    until: `${row['End Date']} ${endTime}`,
                    byday: convertDayOfWeekFormat(days),
                },
            )
        })
    schedule.download('schedule', '.ics')
}

/**
 * Starts the download of the schedule
 * This is meant for the onclick of the download schedule button
 * 
 * Workday can't be simple, so we:
 * - Manually tell workday to download the excel spreadsheet
 * - Listen to the outbound network request Workday makes so we can replicate it
 *   - This occurs over in worker.js
 * - Perform some clean up work
 * - Replicate this outbound network request ourselves with some twists
 * - Process the returned spreadsheet and create the schedule
 */
function startScheduleDownload() {
    // The service worker doesn't wake up like it is supposed to for webRequest
    // See https://bugs.chromium.org/p/chromium/issues/detail?id=1024211
    // So we manually need to wake it up by sending a dummy message
    // This is a hacky workaround to get Manifest V3 support until the issue is fixed
    chrome.runtime.sendMessage('Wakey wakey it\'s time for schoo')
    chrome.runtime.onMessage.addListener(async function listener(url: string) {

        // Clean up
        chrome.runtime.onMessage.removeListener(listener)
        getCloseDialogButton().click()

        // Create the schedule
        const bytes = await fetchWorkdaySpreadsheet(url)
        const workbook = XLSX.read(bytes, { type: 'array' })
        createSchedule(workbook.Sheets[workbook.SheetNames[0]])
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

// Inject the download button if needed after page load
// Workday sucks so we have to listen for mutations of the document title
// (The document title is a placeholder until the page fully loads)
window.addEventListener('load', () => {
    removeDownloadButtonIfPresent()
    new MutationObserver(() => {
        removeDownloadButtonIfPresent()
        const onViewCoursesPage = document.title.indexOf('View My Courses') === 0
        if (onViewCoursesPage) addDownloadButton()
    }).observe(
        document.querySelector('title')!,
        { subtree: true, characterData: true, childList: true }
    )
})
