import * as XLSX from "xlsx"
import * as schedule from "ics"

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
    let classes: schedule.EventAttributes[] = []
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
            const [days, startTime, endTime, spot] =
                meetingPatternsRegex.exec(row['Meeting Patterns'] ?? '')!.slice(1)
            const [startHour, startMinute] =
                startTime.split(":")
            const [endHour, endMinute] =
                endTime.split(":")
            const [month, day, badYear] =
                row['Start Date']!.split("/")
            // Workday for some ungodly reason puts the year as two digits.
            const year = `20${badYear}`
            // I'm sorry for this awful looking stuff, TypeScript is not my bread and butter.
            let startArray: schedule.DateArray = [parseInt(year), parseInt(month), parseInt(day), parseInt(startHour), parseInt(startMinute)]
            let endArray: schedule.DateArray = [parseInt(year), parseInt(month), parseInt(day), parseInt(endHour), parseInt(endMinute)]
             console.log(startArray)
             console.log(endArray)
            classes.push({
                title: row['Course Listing']!,
                start: startArray,
                end: endArray,
                description: `${row['Section']} with ${row['Instructor']}`,
                location: spot,
                recurrenceRule: `FREQ=WEEKLY;BYDAY=${convertDayOfWeekFormat(days)};INTERVAL=1;UNTIL=${Date.parse(row['End Date']!)}`
            })
        })
    schedule.createEvents(classes, (error, value) => {
        if (error) {
            console.error(error)
            alert("There was a problem with generating your calendar file. Check logs for more information.")
            return
        }

        // Ripped from old ics.js download function, by Gregory Conrad
        const a = document.createElement('a')
            a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(value)
            a.download = "schedule.ics"
            a.style.display = 'none'
            a.click()
    })
}
