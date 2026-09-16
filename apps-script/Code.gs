/**
 * Glyph waitlist -> Google Sheets, with referral codes + confirmation email
 * from glyphedu.tech (via Resend, Gmail fallback).
 *
 * SHEET LAYOUT (first sheet):
 *   A: Timestamp   B: Email   C: Code (their referral code)   D: Referred By
 * The script writes the C1/D1 headers itself if they are missing.
 *
 * SETUP (same as before)
 * 1. Script property RESEND_API_KEY holds the Resend key
 *    (Project Settings gear -> Script Properties).
 * 2. After ANY code change: Deploy -> Manage deployments -> pencil ->
 *    Version: New version -> Deploy. (Not "New deployment".)
 *
 * ONE-TIME FOR THE REFERRAL LAUNCH
 * 3. Run setupLeaderboard() once from the editor: creates a "Leaderboard"
 *    sheet that ranks everyone by signups brought in. It updates itself.
 * 4. Run backfillCodes() from the editor: gives every existing signup a
 *    code and emails it to them. Sends at most 90 emails per run (Resend
 *    free tier is 100/day) — if it logs "run again tomorrow", do that.
 */

var FROM = "Glyph <hello@glyphedu.tech>";
var REPLY_TO = "vaibhavgollapalli5@gmail.com";

/* ---- referral contest settings: EDIT THESE ---- */
var PRIZE = "$500";
var CONTEST_END = "October 15, 2026"; // <-- set the real end date before launching

function doPost(e) {
  try {
    var email = (e && e.parameter && e.parameter.email ? e.parameter.email : "").trim();
    if (!email) return ContentService.createTextOutput("no email");
    var ref = (e && e.parameter && e.parameter.ref ? e.parameter.ref : "").trim().toUpperCase();

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    ensureHeaders(sheet);

    // Only add + email new signups (skip duplicates in column B).
    var existing = sheet.getRange("B:B").getValues().join("\n").toLowerCase();
    if (existing.indexOf(email.toLowerCase()) === -1) {
      var codes = allCodes(sheet);
      if (ref && codes.indexOf(ref) === -1) ref = ""; // ignore codes that don't exist
      var code = makeCode(codes);
      sheet.appendRow([new Date(), email, code, ref]);
      sendConfirmation(email, code);
    }
    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("error");
  }
}

function ensureHeaders(sheet) {
  if (!sheet.getRange("C1").getValue()) sheet.getRange("C1").setValue("Code");
  if (!sheet.getRange("D1").getValue()) sheet.getRange("D1").setValue("Referred By");
}

function allCodes(sheet) {
  return sheet.getRange("C:C").getValues().map(function (r) {
    return String(r[0] || "").trim().toUpperCase();
  }).filter(String);
}

function makeCode(existingCodes) {
  var alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
  for (var attempt = 0; attempt < 50; attempt++) {
    var s = "GLYPH-";
    for (var i = 0; i < 4; i++) s += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    if (existingCodes.indexOf(s) === -1) return s;
  }
  return "GLYPH-" + new Date().getTime().toString(36).toUpperCase().slice(-5);
}

function referralBlock(code) {
  var link = "https://glyphedu.tech/?ref=" + code;
  return (
    '<div style="background:#F4EFE6;border-radius:14px;padding:18px 20px;margin:24px 0">' +
      '<p style="margin:0 0 6px;font-size:14px;color:#8C7E6A">Your referral code</p>' +
      '<p style="margin:0;font-size:24px;letter-spacing:2px;font-weight:bold;color:#2C2418">' + code + '</p>' +
      '<p style="margin:12px 0 0;font-size:14px">Share your link: <a href="' + link + '" style="color:#2C2418">' + link + '</a></p>' +
    '</div>' +
    '<p style="font-size:14px;color:#5C5344;margin:0 0 6px"><b>The referral game:</b></p>' +
    '<p style="font-size:14px;color:#5C5344;margin:0">' +
      'Every signup that joins through your link or enters your code counts as yours. ' +
      'Whoever brings in the most people by ' + CONTEST_END + ' wins <b>' + PRIZE + '</b>. ' +
      'One entry per real person — duplicate or throwaway emails are removed, and the winning count is verified before payout.' +
    '</p>'
  );
}

function confirmationHtml(code) {
  return (
    '<div style="font-family:Georgia,serif;max-width:480px;margin:auto;color:#2C2418;line-height:1.6">' +
      '<h2 style="color:#A8905C;margin:0 0 10px">You&rsquo;re on the list.</h2>' +
      '<p>Thanks for joining the <b>Glyph</b> waitlist — the classroom that lives inside your notebook.</p>' +
      '<p>We&rsquo;ll email you the moment we open up. Until then, keep writing by hand.</p>' +
      referralBlock(code) +
      '<p style="color:#8C7E6A;margin-top:20px">— Vaibhav &amp; Sudeep</p>' +
      '<img src="https://glyphedu.tech/img/logo-email.png" width="48" height="48" alt="Glyph" ' +
        'style="display:block;margin:24px 0 0" />' +
    '</div>'
  );
}

function backfillHtml(code) {
  return (
    '<div style="font-family:Georgia,serif;max-width:480px;margin:auto;color:#2C2418;line-height:1.6">' +
      '<h2 style="color:#A8905C;margin:0 0 10px">Your Glyph referral code is here.</h2>' +
      '<p>You&rsquo;re already on the <b>Glyph</b> waitlist — now you can bring friends and get paid for it.</p>' +
      referralBlock(code) +
      '<p style="color:#8C7E6A;margin-top:20px">— Vaibhav &amp; Sudeep</p>' +
      '<img src="https://glyphedu.tech/img/logo-email.png" width="48" height="48" alt="Glyph" ' +
        'style="display:block;margin:24px 0 0" />' +
    '</div>'
  );
}

function sendConfirmation(email, code) {
  sendHtml(email, "You're on the Glyph waitlist", confirmationHtml(code));
}

function sendHtml(email, subject, html) {
  var key = PropertiesService.getScriptProperties().getProperty("RESEND_API_KEY");
  if (key) {
    try {
      var response = UrlFetchApp.fetch("https://api.resend.com/emails", {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + key },
        payload: JSON.stringify({ from: FROM, to: [email], reply_to: REPLY_TO, subject: subject, html: html }),
        muteHttpExceptions: true
      });
      if (response.getResponseCode() < 300) return true; // sent from the domain
    } catch (err) { /* fall through */ }
  }
  try {
    MailApp.sendEmail({ to: email, subject: subject, htmlBody: html, name: "Glyph", replyTo: REPLY_TO });
    return true;
  } catch (err) { return false; }
}

/**
 * ONE-TIME: give every existing signup a referral code and email it to them.
 * Safe to re-run — rows that already have a code are skipped, so nobody is
 * emailed twice. Caps at 90 emails per run (Resend free tier = 100/day);
 * if the log says "run again tomorrow", run it again the next day.
 */
function backfillCodes() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  ensureHeaders(sheet);
  var last = sheet.getLastRow();
  if (last < 2) { Logger.log("No signups yet."); return; }
  var rows = sheet.getRange(2, 1, last - 1, 3).getValues(); // A,B,C
  var codes = allCodes(sheet);
  var sent = 0, skipped = 0;
  for (var i = 0; i < rows.length; i++) {
    var email = String(rows[i][1] || "").trim();
    var has = String(rows[i][2] || "").trim();
    if (!email || has) { skipped++; continue; }
    if (sent >= 90) { Logger.log("Hit 90 sends — run again tomorrow for the rest."); return; }
    var code = makeCode(codes);
    codes.push(code);
    sheet.getRange(i + 2, 3).setValue(code);
    sendHtml(email, "Your Glyph referral code — top referrer wins " + PRIZE, backfillHtml(code));
    sent++;
    Utilities.sleep(600); // stay under Resend's 2 req/sec limit
  }
  Logger.log("Done. Emailed " + sent + " people, skipped " + skipped + " (already had codes).");
}

/**
 * ONE-TIME: creates a "Leaderboard" sheet ranking everyone by referrals.
 * The formula recomputes live as signups come in.
 */
function setupLeaderboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var src = ss.getSheets()[0].getName();
  var lb = ss.getSheetByName("Leaderboard") || ss.insertSheet("Leaderboard");
  lb.getRange("A1").setValue("Email");
  lb.getRange("B1").setValue("Code");
  lb.getRange("C1").setValue("Referrals");
  lb.getRange("A2").setFormula(
    "=IFERROR(SORT(FILTER({'" + src + "'!B2:B, '" + src + "'!C2:C, " +
    "ARRAYFORMULA(COUNTIF('" + src + "'!D2:D, '" + src + "'!C2:C))}, " +
    "'" + src + "'!C2:C<>\"\"), 3, FALSE), \"no signups yet\")"
  );
  Logger.log("Leaderboard sheet ready.");
}

/** Test: sends yourself the new-signup email with a dummy code. */
function testResend() {
  sendConfirmation(REPLY_TO, "GLYPH-TEST");
}
