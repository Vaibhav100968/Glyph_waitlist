/**
 * Glyph waitlist -> Google Sheets (+ confirmation email from glyphedu.tech).
 *
 * The confirmation is sent through Resend so it comes from
 * "Glyph <hello@glyphedu.tech>" with SPF/DKIM, instead of a personal Gmail.
 * Replies go to REPLY_TO (Resend is send-only; the domain has no inbox).
 *
 * SETUP
 * 1. Google Sheet with row 1 headers: A1 = "Timestamp", B1 = "Email".
 * 2. Extensions -> Apps Script. Replace all code with this file.
 * 3. Store the Resend API key OUTSIDE the code:
 *      Project Settings (gear icon) -> Script Properties -> Add script property
 *        Property: RESEND_API_KEY
 *        Value:    (paste the key from resend.com -> API Keys)
 * 4. Deploy -> Manage deployments -> edit (pencil) -> Deploy.
 *    (Every code change needs this re-deploy step to take effect.)
 *
 * If the key is missing or Resend errors, it falls back to MailApp (Gmail)
 * so no signup ever goes without a confirmation.
 */

var FROM = "Glyph <hello@glyphedu.tech>";
var REPLY_TO = "vaibhavgollapalli5@gmail.com";

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

function confirmationHtml() {
  return (
    '<div style="font-family:Georgia,serif;max-width:480px;margin:auto;color:#2C2418;line-height:1.6">' +
      '<h2 style="color:#A8905C;margin:0 0 10px">You’re on the list.</h2>' +
      '<p>Thanks for joining the <b>Glyph</b> waitlist — the classroom that lives inside your notebook.</p>' +
      '<p>We’ll email you the moment we open up. Until then, keep writing by hand.</p>' +
      '<p style="color:#8C7E6A;margin-top:20px">— Vaibhav &amp; Sudeep</p>' +
    '</div>'
  );
}

function sendConfirmation(email) {
  var subject = "You're on the Glyph waitlist";
  var html = confirmationHtml();

  var key = PropertiesService.getScriptProperties().getProperty("RESEND_API_KEY");
  if (key) {
    try {
      var response = UrlFetchApp.fetch("https://api.resend.com/emails", {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + key },
        payload: JSON.stringify({
          from: FROM,
          to: [email],
          reply_to: REPLY_TO,
          subject: subject,
          html: html
        }),
        muteHttpExceptions: true
      });
      if (response.getResponseCode() < 300) return; // sent from the domain
      // Non-2xx (bad key, quota, etc.) falls through to the Gmail fallback.
    } catch (err) {
      // Network failure falls through to the Gmail fallback.
    }
  }

  try {
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: html, name: "Glyph", replyTo: REPLY_TO });
  } catch (err) {
    // If all sending fails (e.g. quota), the signup is still saved to the sheet.
  }
}

/**
 * Run this once from the editor (select "testResend" -> Run) after adding the
 * script property, to confirm domain sending works. Check your own inbox.
 */
function testResend() {
  sendConfirmation(REPLY_TO);
}
