import * as XLSX from "xlsx"
import { ics } from "./ics"

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
export function exportSchedule(sheet: XLSX.WorkSheet) {
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
        .filter(row => /^(Registered)|(Waitlisted)/.test(row['Registration Status'] ?? ''))
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
