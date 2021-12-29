/*
TODO
https://github.com/marketplace/actions/chrome-extension-upload-publish
https://github.com/marketplace/actions/chrome-extension-upload-action
https://developer.chrome.com/docs/extensions/mv3/manifest/
*/

import * as XLSX from "xlsx"
import { ics } from "./ics"

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
            const captureGroups = meetingPatternsRegex.exec(row['Meeting Patterns'] ?? '')!
            schedule.addEvent(
                row['Course Listing']!,
                `${row['Section']} with ${row['Instructor']}`,
                captureGroups[4],
                `${row['Start Date']} ${captureGroups[2]}`,
                `${row['Start Date']} ${captureGroups[3]}`,
                {
                    freq: 'WEEKLY',
                    until: `${row['End Date']} ${captureGroups[3]}`,
                    byday: convertDayOfWeekFormat(captureGroups[1]),
                },
            )
        })
    schedule.download('schedule', '.ics')
}

function downloadScheduleCSV() {
    chrome.runtime.onMessage.addListener(async function listener(url: string) {
        chrome.runtime.onMessage.removeListener(listener)

        // Close the opened dialog
        getCloseDialogButton().click()

        // Create the CSV
        const bytes = await fetchWorkdaySpreadsheet(url)
        const workbook = XLSX.read(bytes, { type: 'array' })
        createSchedule(workbook.Sheets[workbook.SheetNames[0]])
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
