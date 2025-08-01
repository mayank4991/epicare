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