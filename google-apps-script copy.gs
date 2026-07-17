// ============================================================
//  Pupils & Peoples Foundation — Google Apps Script  v3
//  Deploy as Web App:
//    Execute as: Me  |  Who has access: Anyone
// ============================================================

const SPREADSHEET_ID = '1qEZOLwC3efI0zPlmI03PtHiMe8Nk9mBkjhgIuzybyR0';
const SHEET_VOL       = 'Volunteers';
const SHEET_MEM       = 'Members';
const SHEET_DONATIONS = 'Donations';
const SHEET_PRODUCTS  = 'Products';
const SHEET_SALES     = 'Sales';
const SHEET_STAFF     = 'Staff';
const SHEET_EXPENSES  = 'Expenses';
const SHEET_PURCHASES = 'Purchases';
const SHEET_STAFF_HR  = 'StaffHR';
const SHEET_SALARY    = 'Salary';
const SHEET_REIMBURSE = 'Reimbursements';
const ORG_NAME        = 'Pupils & Peoples Foundation';
const ORG_WEBSITE     = 'pupilsandpeoples.org';
const ORG_EMAIL       = 'pupilsandpeoples@gmail.com';
const ORG_PHONE       = '+91 XXXXX XXXXX';
const ORG_ADDRESS     = 'Your Head Office Address, City, State — PIN'; // main / registered address
const ORG_BRANCHES     = [
  // Add more branches as needed — shown at the bottom of every receipt
  // { name: 'Branch Name', address: 'Branch address here' },
];
const ORG_PAN         = 'AAAAA0000A'; // PAN for 80G receipt
const ORG_80G_NO      = 'AAAAA0000A/80G/000001/2025-26'; // 80G registration number — update once registered
const ORG_LOGO_URL    = ''; // paste a public image URL for your logo, used in receipts
const ADMIN_EMAIL     = 'pupilsandpeoples@gmail.com';

// ============================================================
//  GENERATE UNIQUE IDs
// ============================================================
function generateId(type) {
  const prefix = type === 'member' ? 'PAP-MEM' : 'PAP-VOL';
  const year   = new Date().getFullYear();
  const num    = Math.floor(1000 + Math.random() * 9000);
  return prefix + '-' + year + '-' + num;
}
function generateReceiptNo(is80g) {
  const year = new Date().getFullYear();
  const num  = Math.floor(10000 + Math.random() * 90000);
  return (is80g ? 'PAP-80G-' : 'PAP-RCT-') + year + '-' + num;
}
function generateInvoiceNo() {
  const year = new Date().getFullYear();
  const num  = Math.floor(1000 + Math.random() * 9000);
  return 'PAP-INV-' + year + '-' + num;
}

// ============================================================
//  doGet — router for ALL actions (form submit, admin fetch, etc.)
// ============================================================
function doGet(e) {
  const p = e && e.parameter ? e.parameter : {};
  try {
    let result;

    switch (p.action) {
      case 'getAll':          result = getAllData(); break;
      case 'approve':         result = approveEntry(p.rowIndex, p.sheetName, p.assignedId); break;
      case 'reject':          result = rejectEntry(p.rowIndex, p.sheetName); break;

      case 'login':           result = staffLogin(p.username, p.password); break;

      case 'lookupDonor':      result = lookupDonor(p.query); break;
      case 'saveDonation':     result = saveDonation(p); break;
      case 'previewReceipt':   result = previewReceipt(p); break;
      case 'getDonations':     result = getDonations(); break;
      case 'sendReceipt':      result = sendReceiptEmail(p); break;

      case 'getProducts':      result = getProducts(); break;
      case 'saveProduct':      result = saveProduct(p); break;
      case 'deleteProduct':    result = deleteProduct(p.sku); break;

      case 'getSales':         result = getSales(); break;
      case 'saveSale':         result = saveSale(p); break;
      case 'previewInvoice':   result = previewInvoice(p); break;
      case 'sendInvoice':      result = sendInvoiceEmail(p); break;

      case 'getStaff':         result = getStaffList(); break;
      case 'saveStaff':        result = saveStaff(p); break;
      case 'deleteStaff':      result = deleteStaff(p.username); break;

      case 'getExpenses':      result = getExpenses(); break;
      case 'saveExpense':      result = saveExpense(p); break;
      case 'deleteExpense':    result = deleteExpense(p.rowIndex); break;

      case 'getPurchases':     result = getPurchases(); break;
      case 'savePurchase':     result = savePurchase(p); break;
      case 'deletePurchase':   result = deletePurchase(p.rowIndex); break;
      case 'updatePurchaseStatus': result = updatePurchaseStatus(p.rowIndex, p.status); break;

      case 'getStaffHR':       result = getStaffHR(); break;
      case 'saveStaffHR':      result = saveStaffHR(p); break;
      case 'deleteStaffHR':    result = deleteStaffHR(p.employeeId); break;

      case 'getSalaries':      result = getSalaries(); break;
      case 'saveSalary':       result = saveSalary(p); break;
      case 'deleteSalary':     result = deleteSalary(p.rowIndex); break;

      case 'getReimbursements':   result = getReimbursements(); break;
      case 'saveReimbursement':   result = saveReimbursement(p); break;
      case 'updateReimbursement': result = updateReimbursementStatus(p.rowIndex, p.status); break;

      case 'getFinanceSummary':   result = getFinanceSummary(); break;

      default:
        if (p.name) {
          // Volunteer / Member form submission
          const assignedId = generateId(p.type);
          p.assignedId = assignedId;
          saveToSheet(p);
          notifyAdmin(p);
          result = { success: true, assignedId: assignedId };
        } else {
          result = { success: true, message: ORG_NAME + ' Script v3 — Live ✅' };
        }
    }

    return respond(result, p.callback);

  } catch (err) {
    return respond({ success: false, error: err.message }, p.callback);
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData ? e.postData.contents : '{}');
    let result;
    if (data.action === 'sendIdCard') { sendIdCardEmail(data); result = { success: true }; }
    else {
      const assignedId = generateId(data.type);
      data.assignedId  = assignedId;
      saveToSheet(data);
      notifyAdmin(data);
      result = { success: true, assignedId: assignedId };
    }
    return respond(result, null);
  } catch (err) {
    return respond({ success: false, error: err.message }, null);
  }
}

function respond(obj, callback) {
  const json = JSON.stringify(obj);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + json + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
//  SHEET HELPER — get or create with headers
// ============================================================
function getOrCreateSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setBackground('#0E4F4F').setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}
function sheetToObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const isBlankRow = values[i].every(function(cell) { return cell === '' || cell === null || cell === undefined; });
    if (isBlankRow) continue; // skip ghost/blank rows
    const row = {};
    headers.forEach(function(h, j) { row[h] = values[i][j] !== undefined ? values[i][j] : ''; });
    row._rowIndex = i + 1;
    rows.push(row);
  }
  return rows;
}

// ============================================================
//  VOLUNTEERS / MEMBERS  (unchanged from v2)
// ============================================================
function getAllData() {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const rows = [];
  [SHEET_VOL, SHEET_MEM].forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    const objs = sheetToObjects(sheet);
    objs.forEach(function(row, idx) {
      row._sheetName = sheetName;
      row._id = sheetName + '_' + row._rowIndex;
      rows.push(row);
    });
  });
  return { success: true, data: rows };
}

function approveEntry(rowIndex, sheetName, assignedId) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Sheet not found' };

  const headers     = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol   = headers.indexOf('Status') + 1;
  const idCol       = headers.indexOf('Assigned ID') + 1;
  const approvedCol = headers.indexOf('Approved On') + 1;
  const row = parseInt(rowIndex);

  if (statusCol)   sheet.getRange(row, statusCol).setValue('Approved');
  if (idCol)       sheet.getRange(row, idCol).setValue(assignedId);
  if (approvedCol) sheet.getRange(row, approvedCol).setValue(new Date().toLocaleDateString('en-IN'));

  const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowObj  = {};
  headers.forEach(function(h, j) { rowObj[h] = rowData[j] || ''; });
  rowObj.assignedId = assignedId;
  rowObj.type       = sheetName === SHEET_MEM ? 'member' : 'volunteer';

  const expDate = new Date();
  expDate.setFullYear(expDate.getFullYear() + 1);
  rowObj.joinDate   = new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'long', year:'numeric'});
  rowObj.validUntil = expDate.toLocaleDateString('en-IN', {day:'2-digit', month:'long', year:'numeric'});
  rowObj.phone      = rowObj['Phone'] || '';
  rowObj.email      = rowObj['Email'] || '';
  rowObj.name       = rowObj['Name']  || '';
  rowObj.city       = rowObj['City']  || '';
  rowObj.plan       = rowObj['Plan']  || 'Silver';
  rowObj.interest   = rowObj['Interest'] || 'General';

  sendIdCardEmail(rowObj);
  return { success: true };
}

function rejectEntry(rowIndex, sheetName) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { success: false, error: 'Sheet not found' };
  const headers   = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('Status') + 1;
  if (statusCol) sheet.getRange(parseInt(rowIndex), statusCol).setValue('Rejected');
  return { success: true };
}

function saveToSheet(data) {
  const sheetName = data.type === 'member' ? SHEET_MEM : SHEET_VOL;
  const headers = data.type === 'member'
    ? ['Timestamp','Name','Email','Phone','DOB','Gender','City','Profession','Address','Plan','Message','Status','Assigned ID','Approved On']
    : ['Timestamp','Name','Email','Phone','DOB','Gender','City','Occupation','Interest','Motivation','Status','Assigned ID','Approved On'];
  const sheet = getOrCreateSheet(sheetName, headers);

  const row = data.type === 'member'
    ? [data.timestamp||new Date().toISOString(), data.name, data.email, data.phone, data.dob||'', data.gender||'', data.city, data.profession||'', data.address||'', data.plan||'Silver', data.message||'', 'Pending', data.assignedId||'', '']
    : [data.timestamp||new Date().toISOString(), data.name, data.email, data.phone, data.dob||'', data.gender||'', data.city, data.occupation||'', data.interest||'', data.motivation||'', 'Pending', data.assignedId||'', ''];

  sheet.appendRow(row);
}

function notifyAdmin(data) {
  try {
    const type = data.type === 'member' ? 'Member' : 'Volunteer';
    const subject = '[P&P] New ' + type + ' Application — ' + data.name;
    const body = 'New ' + type.toLowerCase() + ' application received:\n\n'
      + 'Name: ' + data.name + '\nEmail: ' + data.email + '\nMobile: ' + data.phone + '\nCity: ' + data.city
      + '\nAssigned ID: ' + data.assignedId + '\n\nLogin to admin panel to approve.\n\n— ' + ORG_NAME;
    GmailApp.sendEmail(ADMIN_EMAIL, subject, body);
  } catch(e) { Logger.log('notifyAdmin error: ' + e.message); }
}

function sendIdCardEmail(data) {
  const isVol = data.type === 'volunteer';
  const roleLabel = isVol ? 'Volunteer' : 'Member — ' + (data.plan || 'Silver');
  const html = buildIdCardHtml(data, roleLabel, isVol);
  const subject = '[P&P] Your ID Card — ' + data.assignedId;
  const plain = 'Dear ' + data.name + ',\n\nYour application is approved!\nID: ' + data.assignedId + '\nValid Till: ' + data.validUntil + '\n\n— ' + ORG_NAME;
  try {
    GmailApp.sendEmail(data.email, subject, plain, { htmlBody: html, name: ORG_NAME });
  } catch(e) { Logger.log('sendIdCardEmail error: ' + e.message); }
}

function buildIdCardHtml(data, roleLabel, isVol) {
  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F7F5F2;font-family:Arial,sans-serif;">'
  + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:32px 0;"><tr><td align="center">'
  + '<table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">'
  + '<tr><td style="background:linear-gradient(135deg,#0E4F4F,#0A3D3D);padding:24px 32px;">'
  + '<span style="color:white;font-size:20px;font-weight:700;">' + ORG_NAME + '</span></td></tr>'
  + '<tr><td style="padding:28px 32px 0;">'
  + '<p style="font-size:15px;color:#1A1612;margin:0 0 8px;">Dear <strong>' + data.name + '</strong>,</p>'
  + '<p style="font-size:14px;color:#6B5C4E;line-height:1.7;margin:0 0 24px;">Your application has been <span style="color:#2D7A4F;font-weight:700;">approved</span>! Here is your official ID card.</p>'
  + '</td></tr>'
  + '<tr><td style="padding:0 32px 28px;">'
  + '<table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0E4F4F;border-radius:14px;overflow:hidden;max-width:380px;margin:0 auto;">'
  + '<tr><td style="background:linear-gradient(135deg,#0E4F4F,#0A3D3D);padding:14px 18px;"><span style="color:white;font-size:14px;font-weight:700;">' + ORG_NAME + '</span></td></tr>'
  + '<tr><td style="background:white;padding:20px 18px 14px;text-align:center;">'
  + '<div style="font-size:20px;font-weight:700;color:#1A1612;">' + data.name + '</div>'
  + '<div style="font-size:11px;color:#0E4F4F;font-weight:700;letter-spacing:1px;margin-top:3px;text-transform:uppercase;">' + roleLabel + '</div>'
  + '</td></tr>'
  + '<tr><td style="background:white;padding:0 18px 14px;">'
  + '<table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px;">'
  + '<tr><td style="padding:5px 0;border-bottom:0.5px solid #eee;color:#6B5C4E;">ID Number</td><td style="padding:5px 0;border-bottom:0.5px solid #eee;text-align:right;font-weight:700;color:#0E4F4F;">' + data.assignedId + '</td></tr>'
  + '<tr><td style="padding:5px 0;border-bottom:0.5px solid #eee;color:#6B5C4E;">Mobile</td><td style="padding:5px 0;border-bottom:0.5px solid #eee;text-align:right;font-weight:600;">' + data.phone + '</td></tr>'
  + '<tr><td style="padding:5px 0;border-bottom:0.5px solid #eee;color:#6B5C4E;">City</td><td style="padding:5px 0;border-bottom:0.5px solid #eee;text-align:right;font-weight:600;">' + data.city + '</td></tr>'
  + '<tr><td style="padding:5px 0;border-bottom:0.5px solid #eee;color:#6B5C4E;">' + (isVol ? 'Area of Work' : 'Plan') + '</td><td style="padding:5px 0;border-bottom:0.5px solid #eee;text-align:right;font-weight:600;">' + (isVol ? (data.interest||'General') : (data.plan||'Silver')) + '</td></tr>'
  + '<tr><td style="padding:5px 0;border-bottom:0.5px solid #eee;color:#6B5C4E;">Joined</td><td style="padding:5px 0;border-bottom:0.5px solid #eee;text-align:right;font-weight:600;">' + data.joinDate + '</td></tr>'
  + '<tr><td style="padding:5px 0;color:#6B5C4E;">Valid Until</td><td style="padding:5px 0;text-align:right;font-weight:600;color:#2D7A4F;">' + data.validUntil + '</td></tr>'
  + '</table></td></tr>'
  + '<tr><td style="background:#2D7A4F;padding:10px 18px;"><span style="color:white;font-size:12px;font-weight:700;letter-spacing:1.5px;">' + data.assignedId + '</span><span style="color:rgba(255,255,255,0.6);font-size:10px;float:right;">' + ORG_WEBSITE + '</span></td></tr>'
  + '</table></td></tr>'
  + '<tr><td style="background:#1A1612;padding:16px 32px;text-align:center;"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0;">© ' + new Date().getFullYear() + ' ' + ORG_NAME + ' 🙏</p></td></tr>'
  + '</table></td></tr></table></body></html>';
}

// ============================================================
//  DONATIONS  +  80G / NORMAL RECEIPTS
// ============================================================
const DONATION_HEADERS = ['Timestamp','Donor Name','Phone','Email','Address','PAN','Amount','Payment Mode','Purpose','Receipt No','Receipt Type','Notes'];

function saveDonation(p) {
  const sheet = getOrCreateSheet(SHEET_DONATIONS, DONATION_HEADERS);
  const receiptNo = generateReceiptNo(p.receiptType === '80G');
  const row = [
    new Date().toISOString(), p.donorName, p.phone||'', p.email||'', p.address||'',
    p.pan||'', p.amount, p.paymentMode||'UPI', p.purpose||'General Donation',
    receiptNo, p.receiptType||'Normal', p.notes||''
  ];
  sheet.appendRow(row);
  return { success: true, receiptNo: receiptNo };
}

function getDonations() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_DONATIONS);
  if (!sheet) return { success: true, data: [] };
  return { success: true, data: sheetToObjects(sheet) };
}

// Lookup donor by phone or email — returns most recent matching record
function lookupDonor(query) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_DONATIONS);
  if (!sheet) return { success: true, found: false };
  const rows = sheetToObjects(sheet);
  const q = (query || '').toString().trim().toLowerCase();
  if (!q) return { success: true, found: false };

  const matches = rows.filter(function(r) {
    return (r['Phone'] && r['Phone'].toString().toLowerCase() === q) ||
           (r['Email'] && r['Email'].toString().toLowerCase() === q);
  });
  if (!matches.length) return { success: true, found: false };

  // Most recent
  const latest = matches[matches.length - 1];
  return {
    success: true,
    found: true,
    donor: {
      name:    latest['Donor Name'] || '',
      phone:   latest['Phone'] || '',
      email:   latest['Email'] || '',
      address: latest['Address'] || '',
      pan:     latest['PAN'] || ''
    },
    totalDonations: matches.length,
    totalAmount: matches.reduce(function(sum, r) { return sum + (parseFloat(r['Amount']) || 0); }, 0)
  };
}

// Build & send the receipt (80G or normal) by email
function sendReceiptEmail(p) {
  const isVol80G  = p.receiptType === '80G';
  const html      = buildReceiptHtml(p, isVol80G);
  const subject   = '[' + ORG_NAME + '] ' + (isVol80G ? '80G Donation Receipt' : 'Donation Receipt') + ' — ' + p.receiptNo;
  const plain     = 'Dear ' + p.donorName + ',\n\nThank you for your generous donation of ₹' + p.amount + '.\nReceipt No: ' + p.receiptNo + '\n\n— ' + ORG_NAME;

  try {
    if (p.email) {
      GmailApp.sendEmail(p.email, subject, plain, { htmlBody: html, name: ORG_NAME });
    }
    return { success: true, html: html };
  } catch(e) {
    return { success: false, error: e.message, html: html };
  }
}

// Preview-only — builds the receipt HTML without saving or sending anything
function previewReceipt(p) {
  const isVol80G = p.receiptType === '80G';
  const html = buildReceiptHtml(p, isVol80G);
  return { success: true, html: html };
}

function buildReceiptHtml(p, is80g) {
  const logoBlock = ORG_LOGO_URL
    ? '<img src="' + ORG_LOGO_URL + '" style="height:56px;display:block;" alt="logo">'
    : '<div style="width:56px;height:56px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;font-weight:700;color:#0E4F4F;font-family:Georgia,serif;font-size:15px;">P&amp;P</div>';

  const amountWords = numberToWordsIndian(parseInt(p.amount) || 0);
  const dateStr = new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'long', year:'numeric'});
  const timeStr = new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});

  const branchesHtml = ORG_BRANCHES.length
    ? '<div style="margin-top:10px;padding-top:10px;border-top:1px dashed #ddd;">'
      + '<div style="font-size:10px;font-weight:700;color:#6B5C4E;letter-spacing:0.5px;margin-bottom:4px;">OTHER BRANCHES</div>'
      + ORG_BRANCHES.map(function(b) {
          return '<div style="font-size:10px;color:#999;line-height:1.5;">' + b.name + ' — ' + b.address + '</div>';
        }).join('')
      + '</div>'
    : '';

  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F7F5F2;font-family:Georgia,Arial,serif;">'
  + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:30px 0;"><tr><td align="center">'
  + '<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #ddd;">'

  // HEADER — logo + org name + reg address
  + '<tr><td style="background:linear-gradient(135deg,#0E4F4F,#0A3D3D);padding:22px 32px;">'
  + '<table width="100%"><tr>'
  + '<td style="width:60px;">' + logoBlock + '</td>'
  + '<td style="padding-left:14px;">'
  + '<div style="color:white;font-size:19px;font-weight:700;font-family:Georgia,serif;">' + ORG_NAME + '</div>'
  + '<div style="color:rgba(255,255,255,0.9);font-size:11px;margin-top:3px;">' + ORG_ADDRESS + '</div>'
  + '<div style="color:rgba(255,255,255,0.8);font-size:10px;margin-top:2px;">✉ ' + ORG_EMAIL + ' &nbsp;|&nbsp; ☎ ' + ORG_PHONE + ' &nbsp;|&nbsp; 🌐 ' + ORG_WEBSITE + '</div>'
  + '</td>'
  + '</tr></table>'
  + '</td></tr>'

  // RECEIPT TITLE BAR
  + '<tr><td style="padding:20px 32px 6px;text-align:center;">'
  + '<div style="font-size:21px;font-weight:700;letter-spacing:1px;color:#1A1612;">' + (is80g ? 'DONATION RECEIPT (Section 80G)' : 'DONATION RECEIPT') + '</div>'
  + (is80g ? '<div style="font-size:11px;color:#6B5C4E;margin-top:5px;">80G Registration No: ' + ORG_80G_NO + ' &nbsp;|&nbsp; PAN: ' + ORG_PAN + '</div>' : '')
  + '</td></tr>'

  // RECEIPT NO + DATE BAR
  + '<tr><td style="padding:14px 32px;">'
  + '<table width="100%" style="background:#FFF0E0;border-radius:8px;"><tr>'
  + '<td style="padding:10px 16px;font-size:13px;color:#1A1612;"><strong>Receipt No:</strong> <span style="color:#0E4F4F;font-weight:700;">' + p.receiptNo + '</span></td>'
  + '<td style="padding:10px 16px;text-align:right;font-size:13px;color:#1A1612;"><strong>Date:</strong> ' + dateStr + ' &nbsp;<span style="color:#999;font-size:11px;">(' + timeStr + ')</span></td>'
  + '</tr></table>'
  + '</td></tr>'

  // DONOR DETAILS
  + '<tr><td style="padding:6px 32px 16px;">'
  + '<table width="100%" style="font-size:13px;color:#1A1612;">'
  + '<tr><td style="padding:5px 0;color:#6B5C4E;width:160px;">Donor Name</td><td style="padding:5px 0;font-weight:600;">' + p.donorName + '</td></tr>'
  + (p.address ? '<tr><td style="padding:5px 0;color:#6B5C4E;">Address</td><td style="padding:5px 0;">' + p.address + '</td></tr>' : '')
  + (p.phone ? '<tr><td style="padding:5px 0;color:#6B5C4E;">Mobile</td><td style="padding:5px 0;">' + p.phone + '</td></tr>' : '')
  + (p.email ? '<tr><td style="padding:5px 0;color:#6B5C4E;">Email</td><td style="padding:5px 0;">' + p.email + '</td></tr>' : '')
  + (is80g ? '<tr><td style="padding:5px 0;color:#6B5C4E;">PAN</td><td style="padding:5px 0;">' + (p.pan || '—') + '</td></tr>' : '')
  + '<tr><td style="padding:5px 0;color:#6B5C4E;">Payment Mode</td><td style="padding:5px 0;">' + (p.paymentMode||'UPI') + '</td></tr>'
  + '<tr><td style="padding:5px 0;color:#6B5C4E;">Purpose</td><td style="padding:5px 0;">' + (p.purpose||'General Donation') + '</td></tr>'
  + '</table>'

  + '<div style="background:#E8F5EE;border-radius:8px;padding:18px 20px;margin:20px 0;text-align:center;">'
  + '<div style="font-size:12px;color:#6B5C4E;margin-bottom:4px;">AMOUNT DONATED</div>'
  + '<div style="font-size:32px;font-weight:700;color:#2D7A4F;font-family:Georgia,serif;">₹' + parseFloat(p.amount).toLocaleString('en-IN') + '</div>'
  + '<div style="font-size:12px;color:#6B5C4E;margin-top:4px;">(Rupees ' + amountWords + ' Only)</div>'
  + '</div>'

  + (is80g ? '<p style="font-size:11px;color:#6B5C4E;line-height:1.6;margin:16px 0 0;">This donation is eligible for tax deduction under Section 80G of the Income Tax Act, 1961, subject to applicable limits. Please retain this receipt for your tax filing records.</p>' : '<p style="font-size:11px;color:#6B5C4E;line-height:1.6;margin:16px 0 0;">Thank you for supporting our cause. Your generosity helps us continue our work in education, nutrition, environment and community welfare.</p>')

  + '</td></tr>'

  // FOOTER — signature line + branches
  + '<tr><td style="padding:18px 32px 8px;border-top:1px solid #eee;">'
  + '<table width="100%"><tr>'
  + '<td style="font-size:11px;color:#999;">This is a computer-generated receipt and does not require a physical signature.</td>'
  + '<td style="text-align:right;"><div style="font-size:12px;color:#1A1612;font-weight:700;">' + ORG_NAME + '</div><div style="font-size:10px;color:#999;margin-top:2px;">Authorised Signatory</div></td>'
  + '</tr></table>'
  + branchesHtml
  + '</td></tr>'

  + '</table></td></tr></table></body></html>';
}

// Convert number to words (Indian numbering system) — simple implementation
function numberToWordsIndian(num) {
  if (num === 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function twoDigits(n) {
    if (n < 20) return ones[n];
    return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
  }
  function threeDigits(n) {
    if (n < 100) return twoDigits(n);
    return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' ' + twoDigits(n%100) : '');
  }

  let result = '';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh  = Math.floor(num / 100000);    num %= 100000;
  const thousand = Math.floor(num / 1000);   num %= 1000;
  const hundred = num;

  if (crore)    result += threeDigits(crore) + ' Crore ';
  if (lakh)     result += threeDigits(lakh) + ' Lakh ';
  if (thousand) result += threeDigits(thousand) + ' Thousand ';
  if (hundred)  result += threeDigits(hundred);

  return result.trim();
}

// ============================================================
//  PRODUCTS  (NGO-manufactured items)
// ============================================================
const PRODUCT_HEADERS = ['SKU','Name','Category','Price','Cost Price','Stock Qty','Unit','Tax%','Description','Image URL','Created On'];

function getProducts() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) return { success: true, data: [] };
  return { success: true, data: sheetToObjects(sheet) };
}

function saveProduct(p) {
  const sheet = getOrCreateSheet(SHEET_PRODUCTS, PRODUCT_HEADERS);
  const values = sheet.getDataRange().getValues();

  // Check if SKU already exists → update instead of duplicate
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(p.sku)) {
      sheet.getRange(i+1, 1, 1, PRODUCT_HEADERS.length).setValues([[
        p.sku, p.name, p.category||'', p.price||0, p.costPrice||0,
        p.stockQty||0, p.unit||'pcs', p.tax||0, p.description||'', p.imageUrl||'', values[i][10]
      ]]);
      return { success: true, updated: true };
    }
  }
  // New product
  sheet.appendRow([
    p.sku, p.name, p.category||'', p.price||0, p.costPrice||0,
    p.stockQty||0, p.unit||'pcs', p.tax||0, p.description||'', p.imageUrl||'',
    new Date().toLocaleDateString('en-IN')
  ]);
  return { success: true, created: true };
}

function deleteProduct(sku) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) return { success: false, error: 'No products sheet' };
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(sku)) { sheet.deleteRow(i+1); return { success: true }; }
  }
  return { success: false, error: 'SKU not found' };
}

// ============================================================
//  SALES  +  INVOICE GENERATION
// ============================================================
const SALES_HEADERS = ['Timestamp','Invoice No','Customer Name','Phone','Email','Address','Items JSON','Subtotal','Tax','Total','Payment Mode','Notes'];

function getSales() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_SALES);
  if (!sheet) return { success: true, data: [] };
  return { success: true, data: sheetToObjects(sheet) };
}

function saveSale(p) {
  const sheet = getOrCreateSheet(SHEET_SALES, SALES_HEADERS);
  const invoiceNo = generateInvoiceNo();
  const items = JSON.parse(p.items || '[]');

  // Reduce stock for each item sold
  const prodSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PRODUCTS);
  if (prodSheet) {
    const values = prodSheet.getDataRange().getValues();
    items.forEach(function(item) {
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === String(item.sku)) {
          const currentStock = values[i][5] || 0;
          prodSheet.getRange(i+1, 6).setValue(Math.max(0, currentStock - item.qty));
          break;
        }
      }
    });
  }

  sheet.appendRow([
    new Date().toISOString(), invoiceNo, p.customerName, p.phone||'', p.email||'', p.address||'',
    p.items, p.subtotal, p.tax, p.total, p.paymentMode||'Cash', p.notes||''
  ]);
  return { success: true, invoiceNo: invoiceNo };
}

function sendInvoiceEmail(p) {
  const html = buildInvoiceHtml(p);
  const subject = '[' + ORG_NAME + '] Invoice — ' + p.invoiceNo;
  const plain = 'Dear ' + p.customerName + ',\n\nThank you for your purchase. Invoice No: ' + p.invoiceNo + '\nTotal: ₹' + p.total + '\n\n— ' + ORG_NAME;
  try {
    if (p.email) GmailApp.sendEmail(p.email, subject, plain, { htmlBody: html, name: ORG_NAME });
    return { success: true, html: html };
  } catch(e) {
    return { success: false, error: e.message, html: html };
  }
}

// Preview-only — builds the invoice HTML without saving or sending anything
function previewInvoice(p) {
  return { success: true, html: buildInvoiceHtml(p) };
}

function buildInvoiceHtml(p) {
  const items = JSON.parse(p.items || '[]');
  const itemRows = items.map(function(it) {
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid #eee;">' + it.name + '</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">' + it.qty + '</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹' + it.price + '</td>'
      + '<td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">₹' + (it.qty * it.price) + '</td>'
      + '</tr>';
  }).join('');
  const dateStr = new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'long', year:'numeric'});
  const logoBlock = ORG_LOGO_URL
    ? '<img src="' + ORG_LOGO_URL + '" style="height:50px;display:block;" alt="logo">'
    : '<div style="width:50px;height:50px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;font-weight:700;color:#0E4F4F;font-family:Georgia,serif;">P&amp;P</div>';

  return '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F7F5F2;font-family:Arial,sans-serif;">'
  + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:30px 0;"><tr><td align="center">'
  + '<table width="620" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #ddd;">'
  + '<tr><td style="background:linear-gradient(135deg,#0E4F4F,#0A3D3D);padding:22px 32px;">'
  + '<table width="100%"><tr>'
  + '<td style="width:60px;">' + logoBlock + '</td>'
  + '<td style="padding-left:14px;">'
  + '<div style="color:white;font-size:18px;font-weight:700;">' + ORG_NAME + '</div>'
  + '<div style="color:rgba(255,255,255,0.9);font-size:11px;margin-top:3px;">' + ORG_ADDRESS + '</div>'
  + '<div style="color:rgba(255,255,255,0.8);font-size:10px;margin-top:2px;">✉ ' + ORG_EMAIL + ' &nbsp;|&nbsp; ☎ ' + ORG_PHONE + '</div>'
  + '</td></tr></table>'
  + '</td></tr>'
  + '<tr><td style="padding:20px 32px;">'
  + '<table width="100%"><tr>'
  + '<td><strong>Invoice No:</strong> <span style="color:#0E4F4F;font-weight:700;">' + p.invoiceNo + '</span></td>'
  + '<td align="right"><strong>Date:</strong> ' + dateStr + '</td>'
  + '</tr></table>'
  + '<hr style="border:none;border-top:1px solid #eee;margin:14px 0;">'
  + '<p style="font-size:13px;margin:0 0 4px;"><strong>' + p.customerName + '</strong></p>'
  + (p.phone ? '<p style="font-size:12px;color:#6B5C4E;margin:0;">' + p.phone + '</p>' : '')
  + (p.address ? '<p style="font-size:12px;color:#6B5C4E;margin:0;">' + p.address + '</p>' : '')
  + '<table width="100%" style="margin-top:18px;font-size:13px;border-collapse:collapse;">'
  + '<tr style="background:#F7F5F2;"><th style="padding:8px;text-align:left;">Item</th><th style="padding:8px;">Qty</th><th style="padding:8px;text-align:right;">Price</th><th style="padding:8px;text-align:right;">Total</th></tr>'
  + itemRows
  + '</table>'
  + '<table width="100%" style="margin-top:14px;font-size:13px;">'
  + '<tr><td style="text-align:right;padding:4px 0;color:#6B5C4E;">Subtotal</td><td style="text-align:right;padding:4px 0;width:100px;">₹' + p.subtotal + '</td></tr>'
  + '<tr><td style="text-align:right;padding:4px 0;color:#6B5C4E;">Tax</td><td style="text-align:right;padding:4px 0;">₹' + p.tax + '</td></tr>'
  + '<tr><td style="text-align:right;padding:8px 0;font-weight:700;font-size:16px;">Total</td><td style="text-align:right;padding:8px 0;font-weight:700;font-size:16px;color:#0E4F4F;">₹' + p.total + '</td></tr>'
  + '</table>'
  + '</td></tr>'
  + '<tr><td style="padding:18px 32px;text-align:center;border-top:1px solid #eee;">'
  + '<p style="font-size:11px;color:#999;margin:0;">Computer-generated invoice. Thank you for supporting ' + ORG_NAME + '!</p>'
  + '</td></tr>'
  + '</table></td></tr></table></body></html>';
}

// ============================================================
//  STAFF / ROLE-BASED LOGIN
// ============================================================
const STAFF_HEADERS = ['Username','Password','Full Name','Role','Category','Email','Phone','Created On','Status'];
// Role: Admin | Staff | Coordinator
// Category (for Coordinator only): Education | Food | Environment | Animal Care | Devotion | etc.

function getStaffList() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_STAFF);
  if (!sheet) return { success: true, data: [] };
  const data = sheetToObjects(sheet);
  // Don't send passwords back to client list view
  const safe = data.map(function(d) { const c = Object.assign({}, d); c['Password'] = '••••••'; return c; });
  return { success: true, data: safe };
}

function saveStaff(p) {
  const sheet = getOrCreateSheet(SHEET_STAFF, STAFF_HEADERS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(p.username)) {
      // Update existing — keep old password if new one not provided
      const pass = p.password || values[i][1];
      sheet.getRange(i+1, 1, 1, STAFF_HEADERS.length).setValues([[
        p.username, pass, p.fullName, p.role, p.category||'', p.email||'', p.phone||'', values[i][7], p.status||'Active'
      ]]);
      return { success: true, updated: true };
    }
  }
  sheet.appendRow([
    p.username, p.password, p.fullName, p.role, p.category||'', p.email||'', p.phone||'',
    new Date().toLocaleDateString('en-IN'), p.status||'Active'
  ]);
  return { success: true, created: true };
}

function deleteStaff(username) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_STAFF);
  if (!sheet) return { success: false, error: 'No staff sheet' };
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(username)) { sheet.deleteRow(i+1); return { success: true }; }
  }
  return { success: false, error: 'Username not found' };
}

// Login check — Admin is hardcoded fallback; Staff/Coordinator come from sheet
function staffLogin(username, password) {
  // Built-in super admin (always works even if sheet is empty)
  if (username === 'admin' && password === 'pnp@2025') {
    return { success: true, role: 'Admin', fullName: 'Administrator', category: '' };
  }

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_STAFF);
  if (!sheet) return { success: false, error: 'Invalid credentials' };

  const data = sheetToObjects(sheet);
  const match = data.find(function(d) {
    return d['Username'] === username && d['Password'] === password && d['Status'] !== 'Inactive';
  });
  if (!match) return { success: false, error: 'Invalid credentials' };

  return {
    success: true,
    role: match['Role'],
    fullName: match['Full Name'],
    category: match['Category'] || ''
  };
}

// ============================================================
//  EXPENSES
// ============================================================
const EXPENSE_HEADERS = ['Timestamp','Date','Category','Description','Amount','Vendor','Payment Mode','Bill URL','Approved By','Status'];

function getExpenses() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_EXPENSES);
  if (!sheet) return { success: true, data: [] };
  return { success: true, data: sheetToObjects(sheet) };
}

function saveExpense(p) {
  const sheet = getOrCreateSheet(SHEET_EXPENSES, EXPENSE_HEADERS);
  sheet.appendRow([
    new Date().toISOString(), p.date || new Date().toLocaleDateString('en-IN'),
    p.category||'', p.description||'', p.amount||0, p.vendor||'',
    p.paymentMode||'Cash', p.billUrl||'', p.approvedBy||'', p.status||'Paid'
  ]);
  return { success: true };
}

function deleteExpense(rowIndex) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_EXPENSES);
  if (!sheet) return { success: false, error: 'No expenses sheet' };
  sheet.deleteRow(parseInt(rowIndex));
  return { success: true };
}

// ============================================================
//  PURCHASES
// ============================================================
const PURCHASE_HEADERS = ['Timestamp','Date','Item','Supplier','Quantity','Amount','Invoice No','Payment Status','Due Date','Notes'];

function getPurchases() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PURCHASES);
  if (!sheet) return { success: true, data: [] };
  return { success: true, data: sheetToObjects(sheet) };
}

function savePurchase(p) {
  const sheet = getOrCreateSheet(SHEET_PURCHASES, PURCHASE_HEADERS);
  sheet.appendRow([
    new Date().toISOString(), p.date || new Date().toLocaleDateString('en-IN'),
    p.item||'', p.supplier||'', p.quantity||0, p.amount||0,
    p.invoiceNo||'', p.paymentStatus||'Pending', p.dueDate||'', p.notes||''
  ]);
  return { success: true };
}

function deletePurchase(rowIndex) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PURCHASES);
  if (!sheet) return { success: false, error: 'No purchases sheet' };
  sheet.deleteRow(parseInt(rowIndex));
  return { success: true };
}

function updatePurchaseStatus(rowIndex, status) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_PURCHASES);
  if (!sheet) return { success: false, error: 'No purchases sheet' };
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('Payment Status') + 1;
  if (statusCol) sheet.getRange(parseInt(rowIndex), statusCol).setValue(status);
  return { success: true };
}

// ============================================================
//  STAFF HR DETAILS (full HR record — separate from login Staff sheet)
// ============================================================
const STAFF_HR_HEADERS = ['Employee ID','Full Name','Department','Employment Type','Join Date','Phone','Email','Address','PAN','Aadhar','Bank Name','Account Number','IFSC Code','Monthly Salary','Status'];

function getStaffHR() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_STAFF_HR);
  if (!sheet) return { success: true, data: [] };
  const data = sheetToObjects(sheet);
  // Mask sensitive fields in list view
  const safe = data.map(function(d) {
    const c = Object.assign({}, d);
    if (c['Account Number']) c['Account Number'] = '••••' + String(c['Account Number']).slice(-4);
    if (c['Aadhar']) c['Aadhar'] = '••••••••' + String(c['Aadhar']).slice(-4);
    return c;
  });
  return { success: true, data: safe };
}

function saveStaffHR(p) {
  const sheet = getOrCreateSheet(SHEET_STAFF_HR, STAFF_HR_HEADERS);
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(p.employeeId)) {
      sheet.getRange(i+1, 1, 1, STAFF_HR_HEADERS.length).setValues([[
        p.employeeId, p.fullName, p.department||'', p.employmentType||'Full-time',
        p.joinDate||'', p.phone||'', p.email||'', p.address||'',
        p.pan||'', p.aadhar||'', p.bankName||'', p.accountNumber||'', p.ifsc||'',
        p.monthlySalary||0, p.status||'Active'
      ]]);
      return { success: true, updated: true };
    }
  }
  sheet.appendRow([
    p.employeeId, p.fullName, p.department||'', p.employmentType||'Full-time',
    p.joinDate||'', p.phone||'', p.email||'', p.address||'',
    p.pan||'', p.aadhar||'', p.bankName||'', p.accountNumber||'', p.ifsc||'',
    p.monthlySalary||0, p.status||'Active'
  ]);
  return { success: true, created: true };
}

function deleteStaffHR(employeeId) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_STAFF_HR);
  if (!sheet) return { success: false, error: 'No StaffHR sheet' };
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(employeeId)) { sheet.deleteRow(i+1); return { success: true }; }
  }
  return { success: false, error: 'Employee ID not found' };
}

// ============================================================
//  SALARY (monthly fixed salary records)
// ============================================================
const SALARY_HEADERS = ['Timestamp','Month','Employee ID','Employee Name','Basic Salary','Deductions','Net Paid','Payment Date','Payment Mode','Notes'];

function getSalaries() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_SALARY);
  if (!sheet) return { success: true, data: [] };
  return { success: true, data: sheetToObjects(sheet) };
}

function saveSalary(p) {
  const sheet = getOrCreateSheet(SHEET_SALARY, SALARY_HEADERS);
  const basic = parseFloat(p.basicSalary) || 0;
  const deductions = parseFloat(p.deductions) || 0;
  const net = basic - deductions;
  sheet.appendRow([
    new Date().toISOString(), p.month||'', p.employeeId||'', p.employeeName||'',
    basic, deductions, net, p.paymentDate || new Date().toLocaleDateString('en-IN'),
    p.paymentMode||'Bank Transfer', p.notes||''
  ]);
  return { success: true, netPaid: net };
}

function deleteSalary(rowIndex) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_SALARY);
  if (!sheet) return { success: false, error: 'No salary sheet' };
  sheet.deleteRow(parseInt(rowIndex));
  return { success: true };
}

// ============================================================
//  REIMBURSEMENTS (staff can self-submit from their login)
// ============================================================
const REIMBURSE_HEADERS = ['Timestamp','Staff Name','Username','Date','Reason','Amount','Status','Notes'];

function getReimbursements() {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_REIMBURSE);
  if (!sheet) return { success: true, data: [] };
  return { success: true, data: sheetToObjects(sheet) };
}

function saveReimbursement(p) {
  const sheet = getOrCreateSheet(SHEET_REIMBURSE, REIMBURSE_HEADERS);
  sheet.appendRow([
    new Date().toISOString(), p.staffName||'', p.username||'',
    p.date || new Date().toLocaleDateString('en-IN'), p.reason||'',
    p.amount||0, 'Pending', p.notes||''
  ]);
  return { success: true };
}

function updateReimbursementStatus(rowIndex, status) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_REIMBURSE);
  if (!sheet) return { success: false, error: 'No reimbursements sheet' };
  const headers   = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const statusCol = headers.indexOf('Status') + 1;
  if (statusCol) sheet.getRange(parseInt(rowIndex), statusCol).setValue(status);
  return { success: true };
}

// ============================================================
//  FINANCE SUMMARY — rolled-up numbers for the admin dashboard
// ============================================================
function getFinanceSummary() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  function sumColumn(sheetName, colName, filterFn) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return 0;
    const rows = sheetToObjects(sheet);
    return rows
      .filter(function(r) { return filterFn ? filterFn(r) : true; })
      .reduce(function(sum, r) { return sum + (parseFloat(r[colName]) || 0); }, 0);
  }
  function countRows(sheetName, filterFn) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return 0;
    const rows = sheetToObjects(sheet);
    return filterFn ? rows.filter(filterFn).length : rows.length;
  }

  const totalExpenses     = sumColumn(SHEET_EXPENSES, 'Amount');
  const totalPurchases    = sumColumn(SHEET_PURCHASES, 'Amount');
  const pendingPurchases  = sumColumn(SHEET_PURCHASES, 'Amount', function(r){ return r['Payment Status'] === 'Pending'; });
  const totalSalaryPaid   = sumColumn(SHEET_SALARY, 'Net Paid');
  const totalReimbursed   = sumColumn(SHEET_REIMBURSE, 'Amount', function(r){ return r['Status'] === 'Paid'; });
  const pendingReimburse  = sumColumn(SHEET_REIMBURSE, 'Amount', function(r){ return r['Status'] === 'Pending'; });
  const pendingReimburseCount = countRows(SHEET_REIMBURSE, function(r){ return r['Status'] === 'Pending'; });
  const totalDonations    = sumColumn(SHEET_DONATIONS, 'Amount');
  const totalSales        = sumColumn(SHEET_SALES, 'Total');
  const staffCount        = countRows(SHEET_STAFF_HR, function(r){ return r['Status'] === 'Active'; });

  const totalIncome  = totalDonations + totalSales;
  const totalOutgo   = totalExpenses + totalPurchases + totalSalaryPaid + totalReimbursed;
  const netBalance   = totalIncome - totalOutgo;

  return {
    success: true,
    summary: {
      totalExpenses: totalExpenses,
      totalPurchases: totalPurchases,
      pendingPurchases: pendingPurchases,
      totalSalaryPaid: totalSalaryPaid,
      totalReimbursed: totalReimbursed,
      pendingReimburse: pendingReimburse,
      pendingReimburseCount: pendingReimburseCount,
      totalDonations: totalDonations,
      totalSales: totalSales,
      totalIncome: totalIncome,
      totalOutgo: totalOutgo,
      netBalance: netBalance,
      staffCount: staffCount
    }
  };
}