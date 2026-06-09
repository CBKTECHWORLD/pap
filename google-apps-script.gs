// ============================================================
//  Pupils & Peoples Foundation — Google Apps Script
//  Paste this ENTIRE file into:
//  script.google.com → New Project → Replace Code.gs
//
//  Then: Deploy → New Deployment → Web App
//        Execute as: Me
//        Who has access: Anyone
//  Copy the Web App URL and paste it into:
//    - index.html  → const SHEET_URL = '...'
//    - admin.html  → Settings → Sheet URL field
// ============================================================

const SPREADSHEET_ID = ''; // ← Paste your Google Sheet ID here (from its URL)
const SHEET_NAME_VOL = 'Volunteers';
const SHEET_NAME_MEM = 'Members';
const FROM_EMAIL     = 'pupilsandpeoples@gmail.com'; // Must be your Gmail
const ORG_NAME       = 'Pupils & Peoples Foundation';
const ORG_WEBSITE    = 'pupilsandpeoples.org';
const ADMIN_EMAIL    = 'pupilsandpeoples@gmail.com'; // Gets notified on new submission

// ============================================================
//  ENTRY POINT — handles POST requests from the website forms
// ============================================================
function doPost(e) {
  try {
    const raw  = e.postData ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    if (data.action === 'sendIdCard') {
      // Called by admin.html when admin clicks Approve
      sendIdCardEmail(data);
    } else {
      // Called by index.html on form submission
      saveToSheet(data);
      notifyAdmin(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Also handle GET (for testing the deployment URL in browser)
function doGet() {
  return ContentService
    .createTextOutput('Pupils & Peoples Foundation — Script is live ✅')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
//  SAVE FORM SUBMISSION TO GOOGLE SHEET
// ============================================================
function saveToSheet(data) {
  const ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = data.type === 'member' ? SHEET_NAME_MEM : SHEET_NAME_VOL;

  // Auto-create sheet with header row if it doesn't exist
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = data.type === 'member'
      ? ['Timestamp','Name','Email','Phone','DOB','Gender','City','Profession','Address','Plan','Message','Status','Assigned ID','Approved On']
      : ['Timestamp','Name','Email','Phone','DOB','Gender','City','Occupation','Interest','Motivation','Status','Assigned ID','Approved On'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#FF6B00').setFontColor('#FFFFFF').setFontWeight('bold');
  }

  const row = data.type === 'member'
    ? [data.timestamp, data.name, data.email, data.phone, data.dob,
       data.gender, data.city, data.profession||'', data.address||'',
       data.plan||'Silver', data.message||'', 'Pending', '', '']
    : [data.timestamp, data.name, data.email, data.phone, data.dob,
       data.gender, data.city, data.occupation||'', data.interest||'',
       data.motivation||'', 'Pending', '', ''];

  sheet.appendRow(row);
  Logger.log('Saved: ' + data.name + ' → ' + sheetName);
}

// ============================================================
//  NOTIFY ADMIN on new submission
// ============================================================
function notifyAdmin(data) {
  const type    = data.type === 'member' ? 'Member' : 'Volunteer';
  const subject = `[P&P] New ${type} Application — ${data.name}`;
  const body    =
    `New ${type.toLowerCase()} application received:\n\n` +
    `Name    : ${data.name}\n` +
    `Email   : ${data.email}\n` +
    `Mobile  : ${data.phone}\n` +
    `City    : ${data.city}\n` +
    (data.type === 'member' ? `Plan    : ${data.plan||'Silver'}\n` : `Interest: ${data.interest||''}\n`) +
    `\nLogin to the admin dashboard to review and approve.\n\n— ${ORG_NAME}`;

  GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
}

// ============================================================
//  SEND ID CARD EMAIL — called from admin dashboard on approval
// ============================================================
function sendIdCardEmail(data) {
  const isVol   = data.type === 'volunteer';
  const roleLabel = isVol ? 'Volunteer' : `Member — ${data.plan || 'Silver'}`;
  const idColor   = '#FF6B00'; // saffron

  // Build HTML email with embedded ID card
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:'Segoe UI',Arial,sans-serif;">

<!-- Wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:32px 0;">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

  <!-- Header bar -->
  <tr>
    <td style="background:linear-gradient(135deg,#FF6B00,#C44D00);padding:24px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="width:48px;height:48px;border-radius:50%;background:white;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#FF6B00;font-size:13px;vertical-align:middle;">P&amp;P</div>
            &nbsp;
            <span style="color:white;font-size:18px;font-weight:700;vertical-align:middle;">${ORG_NAME}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Greeting -->
  <tr>
    <td style="padding:28px 32px 0;">
      <p style="font-size:15px;color:#1A1612;margin:0 0 8px;">Dear <strong>${data.name}</strong>,</p>
      <p style="font-size:14px;color:#6B5C4E;line-height:1.7;margin:0 0 24px;">
        Your ${isVol ? 'volunteer registration' : 'membership application'} with <strong>${ORG_NAME}</strong> has been
        <span style="color:#2D7A4F;font-weight:700;">approved</span>! 🎉
        Please find your official ${isVol ? 'Volunteer' : 'Member'} ID card below.
      </p>
    </td>
  </tr>

  <!-- ===== ID CARD ===== -->
  <tr>
    <td style="padding:0 32px 28px;">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="border:2px solid #FF6B00;border-radius:14px;overflow:hidden;max-width:380px;margin:0 auto;">

        <!-- Card header -->
        <tr>
          <td style="background:linear-gradient(135deg,#FF6B00,#C44D00);padding:14px 18px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="width:44px;">
                  <div style="width:42px;height:42px;border-radius:50%;background:white;text-align:center;line-height:42px;font-weight:700;color:#FF6B00;font-size:12px;">P&amp;P</div>
                </td>
                <td style="padding-left:12px;">
                  <div style="color:white;font-size:14px;font-weight:700;">${ORG_NAME}</div>
                  <div style="color:rgba(255,255,255,0.82);font-size:10px;margin-top:2px;">Community Service NGO</div>
                </td>
                <td align="right">
                  <div style="background:rgba(255,255,255,0.2);color:white;font-size:10px;font-weight:700;padding:4px 10px;border-radius:100px;letter-spacing:1px;">
                    ${isVol ? 'VOLUNTEER' : 'MEMBER'}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card photo placeholder + name -->
        <tr>
          <td style="background:white;padding:20px 18px 14px;text-align:center;">
            <div style="width:72px;height:72px;border-radius:50%;background:#FFF0E0;border:3px solid #FF6B00;margin:0 auto 12px;line-height:72px;font-size:28px;">🙋</div>
            <div style="font-size:18px;font-weight:700;color:#1A1612;">${data.name}</div>
            <div style="font-size:11px;color:#FF6B00;font-weight:700;letter-spacing:1px;margin-top:3px;text-transform:uppercase;">${roleLabel}</div>
          </td>
        </tr>

        <!-- Card details -->
        <tr>
          <td style="background:white;padding:0 18px 14px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;">
              <tr>
                <td style="padding:5px 0;border-bottom:0.5px solid #eee;color:#6B5C4E;">Mobile</td>
                <td style="padding:5px 0;border-bottom:0.5px solid #eee;text-align:right;font-weight:600;">${data.phone}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;border-bottom:0.5px solid #eee;color:#6B5C4E;">City</td>
                <td style="padding:5px 0;border-bottom:0.5px solid #eee;text-align:right;font-weight:600;">${data.city}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;border-bottom:0.5px solid #eee;color:#6B5C4E;">${isVol ? 'Area of Work' : 'Plan'}</td>
                <td style="padding:5px 0;border-bottom:0.5px solid #eee;text-align:right;font-weight:600;">${isVol ? (data.interest||'General') : (data.plan||'Silver')}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;border-bottom:0.5px solid #eee;color:#6B5C4E;">Joined</td>
                <td style="padding:5px 0;border-bottom:0.5px solid #eee;text-align:right;font-weight:600;">${data.joinDate}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;color:#6B5C4E;">Valid Until</td>
                <td style="padding:5px 0;text-align:right;font-weight:600;color:#2D7A4F;">${data.validUntil}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Card footer -->
        <tr>
          <td style="background:#2D7A4F;padding:10px 18px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="color:white;font-size:12px;font-weight:700;letter-spacing:1.5px;">${data.assignedId}</div>
                  <div style="color:rgba(255,255,255,0.6);font-size:10px;margin-top:2px;">${ORG_WEBSITE}</div>
                </td>
                <td align="right">
                  <div style="color:rgba(255,255,255,0.5);font-size:10px;">Authorised by Admin</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>

  <!-- Instructions -->
  <tr>
    <td style="padding:0 32px 28px;">
      <div style="background:#E8F5EE;border-radius:12px;padding:16px 18px;">
        <p style="font-size:13px;font-weight:700;color:#1A4D30;margin:0 0 8px;">📌 How to use your ID card</p>
        <ul style="font-size:13px;color:#2D7A4F;line-height:1.8;margin:0;padding-left:18px;">
          <li>Take a screenshot or save this email for your ID card.</li>
          <li>Present this ID at all Pupils &amp; Peoples events and programs.</li>
          <li>Your ID is valid for 1 year from the date of joining.</li>
          <li>Renewal is managed by the admin — you'll be notified before expiry.</li>
          <li>For any queries contact us at <strong>${FROM_EMAIL}</strong></li>
        </ul>
      </div>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#1A1612;padding:20px 32px;">
      <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;text-align:center;">
        © ${new Date().getFullYear()} ${ORG_NAME} — Serving Communities with Love 🙏<br>
        <a href="mailto:${FROM_EMAIL}" style="color:#FF6B00;text-decoration:none;">${FROM_EMAIL}</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`;

  const subject = `[P&P] Your ${isVol ? 'Volunteer' : 'Membership'} ID Card — ${data.assignedId}`;
  const plain   =
    `Dear ${data.name},\n\n` +
    `Your application has been approved!\n\n` +
    `ID        : ${data.assignedId}\n` +
    `Name      : ${data.name}\n` +
    `Role      : ${roleLabel}\n` +
    `Mobile    : ${data.phone}\n` +
    `City      : ${data.city}\n` +
    `Joined    : ${data.joinDate}\n` +
    `Valid Till: ${data.validUntil}\n\n` +
    `Please present this ID at all Pupils & Peoples programs.\n\n` +
    `Thank you for being part of our family!\n— ${ORG_NAME}`;

  GmailApp.sendEmail(data.email, subject, plain, { htmlBody: html, name: ORG_NAME });
  Logger.log('ID card email sent to: ' + data.email);

  // Also update the sheet row to mark as Approved
  updateSheetStatus(data);
}

// ============================================================
//  UPDATE SHEET STATUS after approval
// ============================================================
function updateSheetStatus(data) {
  try {
    const ss        = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheetName = data.type === 'member' ? SHEET_NAME_MEM : SHEET_NAME_VOL;
    const sheet     = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const values = sheet.getDataRange().getValues();
    // Email is column index 2 (0-based), Status col index 10 or 11
    for (let i = 1; i < values.length; i++) {
      if (values[i][2] === data.email) {
        // Find Status column (second to last before AssignedId)
        const statusCol  = values[0].indexOf('Status')  + 1;
        const idCol      = values[0].indexOf('Assigned ID') + 1;
        const approvedCol= values[0].indexOf('Approved On') + 1;
        if (statusCol)   sheet.getRange(i + 1, statusCol).setValue('Approved');
        if (idCol)       sheet.getRange(i + 1, idCol).setValue(data.assignedId);
        if (approvedCol) sheet.getRange(i + 1, approvedCol).setValue(new Date().toLocaleDateString('en-IN'));
        break;
      }
    }
  } catch (err) {
    Logger.log('Sheet update error: ' + err.message);
  }
}
