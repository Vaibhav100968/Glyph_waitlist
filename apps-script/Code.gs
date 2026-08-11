/**
 * Glyph waitlist -> Google Sheets.
 *
 * SETUP
 * 1. Create a Google Sheet. In row 1 put headers: A1 = "Timestamp", B1 = "Email".
 * 2. Extensions -> Apps Script. Delete any code and paste this file.
 * 3. Deploy -> New deployment -> type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Copy the Web app URL it gives you.
 * 4. Paste that URL into SCRIPT_URL in index.html.
 *
 * Emails from the site land in the sheet. Duplicate emails are ignored.
 */
function doPost(e) {
  try {
    var email = (e && e.parameter && e.parameter.email ? e.parameter.email : "").trim();
    if (!email) return ContentService.createTextOutput("no email");

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Skip duplicates (column B holds emails).
    var existing = sheet.getRange("B:B").getValues().join("\n").toLowerCase();
    if (existing.indexOf(email.toLowerCase()) === -1) {
      sheet.appendRow([new Date(), email]);
    }
    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("error");
  }
}
