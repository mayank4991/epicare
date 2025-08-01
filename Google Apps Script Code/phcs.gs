// Function to get active PHC list
function getActivePHCs() {
  try {
    const phcSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PHCS_SHEET_NAME);
    if (!phcSheet) {
      createPHCsSheetWithSampleData();
      return getActivePHCs();
      // Recursive call after creating sheet
    }

    const dataRange = phcSheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length < 2) {
      addSamplePHCData();
      return getActivePHCs();
      // Recursive call after adding data
    }

    const header = values[0];
    const phcNameCol = header.indexOf('PHCName');
    const statusCol = header.indexOf('Status');

    const activePHCs = [];
    // Start from row 2 (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const phcName = row[phcNameCol];
      const status = row[statusCol];

      if (phcName && (!status || status.toLowerCase() === 'active')) {
        activePHCs.push(phcName);
      }
    }

    return activePHCs.sort();
    // Return sorted list

  } catch (error) {
    console.error('Error getting active PHCs:', error);
    return []; // Return empty array on error
  }
}

/**
 * Get active PHC names with caching for better performance
 * Returns a clean flat array of active PHC names
 */
function getActivePHCNames() {
  const now = Date.now();
  // Check if cache is valid
  if (phcNamesCache && phcNamesCacheTimestamp &&
      (now - phcNamesCacheTimestamp) < PHC_CACHE_DURATION) {
    return phcNamesCache;
  }

  try {
    const phcSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PHCS_SHEET_NAME);
    if (!phcSheet) {
      createPHCsSheetWithSampleData();
      return getActivePHCNames();
      // Recursive call after creating sheet
    }

    const dataRange = phcSheet.getDataRange();
    const values = dataRange.getValues();

    if (values.length < 2) {
      addSamplePHCData();
      return getActivePHCNames();
      // Recursive call after adding data
    }

    const header = values[0];
    const phcNameCol = header.indexOf('PHCName');
    const statusCol = header.indexOf('Status');

    if (phcNameCol === -1) {
      return [];
    }

    const activePHCNames = [];
    // Start from row 2 (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const phcName = row[phcNameCol];
      const status = row[statusCol];

      // Only include non-empty PHC names with 'Active' status (case-insensitive)
      if (phcName && phcName.toString().trim() !== '' &&
          (!status || status.toString().toLowerCase().trim() === 'active')) {
        activePHCNames.push(phcName.toString().trim());
      }
    }

    // Sort alphabetically and update cache
    const sortedPHCNames = activePHCNames.sort();
    phcNamesCache = sortedPHCNames;
    phcNamesCacheTimestamp = now;

    return sortedPHCNames;

  } catch (error) {
    // Return cached data if available, otherwise empty array
    return phcNamesCache ||
      [];
  }
}

/**
 * Clear PHC names cache (useful when PHC data is updated)
 */
function clearPHCNamesCache() {
  phcNamesCache = null;
  phcNamesCacheTimestamp = null;
}

// Function to create PHCs sheet with sample data
function createPHCsSheetWithSampleData() {
  const phcHeaders = [
    'PHCCode', 'PHCName', 'District', 'Block', 'Address',
    'ContactPerson', 'Phone', 'Email', 'Status', 'DateAdded'
  ];
  const phcSheet = getOrCreateSheet(PHCS_SHEET_NAME, phcHeaders);

  // Add sample PHC data for East Singhbhum district
  const samplePHCs = [
    ['PHC001', 'Golmuri PHC', 'East Singhbhum', 'Golmuri', 'Golmuri, Jamshedpur', 'Dr. Sharma', '9876543210', 'golmuri.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
    ['PHC002', 'Parsudih PHC', 'East Singhbhum', 'Parsudih', 'Parsudih, Jamshedpur', 'Dr. Kumar', '9876543211', 'parsudih.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
    ['PHC003', 'Jugsalai PHC', 'East Singhbhum', 'Jugsalai', 'Jugsalai, Jamshedpur', 'Dr. Singh', '9876543212', 'jugsalai.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
    ['PHC004', 'Kadma PHC', 'East Singhbhum', 'Kadma', 'Kadma, Jamshedpur', 'Dr. Verma', '9876543213', 'kadma.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
    ['PHC005', 'Mango PHC', 'East Singhbhum', 'Mango', 'Mango, Jamshedpur', 'Dr. Gupta', '9876543214', 'mango.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
    ['PHC006', 'Bagbera PHC', 'East Singhbhum', 'Bagbera', 'Bagbera, Jamshedpur', 'Dr. Mishra', '9876543215', 'bagbera.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
    ['PHC007', 'Chas PHC', 'East Singhbhum', 'Chas', 'Chas, Bokaro', 'Dr. Pandey', '9876543216', 'chas.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
    ['PHC008', 'Ghatshila PHC', 'East Singhbhum', 'Ghatshila', 'Ghatshila', 'Dr. Jha', '9876543217', 'ghatshila.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
    ['PHC009', 'Musabani PHC', 'East Singhbhum', 'Musabani', 'Musabani', 'Dr. Rai', '9876543218', 'musabani.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
    ['PHC010', 'Patamda PHC', 'East Singhbhum', 'Patamda', 'Patamda', 'Dr. Sinha', '9876543219', 'patamda.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
    ['PHC011', 'Potka PHC', 'East Singhbhum', 'Potka', 'Potka', 'Dr. Thakur', '9876543220', 'potka.phc@jharkhand.gov.in', 'Active', new Date().toISOString()],
    ['PHC012', 'Dhalbhumgarh PHC', 'East Singhbhum', 'Dhalbhumgarh', 'Dhalbhumgarh', 'Dr. Chandra', '9876543221', 'dhalbhumgarh.phc@jharkhand.gov.in', 'Active', new Date().toISOString()]
  ];

  // Add sample data starting from row 2
  if (phcSheet.getLastRow() === 1) { // Only headers exist
    phcSheet.getRange(2, 1, samplePHCs.length, samplePHCs[0].length).setValues(samplePHCs);
  }
}

// Function to add sample PHC data if sheet exists but is empty
function addSamplePHCData() {
  const phcSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PHCS_SHEET_NAME);
  if (!phcSheet) return;

  if (phcSheet.getLastRow() <= 1) { // Only headers or empty
    createPHCsSheetWithSampleData();
  }
}
/**
 * Gets the current stock levels for a specific PHC
 * @param {string} phcName - The name of the PHC to get stock for
 * @return {Array} Array of stock objects for the PHC
 */
function getPHCStock(phcName) {
  try {
    // Get or create the PHC_Stock sheet
    const stockSheet = getOrCreateSheet('PHC_Stock', ['PHC', 'Medicine', 'CurrentStock', 'LastUpdated']);
    const data = getSheetData('PHC_Stock');
    
    // Filter stock for the specified PHC
    return data.filter(row => row.PHC === phcName);
  } catch (error) {
    console.error('Error in getPHCStock:', error);
    throw new Error('Failed to retrieve stock data');
  }
}

/**
 * Updates stock levels for a PHC
 * @param {Array} stockData - Array of stock update objects with phc, medicine, and stock properties
 * @return {Object} Status object indicating success or failure
 */
function updatePHCStock(stockData) {
  try {
    // Get or create the PHC_Stock sheet with required headers
    const stockSheet = getOrCreateSheet('PHC_Stock', ['PHC', 'Medicine', 'CurrentStock', 'LastUpdated']);
    const allStock = stockSheet.getDataRange().getValues();
    const headers = allStock[0];
    
    // Create a map of existing stock for quick lookup
    const stockMap = new Map();
    
    // Start from row 1 to skip headers
    for (let i = 1; i < allStock.length; i++) {
      const row = allStock[i];
      const phc = row[headers.indexOf('PHC')];
      const medicine = row[headers.indexOf('Medicine')];
      const key = `${phc}_${medicine}`;
      stockMap.set(key, i); // Store row index for updates
    }
    
    // Process each stock update
    const now = new Date();
    const updates = [];
    
    stockData.forEach(item => {
      const key = `${item.phc}_${item.medicine}`;
      const rowIndex = stockMap.get(key);
      
      if (rowIndex !== undefined) {
        // Update existing row
        stockSheet.getRange(rowIndex + 1, headers.indexOf('CurrentStock') + 1).setValue(Number(item.stock));
        stockSheet.getRange(rowIndex + 1, headers.indexOf('LastUpdated') + 1).setValue(now);
      } else {
        // Add new row
        updates.push([
          item.phc,
          item.medicine,
          Number(item.stock),
          now
        ]);
      }
    });
    
    // Add any new rows in a batch
    if (updates.length > 0) {
      stockSheet.getRange(
        stockSheet.getLastRow() + 1, 
        1, 
        updates.length, 
        updates[0].length
      ).setValues(updates);
    }
    
    return { status: 'success', message: 'Stock updated successfully', updatedAt: now };
  } catch (error) {
    console.error('Error in updatePHCStock:', error);
    throw new Error('Failed to update stock data');
  }
}

/**
 * Helper function to get or create a sheet with the specified headers
 * @private
 * @param {string} sheetName - Name of the sheet
 * @param {Array} headers - Array of header names
 * @return {Sheet} The sheet object
 */
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    // Create new sheet if it doesn't exist
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 0) {
    // Add headers if sheet is empty
    sheet.appendRow(headers);
  }
  
  // Ensure all headers exist
  const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const missingHeaders = headers.filter(h => !existingHeaders.includes(h));
  
  if (missingHeaders.length > 0) {
    const lastCol = sheet.getLastColumn();
    sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]);
  }
  
  return sheet;
}