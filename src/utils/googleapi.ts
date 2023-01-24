import { google } from "googleapis";

const spreadsheetId = '1wj40nF6PPXR6rC6xFrlAMe0k-HzVl__pDHlaZa8RzJQ'

const initSheet = async () => {
    const auth = new google.auth.GoogleAuth({ keyFile: './secret.json', scopes: "https://www.googleapis.com/auth/spreadsheets" })
    const client = await auth.getClient()
    return google.sheets({ version: 'v4', auth: client })
}

export const getSheet = async () => {
    const sheets = await initSheet()
    const range = 'Feuille 1!A:L'
    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range
    })
    const rows = res.data.values
    if (!rows || rows.length === 0) {
        console.log('No data found.')
        return
    }
    rows.forEach((row) => {
        console.log(`${row}`)
    })
}

export const addRow = async (data: any[]) => {
    const sheets = await initSheet()
    const range = 'Feuille 1!A2:L2'
    await sheets.spreadsheets.values.append({ spreadsheetId, range, valueInputOption: 'RAW', requestBody: { values: [data] } })
}

export const updateDailyCell = async (percent: number) => {
    const sheets = await initSheet()
    const date = new Date()
    const letters = 'BCDEFGHIJKLM'
    const monthLetter = letters[date.getMonth()]
    const cell = date.getDate() + 2
    const range = `2023!${monthLetter}${cell}`
    await sheets.spreadsheets.values.update({ spreadsheetId, range, valueInputOption: 'RAW', requestBody: { values: [[percent]] } })
}