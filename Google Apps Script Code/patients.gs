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

// Update patient status function with enhanced validation and referral logic
function updatePatientStatus(patientId, newStatus, referralDetails = null) {
  try {
    // Input validation
    if (!patientId || typeof patientId !== 'string') {
      throw new Error('Invalid patient ID');
    }
    
    const validStatuses = ['Active', 'Inactive', 'Referred to MO', 'Referred to Tertiary'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PATIENTS_SHEET_NAME);
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    const header = values[0];
    
    // Find column indices using headers
    const idCol = header.indexOf('ID');
    const statusCol = header.indexOf('PatientStatus');
    const lastUpdatedCol = header.indexOf('LastStatusUpdate');
    const notesCol = header.indexOf('Notes');
    const referredByCol = header.indexOf('ReferredBy');
    const referralNotesCol = header.indexOf('ReferralNotes');
    
    // Find patient row
    let rowIndex = -1;
    let currentStatus = '';
    for (let i = 1; i < values.length; i++) {
      if (values[i][idCol] === patientId) {
        rowIndex = i + 1; // +1 because sheet rows are 1-indexed
        currentStatus = values[i][statusCol] || '';
        break;
      }
    }

    if (rowIndex === -1) {
      throw new Error('Patient not found');
    }
    
    // All status transitions are allowed in this simplified version
    // You can add more specific transition rules later if needed
    
    // Prepare updates
    const updates = [];
    const now = new Date();
    
    // Update status and timestamp
    updates.push({
      range: sheet.getRange(rowIndex, statusCol + 1),
      value: newStatus
    });
    
    if (lastUpdatedCol !== -1) {
      updates.push({
        range: sheet.getRange(rowIndex, lastUpdatedCol + 1),
        value: now
      });
    }
    
    // Handle referral specific logic for both referral statuses
    if ((newStatus === 'Referred to MO' || newStatus === 'Referred to Tertiary') && referralDetails) {
      if (referredByCol !== -1 && referralDetails.referredBy) {
        updates.push({
          range: sheet.getRange(rowIndex, referredByCol + 1),
          value: referralDetails.referredBy
        });
      }
      
      if (referralNotesCol !== -1 && referralDetails.notes) {
        const existingNotes = sheet.getRange(rowIndex, referralNotesCol + 1).getValue() || '';
        const newNote = `[${now.toISOString()}] Referral: ${referralDetails.notes}\n${existingNotes}`;
        updates.push({
          range: sheet.getRange(rowIndex, referralNotesCol + 1),
          value: newNote
        });
      }
    }
    
    // Add status change to notes
    if (notesCol !== -1) {
      const existingNotes = sheet.getRange(rowIndex, notesCol + 1).getValue() || '';
      const statusNote = `[${now.toISOString()}] Status changed from ${currentStatus || 'N/A'} to ${newStatus}`;
      updates.push({
        range: sheet.getRange(rowIndex, notesCol + 1),
        value: `${statusNote}\n${existingNotes}`.trim()
      });
    }
    
    // Apply all updates in a single batch
    updates.forEach(update => update.range.setValue(update.value));
    
    // If this is a referral, you might want to trigger additional actions here
    if (newStatus === 'Referred') {
      // Example: Send email notification, create task, etc.
      // sendReferralNotification(patientId, referralDetails);
    }
    
    return { 
      status: 'success', 
      message: `Patient status updated to ${newStatus} successfully`,
      timestamp: now.toISOString()
    };
    
  } catch (error) {
    console.error('Error updating patient status:', error);
    return { 
      status: 'error', 
      message: error.message || 'Failed to update patient status',
      details: error.stack
    };
  }
}

/**
 * Update an existing patient row by ID.
 * Accepts a partial or full patient object in the same shape used by addPatient.
 * Only columns that are present in the incoming data will be overwritten.
 * Returns a success or error object suitable for createJsonResponse.
 */
function updatePatient(patientData) {
  try {
    if (!patientData) return { status: 'error', message: 'Missing patient data' };

    const patientId = (patientData.ID || patientData.id || patientData.patientId || patientData.PatientID || '').toString();
    if (!patientId) return { status: 'error', message: 'Patient ID is required for update' };

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(PATIENTS_SHEET_NAME);
    if (!sheet) return { status: 'error', message: 'Patients sheet not found' };

    const values = sheet.getDataRange().getValues();
    if (!values || values.length < 2) return { status: 'error', message: 'No patient rows found' };

    const headers = values[0];

    // Build a header -> column index map where keys are normalized (lowercase, alphanumeric)
    const headerIndexMap = {};
    for (let j = 0; j < headers.length; j++) {
      const raw = (headers[j] || '').toString();
      const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
      headerIndexMap[key] = j; // store 0-based index
    }

    // Find the row number for the patient (1-indexed sheet row)
    const idKey = Object.keys(headerIndexMap).find(k => k === 'id') || 'id';
    const idColIndex = headerIndexMap[idKey];
    if (typeof idColIndex === 'undefined') return { status: 'error', message: 'ID column not found in Patients sheet' };

    let rowNumber = -1;
    for (let i = 1; i < values.length; i++) {
      const cellVal = values[i][idColIndex];
      if (cellVal !== undefined && cellVal !== null && cellVal.toString() === patientId) {
        rowNumber = i + 1; // sheet rows are 1-indexed
        break;
      }
    }

    if (rowNumber === -1) return { status: 'error', message: 'Patient not found' };

    // Known alias map for incoming keys -> normalized header keys
    const alias = {
      name: 'patientname',
      patientname: 'patientname',
      patientid: 'id',
      id: 'id',
      phc: 'phc',
      patientstatus: 'patientstatus',
      status: 'patientstatus',
      medications: 'medications',
      phone: 'phone',
      fathername: 'fathername',
      age: 'age',
      gender: 'gender',
      address: 'address',
      residencetype: 'residencetype',
      followupstatus: 'followupstatus',
      lastfollowup: 'lastfollowup',
      addedby: 'addedby'
    };

    const updates = [];

    // For each incoming field, try to map it to a sheet header and prepare update
    for (const rawKey in patientData) {
      if (!patientData.hasOwnProperty(rawKey)) continue;
      const val = patientData[rawKey];
      let k = rawKey.toString().toLowerCase();
      k = k.replace(/[^a-z0-9]/g, '');

      // Resolve using alias map if necessary
      if (alias[k]) k = alias[k];

      // If header exists for this normalized key, use it
      if (typeof headerIndexMap[k] !== 'undefined') {
        const col = headerIndexMap[k] + 1; // 1-based
        let valueToWrite = val;
        // If updating medications, ensure stored as JSON string
        const headerName = (headers[headerIndexMap[k]] || '').toString();
        if (headerName === 'Medications' || headerName === 'NewMedications' || headerName === 'MedicationHistory') {
          try {
            valueToWrite = (typeof val === 'string') ? val : JSON.stringify(val || []);
          } catch (e) {
            valueToWrite = JSON.stringify([]);
          }
        }

        updates.push({ col: col, value: valueToWrite });
      }
    }

    // If there is a known timestamp/last updated header, set it
    const timestampCandidates = ['laststatusupdate', 'lastupdated', 'updatedat', 'lastmodified', 'registrationdate'];
    const nowIso = new Date().toISOString();
    for (let t = 0; t < timestampCandidates.length; t++) {
      const cand = timestampCandidates[t];
      if (typeof headerIndexMap[cand] !== 'undefined') {
        updates.push({ col: headerIndexMap[cand] + 1, value: nowIso });
        break;
      }
    }

    // Apply updates
    updates.forEach(u => {
      try {
        sheet.getRange(rowNumber, u.col).setValue(u.value);
      } catch (err) {
        console.error('Failed writing to cell', rowNumber, u.col, err);
      }
    });

    return { status: 'success', message: 'Patient updated successfully', patientId: patientId };

  } catch (error) {
    console.error('Error in updatePatient:', error);
    return { status: 'error', message: error.message || 'Failed to update patient', details: error.stack };
  }
}