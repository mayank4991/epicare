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
const USERS_SHEET_NAME = 'Users';
const FOLLOWUPS_SHEET_NAME = 'FollowUps';
const PHCS_SHEET_NAME = 'PHCs';

// Cache for PHC names to improve performance
let phcNamesCache = null;
let phcNamesCacheTimestamp = null;
const PHC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper function to set CORS headers
function setCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

// Helper function to create a CORS response
function createCorsResponse(content, statusCode = 200) {
  const response = ContentService.createTextOutput(content);
  const headers = setCorsHeaders();
  
  Object.entries(headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
  
  response.setMimeType(ContentService.MimeType.JSON);
  response.setStatusCode(statusCode);
  return response;
}

// Helper function to set CORS headers
function setCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
}

// Helper function to create a CORS response
function createCorsResponse(content, statusCode = 200) {
  const response = ContentService.createTextOutput(content);
  const headers = setCorsHeaders();
  
  Object.entries(headers).forEach(([key, value]) => {
    response.setHeader(key, value);
  });
  
  response.setMimeType(ContentService.MimeType.JSON);
  response.setStatusCode(statusCode);
  return response;
}

function doGet(e) {
  // Handle CORS preflight request
  if (e && e.parameter && e.parameter.action === 'options') {
    return createCorsResponse(JSON.stringify({ status: 'success' }));
  }
  
  try {
    const action = e.parameter.action;
    let data;
    let responseData;

    if (action === 'getPatients') {
      data = getSheetData(PATIENTS_SHEET_NAME);
      // Apply user access filtering if user info is provided
      if (e.parameter.username && e.parameter.role && e.parameter.assignedPHC) {
        data = filterDataByUserAccess(data, e.parameter.username, e.parameter.role, e.parameter.assignedPHC);
      }
      responseData = { status: 'success', data: data };
    } else if (action === 'getUsers') {
      data = getSheetData(USERS_SHEET_NAME);
      responseData = { status: 'success', data: data };
    } else if (action === 'getFollowUps') {
      data = getSheetData(FOLLOWUPS_SHEET_NAME);
      // Apply user access filtering if user info is provided
      if (e.parameter.username && e.parameter.role && e.parameter.assignedPHC) {
        data = filterFollowUpsByUserAccess(data, e.parameter.username, e.parameter.role, e.parameter.assignedPHC);
      }
      responseData = { status: 'success', data: data };
    } else if (action === 'getPHCs') {
      data = getSheetData(PHCS_SHEET_NAME);
      responseData = { status: 'success', data: data };
    } else if (action === 'getActivePHCNames') {
      // New clean API for active PHC names only
      data = getActivePHCNames();
      responseData = { status: 'success', data: data };
    } else if (action === 'resetFollowUpsByPhc') {
      const phc = e.parameter.phc;
      responseData = resetFollowUpsByPhc(phc);
    } else if (action === 'getPHCStock') {
      const phcName = e.parameter.phcName;
      if (!phcName) {
        responseData = { status: 'error', message: 'PHC name is required' };
      } else {
        data = getPHCStock(phcName);
        responseData = { status: 'success', data: data };
      }
    } else if (action === 'updatePHCStock') {
      // Handle stock update via GET (for JSONP)
      const stockData = [];
      let i = 0;
      while (e.parameter[`data[${i}].phc`]) {
        stockData.push({
          phc: e.parameter[`data[${i}].phc`],
          medicine: e.parameter[`data[${i}].medicine`],
          stock: parseInt(e.parameter[`data[${i}].stock`]) || 0
        });
        i++;
      }
      
      if (stockData.length === 0) {
        responseData = { status: 'error', message: 'No stock data provided' };
      } else {
        responseData = updatePHCStock(stockData);
      }
    } else {
      responseData = { status: 'error', message: 'Invalid action' };
    }

    // Handle JSONP callback if provided
    const callback = e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(
        callback + '(' + JSON.stringify(responseData) + ')'
      ).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return createJsonResponse(responseData);
    
  } catch (error) {
    const errorResponse = {
      status: 'error',
      message: error.message,
      stack: error.stack
    };
    
    // Handle JSONP for errors too
    if (e.parameter.callback) {
      return ContentService.createTextOutput(
        e.parameter.callback + '(' + JSON.stringify(errorResponse) + ')'
      ).setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    
    return createJsonResponse(errorResponse);
  }
}

// Function to get data from a sheet
function getSheetData(sheetName) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    // Convert to array of objects with headers as keys
    if (values.length === 0) return [];
    
    const headers = values[0];
    const data = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = {};
      for (let j = 0; j < headers.length; j++) {
        // Clean up header names by removing spaces and special characters
        const cleanHeader = headers[j].toString().replace(/[^a-zA-Z0-9_]/g, '');
        row[cleanHeader] = values[i][j];
      }
      data.push(row);
    }
    
    return data;
  } catch (error) {
    console.error('Error getting data from sheet ' + sheetName + ':', error);
    throw new Error('Failed to retrieve data from ' + sheetName + ' sheet');
  }
}

function getPHCStock(phcName) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('PHC_Stock');
    if (!sheet) {
      throw new Error('PHC_Stock sheet not found');
    }
    
    // Get all data from the sheet
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    
    // Get header indices (case-insensitive)
    const headers = data[0].map(h => h.trim().toLowerCase());
    const phcCol = headers.indexOf('phc');
    const medicineCol = headers.indexOf('medicine');
    const stockCol = headers.indexOf('currentstock');
    
    if (phcCol === -1 || medicineCol === -1 || stockCol === -1) {
      throw new Error('Required columns not found in PHC_Stock sheet');
    }
    
    // Filter rows for the requested PHC (case-insensitive)
    return data.slice(1) // Skip header row
      .filter(row => row[phcCol] && row[phcCol].toString().trim().toLowerCase() === phcName.toLowerCase())
      .map(row => ({
        Medicine: row[medicineCol] || '',
        CurrentStock: row[stockCol] ? parseInt(row[stockCol]) || 0 : 0
      }));
      
  } catch (error) {
    console.error('Error in getPHCStock:', error);
    throw new Error('Failed to retrieve PHC stock data: ' + error.message);
  }
}

/**
 * Updates stock levels in the PHC_Stock sheet
 * @param {Array} stockData - Array of objects with PHC, medicine, and stock info
 * @return {Object} Status of the update operation
 */
function updatePHCStock(stockData) {
  if (!stockData || !stockData.length) {
    throw new Error('No stock data provided');
  }
  
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('PHC_Stock');
  if (!sheet) {
    throw new Error('PHC_Stock sheet not found');
  }
  
  try {
    // Lock the sheet to prevent concurrent modifications
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      throw new Error('Could not obtain lock on PHC_Stock sheet. Please try again.');
    }
    
    // Get all data from the sheet
    const data = sheet.getDataRange().getValues();
    const headers = data[0].map(h => h.trim().toLowerCase());
    
    // Get column indices (case-insensitive)
    const phcCol = headers.indexOf('phc');
    const medicineCol = headers.indexOf('medicine');
    const stockCol = headers.indexOf('currentstock');
    const lastUpdatedCol = headers.indexOf('lastupdated');
    
    if (phcCol === -1 || medicineCol === -1 || stockCol === -1) {
      throw new Error('Required columns not found in PHC_Stock sheet');
    }
    
    // Process each stock update
    stockData.forEach(update => {
      if (!update.phc || !update.medicine) {
        console.warn('Skipping invalid update:', update);
        return;
      }
      
      // Find existing row for this PHC and medicine (case-insensitive)
      const rowIndex = data.findIndex(row => 
        row[phcCol] && 
        row[phcCol].toString().trim().toLowerCase() === update.phc.toLowerCase() &&
        row[medicineCol] && 
        row[medicineCol].toString().trim().toLowerCase() === update.medicine.toLowerCase()
      );
      
      if (rowIndex !== -1) {
        // Update existing row
        sheet.getRange(rowIndex + 1, stockCol + 1).setValue(parseInt(update.stock) || 0);
        if (lastUpdatedCol !== -1) {
          sheet.getRange(rowIndex + 1, lastUpdatedCol + 1).setValue(new Date());
        }
      } else {
        // Add new row for this PHC/medicine combination
        const newRow = Array(headers.length).fill('');
        newRow[phcCol] = update.phc; // Preserve original case
        newRow[medicineCol] = update.medicine; // Preserve original case
        newRow[stockCol] = parseInt(update.stock) || 0;
        if (lastUpdatedCol !== -1) {
          newRow[lastUpdatedCol] = new Date();
        }
        sheet.appendRow(newRow);
      }
    });
    
    SpreadsheetApp.flush();
    return { status: 'success', message: 'Stock levels updated successfully' };
    
  } catch (error) {
    console.error('Error in updatePHCStock:', error);
    throw new Error('Failed to update PHC stock data: ' + error.message);
  } finally {
    // Release the lock
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

/**
 * Gets a list of active PHC names from the PHCs sheet
 * @return {Array} Array of active PHC names
 */
function getActivePHCNames() {
  try {
    const phcsSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PHCS_SHEET_NAME);
    if (!phcsSheet) { return []; }
    const data = phcsSheet.getDataRange().getValues();
    if (data.length < 2) { return []; }

    const headers = data[0].map(h => h.toString().toLowerCase().trim());
    const nameCol = headers.indexOf('phcname');
    const statusCol = headers.indexOf('status');

    if (nameCol === -1 || statusCol === -1) {
      console.error("Could not find 'phcname' or 'status' columns in PHCs sheet.");
      return [];
    }

    const activePHCNames = data.slice(1)
      .filter(row => row[statusCol] && row[statusCol].toString().toLowerCase() === 'active')
      .map(row => row[nameCol])
      .filter(name => name);

    return activePHCNames;
  } catch (error) {
    console.error("Error in getActivePHCNames:", error);
    return [];
  }
}

function doPost(e) {
  // Handle CORS preflight request
  if (e && e.parameter && e.parameter.action === 'options') {
    return createCorsResponse(JSON.stringify({ status: 'success' }));
  }
  
  try {
    let requestData;
    
    // Parse the request data
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (error) {
      return createCorsResponse(JSON.stringify({
        status: 'error',
        message: 'Invalid JSON data in request body'
      }), 400);
    }
    const action = requestData.action;
    if (action === 'addPatient') {
      const patientSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
      const newRowData = requestData.data;
      // Generate unique patient ID for new patients
      const uniquePatientId = generateUniquePatientId();
      // Create row array in column order - Updated to match actual sheet structure
      const row = [
        uniquePatientId, // Use the generated unique ID
        newRowData.PatientName ||
      newRowData.name || '',
        newRowData.fatherName ||
      '',
        newRowData.age || '',
        newRowData.gender ||
      '',
        newRowData.phone || '',
        newRowData.phoneBelongsTo ||
      '',
        newRowData.campLocation || '',
        newRowData.residenceType ||
      '',
        newRowData.address || '',
        newRowData.phc ||
      '',
        newRowData.diagnosis || 'Epilepsy',
        newRowData.etiologySyndrome ||
      '',
        newRowData.ageOfOnset || '',
        newRowData.seizureFrequency ||
      '',
        newRowData.status || 'New',
        newRowData.weight ||
      '',
        newRowData.bpSystolic || '',
        newRowData.bpDiastolic ||
      '',
        newRowData.bpRemark || '',
        JSON.stringify(newRowData.medications) ||
      '[]',
        newRowData.addictions || '',
        newRowData.injuryType ||
      '',
        newRowData.treatmentStatus || '',
        newRowData.previouslyOnDrug ||
      '',
        new Date().toISOString(), // RegistrationDate
        newRowData.followUpStatus ||
      'Pending',
        newRowData.adherence || 'N/A',
        newRowData.lastFollowUp ||
      new Date().toLocaleDateString(), // LastFollowUp
        newRowData.addedBy ||
      'System' // AddedBy
      ];
      patientSheet.appendRow(row);
      return createJsonResponse({
        status: 'success',
        message: 'Patient added successfully',
        patientId: uniquePatientId
      });
    } else if (action === 'addUser') {
      const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
      const newUserData = requestData.data;
      const row = [
        newUserData.username,
        newUserData.password,
        newUserData.role,
        newUserData.phc ||
      '',
        newUserData.name || '',
        newUserData.email ||
      '',
        newUserData.status || 'Active'
      ];
      userSheet.appendRow(row);
      return createJsonResponse({ status: 'success', message: 'User added successfully' });

    } else if (action === 'addPHC') {
      const phcSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PHCS_SHEET_NAME);
      const newPHCData = requestData.data;
      const row = [
        newPHCData.phcCode ||
      '',
        newPHCData.phcName || '',
        newPHCData.district ||
      'East Singhbhum',
        newPHCData.block ||
      '',
        newPHCData.address || '',
        newPHCData.contactPerson ||
      '',
        newPHCData.phone || '',
        newPHCData.email ||
      '',
        newPHCData.status ||
      'Active',
        new Date().toISOString() // DateAdded
      ];
      phcSheet.appendRow(row);
      // Clear PHC names cache since we added a new PHC
      clearPHCNamesCache();
      return createJsonResponse({ status: 'success', message: 'PHC added successfully' });

    } else if (action === 'addFollowUp') {
      const followUpData = requestData.data;
      const patientId = followUpData.patientId;

      // First, run the standard logic to update patient's last follow-up date, etc.
      const completionResult = completeFollowUp(patientId, followUpData);

      // **CRITICAL FIX**: Check if the 'Mark as Returned to PHC' box was checked
      if (followUpData.returnToPhc === true) {
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          
          // This function resets the patient's status for the CHO
          updatePatientFollowUpStatus(
              patientId,
              'Pending', // Set status back to Pending for the CHO
              followUpData.followUpDate,
              nextMonth.toISOString().split('T')[0], // Set next follow-up for next month
              followUpData.newMedications // Pass any new medications from the MO
          );
          
          // This function marks all previous referral entries as closed
          updateExistingReferralEntries(patientId);
      }
      
      // Now, save the detailed follow-up record to the 'FollowUps' sheet
      const followUpSheet = getOrCreateSheet(FOLLOWUPS_SHEET_NAME, [
        'FollowUpID', 'PatientID', 'CHOName', 'FollowUpDate', 'PhoneCorrect', 'CorrectedPhoneNumber',
        'FeltImprovement', 'SeizureFrequency', 'SeizureTypeChange',
        'SeizureDurationChange', 'SeizureSeverityChange', 'MedicationSource',
        'MissedDose', 'TreatmentAdherence', 'MedicationChanged', 'NewMedications',
        'NewMedicalConditions', 'AdditionalQuestions', 'FollowUpDurationSeconds',
        'SubmittedBy', 'ReferredToMO', 'DrugDoseVerification', 'SubmissionDate', 'NextFollowUpDate',
        'ReferralClosed', 'UpdateWeightAge', 'CurrentWeight', 'CurrentAge', 'WeightAgeUpdateReason', 'WeightAgeUpdateNotes', 'AdverseEffects'
      ]);

      const followUpId = 'FU-' + Date.now().toString().slice(-6);
      const newFollowUpRow = [
        followUpId, patientId, followUpData.choName, followUpData.followUpDate,
        followUpData.phoneCorrect, followUpData.correctedPhoneNumber || '', 
        followUpData.feltImprovement, followUpData.seizureFrequency, 
        followUpData.seizureTypeChange || '', followUpData.seizureDurationChange || '',
        followUpData.seizureSeverityChange || '', followUpData.medicationSource || '', 
        followUpData.missedDose || '', followUpData.treatmentAdherence || '', 
        followUpData.medicationChanged ? 'Yes' : 'No',
        JSON.stringify(followUpData.newMedications || []), 
        followUpData.newMedicalConditions || '',
        followUpData.additionalQuestions || '', 
        followUpData.durationInSeconds || 0,
        followUpData.submittedByUsername || 'Unknown', 
        followUpData.referToMO ? 'Yes' : 'No',
        followUpData.drugDoseVerification || '', 
        new Date().toISOString(), 
        completionResult.nextFollowUpDate,
        followUpData.returnToPhc ? 'Yes' : 'No', 
        followUpData.updateWeightAge || '', 
        followUpData.currentWeight || '',
        followUpData.currentAge || '', 
        followUpData.weightAgeUpdateReason || '', 
        followUpData.weightAgeUpdateNotes || '',
        followUpData.adverseEffects || ''
      ];
      followUpSheet.appendRow(newFollowUpRow);

      return createJsonResponse({
        status: 'success',
        message: 'Follow-up recorded successfully',
        completionStatus: completionResult.completionStatus,
        nextFollowUpDate: completionResult.nextFollowUpDate
      });
    } else if (action === 'resetFollowUps') {
      const resetResult = monthlyFollowUpRenewal();
      return createJsonResponse({
        status: 'success',
        message: 'Follow-ups reset for the month',
        resetCount: resetResult
      });
    } else if (action === 'getFollowUpStatus') {
      const statusInfo = getFollowUpStatusInfo();
      return createJsonResponse({
        status: 'success',
        data: statusInfo
      });
    } else if (action === 'updatePatientStatus') {
      const patientId = requestData.id;
      const newStatus = requestData.status;
      const updateResult = updatePatientStatus(patientId, newStatus);
      return createJsonResponse(updateResult);
    } else if (action === 'updatePatientFollowUpStatus') {
      const patientId = requestData.patientId;
      const followUpStatus = requestData.followUpStatus;
      const lastFollowUp = requestData.lastFollowUp;
      const nextFollowUpDate = requestData.nextFollowUpDate;
      const medications = requestData.medications;
      const updateResult = updatePatientFollowUpStatus(patientId, followUpStatus, lastFollowUp, nextFollowUpDate, medications);
      return createJsonResponse(updateResult);
    } else if (action === 'fixReferralEntries') {
      const fixResult = fixExistingReferralEntries();
      return createJsonResponse(fixResult);
    } else if (action === 'login') {
      const { username, password } = requestData.data;
      
      // Validate user credentials
      const users = getSheetData(USERS_SHEET_NAME);
      const validUser = users.find(user => 
        user.username === username && user.password === password && user.status === 'Active');
      
      if (validUser) {
        // Log user activity
        logUserActivity(e, username, 'User Login');
        
        // Return user data (excluding password)
        const { password, ...userData } = validUser;
        return createJsonResponse({ 
          status: 'success', 
          message: 'Login successful', 
          user: userData 
        });
      } else {
        // Log failed user activity
        logUserActivity(e, username, 'User Login Failed', { reason: 'Invalid credentials or inactive account' });
        
        return createJsonResponse({ 
          status: 'error', 
          message: 'Invalid username or password, or account is inactive' 
        });
      }
    } else if (action === 'updatePHCStock') {
      // Handle stock update
      const stockData = requestData.data;
      if (!stockData || !Array.isArray(stockData) || stockData.length === 0) {
        return createCorsResponse(JSON.stringify({
          status: 'error',
          message: 'No stock data provided'
        }), 400);
      }
      
      try {
        const result = updatePHCStock(stockData);
        return createCorsResponse(JSON.stringify(result));
      } catch (error) {
        return createCorsResponse(JSON.stringify({
          status: 'error',
          message: error.message || 'Failed to update stock',
          stack: error.stack
        }), 500);
      }
    } else {
      return createCorsResponse(JSON.stringify({ 
        status: 'error', 
        message: 'Invalid action' 
      }), 400);
    }
  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
}