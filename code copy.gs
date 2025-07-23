/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const PATIENTS_SHEET_NAME = 'Patients';
const FOLLOWUPS_SHEET_NAME = 'FollowUps';
const USERS_SHEET_NAME = 'Users';
const PHCS_SHEET_NAME = 'PHCs';
const MEDICINE_STOCK_SHEET_NAME = 'MedicineStock';
const PHC_STOCK_SHEET_NAME = 'PHC_Stock';
const USER_ACTIVITY_LOGS_SHEET_NAME = 'UserActivityLogs'; // New sheet for PHC data

// Cache for PHC names to improve performance
let phcNamesCache = null;
let phcNamesCacheTimestamp = null;
const PHC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// ... (rest of the code remains the same)

// Function to create a sheet if it doesn't exist
function createSheetIfNotExists(sheetName, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f0f0f0');
    sheet.setFrozenRows(1);
    
    // Special formatting for UserActivityLogs
    if (sheetName === USER_ACTIVITY_LOGS_SHEET_NAME) {
      sheet.setColumnWidth(1, 160); // Timestamp
      sheet.setColumnWidth(2, 120); // Username
      sheet.setColumnWidth(3, 100); // UserRole
      sheet.setColumnWidth(4, 120); // UserPHC
      sheet.setColumnWidth(5, 150); // Action
      sheet.setColumnWidth(6, 100); // EntityType
      sheet.setColumnWidth(7, 100); // EntityId
      sheet.setColumnWidth(8, 150); // EntityName
      sheet.setColumnWidth(9, 300); // Details
      sheet.setColumnWidth(10, 120); // IPAddress
      sheet.setColumnWidth(11, 200); // UserAgent
      sheet.setColumnWidth(12, 300); // AdditionalData
    }
  } else {
    // Ensure all required columns exist in the sheet
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const missingHeaders = [];
    
    headers.forEach(header => {
      if (!existingHeaders.includes(header)) {
        missingHeaders.push(header);
      }
    });
    
    if (missingHeaders.length > 0) {
      // Add missing headers to the end
      const lastCol = sheet.getLastColumn();
      sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]);
      
      // Format the new headers
      const newHeaderRange = sheet.getRange(1, lastCol + 1, 1, missingHeaders.length);
      newHeaderRange.setFontWeight('bold');
      newHeaderRange.setBackground('#f0f0f0');
    }
  }
  
  return sheet;
}

// Initialize the spreadsheet with required sheets and headers
function initializeSpreadsheet() {
  createSheetIfNotExists(PATIENTS_SHEET_NAME, ['ID', 'Name', 'Age', 'Gender', 'Phone', 'Village', 'PHC', 'RegistrationDate', 'Status', 'FollowUpStatus', 'LastFollowUp', 'NextFollowUpDate', 'Medications', 'MedicationHistory', 'LastMedicationChangeDate', 'LastMedicationChangeBy', 'PatientStatus', 'Diagnosis', 'ReferredToMO', 'ReferralClosed', 'Weight', 'BMI', 'BloodPressure', 'SeizureFrequency', 'SeizureType', 'Comorbidities', 'Notes']);
  createSheetIfNotExists(FOLLOWUPS_SHEET_NAME, ['ID', 'PatientID', 'Date', 'Status', 'Notes', 'NextFollowUpDate', 'Medications', 'MedicationChanged', 'Weight', 'BMI', 'BloodPressure', 'SeizureFrequency', 'SeizureType', 'Comorbidities', 'Adherence', 'SideEffects', 'ReferredToMO', 'ReferralNotes', 'ReferralClosed', 'SubmittedBy']);
  createSheetIfNotExists(USERS_SHEET_NAME, ['Username', 'Password', 'Role', 'PHC', 'Name', 'Email', 'Status']);
  createSheetIfNotExists(PHCS_SHEET_NAME, ['Name', 'District', 'Block', 'Address', 'ContactPerson', 'Phone', 'Email', 'Status']);
  createSheetIfNotExists(MEDICINE_STOCK_SHEET_NAME, ['Medicine', 'CurrentStock', 'LastUpdated', 'Notes']);
  createSheetIfNotExists(PHC_STOCK_SHEET_NAME, ['PHC', 'Medicine', 'CurrentStock', 'LastUpdated', 'Notes']);
  // Create UserActivityLogs sheet if it doesn't exist
  createSheetIfNotExists(USER_ACTIVITY_LOGS_SHEET_NAME, [
    'Timestamp',
    'Username',
    'UserRole',
    'UserPHC',
    'Action',
    'EntityType',
    'EntityId',
    'EntityName',
    'Details',
    'IPAddress',
    'UserAgent',
    'AdditionalData'
  ]);
}

// Logs user activity to the UserActivityLogs sheet
function logUserActivity(params, e = null, additionalData = {}) {
  try {
    const { username, action, entityType, entityId, entityName, details } = params;
    
    // Get user info
    const userInfo = getUserAccessInfo(username);
    
    // Get client info from the request
    let ipAddress = 'Unknown';
    let userAgent = 'Unknown';
    
    if (e) {
      ipAddress = e.parameter.remoteAddress || 
                 e.parameter.forwardedFor || 
                 e.parameter['X-Forwarded-For'] || 
                 'Unknown';
      userAgent = e.parameter.userAgent || 
                 e.parameter['User-Agent'] || 
                 'Unknown';
    }
    
    // Prepare the data row
    const timestamp = new Date().toISOString();
    const rowData = [
      timestamp,                      // Timestamp
      username,                      // Username
      userInfo.role || 'unknown',    // UserRole
      userInfo.phc || '',            // UserPHC
      action || 'unknown',           // Action
      entityType || '',              // EntityType
      entityId || '',                // EntityId
      entityName || '',              // EntityName
      details || '',                 // Details
      ipAddress,                     // IPAddress
      userAgent,                     // UserAgent
      JSON.stringify(additionalData) // AdditionalData as JSON string
      'SubmissionDate', 'NextFollowUpDate', 'ReferralClosed', 'UpdateWeightAge', 'CurrentWeight', 'CurrentAge', 'WeightAgeUpdateReason', 'WeightAgeUpdateNotes'
    ];
    
    updateSheetHeaders(sheet, followUpHeaders);
    
    // Create/Update Users sheet
    sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(USERS_SHEET_NAME);
    }
    
    const userHeaders = [
      'Username', 'Password', 'Role', 'PHC', 'Name', 'Email', 'Status'
    ];
    
    updateSheetHeaders(sheet, userHeaders);
    
    // Add sample users if sheet is empty
    if (sheet.getLastRow() === 1) {
      createSampleUsers();
    }
    
    // Create/Update PHCs sheet
    createPHCsSheetWithSampleData();
    
  } catch (error) {
    console.error('Error creating spreadsheet structure:', error);
  }
}

// Helper function to update sheet headers
function updateSheetHeaders(sheet, headers) {
  try {
    // Check if sheet is empty or has no data
    if (sheet.getLastRow() === 0) {
      // Empty sheet, add all headers
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      return;
    }
    
    // Get existing headers
    const lastColumn = sheet.getLastColumn();
    if (lastColumn === 0) {
      // Sheet exists but has no columns, add all headers
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      return;
    }
    
    const existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    
    // Filter out empty headers
    const cleanExistingHeaders = existingHeaders.filter(h => h && h.toString().trim() !== '');
    
    if (cleanExistingHeaders.length === 0) {
      // No valid headers found, add all headers
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      return;
    }
    
    // Check for missing headers and add them
    const existingHeaderSet = new Set(cleanExistingHeaders);
    const newHeadersToAppend = headers.filter(h => !existingHeaderSet.has(h));
    
    if (newHeadersToAppend.length > 0) {
      const startCol = cleanExistingHeaders.length + 1;
      sheet.getRange(1, startCol, 1, newHeadersToAppend.length).setValues([newHeadersToAppend]);
      sheet.getRange(1, startCol, 1, newHeadersToAppend.length).setFontWeight('bold');
      console.log(`Added ${newHeadersToAppend.length} new headers: ${newHeadersToAppend.join(', ')}`);
    }
    
  } catch (error) {
    console.error('Error updating sheet headers:', error);
    // Fallback: try to add all headers
    try {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      console.log('Fallback: Added all headers');
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw error;
    }
  }
}

// Utility function to get system statistics
function getSystemStats() {
  try {
    const patientsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
    const followUpsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FOLLOWUPS_SHEET_NAME);
    const usersSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
    const phcsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PHCS_SHEET_NAME);
    
    const stats = {
      totalPatients: patientsSheet.getLastRow() - 1,
      totalFollowUps: followUpsSheet.getLastRow() - 1,
      totalUsers: usersSheet.getLastRow() - 1,
      totalPHCs: phcsSheet ? phcsSheet.getLastRow() - 1 : 0,
      lastBackup: 'Live Save to Cloud',
      systemStatus: 'Operational'
    };
    
    return stats;
    
  } catch (error) {
    console.error('Error getting system stats:', error);
    return { error: error.message };
  }
}

// Test function to verify setup
function testConnection() {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = spreadsheet.getSheets();
    
    return {
      status: 'success',
      message: 'Connection successful',
      sheets: sheets.map(s => s.getName())
    };
    
  } catch (error) {
    console.error('Connection failed:', error);
    return {
      status: 'error',
      message: 'Connection failed: ' + error.message
    };
  }
}

// Get follow-up status information for patients
function getFollowUpStatusInfo() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Find column indices using headers
  const header = values[0];
  const idCol = header.indexOf('ID');
  const nameCol = header.indexOf('PatientName');
  const phcCol = header.indexOf('PHC');
  const lastFollowUpCol = header.indexOf('LastFollowUp');
  const statusCol = header.indexOf('PatientStatus');
  const followUpStatusCol = header.indexOf('FollowUpStatus');
  
  const statusInfo = [];
  
  // Start from row 2 (skip header)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const patientId = row[idCol];
    const patientName = row[nameCol];
    const phc = row[phcCol];
    const lastFollowUp = row[lastFollowUpCol] ? new Date(row[lastFollowUpCol]) : null;
    const status = row[statusCol];
    const followUpStatus = row[followUpStatusCol];
    
    if (!patientId || !patientName) continue;
    
    let isCompleted = false;
    let completionMonth = null;
    let nextFollowUpDate = null;
    let needsReset = false;
    
    if (followUpStatus && followUpStatus.includes('Completed')) {
      isCompleted = true;
      
      // Extract month from completion status
      const monthMatch = followUpStatus.match(/Completed for (.+)/);
      if (monthMatch) {
        completionMonth = monthMatch[1];
      }
      
      // Calculate next follow-up date
      if (lastFollowUp) {
        const nextDate = new Date(lastFollowUp);
        nextDate.setMonth(nextDate.getMonth() + 1);
        nextFollowUpDate = nextDate.toISOString().split('T')[0];
        
        // Check if needs reset
        const lastFollowUpMonth = lastFollowUp.getMonth();
        const lastFollowUpYear = lastFollowUp.getFullYear();
        needsReset = lastFollowUpYear < currentYear || (lastFollowUpYear === currentYear && lastFollowUpMonth < currentMonth);
      }
    }
    
    statusInfo.push({
      patientId: patientId,
      patientName: patientName,
      phc: phc,
      status: status,
      followUpStatus: followUpStatus,
      lastFollowUp: lastFollowUp ? lastFollowUp.toISOString().split('T')[0] : null,
      isCompleted: isCompleted,
      completionMonth: completionMonth,
      nextFollowUpDate: nextFollowUpDate,
      needsReset: needsReset
    });
  }
  
  return statusInfo;
}

// PHC-specific follow-up reset function
function resetFollowUpsByPhc(phc) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  let resetCount = 0;

  // Find column indices using headers
  const header = values[0];
  const followUpStatusCol = header.indexOf('FollowUpStatus');
  const lastFollowUpCol = header.indexOf('LastFollowUp');
  const phcCol = header.indexOf('PHC');
  const statusCol = header.indexOf('PatientStatus');

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const phcMatch = row[phcCol] && row[phcCol].trim().toLowerCase() === phc.trim().toLowerCase();
    if (!phcMatch) continue;
    
    const lastFollowUp = row[lastFollowUpCol] ? new Date(row[lastFollowUpCol]) : null;
    const status = row[statusCol];
    const followUpStatus = row[followUpStatusCol];
    
    if (!lastFollowUp || isNaN(lastFollowUp.getTime())) continue;
    
    // Only reset for active/follow-up/new patients
    const statusNorm = (status || '').trim().toLowerCase();
    if (!['active', 'follow-up', 'new'].includes(statusNorm)) continue;
    
    // Check if follow-up was completed in a previous month and needs reset
    if (followUpStatus && followUpStatus.includes('Completed') && lastFollowUp) {
      const lastFollowUpMonth = lastFollowUp.getMonth();
      const lastFollowUpYear = lastFollowUp.getFullYear();
      if (lastFollowUpYear < currentYear || (lastFollowUpYear === currentYear && lastFollowUpMonth < currentMonth)) {
        sheet.getRange(i + 1, followUpStatusCol + 1).setValue('Pending');
        resetCount++;
      }
    }
  }
  return { status: 'success', resetCount: resetCount };
}

// Update patient status function
function updatePatientStatus(patientId, newStatus) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Find column indices using headers
    const header = values[0];
    const idCol = header.indexOf('ID');
    const statusCol = header.indexOf('PatientStatus');
    
    // Find patient row
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][idCol] === patientId) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { status: 'error', message: 'Patient not found' };
    }
    
    // Update patient status
    sheet.getRange(rowIndex, statusCol + 1).setValue(newStatus);
    
    return { status: 'success', message: 'Patient status updated successfully' };
    
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// Update patient follow-up status function
function updatePatientFollowUpStatus(patientId, followUpStatus, lastFollowUp, nextFollowUpDate, medications) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const header = values[0];
    const idCol = header.indexOf('ID');
    const followUpStatusCol = header.indexOf('FollowUpStatus');
    const lastFollowUpCol = header.indexOf('LastFollowUp');
    const nextFollowUpDateCol = header.indexOf('NextFollowUpDate');
    const medicationsCol = header.indexOf('Medications');
    const medicationHistoryCol = header.indexOf('MedicationHistory');
    const lastMedicationChangeDateCol = header.indexOf('LastMedicationChangeDate');
    const lastMedicationChangeByCol = header.indexOf('LastMedicationChangeBy');

    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][idCol] === patientId) {
        rowIndex = i + 1;
        break;
      }
    }
    if (rowIndex === -1) {
      return { status: 'error', message: 'Patient not found' };
    }

    // Update follow-up status
    if (followUpStatusCol !== -1) {
      sheet.getRange(rowIndex, followUpStatusCol + 1).setValue(followUpStatus);
    }
    
    // Update last follow-up date
    if (lastFollowUpCol !== -1) {
      sheet.getRange(rowIndex, lastFollowUpCol + 1).setValue(lastFollowUp);
    }
    
    // Update next follow-up date (important for patients returned from referral)
    if (nextFollowUpDateCol !== -1 && nextFollowUpDate) {
      sheet.getRange(rowIndex, nextFollowUpDateCol + 1).setValue(nextFollowUpDate);
    }

    // Handle medication updates with audit trail
    if (medications && medicationsCol !== -1) {
      const currentMedications = values[rowIndex - 1][medicationsCol];
      let currentMedicationArray = [];
      
      try {
        currentMedicationArray = JSON.parse(currentMedications || '[]');
      } catch (e) {
        currentMedicationArray = [];
      }
      
      // Update current medications
      sheet.getRange(rowIndex, medicationsCol + 1).setValue(JSON.stringify(medications));
      
      // Create medication history entry
      const medicationHistoryEntry = {
        date: new Date().toISOString(),
        changedBy: 'Medical Officer', // or get from context
        previousMedications: currentMedicationArray,
        newMedications: medications,
        changeReason: 'Referral follow-up completion'
      };
      
      // Update medication history
      if (medicationHistoryCol !== -1) {
        let existingHistory = [];
        try {
          existingHistory = JSON.parse(values[rowIndex - 1][medicationHistoryCol] || '[]');
        } catch (e) {
          existingHistory = [];
        }
        
        existingHistory.push(medicationHistoryEntry);
        sheet.getRange(rowIndex, medicationHistoryCol + 1).setValue(JSON.stringify(existingHistory));
      }
      
      // Update last medication change tracking
      if (lastMedicationChangeDateCol !== -1) {
        sheet.getRange(rowIndex, lastMedicationChangeDateCol + 1).setValue(new Date().toISOString());
      }
      
      if (lastMedicationChangeByCol !== -1) {
        sheet.getRange(rowIndex, lastMedicationChangeByCol + 1).setValue('Medical Officer');
      }
    }

    return { status: 'success', message: 'Patient follow-up status updated for next month' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

// Generate unique patient ID for new patients
function generateUniquePatientId() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const header = values[0];
  const idCol = header.indexOf('ID');
  let highestId = 0;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const id = row[idCol];
    let num = 0;
    if (!isNaN(Number(id))) {
      num = Number(id);
    } else if (typeof id === 'string' && id.startsWith('PT-')) {
      num = parseInt(id.replace('PT-', ''), 10);
    }
    if (num > highestId) highestId = num;
  }
  const newId = highestId + 1;
  return newId.toString();
}

// Update existing referral entries when a referral is closed
function updateExistingReferralEntries(patientId) {
  try {
    console.log(`updateExistingReferralEntries called for patientId: ${patientId}, type: ${typeof patientId}`);
    const followUpSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FOLLOWUPS_SHEET_NAME);
    const dataRange = followUpSheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      return 0; // No data to update
    }
    
    const header = values[0];
    const patientIdCol = header.indexOf('PatientID');
    const referredToMOCol = header.indexOf('ReferredToMO');
    const referralClosedCol = header.indexOf('ReferralClosed');
    
    if (patientIdCol === -1 || referredToMOCol === -1 || referralClosedCol === -1) {
      console.error('Required columns not found in FollowUps sheet');
      return 0;
    }
    
    let updatedCount = 0;
    let totalReferralEntries = 0;
    
    console.log(`Searching for referral entries for patient ${patientId}...`);
    
    // Update all existing referral entries for this patient
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const currentPatientId = row[patientIdCol];
      const isReferred = row[referredToMOCol] === 'Yes';
      const isAlreadyClosed = row[referralClosedCol] === 'Yes';
      
      if (isReferred) {
        totalReferralEntries++;
        console.log(`Found referral entry: PatientID=${currentPatientId}, ReferredToMO=${row[referredToMOCol]}, ReferralClosed=${row[referralClosedCol]}`);
      }
      
      // If this is a referral entry for the same patient that's not already closed
      // Use robust comparison to handle type mismatches
      const currentPatientIdStr = String(currentPatientId).trim();
      const patientIdStr = String(patientId).trim();
      
      if (currentPatientIdStr === patientIdStr && isReferred && !isAlreadyClosed) {
        followUpSheet.getRange(i + 1, referralClosedCol + 1).setValue('Yes');
        updatedCount++;
        console.log(`Updated referral entry for patient ${patientId} at row ${i + 1}`);
      }
      
      // Also update any entry that has ReferralClosed=Yes but ReferredToMO=No (referral closure entry)
      if (currentPatientIdStr === patientIdStr && !isReferred && isAlreadyClosed) {
        // This is a referral closure entry, ensure it's properly marked
        console.log(`Found referral closure entry for patient ${patientId} at row ${i + 1}`);
      }
    }
    
    console.log(`Total referral entries found: ${totalReferralEntries}, Updated: ${updatedCount}`);
    return updatedCount;
    
  } catch (error) {
    console.error('Error updating existing referral entries:', error);
    return 0;
  }
}

// Utility function to fix existing referral entries (can be called manually if needed)
function fixExistingReferralEntries() {
  try {
    const followUpSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FOLLOWUPS_SHEET_NAME);
    const dataRange = followUpSheet.getDataRange();
    const values = dataRange.getValues();
    
    if (values.length < 2) {
      return { status: 'success', message: 'No referral entries to fix', fixedCount: 0 };
    }
    
    const header = values[0];
    const patientIdCol = header.indexOf('PatientID');
    const referredToMOCol = header.indexOf('ReferredToMO');
    const referralClosedCol = header.indexOf('ReferralClosed');
    
    if (patientIdCol === -1 || referredToMOCol === -1 || referralClosedCol === -1) {
      return { status: 'error', message: 'Required columns not found in FollowUps sheet' };
    }
    
    let fixedCount = 0;
    const patientsWithClosedReferrals = new Set();
    
    // First pass: identify patients who have any closed referral
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const patientId = row[patientIdCol];
      const isReferred = row[referredToMOCol] === 'Yes';
      const isClosed = row[referralClosedCol] === 'Yes';
      
      if (patientId && isReferred && isClosed) {
        patientsWithClosedReferrals.add(patientId);
      }
    }
    
    // Second pass: update all referral entries for patients with closed referrals
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const patientId = row[patientIdCol];
      const isReferred = row[referredToMOCol] === 'Yes';
      const isAlreadyClosed = row[referralClosedCol] === 'Yes';
      
      if (patientId && isReferred && !isAlreadyClosed && patientsWithClosedReferrals.has(patientId)) {
        followUpSheet.getRange(i + 1, referralClosedCol + 1).setValue('Yes');
        fixedCount++;
      }
    }
    
    return { 
      status: 'success', 
      message: `Fixed ${fixedCount} referral entries for ${patientsWithClosedReferrals.size} patients`,
      fixedCount: fixedCount,
      patientsFixed: patientsWithClosedReferrals.size
    };
    
  } catch (error) {
    console.error('Error fixing existing referral entries:', error);
    return { status: 'error', message: error.message };
  }
}

function getUserPHC() {
    if (currentUserRole === 'admin') return null;
    const user = userData.find(u => u.Username === currentUserName && u.Role === currentUserRole);
    return user && user.PHC ? user.PHC : null;
}
// Test function to set up the complete spreadsheet structure
function setupCompleteSystem() {
  try {
    console.log('Starting complete system setup...');
    
    // Create all sheet structures
    createSpreadsheetStructure();
    console.log('✓ Sheet structures created');
    
    // Test connection
    const connectionTest = testConnection();
    console.log('✓ Connection test:', connectionTest);
    
    // Get system stats
    const stats = getSystemStats();
    console.log('✓ System stats:', stats);
    
    console.log('Complete system setup finished successfully!');
    return {
      status: 'success',
      message: 'Complete system setup finished successfully!',
      connectionTest: connectionTest,
      stats: stats
    };
    
  } catch (error) {
    console.error('Error in complete system setup:', error);
    return {
      status: 'error',
      message: 'Error in complete system setup: ' + error.message
    };
  }
}
// Test function to set up the complete spreadsheet structure
function setupCompleteSystem() {
  try {
    console.log('Starting complete system setup...');
    
    // Create all sheet structures
    createSpreadsheetStructure();
    console.log('✓ Sheet structures created');
    
    // Test connection
    const connectionTest = testConnection();
    console.log('✓ Connection test:', connectionTest);
    
    // Get system stats
    const stats = getSystemStats();
    console.log('✓ System stats:', stats);
    
    console.log('Complete system setup finished successfully!');
    return {
      status: 'success',
      message: 'Complete system setup finished successfully!',
      connectionTest: connectionTest,
      stats: stats
    };
    
  } catch (error) {
    console.error('Error in complete system setup:', error);
    return {
      status: 'error',
      message: 'Error in complete system setup: ' + error.message
    };
  }
}