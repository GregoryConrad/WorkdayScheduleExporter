import { WorkBook } from "xlsx"

export interface Message {
    type: 'initialRequestCompleted' | 'spreadsheet' | 'error'
    data: undefined | WorkBook | any
}
