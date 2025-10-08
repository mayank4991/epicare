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
const ADMIN_SETTINGS_SHEET_NAME = 'AdminSettings';
const PUSH_SUBSCRIPTIONS_SHEET_NAME = 'PushSubscriptions';

// Cache for PHC names to improve performance
let phcNamesCache = null;
let phcNamesCacheTimestamp = null;
const PHC_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

function doGet(e) {
  try {
    const action = e.parameter.action;
    let data;

    if (action === 'getPatients') {
      data = getSheetData(PATIENTS_SHEET_NAME);
      // Apply user access filtering if user info is provided
      if (e.parameter.username && e.parameter.role && e.parameter.assignedPHC) {
        data = filterDataByUserAccess(data, e.parameter.username, e.parameter.role, e.parameter.assignedPHC);
      }
    } else if (action === 'getUsers') {
      data = getSheetData(USERS_SHEET_NAME);
    } else if (action === 'getFollowUps') {
      data = getSheetData(FOLLOWUPS_SHEET_NAME);
      // Apply user access filtering if user info is provided
      if (e.parameter.username && e.parameter.role && e.parameter.assignedPHC) {
        data = filterFollowUpsByUserAccess(data, e.parameter.username, e.parameter.role, e.parameter.assignedPHC);
      }
    } else if (action === 'getPHCs') {
      data = getSheetData(PHCS_SHEET_NAME);
    } else if (action === 'getActivePHCNames') {
      // New clean API for active PHC names only
      data = getActivePHCNames();
    } else if (action === 'resetFollowUpsByPhc') {
      const phc = e.parameter.phc;
      return createJsonResponse(resetFollowUpsByPhc(phc));
    } else if (action === 'getPHCStock') {
      const phcName = e.parameter.phcName;
      if (!phcName) {
        return createJsonResponse({ status: 'error', message: 'PHC name is required' });
      }
      data = getPHCStock(phcName);
      return createJsonResponse({ status: 'success', data: data });
    } else if (action === 'getAllPHCStock') {
      // Return all PHC stock rows for consolidated reporting
      const allStock = getAllPHCStock();
      return createJsonResponse({ status: 'success', data: allStock });
    } else if (action === 'getViewerAddPatientToggle') {
      // Read from AdminSettings sheet (Key/Value)
      const rawVal = getAdminSetting('viewerAllowAddPatient', 'false');
      const enabled = (typeof rawVal === 'string')
        ? rawVal.toLowerCase() === 'true'
        : !!rawVal;
      return createJsonResponse({ status: 'success', data: { enabled } });
    } else if (action === 'getAAMCenters') {
      // Read the AAM sheet which contains columns: Sl. No., PHCName, AAM Name, NIN, Rural/Urban
      try {
        const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('AAM');
        if (!sheet) return createJsonResponse({ status: 'success', data: [] });
        const values = sheet.getDataRange().getValues();
        if (values.length < 2) return createJsonResponse({ status: 'success', data: [] });
        const headers = values[0].map(h => (h || '').toString().trim());
        const nameCol = headers.findIndex(h => /aam\s*name/i.test(h));
        const phcCol = headers.findIndex(h => /phc/i.test(h));
        const ninCol = headers.findIndex(h => /nin/i.test(h));

        const centers = values.slice(1).map(row => ({
          phc: row[phcCol] || '',
          name: row[nameCol] || '',
          nin: row[ninCol] || ''
        })).filter(c => c.name && c.name.toString().trim() !== '');

        return createJsonResponse({ status: 'success', data: centers });
      } catch (err) {
        console.error('Error reading AAM sheet:', err);
        return createJsonResponse({ status: 'error', message: 'Failed to read AAM centers' });
      }
    } else {
      return createJsonResponse({ status: 'error', message: 'Invalid action' });
    }

    return createJsonResponse({ status: 'success', data: data });
  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
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

/**
 * AdminSettings helpers (Key/Value persistence)
 */
function getAdminSetting(key, defaultValue) {
  try {
    const sheet = getOrCreateSheet(ADMIN_SETTINGS_SHEET_NAME, ['Key', 'Value']);
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString() === key) {
        return values[i][1];
      }
    }
    return defaultValue;
  } catch (err) {
    console.error('getAdminSetting error:', err);
    return defaultValue;
  }
}

function setAdminSetting(key, value) {
  try {
    const sheet = getOrCreateSheet(ADMIN_SETTINGS_SHEET_NAME, ['Key', 'Value']);
    const range = sheet.getDataRange();
    const values = range.getValues();
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] && values[i][0].toString() === key) {
        // Update value in place
        sheet.getRange(i + 1, 2).setValue(value);
        return true;
      }
    }
    // Append if key not found
    sheet.appendRow([key, value]);
    return true;
  } catch (err) {
    console.error('setAdminSetting error:', err);
    return false;
  }
}

function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    if (action === 'addPatient' || action === 'updatePatient') {
      // Support explicit update via action=updatePatient
      if (action === 'updatePatient') {
        const updateResult = updatePatient(requestData.data || {});
        return createJsonResponse(updateResult);
      }

      // Backwards-compatible behavior: if addPatient call contains an ID, treat it as update
      const possibleId = (requestData.data && (requestData.data.ID || requestData.data.id || requestData.data.patientId)) || null;
      if (possibleId) {
        const updateResult = updatePatient(requestData.data || {});
        // If update succeeded, return update response instead of creating a duplicate
        if (updateResult && updateResult.status === 'success') {
          return createJsonResponse(updateResult);
        }
        // Otherwise fall back to addPatient below
      }

      // Continue with addPatient when no ID present or update failed
    if (action === 'addPatient') {
      const patientSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
      const newRowData = requestData.data;
      // Generate unique patient ID for new patients
      const uniquePatientId = generateUniquePatientId();
      // Create row array in column order - Updated to match actual sheet structure
    const row = [
    uniquePatientId, // ID
    newRowData.PatientName || newRowData.name || '', // PatientName
    newRowData.fatherName || '', // FatherName
    newRowData.age || '', // Age
    newRowData.gender || '', // Gender
    newRowData.phone || '', // Phone
    newRowData.phoneBelongsTo || '', // PhoneBelongsTo
    newRowData.campLocation || '', // CampLocation
    newRowData.residenceType || '', // ResidenceType
    newRowData.address || '', // Address
    newRowData.phc || '', // PHC
    newRowData.nearestAAMCenter || '', // NearestAAMCenter (added)
  newRowData.diagnosis || 'Epilepsy', // Diagnosis
        newRowData.epilepsyType || '', // epilepsyType
        newRowData.epilepsyCategory || '', // epilepsyCategory
        newRowData.ageOfOnset || '', // AgeOfOnset
        newRowData.seizureFrequency || '', // SeizureFrequency
  // Respect incoming PatientStatus (e.g., 'Draft') so partial records can be saved
  newRowData.PatientStatus || newRowData.status || 'New', // PatientStatus
        newRowData.weight || '', // Weight
        newRowData.bpSystolic || '', // BPSystolic
        newRowData.bpDiastolic || '', // BPDiastolic
        newRowData.bpRemark || '', // BPRemark
        JSON.stringify(newRowData.medications) || '[]', // Medications
        newRowData.addictions || '', // Addictions
        newRowData.injuryType || '', // InjuryType
        newRowData.treatmentStatus || '', // TreatmentStatus
        newRowData.previouslyOnDrug || '', // PreviouslyOnDrug
        new Date().toISOString(), // RegistrationDate
        newRowData.followUpStatus || 'Pending', // FollowUpStatus
        newRowData.adherence || 'N/A', // Adherence
        newRowData.lastFollowUp || new Date().toLocaleDateString(), // LastFollowUp
        '', // NextFollowUpDate
        '', // MedicationHistory
        '', // LastMedicationChangeDate
        '', // LastMedicationChangeBy
        '', // WeightAgeHistory
        '', // LastWeightAgeUpdateDate
        '', // LastWeightAgeUpdateBy
        newRowData.addedBy || 'System', // AddedBy
        '' // PatientStatusDetail
      ];
      patientSheet.appendRow(row);
      return createJsonResponse({
        status: 'success',
        message: 'Patient added successfully',
        patientId: uniquePatientId
      });
    }
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
      const stockData = requestData.data;
      const updateResult = updatePHCStock(stockData);
      return createJsonResponse(updateResult);
    } else if (action === 'setViewerAddPatientToggle') {
      const { enabled } = requestData;
      const ok = setAdminSetting('viewerAllowAddPatient', enabled ? 'true' : 'false');
      if (!ok) {
        return createJsonResponse({ status: 'error', message: 'Failed to persist setting' });
      }
      return createJsonResponse({ status: 'success', message: 'Setting updated', data: { enabled: !!enabled } });
    } else if (action === 'subscribePush') {
      const { phc, subscription } = requestData.data;
      const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PUSH_SUBSCRIPTIONS_SHEET_NAME);
      
      // Store the subscription object as a JSON string
      sheet.appendRow([phc, JSON.stringify(subscription), new Date()]);
      
      return createJsonResponse({ status: 'success', message: 'Subscription saved.' });
    }
    
    else {
      return createJsonResponse({ status: 'error', message: 'Invalid action' });
    }
  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
}

/**
 * =================================================================
 * WEB PUSH NOTIFICATION SENDER (Corrected for Google Apps Script)
 * =================================================================
 */

// This function is the main entry point for sending weekly notifications.
function sendWeeklyPushNotifications() {
  const allPatients = getSheetData(PATIENTS_SHEET_NAME);
  const allSubscriptionsData = getSheetData(PUSH_SUBSCRIPTIONS_SHEET_NAME);

  if (!allSubscriptionsData || allSubscriptionsData.length === 0) {
    console.log('No push subscriptions found. Exiting.');
    return;
  }

  // Calculate pending follow-ups for each PHC
  const followUpCounts = {};
  allPatients.forEach(patient => {
    // Correctly reference the column names from your getSheetData function
    const status = patient.FollowUpStatus || patient.followUpStatus || '';
    const phc = patient.PHC || patient.phc || '';
    if (status === 'Pending' && phc) {
      if (!followUpCounts[phc]) {
        followUpCounts[phc] = 0;
      }
      followUpCounts[phc]++;
    }
  });

  console.log('Calculated Follow-up Counts:', followUpCounts);
  
  // VAPID keys from your frontend setup
  const VAPID_PUBLIC_KEY = 'BHVsowUqMTwIMAYH8ORy1W4pAq-WZgBpYK952GTxppGfo3xss5iaYrRYPQS4M6trnLieltwxh_iiq7d9acw2kxA';
  // NOTE: The private key should be kept secure. For Apps Script, a Script Property is best.
  const VAPID_PRIVATE_KEY = 'ck5L0mGoXTHkR4miNWnStFWsI_mVJXim007CsSIRa2Y='; // Note the added '=' for valid Base64 in Apps Script
  
  // Send notifications for each subscription
  allSubscriptionsData.forEach(subData => {
    try {
      const phc = subData.PHC || subData.phc;
      const subscription = JSON.parse(subData.Subscription || subData.subscription);
      
      if (!phc || !subscription || !subscription.endpoint) return;

      const count = followUpCounts[phc] || 0;
      
      // The information that will be displayed in the notification
      const notificationPayload = JSON.stringify({
        title: 'Weekly Follow-up Reminder',
        body: `You have ${count} pending follow-ups for ${phc} this week.`,
        icon: 'images/notification-icon.png', // The service worker will use these
        badge: 'images/badge.png'
      });

      // --- VAPID Authentication ---
      const endpoint = subscription.endpoint;
      const audience = new URL(endpoint).origin;
      const tokenGenerator = new VapidTokenGenerator(VAPID_PRIVATE_KEY);
      const vapidToken = tokenGenerator.generate(audience);
      
      const options = {
        method: 'POST',
        headers: {
          'TTL': '86400', // Time To Live in seconds (1 day)
          'Authorization': `vapid t=${vapidToken}, k=${VAPID_PUBLIC_KEY}`
        },
        payload: notificationPayload,
        muteHttpExceptions: true // This allows us to see the error codes (like 410 for expired)
      };

      console.log(`Sending notification to ${phc} subscriber...`);
      const response = UrlFetchApp.fetch(endpoint, options);
      
      console.log(`Response for ${phc}: ${response.getResponseCode()}`);
      
      // If a subscription is expired, the push service returns a 410 Gone status code.
      // You can add logic here to find and delete this subscription from your sheet.
      if (response.getResponseCode() === 410) {
        console.log(`Subscription for ${phc} is expired and should be removed.`);
        // To implement: find the row with this subscription and delete it.
      }

    } catch (e) {
      console.error(`Failed to process subscription for PHC ${subData.PHC}:`, e);
    }
  });
}