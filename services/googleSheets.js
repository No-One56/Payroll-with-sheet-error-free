const { google } = require('googleapis');
const { readFileSync } = require('fs');

const credentials = JSON.parse(
    readFileSync('H:/Payroll with sheet error free/config/google-sheets-key.json')
);

const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets',
    ],
});

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

module.exports = { drive, sheets };