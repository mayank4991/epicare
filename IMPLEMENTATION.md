# EpiCare - Implementation Documentation

## Project Overview

**EpiCare** is a comprehensive web-based epilepsy care management system designed for rural healthcare settings in India. It streamlines patient management, seizure tracking, treatment adherence monitoring, and supply chain management across multi-level healthcare facilities (District → Block/PHC → AAM Centers).

---

## Table of Contents

1. [Technical Architecture](#technical-architecture)
2. [Core Features](#core-features)
3. [4-Phase Stock Management System](#4-phase-stock-management-system)
4. [System Workflow](#system-workflow)
5. [Implementation Details](#implementation-details)
6. [API Endpoints](#api-endpoints)
7. [Data Models](#data-models)
8. [Installation & Setup](#installation--setup)
9. [Future Enhancements](#future-enhancements)

---

## Technical Architecture

### Stack
- **Backend**: Google Apps Script (Serverless)
- **Database**: Google Sheets
- **Frontend**: Vanilla JavaScript (No frameworks)
- **Deployment**: GitHub Pages + Google Apps Script
- **State Management**: Client-side JavaScript objects
- **Localization**: Multi-language support (EN, HI, BN, TA, TE, ML, KN, MR, PA)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    BROWSER / WEB CLIENT                      │
│  index.html + CSS/JS (Vanilla JavaScript)                   │
│  - Patient Management Dashboard                             │
│  - Seizure Tracking & Analytics                             │
│  - Stock Management & Indent Wizard                         │
│  - Multi-level Approver Dashboard                           │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│         GOOGLE APPS SCRIPT API LAYER (main.gs)              │
│  - RESTful endpoints (doPost/doGet)                         │
│  - Request routing & authentication                         │
│  - Session management                                       │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│        BUSINESS LOGIC MODULES (Google Apps Script)          │
│  - patients.gs: Patient CRUD & search                       │
│  - followups.gs: Follow-up recording & analysis             │
│  - phcs.gs: Stock management & reconciliation               │
│  - SeizureManager.gs: Seizure analytics                     │
│  - ClinicalDecisionSupport.gs: Recommendations              │
│  - users.gs: Role-based access control                      │
│  - reports.gs: Export & reporting                           │
│  - utils.gs: Shared utilities                               │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│              GOOGLE SHEETS DATABASE                          │
│  Multiple sheets: Patients, FollowUps, PHC_Stock,           │
│  Indents, StockReconciliations, Users, MedicineMaster, etc. │
└─────────────────────────────────────────────────────────────┘
```

### Multi-Level Hierarchy

```
District Admin (Dashboard)
  ↓
Block/PHC Medical Officer or Pharmacist (Approver)
  ↓
AAM Center / CHO (Front-line worker)
  ↓
Patients in Community
```

---

## Core Features

### 1. **Patient Management**
- ✅ Register patients with comprehensive demographic & clinical data
- ✅ Track diagnosis, seizure type, medication history
- ✅ Manage patient addresses, AAM center assignments
- ✅ Search by phone, name, address
- ✅ Track medication adherence & treatment status

### 2. **Follow-Up Management**
- ✅ Record seizure frequency changes
- ✅ Track medication adherence & side effects
- ✅ Update weight, age, comorbidities
- ✅ Generate automatic follow-up schedules
- ✅ Phone-based follow-up tracking
- ✅ Psychosocial screening & hormonal assessment

### 3. **Seizure Management & Analytics**
- ✅ Real-time seizure frequency analytics
- ✅ Medication adherence tracking
- ✅ Patient outcome analysis
- ✅ CHO performance ranking
- ✅ Age distribution analytics
- ✅ Referral tracking & outcomes
- ✅ Non-compliance identification

### 4. **Clinical Decision Support**
- ✅ Medicine substitution recommendations (based on availability)
- ✅ Dosage adjustment guidelines
- ✅ Drug interaction warnings
- ✅ Pregnancy safety alerts for females of childbearing age
- ✅ Recommendation audit trail

### 5. **Multi-Level Stock Management** (NEW - 4 Phases)
- ✅ Automated demand calculation from patient history
- ✅ Real-time stock tracking across all levels
- ✅ Smart indent wizard with discrepancy detection
- ✅ One-click approval workflow for approvers
- ✅ Automatic stock ledger updates on dispatch
- ✅ Discrepancy intelligence with variance analysis
- ✅ 3-month audit trail & pattern recognition
- ✅ Auto-generated recommendations for anomalies

### 6. **Offline Functionality**
- ✅ Service worker for offline caching
- ✅ IndexedDB for local data persistence
- ✅ Offline form submissions (queued for sync)
- ✅ Offline CDS fallback
- ✅ Encryption for local storage
- ✅ Automatic sync when online

### 7. **Analytics & Reporting**
- ✅ Patient outcomes dashboard
- ✅ Seizure control analysis
- ✅ Medication usage patterns
- ✅ CHO performance metrics
- ✅ Export to Excel/CSV
- ✅ Multi-PHC comparison

### 8. **Security & Audit**
- ✅ Role-based access control (CHO, MO, Pharmacist, Admin)
- ✅ User authentication with password hashing
- ✅ Session management
- ✅ Audit trails for all modifications
- ✅ Activity logging
- ✅ Encryption for sensitive data

---

## 4-Phase Stock Management System

### Phase 1: Backend Calculations

**Purpose**: Calculate medicine demand from patient history automatically

**New Functions** in `phcs.gs`:

```javascript
calculatePatientDemand(patients, medicines)
  - Input: Array of patient objects, list of medicines to check
  - Process: Extracts dosage frequency from medication arrays
            Multiplies by 30 days for monthly requirement
            Adds 5% pilferage buffer
  - Output: { medicine: quantity } map

getFollowUpConsumption(facility, aamCenter, daysInPast)
  - Input: Facility name, AAM center, lookback period
  - Process: Queries FollowUps sheet
             Parses MedicationSource field (format: "Medicine:quantity")
             Sums consumption per medicine
  - Output: { medicine: totalConsumed } map

getCurrentStockAtFacility(facility, aamCenter)
  - Input: Facility and AAM center names
  - Process: Wraps getPHCStock() for safe dictionary access
  - Output: { medicine: currentStock } map
```

**API Endpoints Added**:
- `POST ?action=calculatePatientDemand` - Calculate demand for patients
- `GET ?action=getFollowUpConsumption` - Get consumption data for reconciliation
- `GET ?action=getCurrentStockAtFacility` - Get current stock levels

**Impact**: 3 new endpoints, +150 lines of backend code

---

### Phase 2: Frontend Wizard State & Real Data

**Purpose**: Transform wizard to use real backend data with persistent state

**State Object** in `multi-level-stock-ui.js`:

```javascript
indentWizardState = {
  selectedPatients: [],        // Patient IDs selected in Step 2
  reconciliation: {},          // Opening stock & reported consumption
  calculatedDemand: [],        // Computed requirements (Step 3)
  followUpConsumption: {},     // Actual consumption from backend
  totalPatients: 0,            // Count of selected patients
  medicines: []                // List of medicines involved
}
```

**4-Step Wizard Workflow**:

1. **Step 1 - End-of-Month Reconciliation**
   - Load actual follow-up consumption from backend
   - Display opening stock, consumption, calculate closing stock
   - Flag discrepancies: >10% red, 5-10% yellow
   - Save reconciliation data to state

2. **Step 2 - Patient Selection**
   - Filter patients: Only those with follow-up in last 6 months
   - User checks/unchecks to select
   - Persist selections to `state.selectedPatients`
   - Display patient count

3. **Step 3 - Calculate Requirements**
   - For each selected patient, extract medicines from record
   - Call `StockComparison.calculateMonthlyRequirement()`
   - Apply 5% pilferage buffer automatically
   - Store in `state.calculatedDemand`

4. **Step 4 - Review & Submit**
   - Display summary: total patients, medicines, quantities
   - Submit two requests:
     1. Indent creation
     2. Stock reconciliation audit
   - Display backend recommendations
   - Clear state, show success message

**Impact**: ~300 new lines of UI code, persistent wizard state

---

### Phase 3: Discrepancy Intelligence & Audit Trail

**Purpose**: Detect inconsistencies, generate recommendations, audit everything

**New Functions** in `phcs.gs`:

```javascript
generateReconciliationRecommendations(variance)
  - Input: { medicine: percentageVariance } map
  - Process: Flags high variances (>10%) as CRITICAL
             Flags moderate (5-10%) as MEDIUM
             Creates action codes: 'audit' or 'review'
  - Output: { medicine: [{ severity, action, message }] }

getReconciliationHistory(facility, months)
  - Input: Facility name, lookback months
  - Process: Queries StockReconciliations sheet
             Parses JSON columns (variance, recommendations)
             Returns last N months of records
  - Output: Array of reconciliation records with parsed data

analyzeVariancePatterns(facility, months)
  - Input: Facility name, lookback months
  - Process: Aggregates variance data from N reconciliations
             Identifies medicines with 2+ high-variance occurrences
             Compiles pattern alerts
  - Output: { patterns: [...], alerts: [...], criticalCount: N }
```

**Enhanced Reconciliation Sheet**:
- New columns: `VarianceJSON`, `RecommendationsJSON`
- Variance: { medicine: percentageVariance }
- Recommendations: { medicine: [{ severity, action, message }] }

**API Endpoints Added**:
- `GET ?action=getReconciliationHistory` - Fetch audit trail with variance
- `GET ?action=analyzeVariancePatterns` - Get 3-month trend analysis

**Frontend Display** in `multi-level-stock-ui.js`:
- Variance recommendations shown after Step 1
- Severity colors: Red (>10%), Yellow (5-10%)
- Action items displayed with action codes

**Impact**: ~100 lines of backend + audit trail storage + 50 lines UI

---

### Phase 4: District Approver Dashboard

**Purpose**: Enable district-level approvers to manage all pending indents one-click

**New Functions** in `multi-level-stock-ui.js`:

```javascript
loadApprovalsTab()
  - Calls getIndents(status=Pending) endpoint
  - Calls analyzeVariancePatterns() for trends
  - Renders approval dashboard

quickApproveIndent(indentId, aamCenter)
  - One-click workflow:
    1. Call updateIndentStatus(indentId, 'Dispatched', processedBy)
    2. Fetches current stock via getCurrentStockAtFacility()
    3. Updates PHC stock: -quantity (dispensed)
    4. Updates AAM stock: +quantity (received)
    5. Refreshes approvals UI
  - Shows success notification

renderApprovalsTab(indents, trends)
  - Table with: Indent ID, AAM Center, Requester, Date, Patients, Medicines
  - Stock Alerts column: Shows critical count from variance trends
  - Quick Approve button per indent
  - Metrics: Pending count, Critical alerts, Total medicines
  - Real-time badge on tab
```

**UI Components**:
- New "Pending Approvals" tab (visible only to approvers)
- Badge shows count of pending indents
- Indents table with sortable columns
- Critical alerts integrated from 3-month trends
- Metrics card with KPIs

**Role-Based Access**:
- CHO/AAM: Can raise indents (see wizard)
- Medical Officer/Pharmacist/Admin: Can approve indents (see dashboard)

**Workflow**:
```
CHO submits indent → Indent appears in Approver Dashboard
                  → Approver sees critical alerts from history
                  → One-click "Approve & Dispatch"
                  → Stock auto-updated at both levels
                  → Indent status changes to "Dispatched"
```

**Impact**: ~100 new lines of UI code, complete approval workflow

---

## System Workflow

### Complete End-to-End Flow

#### CHO Workflow (Indent Creation)

1. **Login**: CHO logs in with username/password
2. **Open Stock Management**: Click "Raise Monthly Indent" button
3. **Step 1 - Reconciliation**:
   - System loads follow-up consumption data from backend
   - CHO enters opening stock, verifies consumed quantities
   - System calculates variance %
   - CHO adds notes if discrepancy is high
   - CHO clicks "Next"
4. **Step 2 - Patient Selection**:
   - System shows patients with follow-up in last 6 months
   - CHO selects patients who need medicines this month
   - CHO clicks "Next"
5. **Step 3 - Calculate Requirements**:
   - System auto-calculates requirement for each selected patient
   - Shows: Patient name, medicines, quantities, with 5% buffer
   - CHO reviews (can adjust if needed)
   - CHO clicks "Next"
6. **Step 4 - Review & Submit**:
   - System shows summary: Total patients, medicines, total quantity
   - CHO clicks "Submit Indent"
   - Backend creates: Indent record + Reconciliation audit record
   - System displays recommendations from variance analysis
   - Success message shown

#### Approver Workflow (Indent Approval)

1. **Login**: Medical Officer/Pharmacist/Admin logs in
2. **View Approvals Tab**:
   - Sees all pending indents
   - Each row shows: Indent ID, AAM Center, Requester, Date, Patient count, Medicines, Critical alerts
   - Pending count shown in tab badge
3. **Review Indent**:
   - Approver can click indent to see details
   - Views medicines, quantities, critical alert reasons
4. **One-Click Approval**:
   - Approver clicks "Approve & Dispatch"
   - System:
     * Fetches current stock at both PHC & AAM
     * Updates PHC stock: -quantity (dispensed)
     * Updates AAM stock: +quantity (received)
     * Changes indent status to "Dispatched"
     * Logs approval with approver name & timestamp
5. **Confirmation**:
   - Success notification shown
   - Indent disappears from pending list
   - Stock ledger updated in real-time

---

## Implementation Details

### Key Algorithms

#### 1. Dosage Parsing (Demand Calculation)

```javascript
// Extract frequency from prescription (e.g., "Aspirin BD 100mg")
// Frequency codes: OD=1x/day, BD=2x/day, TDS=3x/day, QID=4x/day, ON=1x night
// Monthly quantity = quantity_per_dose × frequency × 30 days

Example:
- Patient on: "Phenytoin 100mg BD" (2x per day, 100mg per tablet)
- Monthly demand: 2 × 30 = 60 tablets
- With 5% pilferage buffer: 60 × 1.05 = 63 tablets
```

#### 2. Consumption Tally

```javascript
// Parse FollowUps MedicationSource field
// Format: "Phenytoin 100mg:5, Sodium Valproate 200mg:10"
// Sum all consumed quantities per medicine for period

Example:
Follow-up 1 (May 1): "Phenytoin:5, SV:3"
Follow-up 2 (May 15): "Phenytoin:8, SV:2"
Total consumed: { Phenytoin: 13, SV: 5 }
```

#### 3. Variance Analysis

```javascript
// Compare reported vs calculated consumption
// Variance % = ((Reported - Calculated) / Calculated) × 100

Example:
Calculated consumption: 50 tablets
Reported consumption: 45 tablets
Variance: -10% (consumption below expected)
→ Flag as CRITICAL (>10% threshold)
```

#### 4. Pattern Recognition (3-Month Analysis)

```javascript
// Aggregate variance across 3 months
// Identify medicines with 2+ high-variance occurrences

Example:
Month 1: Phenytoin variance = +15% ✓ CRITICAL
Month 2: Phenytoin variance = -12% ✓ CRITICAL
Month 3: Phenytoin variance = +8% (medium)
→ Phenytoin flagged: "Consistent discrepancies across 3 months"
→ Recommendation: "Audit Phenytoin supply chain"
```

### Data Transformations

#### Medicines JSON Storage

```javascript
// In Indents sheet: MedicinesJSON column stores:
{
  "medicines": [
    { "name": "Phenytoin 100mg", "quantity": 63 },
    { "name": "Sodium Valproate 200mg", "quantity": 45 }
  ],
  "totalQuantity": 108
}

// Parsed on frontend when displaying
```

#### Variance JSON in Reconciliations

```javascript
// In StockReconciliations sheet: VarianceJSON column stores:
{
  "Phenytoin 100mg": {
    "calculated": 50,
    "reported": 45,
    "variance_percent": -10
  },
  "Sodium Valproate 200mg": {
    "calculated": 30,
    "reported": 35,
    "variance_percent": 16.7
  }
}
```

---

## API Endpoints

### Authentication

All endpoints require `Authorization: Bearer <token>` header

### Stock Management Endpoints

#### 1. Calculate Patient Demand
```
POST /doPost
{
  "action": "calculatePatientDemand",
  "patients": [{id, medications, ...}, ...],
  "medicines": ["Phenytoin 100mg", "Sodium Valproate 200mg"]
}

Response:
{
  "status": "success",
  "data": {
    "Phenytoin 100mg": 63,
    "Sodium Valproate 200mg": 45
  }
}
```

#### 2. Get Follow-Up Consumption
```
GET /doGet?action=getFollowUpConsumption&facility=PHC1&aamCenter=AAM1&days=30

Response:
{
  "status": "success",
  "data": {
    "Phenytoin 100mg": 45,
    "Sodium Valproate 200mg": 30
  }
}
```

#### 3. Get Current Stock at Facility
```
GET /doGet?action=getCurrentStockAtFacility&facility=PHC1&aamCenter=AAM1

Response:
{
  "status": "success",
  "data": {
    "Phenytoin 100mg": 150,
    "Sodium Valproate 200mg": 100
  }
}
```

#### 4. Get Reconciliation History
```
GET /doGet?action=getReconciliationHistory&facility=PHC1&months=3

Response:
{
  "status": "success",
  "data": [
    {
      "date": "2026-04-30",
      "variance": { "Phenytoin 100mg": -10, "SV 200mg": 5 },
      "recommendations": [...]
    },
    ...
  ]
}
```

#### 5. Analyze Variance Patterns
```
GET /doGet?action=analyzeVariancePatterns&facility=PHC1&months=3

Response:
{
  "status": "success",
  "data": {
    "patterns": [
      { "medicine": "Phenytoin 100mg", "pattern": "Consistent high variance", "occurrences": 2 }
    ],
    "alerts": [...],
    "criticalCount": 1
  }
}
```

#### 6. Submit Indent Request
```
POST /doPost
{
  "action": "submitIndentRequest",
  "facility": "PHC1",
  "aamCenter": "AAM1",
  "medicines": [{ "name": "Phenytoin 100mg", "quantity": 63 }, ...],
  "totalPatients": 15,
  "requestedBy": "cho@example.com"
}

Response:
{
  "status": "success",
  "data": { "indentId": "IND-2026-05-001" }
}
```

#### 7. Submit Stock Reconciliation
```
POST /doPost
{
  "action": "submitStockReconciliation",
  "facility": "PHC1",
  "aamCenter": "AAM1",
  "openingStock": { "Phenytoin 100mg": 150 },
  "calculatedConsumed": { "Phenytoin 100mg": 50 },
  "reportedConsumed": { "Phenytoin 100mg": 45 },
  "closingStock": { "Phenytoin 100mg": 105 },
  "notes": "Discrepancy noted"
}

Response:
{
  "status": "success",
  "data": {
    "reconId": "RECON-2026-05-001",
    "recommendations": [...]
  }
}
```

#### 8. Update Indent Status (Dispatch)
```
POST /doPost
{
  "action": "updateIndentStatus",
  "indentId": "IND-2026-05-001",
  "status": "Dispatched",
  "processedBy": "mo@example.com"
}

Response:
{
  "status": "success",
  "data": { "message": "Indent dispatched, stock updated" }
}
```

#### 9. Get Indents (with filtering)
```
GET /doGet?action=getIndents&status=Pending&facility=PHC1

Response:
{
  "status": "success",
  "data": [
    {
      "indentId": "IND-2026-05-001",
      "aamCenter": "AAM1",
      "requestedBy": "cho@example.com",
      "date": "2026-05-01",
      "totalPatients": 15,
      "medicines": [...]
    },
    ...
  ]
}
```

---

## Data Models

### Patients Sheet

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| ID | String | PAT-001 | Unique patient identifier |
| PatientName | String | Raj Kumar | Full name |
| Age | Number | 32 | Current age |
| Diagnosis | String | Generalized Tonic-Clonic | Epilepsy type |
| Medications | JSON | [...] | Array of current medicines |
| LastFollowUp | Date | 2026-05-01 | Date of last follow-up |
| PHC | String | PHC Central | Primary Health Center |
| NearestAAMCenter | String | AAM Hub | Assigned AAM center |

### FollowUps Sheet

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| FollowUpID | String | FU-001 | Unique follow-up ID |
| PatientID | String | PAT-001 | Reference to patient |
| FollowUpDate | Date | 2026-05-15 | Follow-up date (DD/MM/YYYY) |
| SeizureFrequency | String | Nil for 6 months | Seizure control status |
| MedicationSource | String | "Phenytoin:5, SV:3" | Medicines dispensed |
| TreatmentAdherence | String | Good | Adherence level |
| MedicationChanged | Boolean | false | Whether meds were changed |

### PHC_Stock Sheet

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| Facility | String | PHC Central | Facility name |
| AAMCenter | String | AAM Hub | AAM center name |
| Medicine | String | Phenytoin 100mg | Medicine name |
| CurrentStock | Number | 150 | Current quantity |
| LastUpdated | Date | 2026-05-09 | Stock update date |
| ReorderLevel | Number | 50 | Minimum stock level |

### Indents Sheet

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| IndentID | String | IND-2026-05-001 | Unique indent ID |
| Facility | String | PHC Central | Requesting facility |
| AAMCenter | String | AAM Hub | Requesting AAM center |
| RequestedBy | String | cho@example.com | CHO email |
| Date | Date | 2026-05-01 | Indent date |
| MedicinesJSON | JSON | {...} | Array of medicines & quantities |
| Status | String | Pending | Pending/Dispatched/Rejected |
| TotalPatients | Number | 15 | Patients served |
| ProcessedBy | String | mo@example.com | Approver email |
| ProcessedDate | Date | 2026-05-02 | Approval date |

### StockReconciliations Sheet

| Column | Type | Example | Notes |
|--------|------|---------|-------|
| ReconID | String | RECON-2026-05-001 | Unique reconciliation ID |
| Facility | String | PHC Central | Facility name |
| AAMCenter | String | AAM Hub | AAM center name |
| Date | Date | 2026-05-01 | Reconciliation date |
| OpeningStockJSON | JSON | {...} | Stock at month start |
| ReceivedJSON | JSON | {...} | Stock received this month |
| CalculatedConsumedJSON | JSON | {...} | Expected consumption |
| ReportedConsumedJSON | JSON | {...} | Actual reported consumption |
| ClosingStockJSON | JSON | {...} | Stock at month end |
| VarianceJSON | JSON | {...} | Variance % per medicine |
| RecommendationsJSON | JSON | {...} | Auto-generated recommendations |
| DiscrepancyNotes | String | "..." | CHO notes |
| SubmittedBy | String | cho@example.com | Submitter email |

---

## Installation & Setup

### Prerequisites
- Google Account with access to create Google Apps Script projects
- GitHub account (for deployment)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Step 1: Setup Google Apps Script

1. Create new Google Apps Script project at [script.google.com](https://script.google.com)
2. Create a Google Sheet that will store all data
3. Copy SPREADSHEET_ID from Sheet URL
4. In Apps Script, add all `.gs` files from `Google Apps Script Code/` folder

### Step 2: Configure Backend

1. Edit `utils.gs` - Set `SPREADSHEET_ID` to your sheet ID
2. Run `setupCompleteSystem()` function to initialize all sheets
3. Deploy as web app: Deploy → New deployment → Web app
4. Set execute as your account, accessible to anyone with link
5. Copy deployment URL to use as `MAIN_SCRIPT_URL`

### Step 3: Configure Frontend

1. Update `js/config.js`:
   ```javascript
   API_CONFIG.MAIN_SCRIPT_URL = "https://script.google.com/macros/d/{DEPLOYMENT_ID}/usercontent"
   ```

2. Upload to GitHub Pages or any web host

### Step 4: Deploy

1. Push code to GitHub repository
2. Enable GitHub Pages (Settings → Pages → Deploy from main)
3. Access your app at `https://yourusername.github.io/epicare`

### Step 5: Add Sample Data

1. Open your Google Sheet
2. Go to Patients sheet, add sample patients
3. Go to Users sheet, add CHO/MO/Admin users
4. System ready to use!

---

## Future Enhancements

### Short-Term (Next Release)
- [ ] Email notifications for pending approvals
- [ ] SMS alerts for critical stock levels
- [ ] WhatsApp integration for follow-up reminders
- [ ] Batch export of reconciliation reports
- [ ] Medicine expiry tracking
- [ ] Barcode scanning for stock updates

### Medium-Term
- [ ] Real-time dashboard with WebSockets
- [ ] Predictive demand forecasting (ML)
- [ ] Multi-language report generation
- [ ] Mobile app (React Native)
- [ ] QR code patient cards
- [ ] Video consultation integration

### Long-Term
- [ ] Blockchain for supply chain transparency
- [ ] AI-powered seizure prediction
- [ ] Wearable device integration
- [ ] National-level analytics dashboard
- [ ] Integration with HMIS/DHIS2
- [ ] Telemedicine platform

---

## Support & Documentation

### Troubleshooting

**Issue**: "Connection failed" error
- **Solution**: Check SPREADSHEET_ID in utils.gs is correct

**Issue**: Wizard data not persisting
- **Solution**: Clear browser cache, check localStorage enabled

**Issue**: Stock not updating after approval
- **Solution**: Verify getCurrentStockAtFacility() returns valid data

### Contributing

To contribute:
1. Fork repository
2. Create feature branch (`git checkout -b feature/YourFeature`)
3. Commit changes (`git commit -am 'Add feature'`)
4. Push to branch (`git push origin feature/YourFeature`)
5. Open Pull Request

### License

This project is licensed under the MIT License - see LICENSE file for details

---

## Version History

- **v1.0.0** (May 2026): Initial release with 4-phase stock management system
  - Phase 1: Backend calculations
  - Phase 2: Frontend wizard with real data
  - Phase 3: Discrepancy intelligence & audit trail
  - Phase 4: District approver dashboard

---

## Contact

For questions or support, contact: **EpiCare Development Team**

Last Updated: May 9, 2026
