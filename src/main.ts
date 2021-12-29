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

interface ScheduleDataRow {
    'Subject': string,
    'Start Date': string
    'End Date': string
    'Start Time': string
    'End Time': string
    'Location': string
    'Description': string
}

function parseWorkdayData(sheet: XLSX.WorkSheet) {
    const meetingPatternsRegex = /([MTWRF-]*) \| (.*) - (.*) \| ?(.*)/
    const parsedData = XLSX.utils
        .sheet_to_json<WorkdayDataRow>(sheet, {
            range: 'A1:L50',
            header: [
                '', 'Course Listing', 'Credits', 'Grading Basis', 'Section',
                'Instructional Format', 'Delivery Mode', 'Meeting Patterns',
                'Registration Status', 'Instructor', 'Start Date', 'End Date',
            ],
        })
        .filter(row => meetingPatternsRegex.test(row['Meeting Patterns'] ?? ''))
        .map(row => {
            const captureGroups = meetingPatternsRegex.exec(row['Meeting Patterns'] ?? '')!
            return <ScheduleDataRow>{
                'Subject': row['Course Listing'],
                'Start Date': row['Start Date'],
                'End Date': row['End Date'],
                'Start Time': captureGroups[2],
                'End Time': captureGroups[3],
                'Location': captureGroups[4],
                'Description': `${row['Section']} with ${row['Instructor']}`,
            }
        })
    const toExport = XLSX.utils.json_to_sheet(parsedData)
    return XLSX.utils.sheet_to_csv(toExport)
}

function downloadScheduleCSV() {
    chrome.runtime.onMessage.addListener(async function listener(url: string) {
        chrome.runtime.onMessage.removeListener(listener)

        // Close the opened dialog
        getCloseDialogButton().click()

        // Create the CSV
        const bytes = await fetchWorkdaySpreadsheet(url)
        const workbook = XLSX.read(bytes, { type: 'array' })
        downloadCSV(parseWorkdayData(workbook.Sheets[workbook.SheetNames[0]]))
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
    )
})
