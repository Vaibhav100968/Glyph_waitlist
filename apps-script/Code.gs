/**
 * Glyph waitlist -> Google Sheets (+ confirmation email).
 *
 * SETUP
 * 1. Create a Google Sheet. Row 1 headers: A1 = "Timestamp", B1 = "Email".
 * 2. Extensions -> Apps Script. Delete any code and paste this file.
 * 3. Deploy -> New deployment -> type "Web app".
 *      - Execute as: Me
 *      - Who has access: Anyone
 *    Copy the Web app URL and paste it into SCRIPT_URL in index.html.
 *
 * NOTE: Sending email needs an extra permission. The first time you save/deploy
 * after adding sendConfirmation, Google will ask you to authorize Gmail sending —
 * approve it (Advanced -> Go to project -> Allow).
 *
 * IMPORTANT: after ANY code change you must re-deploy for it to take effect:
 * Deploy -> Manage deployments -> edit (pencil) -> Deploy.
 */
function doPost(e) {
  try {
    var email = (e && e.parameter && e.parameter.email ? e.parameter.email : "").trim();
    if (!email) return ContentService.createTextOutput("no email");

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];

    // Only add + email new signups (skip duplicates in column B).
    var existing = sheet.getRange("B:B").getValues().join("\n").toLowerCase();
    if (existing.indexOf(email.toLowerCase()) === -1) {
      sheet.appendRow([new Date(), email]);
      sendConfirmation(email);
    }
    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("error");
  }
}

function sendConfirmation(email) {
  try {
    var subject = "You're on the Glyph waitlist";
    var html =
      '<div style="font-family:Georgia,serif;max-width:480px;margin:auto;color:#2C2418;line-height:1.6">' +
        '<h2 style="color:#A8905C;margin:0 0 10px">You’re on the list.</h2>' +
        '<p>Thanks for joining the <b>Glyph</b> waitlist — the classroom that lives inside your notebook.</p>' +
        '<p>We’ll email you the moment we open up. Until then, keep writing by hand.</p>' +
        '<p style="color:#8C7E6A;margin-top:20px">— Vaibhav &amp; Sudeep</p>' +
      '</div>';
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: html, name: "Glyph" });
  } catch (err) {
    // If email fails (e.g. daily quota hit), the signup is still saved to the sheet.
  }
}
