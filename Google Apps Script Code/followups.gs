// Automatic monthly follow-up renewal
function monthlyFollowUpRenewal() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  let resetCount = 0;
  // Find column indices using headers
  const header = values[0];
  const lastFollowUpCol = header.indexOf('LastFollowUp');
  const statusCol = header.indexOf('PatientStatus');
  const followUpStatusCol = header.indexOf('FollowUpStatus');

  // Start from row 2 (skip header)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const lastFollowUp = row[lastFollowUpCol] ? new Date(row[lastFollowUpCol]) : null;
    const status = row[statusCol];
    const followUpStatus = row[followUpStatusCol];
    if (!lastFollowUp || isNaN(lastFollowUp.getTime())) continue;

    // Calculate days since last follow-up
    const daysSinceLastFollowUp = Math.floor((today - lastFollowUp) / (1000 * 60 * 60 * 24));
    // Check if active/follow-up/new and last follow-up > 30 days ago
    const statusNorm = (status || '').trim().toLowerCase();
    if (['active', 'follow-up', 'new'].includes(statusNorm) && daysSinceLastFollowUp > 30) {
      // Set FollowUpStatus to 'Pending'
      sheet.getRange(i + 1, followUpStatusCol + 1).setValue('Pending');
      resetCount++;
    }

    // Check if follow-up was completed in a previous month and needs reset
    if (followUpStatus && followUpStatus.includes('Completed') && lastFollowUp) {
      const lastFollowUpDate = new Date(lastFollowUp);
      const lastFollowUpMonth = lastFollowUpDate.getMonth();
      const lastFollowUpYear = lastFollowUpDate.getFullYear();

      // If last follow-up was in a previous month, reset to pending
      if (lastFollowUpYear < currentYear || (lastFollowUpYear === currentYear && lastFollowUpMonth < currentMonth)) {
        sheet.getRange(i + 1, followUpStatusCol + 1).setValue('Pending');
        resetCount++;
      }
    }
  }

  return resetCount;
}

// Enhanced follow-up completion with next follow-up date calculation
function completeFollowUp(patientId, followUpData) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PATIENTS_SHEET_NAME);
  if (!sheet) {
    throw new Error('Patients sheet not found');
  }

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();

  if (values.length < 2) {
    throw new Error('No patient data found in sheet');
  }

  // Find column indices using headers
  const header = values[0];
  const idCol = header.indexOf('ID');
  if (idCol === -1) {
    throw new Error('ID column not found in Patients sheet');
  }

  const lastFollowUpCol = header.indexOf('LastFollowUp');
  const followUpStatusCol = header.indexOf('FollowUpStatus');
  const adherenceCol = header.indexOf('Adherence');
  const phoneCol = header.indexOf('Phone');
  const medicationsCol = header.indexOf('Medications');

  // Find patient row with improved matching
  let rowIndex = -1;
  const patientIdStr = String(patientId).trim();
  for (let i = 1; i < values.length; i++) {
    const rowId = values[i][idCol];
    const rowIdStr = String(rowId).trim();

    if (rowIdStr === patientIdStr) {
      rowIndex = i + 1;
      // +1 because sheet rows are 1-indexed
      break;
    }
  }

  if (rowIndex === -1) {
    // Log available patient IDs for debugging
    const availableIds = values.slice(1).map(row => String(row[idCol]).trim()).filter(id => id);
    throw new Error(`Patient not found. Looking for ID: "${patientIdStr}". Available IDs: ${availableIds.join(', ')}`);
  }

  const followUpDate = new Date(followUpData.followUpDate);
  const currentMonth = followUpDate.getMonth();
  const currentYear = followUpDate.getFullYear();
  // Calculate next follow-up date (1 month from current follow-up)
  const nextFollowUpDate = new Date(followUpDate);
  nextFollowUpDate.setMonth(nextFollowUpDate.getMonth() + 1);
  // Create completion status with month info
  const completionStatus = `Completed for ${followUpDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  // Update patient record using header-based column indices
  if (lastFollowUpCol !== -1) {
    sheet.getRange(rowIndex, lastFollowUpCol + 1).setValue(followUpData.followUpDate);
  }

  if (followUpStatusCol !== -1) {
    sheet.getRange(rowIndex, followUpStatusCol + 1).setValue(completionStatus);
  }

  if (adherenceCol !== -1) {
    sheet.getRange(rowIndex, adherenceCol + 1).setValue(followUpData.treatmentAdherence);
  }

  // Update phone number if corrected
  if (followUpData.phoneCorrect === 'No' && followUpData.correctedPhoneNumber && phoneCol !== -1) {
    sheet.getRange(rowIndex, phoneCol + 1).setValue(followUpData.correctedPhoneNumber);
  }

  // Update medications if changed
  if (followUpData.medicationChanged && followUpData.newMedications && followUpData.newMedications.length > 0 && medicationsCol !== -1) {
    const currentMedications = values[rowIndex - 1][medicationsCol];
    let currentMedicationArray = [];

    try {
      currentMedicationArray = JSON.parse(currentMedications || '[]');
    } catch (e) {
      currentMedicationArray = [];
    }

    // Update current medications
    sheet.getRange(rowIndex, medicationsCol + 1).setValue(JSON.stringify(followUpData.newMedications));
    // Create medication history entry if MedicationHistory column exists
    const medicationHistoryCol = header.indexOf('MedicationHistory');
    const lastMedicationChangeDateCol = header.indexOf('LastMedicationChangeDate');
    const lastMedicationChangeByCol = header.indexOf('LastMedicationChangeBy');

    if (medicationHistoryCol !== -1) {
      const medicationHistoryEntry = {
        date: new Date().toISOString(),
        changedBy: followUpData.submittedByUsername ||
      'CHO',
        previousMedications: currentMedicationArray,
        newMedications: followUpData.newMedications,
        changeReason: 'Regular follow-up medication change'
      };
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
      sheet.getRange(rowIndex, lastMedicationChangeByCol + 1).setValue(followUpData.submittedByUsername || 'CHO');
    }
  }

  // Handle weight and age updates with audit trail
  if (followUpData.updateWeightAge && (followUpData.currentWeight || followUpData.currentAge)) {
    const weightCol = header.indexOf('Weight');
    const ageCol = header.indexOf('Age');
    const weightAgeHistoryCol = header.indexOf('WeightAgeHistory');
    const lastWeightAgeUpdateDateCol = header.indexOf('LastWeightAgeUpdateDate');
    const lastWeightAgeUpdateByCol = header.indexOf('LastWeightAgeUpdateBy');
    // Get current values for audit trail
    const currentWeight = values[rowIndex - 1][weightCol] || '';
    const currentAge = values[rowIndex - 1][ageCol] || '';

    // Create audit trail entry
    const weightAgeHistoryEntry = {
      date: new Date().toISOString(),
      updatedBy: followUpData.submittedByUsername ||
      'CHO',
      previousWeight: currentWeight,
      previousAge: currentAge,
      newWeight: followUpData.currentWeight ||
      currentWeight,
      newAge: followUpData.currentAge || currentAge,
      updateReason: followUpData.weightAgeUpdateReason ||
      'Regular follow-up update',
      notes: followUpData.weightAgeUpdateNotes || ''
    };
    // Update current weight and age if provided
    if (followUpData.currentWeight && weightCol !== -1) {
      sheet.getRange(rowIndex, weightCol + 1).setValue(followUpData.currentWeight);
    }

    if (followUpData.currentAge && ageCol !== -1) {
      sheet.getRange(rowIndex, ageCol + 1).setValue(followUpData.currentAge);
    }

    // Store audit trail if WeightAgeHistory column exists
    if (weightAgeHistoryCol !== -1) {
      let existingHistory = [];
      try {
        existingHistory = JSON.parse(values[rowIndex - 1][weightAgeHistoryCol] || '[]');
      } catch (e) {
        existingHistory = [];
      }

      existingHistory.push(weightAgeHistoryEntry);
      sheet.getRange(rowIndex, weightAgeHistoryCol + 1).setValue(JSON.stringify(existingHistory));
    }

    // Update last weight/age change tracking
    if (lastWeightAgeUpdateDateCol !== -1) {
      sheet.getRange(rowIndex, lastWeightAgeUpdateDateCol + 1).setValue(new Date().toISOString());
    }

    if (lastWeightAgeUpdateByCol !== -1) {
      sheet.getRange(rowIndex, lastWeightAgeUpdateByCol + 1).setValue(followUpData.submittedByUsername || 'CHO');
    }
  }

  return {
    completionStatus: completionStatus,
    nextFollowUpDate: nextFollowUpDate.toISOString().split('T')[0]
  };
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
    const lastFollowUp = row[lastFollowUpCol] ?
      new Date(row[lastFollowUpCol]) : null;
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

// Update existing referral entries when a referral is closed
function updateExistingReferralEntries(patientId) {
  try {
    console.log(`updateExistingReferralEntries called for patientId: ${patientId}, type: ${typeof patientId}`);
    const followUpSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(FOLLOWUPS_SHEET_NAME);
    const dataRange = followUpSheet.getDataRange();
    const values = dataRange.getValues();
    if (values.length < 2) {
      return 0;
      // No data to update
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