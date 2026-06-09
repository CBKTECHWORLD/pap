# Pupils & Peoples Foundation — Website Setup Guide

## Files in this package

| File | Purpose |
|------|---------|
| `index.html` | Main NGO website (public-facing) |
| `admin.html` | Admin dashboard (approve/reject applications) |
| `google-apps-script.gs` | Google Apps Script (saves data + sends emails) |
| `SETUP.md` | This guide |

---

## STEP 1 — Create your Google Sheet

1. Go to **sheets.google.com** → Create a new blank sheet
2. Name it: `Pupils & Peoples — Registrations`
3. Copy the Sheet ID from the URL:
   - URL looks like: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
   - Copy just the `SHEET_ID_HERE` part

---

## STEP 2 — Set up Google Apps Script

1. Go to **script.google.com** → Click **New Project**
2. Delete all default code in `Code.gs`
3. Paste the entire content of `google-apps-script.gs`
4. On **line 12**, paste your Sheet ID:
   ```
   const SPREADSHEET_ID = 'YOUR_SHEET_ID_HERE';
   ```
5. On **line 14**, confirm your Gmail:
   ```
   const FROM_EMAIL = 'pupilsandpeoples@gmail.com';
   ```
6. Click 💾 **Save** (Ctrl+S)

### Deploy the Script
1. Click **Deploy** → **New Deployment**
2. Click the gear icon ⚙️ next to "Type" → Select **Web App**
3. Set:
   - **Description**: `PNP Website v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Click **Deploy**
5. Click **Authorize access** → Choose your Gmail → Allow
6. **Copy the Web App URL** — it looks like:
   `https://script.google.com/macros/s/ABCDEFG.../exec`

---

## STEP 3 — Connect the URL to the website

### In `index.html`
Find this line (around line 380):
```javascript
const SHEET_URL = 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE';
```
Replace with your actual URL:
```javascript
const SHEET_URL = 'https://script.google.com/macros/s/YOUR.../exec';
```

### In `admin.html` (Settings page)
After logging in → go to **Settings** → paste the same URL into **Google Sheet Integration** → Save.

---

## STEP 4 — Add your UPI QR Code

In `index.html`, find this comment:
```html
<!-- Replace src below with your actual QR code image -->
```
Replace the placeholder div with:
```html
<img src="YOUR_QR_CODE_IMAGE.png" alt="UPI QR Code">
```

To generate a UPI QR code:
- Go to **bhim.upi.com** or use PhonePe/Google Pay → Profile → QR Code → Download
- Or use: `https://upiqr.in` to generate from your UPI ID

---

## STEP 5 — Update your contact details

In `index.html`, find and replace:
- `+91 XXXXX XXXXX` → your actual phone number
- `Your Address, City — PIN` → your actual address
- `pupilsandpeoples@upi` → your actual UPI ID

---

## STEP 6 — Admin Dashboard

### Login credentials
- **Username**: `admin`
- **Password**: `pnp@2025`

> ⚠️ Change the password immediately after first login via **Settings → Change Admin Password**

### How approval works
1. Someone fills the form on `index.html`
2. Data saves to Google Sheet + admin gets email notification
3. Admin logs into `admin.html`
4. Reviews the application → clicks **Approve**
5. System assigns a unique ID (e.g. `PNP-VOL-2025-4821`)
6. ID card email is sent **automatically** to the applicant

---

## STEP 7 — Host the website

### Free hosting options:

**Option A — GitHub Pages (Recommended, free)**
1. Create a GitHub account at github.com
2. New repository → name it `pupils-and-peoples`
3. Upload `index.html` and `admin.html`
4. Go to Settings → Pages → Source: main branch
5. Your site will be live at: `https://yourusername.github.io/pupils-and-peoples`

**Option B — Netlify (Free, drag & drop)**
1. Go to netlify.com → Sign up free
2. Drag & drop your folder to deploy
3. Get a free URL instantly

**Option C — Google Sites (Simplest)**
- Embed the pages inside Google Sites

---

## Admin Login Link

The admin login page is linked **quietly in the footer** of the main website:
```
Footer → bottom right → tiny "Admin Login" link
```
Users won't notice it unless they look. Direct URL: `admin.html`

---

## How Email ID Cards Look

When admin approves a volunteer/member, the applicant receives:
- Subject: `[P&P] Your Volunteer ID Card — PNP-VOL-2025-XXXX`
- A beautiful HTML email with their ID card embedded
- The card includes: Name, Role, Mobile, City, Area of Work, Join Date, Valid Until, and their unique ID

---

## Renewal Policy

- Memberships are **valid for 1 year** from approval date
- The admin controls renewal — there is **no auto-renewal**
- Admin can manually update the sheet and re-send a new ID card email by running `sendIdCardEmail()` with updated `validUntil`

---

## Future Upgrades (when NGO is registered)

- [ ] Replace UPI section with Razorpay payment gateway
- [ ] Add 80G donation receipt auto-generation
- [ ] Add photo upload in registration form
- [ ] WhatsApp notification via Twilio or WA Business API
- [ ] Member portal to check status online

---

## Need Help?

Contact: pupilsandpeoples@gmail.com
