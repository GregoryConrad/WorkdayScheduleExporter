# Workday Schedule Exporter
**Created by Gregory Conrad**
![Extension Screenshot](/screenshot.png?raw=true "Extension in Action")
Meant for use with WPI's Workday instance;
not sure if this extension will work with other schools' Workday.
If not, it should be easily adaptable in `src/parser.ts` (feel free to make a PR!).

## Usage
1. Install the extension [on Chrome](https://chrome.google.com/webstore/detail/elloafhmffcedcmbdepancjijjccmail) or [on Firefox](https://addons.mozilla.org/en-US/firefox/addon/workday-schedule-exporter/)
2. Go to [Workday](https://wd5.myworkday.com/wpi/)
3. Click "Academics"
4. Click "View My Courses" on the right sidebar under "Planning & Registration"
5. Click the "Download Schedule" button
6. Enjoy your downloaded schedule
   - [Steps to import your schedule into Google Calendar](https://support.google.com/calendar/answer/37118)
   - [Steps to import your schedule into Apple Calendar](https://support.apple.com/guide/calendar/import-or-export-calendars-icl1023/mac)

## Project Setup
To get started:
- `npm install`
- `npm run build` (also configured as a VS Code build task)
