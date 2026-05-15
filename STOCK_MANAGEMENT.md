# EpiCare Stock Management — Complete Technical Reference

> **Module:** `js/multi-level-stock-ui.js`  
> **Backend:** `Google Apps Script Code/main.gs`, `Google Apps Script Code/phcs.gs`  
> **Exposed Global:** `window.MultiLevelStockUI`  
> **Mount Point:** `#stockComparisonDashboard` container  
> **Pattern:** IIFE module (`const MultiLevelStockUI = (() => { ... })()`)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Role Hierarchy & Access Control](#2-role-hierarchy--access-control)
3. [Module State (Global Variables)](#3-module-state-global-variables)
4. [Initialization & Tab Routing](#4-initialization--tab-routing)
5. [Tab Structure by Role](#5-tab-structure-by-role)
6. [Role-by-Role Workflows](#6-role-by-role-workflows)
   - 6.1 [CHO (Community Health Officer)](#61-cho-community-health-officer)
   - 6.2 [PHC Admin (Medical Officer / Pharmacist)](#62-phc-admin-medical-officer--pharmacist)
   - 6.3 [Master Admin (District Level)](#63-master-admin-district-level)
7. [UI Components & Shared Elements](#7-ui-components--shared-elements)
8. [Data Flows & API Calls](#8-data-flows--api-calls)
9. [Backend API Reference](#9-backend-api-reference)
10. [Google Sheets Schema](#10-google-sheets-schema)
11. [Key Functions Reference](#11-key-functions-reference)
12. [Business Rules & Constraints](#12-business-rules--constraints)
13. [Email Notifications](#13-email-notifications)
14. [CSS Architecture](#14-css-architecture)

---

## 1. Overview

The Stock Management module implements a **multi-tier medicine supply chain** for epilepsy care across a district. The flow of medicine demand and supply moves through three levels:

```
District Drug Store (Master Admin)
        │
        ▼  (dispatches to PHCs via "Dispatch to PHCs" tab)
PHC (Primary Health Centre) — managed by PHC Admin / Pharmacist
        │
        ▼  (approves and dispatches to CHOs)
CHO (Community Health Officer) at AAM Center
        │
        ▼  (gives to epilepsy patients)
Patients
```

The indent cycle runs on a **monthly cadence**:

| Date | Event |
|------|-------|
| 15th | CHOs raise monthly indent (stock reconciliation + demand calculation) |
| 15th–21st | CHO indent window is open |
| 21st | CHO indent submission deadline |
| 22nd–24th | PHC Admin reviews, approves, and consolidates CHO requests |
| 25th | PHC Admin submits consolidated indent to district |
| 25th deadline | District dispatches to PHCs |
| 1st of next month | Medicines arrive at PHCs / CHOs |

---

## 2. Role Hierarchy & Access Control

### Role Detection

Role detection happens via `getRoleFlags()` which calls `getCurrentUserContext()`:

```javascript
// getCurrentUserContext() reads from:
window.currentUser.Role  ||  window.currentUserRole
window.currentUser.PHC   ||  window.currentUserPHC
window.currentUser.AAM   ||  window.currentUserAAM
window.currentUser.Username || window.currentUserName
```

### Role Classification

| Role String (normalized) | Classified As | `isCHO` | `isPHC` | `isMasterAdmin` |
|--------------------------|---------------|---------|---------|----------------|
| `phc` | CHO | ✓ | — | — |
| `cho` | CHO | ✓ | — | — |
| `aam` | CHO | ✓ | — | — |
| `facility_staff` | CHO | ✓ | — | — |
| `phc_admin` | PHC Admin | — | ✓ | — |
| `medical officer` | PHC Admin | — | ✓ | — |
| `pharmacist` | PHC Admin | — | ✓ | — |
| `master_admin` | Master Admin | — | — | ✓ |
| `admin` | Master Admin | — | — | ✓ |
| `administrator` | Master Admin | — | — | ✓ |

### Allowed Tabs by Role

| Role | Tabs |
|------|------|
| CHO | `cho-indent`, `cho-history` |
| PHC Admin | `phc-requests`, `phc-district-indent`, `facility` |
| Master Admin | `admin-dashboard`, `admin-dispatch`, `facility` |
| Guest/Viewer | `facility`, `aam`, `indents`, `approvals` |

### Default Landing Tab

| Role | Default Tab |
|------|------------|
| CHO | `cho-indent` |
| PHC Admin | `phc-requests` |
| Master Admin | `admin-dashboard` |
| Other | `facility` |

Tab guard runs at every tab switch via `ensureActiveTabForRole()`. If the current tab is not in the role's allowed set, the user is redirected to the default tab.

---

## 3. Module State (Global Variables)

```javascript
let activeTab = 'facility';           // Currently active tab
let lastResolvedRole = '';            // Last detected role (cache invalidation)
let currentData = [];                 // Generic data cache (legacy)
let indentStep = 1;                   // Current step in CHO indent wizard (1–4)
let adminDrilldownPHC = null;         // Expanded PHC in admin drill-down
let adminDrilldownCHO = null;         // Expanded CHO in admin drill-down

// Wizard state (reset on every openIndentWizard() call)
let indentWizardState = {
    selectedPatients: [],             // Patient IDs selected in step 2
    reconciliation: {},               // { medicine: { calculated, reported, variance } }
    calculatedDemand: {},             // Step 3 output: [{ name, quantity, base, pilferage, patientCount }]
    followUpConsumption: {},          // Backend: { medicine: units_given }
    totalPatients: 0,
    medicines: [],                    // Full formulary list
    claimedPatientIds: {},            // { patientId: 'CHO Name' } — cross-CHO duplicate guard
    aamCenterOverride: undefined      // User-entered AAM center (step 1 input)
};

// PHC → District wizard state
let districtWizardState = {
    selectedIndentIds: [],            // CHO names (not IDs) currently checked
    consolidatedMedicines: {},        // { medicine: aggregated_qty }
    choIndents: []                    // All CHO indent records for this PHC
};

// Indent data cache (populated when PHC Requests table renders)
const _indentDataCache = {};         // { IndentID: { medicines, patientIds, raw } }
```

---

## 4. Initialization & Tab Routing

### Entry Point

```javascript
MultiLevelStockUI.init('stockComparisonDashboard')
```

Called from the main application when the Stock Management page is shown. It:
1. Injects scoped `<style>` into `<head>` (once, via `#multi-level-stock-styles`)
2. Calls `ensureActiveTabForRole()` to set the correct initial tab
3. Calls `renderStructure(container)` to build the full HTML shell
4. Calls `loadActiveTabData()` to fetch and render data for the active tab

### Tab Switching

```javascript
MultiLevelStockUI.switchTab('phc-requests')
```

1. Sets `activeTab = tab`
2. Gets the container `#stockComparisonDashboard`
3. Re-runs `ensureActiveTabForRole()` (security guard)
4. Re-renders the entire structure (`renderStructure`)
5. Loads new tab data (`loadActiveTabData`)

### Tab Router (`loadActiveTabData`)

```javascript
switch (activeTab) {
  'indents'             → loadIndents()
  'approvals'           → loadApprovalsTab()
  'cho-indent'          → loadCHOIndentDashboard()
  'cho-history'         → loadCHOIndentHistory()
  'phc-requests'        → loadPHCIndentRequests()
  'phc-district-indent' → loadPHCDistrictIndentTab()
  'admin-dashboard'     → loadAdminIndentDashboard()
  'admin-dispatch'      → loadAdminDispatchDashboard()
  default               → loadData()  // facility / aam tabs
}
```

---

## 5. Tab Structure by Role

### CHO Tabs

```
┌─────────────────────────────────────────────────────────────────┐
│  [📋 Monthly Indent ★]        [📜 My Indent History]           │
└─────────────────────────────────────────────────────────────────┘
```

- **Monthly Indent** (`cho-indent`): Default. Shows action card, 3 metric tiles, info box, and the CHO's recent indents list.
- **My Indent History** (`cho-history`): Timeline cards of all past indents with lifecycle status.

### PHC Admin Tabs

```
┌─────────────────────────────────────────────────────────────────┐
│  [📥 CHO Requests ★]   [✈ Submit to District]   [🏙 Facility]  │
└─────────────────────────────────────────────────────────────────┘
```

- **CHO Requests** (`phc-requests`): Incoming pending indents from CHOs under this PHC. Approve / Partial / Reject.
- **Submit to District** (`phc-district-indent`): Consolidate approved CHO indents and submit a single district-level request.
- **Facility View** (`facility`): Read-only stock dispatch table showing pending CHO indent demand vs facility stock.

### Master Admin Tabs

```
┌─────────────────────────────────────────────────────────────────┐
│  [📊 Indent Overview ★]   [🚚 Dispatch to PHCs]   [🏙 Facility Stock] │
└─────────────────────────────────────────────────────────────────┘
```

- **Indent Overview** (`admin-dashboard`): 4 metric tiles, PHC breakdown cards with CHO drill-down, Export CSV button.
- **Dispatch to PHCs** (`admin-dispatch`): District → PHC dispatch queue. Grouped by PHC with expandable CHO drill-down. One-click "Dispatch All to PHC" action.
- **Facility Stock** (`facility`): **Read-only** cross-PHC stock overview. Shows PHC | Medicine | Current Stock | Monthly Demand | Coverage | Stock Status. No dispatch actions.

---

## 6. Role-by-Role Workflows

---

### 6.1 CHO (Community Health Officer)

#### Tab: Monthly Indent (`cho-indent`)

**Dashboard components:**

1. **Next Action Card** (`renderNextActionCard()`): Context-aware banner:
   - Day = 15th → "TODAY - Time to Tally & Indent"
   - Day 16–21 → "Indent Window Open"
   - Other days → "Track Your Recent Indents"

2. **Metric tiles:**
   - Pending Requests (count of this CHO's Pending status indents)
   - Approved This Month (Dispatched status count)
   - Next Indent Due (derived from current date)

3. **Info box:** Explains the cycle (15th, follow-up verification, safety buffer, PHC approval)

4. **Recent Indents List** (`#cho-indent-list`): Last 10 indents shown as cards. Each card shows: IndentID, date, medicines count, patient count, status badge.

5. **"Start Indent Process"** button → opens the 4-step wizard modal.

**Indent Wizard (4 Steps):**

Triggered by `openIndentWizard()`. Runs inside a `#stock-modal-container` fixed overlay.

---

##### Step 1: End-of-Month Reconciliation

- **Purpose:** Verify physical stock against system-calculated consumption (from follow-ups in past 30 days).
- **AAM Center input:** Required for CHO role. Highlighted red with error message if empty. Validated in `nextIndentStep()` before proceeding.
- **Consumption data source:** `getFollowUpConsumption` backend call (GET, via `loadReconciliationData()`).
- **Quick Tally Mode button:** Switches to a mobile-friendly full-screen mode with large +/− buttons. Data is saved back to `indentWizardState.reconciliation` on "Save Tallies & Continue".
- **Reconciliation table:** Each row = one medicine. Columns: Medicine | Calculated Consumed (from backend) | Remaining Stock (user-entered number input) | Variance Alert (auto-calculated).
- **Variance thresholds:**
  - > 10% → red alert
  - 5–10% → yellow warning
  - ≤ 5% → green check
- **State saved:** `indentWizardState.reconciliation[medicine] = { calculated, reported, variance }` and `indentWizardState.aamCenterOverride`

---

##### Step 2: Patient Selection

- **Data source:** `window.patientData` filtered by PHC/AAM via `getFacilityScopedPatients()`.
- **Eligibility:** Active patients only (deceased / inactive / transferred out are excluded).
- **Main list:** Patients followed up in the last 6 months, sorted most recent first. Patients followed up in last 30 days highlighted in blue.
- **Search panel:** Collapsed by default. Shows remaining active patients (no recent FU). Searchable live by name/ID.
- **Select All button:** Selects only the main list (recent FU patients), not search results.
- **Cross-CHO duplicate detection:** On entering Step 2, `loadClaimedPatients()` fires (async). It calls `getIndents` with facility + Pending status and builds `indentWizardState.claimedPatientIds`. Any patient already in another CHO's pending indent gets:
  - Checkbox disabled + grayed out
  - "In [CHO name]'s indent" badge appended
  - Removed from `selectedPatients` state
- **Persistence:** Selection is saved to `localStorage` keyed by `epicare-indent-selection:<username>:<phc>:<aamCenter>`. Restored when wizard is re-opened.
- **State saved:** `indentWizardState.selectedPatients = [patientId, ...]`

---

##### Step 3: Requirement Calculation

- **Data source:** `indentWizardState.selectedPatients` IDs matched against `window.patientData`.
- **Per-medicine calculation:**
  - Calls `StockComparison.calculateMonthlyRequirement(patients, medicineName)` for each medicine in the formulary.
  - Falls back to `patientCount × 30` (or `×1` for syrups) if the calculation returns 0 but patients are known to need the medicine.
  - `patientUsesMedicine(patient, medicine)` normalizes medicine names (strip brackets, lowercase, alphanumeric only) for fuzzy matching.
- **Safety buffer:** +5% of base (pilferage/wastage). `Math.ceil(base × 1.05)`.
- **Display:** Table shows Base Requirement | 5% Buffer | **Final Order** per medicine.
- **State saved:** `indentWizardState.calculatedDemand = [{ name, quantity, base, pilferage, patientCount, unitLabel }]`

---

##### Step 4: Review & Submit

- Shows summary: patient count, medicine count, first 5 medicines listed.
- "Submit Indent Request" triggers `submitIndent()`.

---

##### Submission (`submitIndent()`)

**Step A — POST `submitIndentRequest`:**

Payload:
```json
{
  "facility": "PHC Name",
  "aamCenter": "AAM Center Name",
  "requestedBy": "username",
  "totalPatients": 12,
  "patientIds": ["P001", "P002", ...],
  "medicines": [{ "name": "Phenytoin 100mg", "quantity": 63 }, ...]
}
```

**Duplicate patient handling:**
- If backend returns `code: 'DUPLICATE_PATIENTS'`, the wizard stays open.
- Conflicting patients highlighted in red, deselected.
- Footer shows "Back to Patient Selection" button → `goBackToStep(2)`.

**Step B — POST `submitStockReconciliation`:**

Payload:
```json
{
  "facility": "PHC Name",
  "aamCenter": "AAM Center Name",
  "calculatedConsumed": { "Phenytoin 100mg": 50 },
  "reportedConsumed": { "Phenytoin 100mg": { "calculated": 50, "reported": 45, "variance": 10 } },
  "discrepancyNotes": "Indent submission ID: IND-xxx",
  "submittedBy": "username"
}
```

**Step C — Email notification:** Sends to `currentUser.PHC_MO_Email` via `sendEmailNotification(indentId, phcMoEmail, ..., 'submission')`.

**Post-success:** Toast notification → `switchTab('indents')` after 1 second.

---

#### Tab: My Indent History (`cho-history`)

- Calls `getIndents` with `requestedBy=<username>&facility=<phc>`.
- Renders as timeline cards. Each card:
  - Header: IndentID, date, medicine count, patient count, status badge
  - Lifecycle timeline: Raised → Approved → Dispatched → Received (via `renderIndentTimeline()`)
  - Medicine summary (first 3 medicines, "+N more")
- Falls back to table view if `#tab-content-area` is absent.

---

### 6.2 PHC Admin (Medical Officer / Pharmacist)

#### Tab: CHO Requests (`phc-requests`)

**Metrics row (3 tiles):**
- Pending from CHOs
- CHOs Under This PHC
- Medicines in Requests

**Table columns:** Indent ID | CHO Name | AAM Center | Date | Patients | Medicines | Status | Action

**Actions per pending indent:**

| Button | Color | Action |
|--------|-------|--------|
| Approve | Blue | `quickApproveIndent(indentId, aamCenter)` → GET `updateIndentStatus?status=Dispatched` |
| Partial | Amber | `showPartialDispatchModal(indentId, choName)` → opens per-medicine qty modal |
| Reject | Red | `showRejectModal(indentId, choName)` → opens rejection reason textarea modal |

**Approve flow (`quickApproveIndent`):**
1. Disables button, shows spinner
2. GET `updateIndentStatus?indentId=X&status=Dispatched&processedBy=Y`
3. Success → toast + reload tab data after 500ms
4. Failure → re-enables button

**Partial Dispatch flow:**
1. Modal shows: requested quantity vs editable dispatch quantity per medicine
2. Medicine data read from `_indentDataCache[indentId]` (populated when table rendered)
3. Falls back to fetching via `getIndents?indentId=X` if not cached
4. "Confirm Partial Dispatch" → `processPartialDispatch(indentId, modalId)` → `partialDispatchIndent(indentId, quantities)`
5. POST `partialDispatchIndent` with `{ indentId, status: 'Partially Dispatched', medicineUpdates: {}, dispatchedBy, dispatchDate, note }`
6. Sends email notification of type `partial_dispatch`

**Reject flow:**
1. Rejection reason textarea (required — validated client-side)
2. POST `updateIndentStatus` with `{ indentId, status: 'Rejected', rejectionReason, rejectedBy, rejectedDate }`
3. Sends email notification of type `rejection`

**"N medicines" pill:** Clicking opens `showIndentDetails(indentId)` — a detail modal showing the medicine table and patient ID list from cache.

---

#### Tab: Submit to District (`phc-district-indent`)

Loaded via `loadPHCDistrictIndentTab()`.

**Parallel fetch on load:**
1. `getIndents?facility=<phc>` — all CHO indents for this PHC
2. `getDistrictIndents?facility=<phc>` — existing district submissions

**Submission deadline banner:**
- Day > 25 → Red "Deadline Passed" warning
- Day ≥ 22 → Amber "Deadline Approaching (X days left)"
- Otherwise → Green "On Track"

**UI Layout (2-column grid):**

**Left panel — Step 1: Select CHO(s)**

CHOs are split into two groups:
- **Available CHOs** (not yet submitted to district this month): Selectable checkboxes. Shows: indent count, pending count badge, medicine count.
- **Already Submitted** (in a district indent this month): Grayed out rows, disabled checkboxes, green "✓ Submitted" badge, "Sent to district" status badge. Separated by a green header row.

"Already submitted" detection: Backend returns `SourceCHONames` in district indent records. The frontend builds a `Set<string>` of CHO names from all district indents with `Date >= start of current month`.

**Right panel — Step 2: Consolidated Requirement**

Populated on CHO checkbox change via `onCHOCheckboxChange()`:
- Aggregates all `MedicinesJSON` quantities from checked CHOs' indents
- Stores in `districtWizardState.consolidatedMedicines`
- Renders editable table (qty inputs allow manual adjustments via `updateDistrictQty()`)
- Submit section appears when at least one medicine has qty > 0

**Submit to District:**

POST `submitDistrictIndent`:
```json
{
  "action": "submitDistrictIndent",
  "sessionToken": "...",
  "facility": "PHC Name",
  "submittedBy": "username",
  "medicines": [{ "name": "Phenytoin 100mg", "quantity": 200 }],
  "notes": "Optional notes",
  "choNames": ["CHO Name 1", "CHO Name 2"]
}
```

On success: Resets `districtWizardState`, reloads the tab after 1 second.

---

#### Tab: Facility View (`facility`)

For PHC Admin, this shows the **pending CHO indent dispatch table**:

- Fetches `getIndents?status=Pending&facility=<phc>`
- Renders 7-column table: CHO Name | Medicine | Facility Stock | Monthly Demand | Coverage | Dispatch Qty | Action
- Each row has an editable qty input (pre-filled with demand) and a "Dispatch" button
- Dispatch button calls `dispatchToIndent(indentId, btn)` → POST `updateIndentStatus`
- Coverage shown as colored badge (Critical / Low / Adequate)
- Metrics row: Total Items, Critical Shortage count, CHOs with Pending, PHC Stock Health

---

### 6.3 Master Admin (District Level)

#### Tab: Indent Overview (`admin-dashboard`)

Loaded via `loadAdminIndentDashboard()`. Fetches ALL indents from `getIndents` (no facility filter).

**4 Metric tiles:**
- Total Indent Requests
- Pending Approval
- PHCs Reporting (unique `Facility` values)
- CHOs Requesting (unique `RequestedBy` values)

**PHC Breakdown cards (clickable):**
- One card per unique `Facility` value
- Shows: total requests, CHO count, pending count badge
- Click → expands CHO-level table inside the card
- Each CHO row: Name | Indents Raised | Pending count | Medicines Requested
- Toggle handled by `toggleAdminPHCDrilldown(phcKey)` — rotates chevron, shows/hides sub-table

**Export CSV button:** `exportIndentReport()` — client-side CSV generation:
- Fetches all indents from `getIndents`
- Builds CSV with UTF-8 BOM (`\uFEFF`) for Excel compatibility
- Columns: IndentID | Facility | Requested By | AAM Center | Date | Status | Total Patients | Medicines | Notes
- Medicines formatted as `"Phenytoin 100mgx63; Clobazam 10mgx42"`
- Triggers browser download: `IndentReport_YYYY-MM-DD.csv`

---

#### Tab: Dispatch to PHCs (`admin-dispatch`)

Loaded via `loadAdminDispatchDashboard()`. Fetches ALL district indents from `getDistrictIndents` (no facility filter).

**Deadline banner:** Same red/green logic as PHC district tab.

**No pending indents:** Shows green "No pending district indent requests" message.

**PHC dispatch queue:**
- Grouped by `Facility`
- Each PHC card:
  - Header: PHC name, indent count, pending count, medicine type count
  - "Dispatch All to [PHC]" button (blue gradient) → `dispatchAllForPHC(phcName)` → confirm dialog → POST `dispatchDistrictIndent`
  - Chevron to expand drill-down
  - Drill-down table: CHO/Submitter | AAM Center | Date | Medicines Requested (first 3 + count) | Status
  - Consolidated medicine pills: "Phenytoin 100mg: **200**" per medicine type
- POST `dispatchDistrictIndent` payload: `{ action, sessionToken, facility, processedBy }`

---

#### Tab: Facility Stock (`facility`)

**Read-only view for master_admin** (does NOT show dispatch actions).

- Fetches `getAllPHCStock` (all stock records across all PHCs)
- Renders 6-column table: PHC | Medicine | Current Stock | Monthly Demand | Coverage | Stock Status
- Coverage: `CurrentStock / MonthlyDemand` in months (shown as "X.X mo")
- Status badges:
  - `< 0.5 months` → **Critical** (red)
  - `0.5–1 month` → **Low** (amber)
  - `≥ 1 month` → **Adequate** (green)
  - No demand data → **No Data**
- Metrics row: PHCs Tracked | Critical Stockout count | Low Stock count | Total Items

> Master admin never dispatches directly to CHOs from this tab. All dispatch happens via "Dispatch to PHCs" (district → PHC) to enforce the supply chain hierarchy.

---

## 7. UI Components & Shared Elements

### `#tab-content-area`

A wrapper `div` inside `#stock-ops-content` that contains the filter bar and stock table. Visibility rules:

```javascript
// Hidden when these tabs are active (they render to their own DOM elements):
activeTab === 'admin-dashboard'  → display: none
activeTab === 'cho-indent'       → display: none
activeTab === 'cho-history'      → display: none

// Visible for:
facility, aam, phc-requests, phc-district-indent, admin-dispatch
```

For `cho-history` and `admin-dispatch`, the loader writes directly to `tab-content-area.innerHTML`.

### `#stock-ops-table`

Standard `<table class="stock-table">` with:
- `#stock-ops-thead` — replaced per tab by each loader
- `#stock-ops-tbody` — data rows

### `#stock-metrics-row`

Flex row of `metric-card` divs. Populated or cleared by each tab's loader.

### `#stock-modal-container`

Fixed container for modals. Cleared by setting `.innerHTML = ''`. Used for:
- CHO Indent Wizard
- Reject modal (appended to `document.body`)
- Partial Dispatch modal (appended to `document.body`)
- Indent Details modal (appended to `document.body`)

### Filter Bar

Visible when `#tab-content-area` is shown:
- **Search input** → `filterTable(value)` — hides rows where `row.innerText` doesn't include query
- **Status dropdown** → `filterStatus(value)` — filters rows by `.status-badge` text

### Status Badges

```css
.status-critical { background: #fee2e2; color: #ef4444; }   /* red */
.status-warning  { background: #ffedd5; color: #f59e0b; }   /* amber */
.status-adequate { background: #dcfce7; color: #10b981; }   /* green */
```

### Coverage Bar

Visual bar under coverage percentage:
```html
<div class="coverage-bar-container">
  <div class="coverage-bar" style="width: X%; background: #color;"></div>
</div>
```

### Indent Lifecycle Timeline (`renderIndentTimeline`)

4-node vertical timeline: Raised → Approved → Dispatched → Received. Nodes colored based on `indent.Status`:
- Completed nodes: green dot
- Active node: blue dot with glow
- Future nodes: gray

---

## 8. Data Flows & API Calls

### CHO Indent Wizard Data Flow

```
loadReconciliationData()
  → GET getFollowUpConsumption?facility=&aamCenter=&days=30
  → indentWizardState.followUpConsumption = { medicine: units }

Step 2 init:
  → window.patientData (pre-loaded by main app)
  → getFacilityScopedPatients() — filters by PHC/AAM
  → loadClaimedPatients()
      → GET getIndents?facility=&status=Pending
      → builds indentWizardState.claimedPatientIds

Step 3:
  → StockComparison.calculateMonthlyRequirement(patients, medicine)
  → +5% safety buffer → indentWizardState.calculatedDemand

submitIndent():
  → POST submitIndentRequest
  → POST submitStockReconciliation
  → POST sendEmailNotification (to PHC_MO_Email)
```

### PHC District Indent Data Flow

```
loadPHCDistrictIndentTab()
  → [parallel]
     GET getIndents?facility=<phc>
     GET getDistrictIndents?facility=<phc>
  → builds submittedCHOs Set from SourceCHONames
  → renderPHCDistrictTabContent(allIndents, phc, submittedCHOs)

onCHOCheckboxChange()
  → aggregates MedicinesJSON from selected CHOs
  → renders consolidated table

submitDistrictConsolidatedIndent()
  → POST submitDistrictIndent
```

### Master Admin Dispatch Data Flow

```
loadAdminDispatchDashboard()
  → GET getDistrictIndents (no filters)
  → groups by Facility
  → renders PHC cards

dispatchAllForPHC(phcName)
  → confirm()
  → POST dispatchDistrictIndent { facility, processedBy }
  → reloads dashboard
```

### Facility Stock Data Flow (all roles)

```
loadData()
  if activeTab === 'facility':
    GET getAllPHCStock                     // master_admin or viewer
  else:
    GET getPHCStock?phcName=<phc>         // block-level (legacy)
  
  → processAndRender(stockData, patients)
    if isMasterAdmin:
      → read-only overview table (no API calls inside)
    else:
      → GET getIndents?status=Pending&facility=<phc>
      → dispatch table with pending CHO demands
```

---

## 9. Backend API Reference

All calls go to the deployment URL in `window.API_CONFIG.MAIN_SCRIPT_URL`.

### GET Endpoints (doGet in main.gs)

| Action | Parameters | Returns | Used By |
|--------|-----------|---------|---------|
| `getAllPHCStock` | — | All rows from `PHC_Stock` sheet | `loadData()` (facility tab) |
| `getPHCStock` | `phcName` | Stock rows for one PHC | `loadData()` (aam tab) |
| `getIndents` | `facility`, `status`, `aamCenter`, `requestedBy` | Filtered Indents rows | Multiple tabs |
| `getDistrictIndents` | `facility`, `status` | Filtered DistrictIndents rows | PHC district tab, admin dispatch |
| `updateIndentStatus` | `indentId`, `status`, `processedBy` | `{ status: 'success' }` | PHC approve, CHO history |
| `getFollowUpConsumption` | `facility`, `aamCenter`, `days` | `{ medicine: units }` | Wizard step 1 |
| `getCurrentStockAtFacility` | `facility`, `aamCenter` | Stock object | Wizard (legacy) |
| `analyzeVariancePatterns` | `facility`, `months` | `{ patterns, alerts }` | Approvals tab |
| `getFollowUps` | — | Follow-up records | General |
| `getPHCs` | — | PHC list | General |
| `getPatients` | various | Patient records | General |

### POST Endpoints (doPost in main.gs)

| Action | Key Payload Fields | Used By |
|--------|-------------------|---------|
| `submitIndentRequest` | `facility, aamCenter, requestedBy, totalPatients, patientIds, medicines` | CHO wizard submit |
| `submitStockReconciliation` | `facility, aamCenter, calculatedConsumed, reportedConsumed, discrepancyNotes, submittedBy` | CHO wizard submit |
| `updateIndentStatus` | `indentId, status, rejectionReason, rejectedBy` (for rejection) | PHC reject |
| `partialDispatchIndent` | `indentId, medicineUpdates, dispatchedBy, dispatchDate, note` | PHC partial dispatch |
| `submitDistrictIndent` | `facility, submittedBy, medicines, notes, choNames, sessionToken` | PHC → district |
| `dispatchDistrictIndent` | `facility, processedBy, sessionToken` | Master admin dispatch |
| `sendEmailNotification` | `recipientEmail, indentId, indentData, notificationType, senderName` | Post-submission |

### Authentication

- All requests check `sessionToken` (from body or `e.parameter`)
- Session stored in `PropertiesService.getScriptProperties()` with key `SESSION_<token>`
- Session duration: 90 minutes, auto-refreshed on every valid request
- Public actions (no auth): `login`, `changePassword`

---

## 10. Google Sheets Schema

### Indents Sheet

| Column | Description |
|--------|-------------|
| `IndentID` | Unique ID (format: `IND-YYYYMMDD-HHMMSS-XXXX`) |
| `Facility` | PHC name |
| `AAMCenter` | CHO's AAM center |
| `RequestedBy` | CHO username |
| `Date` | ISO date string of submission |
| `TotalPatients` | Number of patients included |
| `MedicinesJSON` | JSON array: `[{ name, quantity }]` |
| `PatientIDsJSON` | JSON array of patient IDs |
| `Status` | `Pending`, `Dispatched`, `Rejected`, `Partially Dispatched` |
| `Notes` | Optional notes |
| `ProcessedBy` | Username who approved/rejected |
| `ProcessedDate` | Date of processing |

### DistrictIndents Sheet

| Column | Description |
|--------|-------------|
| `DistrictIndentID` | Unique ID |
| `Facility` | PHC name submitting to district |
| `SubmittedBy` | PHC admin username |
| `Date` | Submission date |
| `MedicinesJSON` | JSON array: `[{ name, quantity }]` |
| `SourceCHONames` | JSON array of CHO names included in consolidation |
| `Status` | `Pending`, `Dispatched` |
| `Notes` | Optional notes (including critical shortage notes) |
| `ProcessedBy` | Master admin who dispatched |
| `ProcessedDate` | Dispatch date |

### StockReconciliations Sheet

Stores end-of-month reconciliation audits (one row per CHO submission).

### PHC_Stock Sheet (used by `getAllPHCStock`)

| Column | Description |
|--------|-------------|
| `PHC` | PHC name |
| `Medicine` | Medicine name |
| `CurrentStock` | Current unit count |
| `MonthlyDemand` | Expected monthly demand |

---

## 11. Key Functions Reference

### Context & Role

| Function | Returns | Description |
|----------|---------|-------------|
| `getCurrentUserContext()` | `{ username, phc, role, normalizedRole, aamCenter, phcMoEmail }` | Reads from `window.currentUser` |
| `getRoleFlags()` | `{ isCHO, isPHC, isMasterAdmin, isApprover, ...context }` | Role booleans |
| `ensureActiveTabForRole()` | — | Guards `activeTab` against unauthorized values |
| `getDefaultTabForRole()` | `string` | Returns role's default landing tab |

### Patient Utilities

| Function | Description |
|----------|-------------|
| `getFacilityScopedPatients(patients)` | Filters `window.patientData` by current user's PHC/AAM |
| `getPatientMedicineNames(patient)` | Extracts medicine names from all possible field locations |
| `normalizeMedicineName(value)` | Strips spaces, brackets, special chars — used for fuzzy matching |
| `patientUsesMedicine(patient, medicine)` | Returns true if patient is on a medicine (normalized match) |

### Indent Wizard State

| Function | Description |
|----------|-------------|
| `openIndentWizard()` | Resets state, opens modal, calls `loadReconciliationData()` |
| `loadReconciliationData()` | Fetches `getFollowUpConsumption`, then renders wizard |
| `renderIndentWizardUI()` | Builds full modal shell with step indicators |
| `renderIndentStep(step)` | Returns HTML for one wizard step (1–4) |
| `nextIndentStep()` | Validates current step, saves state, advances to next |
| `submitIndent()` | Makes backend calls, handles duplicate errors, shows toast |
| `goBackToStep(step)` | Rewinds wizard to a specific step (used for duplicate recovery) |
| `loadClaimedPatients()` | Async: fetches pending indents, builds `claimedPatientIds` |
| `applyClaimedPatientWarnings()` | Applies visual warnings to claimed patient rows |
| `getIndentSelectionStorageKey()` | Returns localStorage key for patient selection |
| `loadSavedIndentSelection()` | Reads saved patient IDs from localStorage |
| `saveIndentSelection(ids)` | Persists patient ID array to localStorage |

### Quick Tally Mode

| Function | Description |
|----------|-------------|
| `switchToQuickTallyMode()` | Replaces wizard body with large +/− button UI |
| `renderQuickTallyMode()` | Returns HTML for quick tally grid |
| `activateQuickTallyMode()` | Wires up +/− button click handlers after render |
| `saveQuickTallyData()` | Saves tally inputs to `indentWizardState.reconciliation` |

### PHC Admin Actions

| Function | Description |
|----------|-------------|
| `loadPHCIndentRequests()` | Fetches and renders CHO requests table |
| `quickApproveIndent(indentId, aamCenter)` | One-click approve via GET `updateIndentStatus` |
| `showRejectModal(indentId, choName)` | Opens rejection reason modal |
| `rejectIndent(indentId, reason)` | POSTs rejection, sends email |
| `showPartialDispatchModal(indentId, choName)` | Opens per-medicine qty modal |
| `_renderPartialMedicineInputs(modalId, medicines)` | Fills partial dispatch table |
| `processPartialDispatch(indentId, modalId)` | Reads inputs, calls `partialDispatchIndent` |
| `partialDispatchIndent(indentId, medicineUpdates)` | POSTs partial dispatch, sends email |
| `showIndentDetails(indentId)` | Opens read-only detail modal (medicines + patients) |

### PHC → District

| Function | Description |
|----------|-------------|
| `loadPHCDistrictIndentTab()` | Parallel-fetches CHO + district indents, renders tab |
| `renderPHCDistrictTabContent(allIndents, phc, submittedCHOs)` | Builds 2-column consolidation UI |
| `onCHOCheckboxChange()` | Recalculates consolidated demand on checkbox toggle |
| `updateDistrictQty(medicine, value)` | Updates `districtWizardState.consolidatedMedicines` |
| `submitDistrictConsolidatedIndent()` | POSTs `submitDistrictIndent` |

### Master Admin

| Function | Description |
|----------|-------------|
| `loadAdminIndentDashboard()` | Fetches all indents, renders PHC breakdown with drill-down |
| `toggleAdminPHCDrilldown(phcKey)` | Shows/hides CHO sub-table inside PHC card |
| `loadAdminDispatchDashboard()` | Fetches all district indents, renders dispatch queue |
| `renderAdminDispatchDashboard(districtIndents)` | Builds PHC group cards |
| `togglePHCDrilldown(phcKey)` | Shows/hides CHO drill-down in dispatch view |
| `dispatchAllForPHC(phcName)` | Confirm → POST `dispatchDistrictIndent` |
| `exportIndentReport()` | Fetches all indents, generates and downloads CSV |

### Facility/Stock View

| Function | Description |
|----------|-------------|
| `loadData()` | Fetches stock data (all PHCs or one PHC), calls `processAndRender` |
| `processAndRender(stockData, patients)` | Branches on role: read-only overview (admin) or dispatch table (PHC) |
| `dispatchToIndent(indentId, btn)` | PHC admin: reads dispatch qty input, POSTs `updateIndentStatus` |
| `dispatch(location, medicine, btn)` | Legacy wrapper → delegates to `dispatchToIndent` |

### UI Utilities

| Function | Description |
|----------|-------------|
| `renderNextActionCard()` | Returns Next Action banner HTML (role + date aware) |
| `renderSupplyHealthGauge(pct, label)` | Returns radial SVG-like gauge HTML |
| `renderIndentTimeline(indent)` | Returns 4-node vertical timeline HTML |
| `filterTable(query)` | Hides table rows not matching search string |
| `filterStatus(status)` | Filters table rows by status badge text |
| `switchTab(tab)` | Full tab switch: re-render + reload |
| `sendEmailNotification(...)` | POST `sendEmailNotification` to backend |

---

## 12. Business Rules & Constraints

### Indent Submission Rules

1. **AAM Center required** for CHO role — wizard blocks Step 1→2 transition if blank.
2. **At least one patient** must be selected in Step 2 — blocks Step 2→3 transition.
3. **Duplicate patients across CHOs:** Backend returns `DUPLICATE_PATIENTS` code with `conflictingPatientIds`. Frontend highlights and deselects, forces CHO to review.
4. **5% safety buffer** is always applied and transparently shown in Step 3.
5. **CHO history persistence:** Patient selection is saved to `localStorage`. Restored on re-opening the wizard.

### District Indent Rules

1. **PHC can only submit a CHO** to district once per calendar month. `SourceCHONames` field stores submitted CHO names per district indent. The frontend grays them out in the "Submit to District" tab.
2. **Deadline enforcement:** Warning banners appear starting day 22 (amber) and day > 25 (red). No server-side block.
3. **Quantity editing:** PHC admin can adjust auto-calculated consolidated quantities before submitting to district.

### Supply Chain Hierarchy Enforcement

- **Master admin never dispatches to CHOs directly.** The "Facility Stock" tab is read-only for `isMasterAdmin`. All master admin dispatch actions go through "Dispatch to PHCs" (`admin-dispatch`), which operates on district-level indents submitted by PHC admins.
- **PHC admin dispatches to CHOs** from "CHO Requests" (`phc-requests`) tab. This is the correct level for CHO → PHC medicine flow.

### Session & Auth

- 90-minute sessions, auto-refreshed per request
- Token passed as query param `sessionToken` in GET requests, or in JSON body for POST
- Public actions: `login`, `changePassword` only

---

## 13. Email Notifications

Handled by `sendEmailNotification(indentId, recipientEmail, indentData, notificationType)` via POST `sendEmailNotification`.

| Trigger | `notificationType` | Recipient |
|---------|-------------------|-----------|
| CHO submits indent | `submission` | PHC MO Email (`currentUser.PHC_MO_Email`) |
| PHC rejects indent | `rejection` | CHO email (from backend `result.choEmail`) |
| PHC partial dispatch | `partial_dispatch` | CHO email (from backend `result.choEmail`) |

Payload to backend:
```json
{
  "recipientEmail": "...",
  "indentId": "IND-xxx",
  "indentData": { ... },
  "notificationType": "submission|approval|rejection|partial_dispatch",
  "timestamp": "ISO date",
  "senderName": "username"
}
```

Email sending is best-effort — failures are logged as warnings but do not block the main workflow.

---

## 14. CSS Architecture

All styles are injected via an IIFE-scoped template literal string (`styles` constant) into a `<div id="multi-level-stock-styles">` appended to `<head>`. Styles are injected only once per page load.

### Key CSS Classes

| Class | Element | Purpose |
|-------|---------|---------|
| `.stock-ops-container` | Root | Card container with shadow |
| `.stock-ops-tabs` | Tab bar | Flex pill tabs |
| `.stock-ops-tab` | Tab item | Inactive tab styling |
| `.stock-ops-tab.active` | Active tab | White bg, blue text |
| `.stock-ops-content` | Content area | Padding, scroll context |
| `.stock-table` | `<table>` | Bordered, hover-highlight table |
| `.status-badge` | Inline badge | Pills for Critical/Low/Adequate |
| `.status-critical` | Badge modifier | Red (#fee2e2 / #ef4444) |
| `.status-warning` | Badge modifier | Amber (#ffedd5 / #f59e0b) |
| `.status-adequate` | Badge modifier | Green (#dcfce7 / #10b981) |
| `.dispatch-input` | `<input type="number">` | 70px centered number input |
| `.btn-dispatch` | `<button>` | Blue action button |
| `.metric-card` | Stat tile | White bordered flex card |
| `.metric-value` | Number | 1.5rem bold |
| `.stock-modal` | Overlay | Fixed full-screen modal backdrop |
| `.stock-modal-content` | Modal box | Max 800px, scrollable |
| `.step-container` | Wizard steps | Flex step indicator row |
| `.step`, `.step.active`, `.step.completed` | Step circle | Blue/green colored circles |
| `.patient-list-item` | Patient row | Flex row in Step 2 |
| `.timeline` | Lifecycle | Left-bordered vertical timeline |
| `.timeline-item` | Timeline node | With dot and content |
| `.bottom-nav` | Mobile nav | Fixed bottom navigation |
| `.coverage-bar-container` | Bar background | 120px gray track |
| `.coverage-bar` | Bar fill | Colored progress bar |

### Responsive Behavior

```css
@media (max-width: 768px) {
    .stock-ops-tabs { display: none; }           /* Use bottom nav on mobile */
    .stock-ops-content { padding-bottom: 80px; } /* Account for bottom nav */
    .metric-card { min-width: 140px; }
}
```

The `.bottom-nav` provides mobile tab navigation (`.nav-item`, `.nav-item.active`).
