# Google Apps Script Backend Setup Guide

## Overview
This Google Apps Script serves as the backend for the Epilepsy Management System for East Singhbhum District. It handles all data operations including patient management, follow-ups, user authentication, and PHC management.

## Setup Instructions

### 1. Create Google Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Epilepsy Management System - East Singhbhum"
4. Copy the Spreadsheet ID from the URL (the long string between /d/ and /edit)

### 2. Set up Google Apps Script
1. Go to [Google Apps Script](https://script.google.com)
2. Create a new project
3. Name it "Epilepsy Management Backend"
4. Replace the default code with the contents of `codeupdated.gs`
5. Update the `SPREADSHEET_ID` constant with your actual spreadsheet ID

### 3. Deploy the Script
1. Click on "Deploy" → "New deployment"
2. Choose "Web app" as the type
3. Set "Execute as" to "Me"
4. Set "Who has access" to "Anyone"
5. Click "Deploy"
6. Copy the Web App URL

### 4. Update Frontend Configuration
1. Open `index.html`
2. Find the `SCRIPT_URL` constant
3. Replace it with your deployed Web App URL

### 5. Initialize Spreadsheet Structure
1. In the Apps Script editor, run the `createSpreadsheetStructure()` function
2. This will create the necessary sheets and headers, including the new PHCs sheet

## Spreadsheet Structure

### Patients Sheet
- **ID**: Unique patient identifier
- **PatientName**: Full name of patient
- **FatherName**: Father's name
- **Age**: Patient age
- **Gender**: Male/Female/Other
- **Phone**: Contact number
- **PhoneBelongsTo**: Who owns the phone
- **CampLocation**: Camp location if applicable
- **ResidenceType**: Urban/Rural/Tribal
- **Address**: Full address
- **PHC**: Primary Health Center (now populated from PHCs sheet)
- **Diagnosis**: Epilepsy/FDS/Uncertain/Other
- **AgeOfOnset**: Age when symptoms began
- **SeizureFrequency**: Daily/Weekly/Monthly/Yearly/Less than yearly
- **PatientStatus**: New/Follow-up/Active/Inactive
- **Weight**: Patient weight in kg
- **BPSystolic**: Blood pressure systolic
- **BPDiastolic**: Blood pressure diastolic
- **BPRemark**: Blood pressure notes
- **Medications**: JSON array of medications
- **Addictions**: Any addictions
- **InjuryType**: Type of injury if any
- **TreatmentStatus**: Ongoing/Completed/Discontinued/Never Treated
- **PreviouslyOnDrug**: Previous medication history
- **RegistrationDate**: Date of registration
- **FollowUpStatus**: Pending/Completed
- **Adherence**: Treatment adherence pattern
- **LastFollowUp**: Date of last follow-up
- **AddedBy**: Username who added the patient

### FollowUps Sheet
- **FollowUpID**: Unique follow-up identifier
- **PatientID**: Reference to patient
- **CHOName**: Name of CHO doing follow-up
- **FollowUpDate**: Date of follow-up
- **PhoneCorrect**: Whether phone number was correct
- **CorrectedPhoneNumber**: New phone number if corrected
- **FeltImprovement**: Whether patient felt improvement
- **SeizureFrequency**: Current seizure frequency
- **SeizureTypeChange**: Changes in seizure type
- **SeizureDurationChange**: Changes in seizure duration
- **SeizureSeverityChange**: Changes in seizure severity
- **MedicationSource**: Source of medication
- **MissedDose**: Whether patient missed any dose
- **TreatmentAdherence**: Adherence pattern
- **MedicationChanged**: Whether medications were changed
- **NewMedications**: JSON array of new medications
- **NewMedicalConditions**: Any new medical conditions
- **AdditionalQuestions**: Additional notes
- **FollowUpDurationSeconds**: Time taken for follow-up
- **SubmittedBy**: Username who submitted
- **ReferredToMO**: Whether referred to Medical Officer
- **DrugDoseVerification**: Verification of drug dose
- **SubmissionDate**: Date of submission

### Users Sheet
- **Username**: Login username
- **Password**: Login password
- **Role**: admin/phc/viewer
- **PHC**: Assigned PHC (references PHCs sheet)
- **Name**: Full name
- **Email**: Email address
- **Status**: Active/Inactive

### PHCs Sheet (NEW)
- **PHCCode**: Unique PHC identifier (e.g., PHC001)
- **PHCName**: Full name of PHC (e.g., "Golmuri PHC")
- **District**: District name (East Singhbhum)
- **Block**: Block/Area name
- **Address**: Full address of PHC
- **ContactPerson**: Name of contact person
- **Phone**: Contact phone number
- **Email**: Contact email address
- **Status**: Active/Inactive
- **DateAdded**: When PHC was added to system

#### Pre-populated PHCs for East Singhbhum District:
1. Golmuri PHC
2. Parsudih PHC
3. Jugsalai PHC
4. Kadma PHC
5. Mango PHC
6. Bagbera PHC
7. Chas PHC
8. Ghatshila PHC
9. Musabani PHC
10. Patamda PHC
11. Potka PHC
12. Dhalbhumgarh PHC

## API Endpoints

### GET Requests
- `?action=getPatients` - Retrieve all patients
- `?action=getFollowUps` - Retrieve all follow-ups
- `?action=getUsers` - Retrieve all users
- `?action=getPHCs` - Retrieve all PHCs (NEW)

### POST Requests
- `action=addPatient` - Add new patient
- `action=addFollowUp` - Add new follow-up
- `action=addUser` - Add new user
- `action=addPHC` - Add new PHC (NEW)

## New Features

### PHC Management
- **Dynamic PHC Loading**: PHC names are now loaded from the PHCs sheet instead of being hardcoded
- **PHC Administration**: Admins can add new PHCs through the system
- **Flexible Assignment**: Users can be assigned to specific PHCs or "All PHCs"
- **Automatic Fallback**: If PHCs sheet doesn't exist, it's created with sample data

### Benefits of PHC Sheet Integration
1. **Maintainability**: No need to modify code to add/remove PHCs
2. **Scalability**: Easy to expand to other districts
3. **Data Integrity**: Consistent PHC names across the system
4. **Audit Trail**: Track when PHCs were added and by whom
5. **Contact Management**: Store contact information for each PHC

## Security Considerations

### 1. Access Control
- The script uses role-based access control
- Different user roles have different permissions
- Viewer role only sees de-identified data
- PHC staff can only see their assigned PHC data

### 2. Data Validation
- All input data is validated before storage
- Phone numbers are validated for 10 digits
- Required fields are enforced
- PHC names are validated against the PHCs sheet

### 3. Error Handling
- Comprehensive error handling for all operations
- Detailed error messages for debugging
- Graceful failure handling
- Automatic sheet creation if missing

## Maintenance Functions

### PHC Management Functions
```javascript
function getActivePHCs() {
  // Returns list of active PHCs from the sheet
}

function createPHCsSheetWithSampleData() {
  // Creates PHCs sheet with sample data for East Singhbhum
}

function addSamplePHCData() {
  // Adds sample PHC data if sheet is empty
}
```

### System Statistics
```javascript
function getSystemStats() {
  // Returns system statistics including PHC count
}
```

### Test Connection
```javascript
function testConnection() {
  // Tests the connection to all sheets including PHCs
}
```

## Troubleshooting

### Common Issues

1. **"PHCs sheet not found" error**
   - Run `createSpreadsheetStructure()` to create all sheets
   - The system will automatically create PHCs sheet with sample data

2. **"No PHC data found" error**
   - The system will automatically add sample PHC data
   - Check if PHCs sheet has proper headers

3. **PHC dropdown not populating**
   - Verify PHCs sheet exists and has data
   - Check that Status column is "Active" for PHCs
   - Ensure frontend is calling `?action=getPHCs`

4. **User assignment to PHC fails**
   - Verify PHC name matches exactly with PHCs sheet
   - Check for extra spaces or case sensitivity

### Debugging Tips

1. Use `getActivePHCs()` function to test PHC loading
2. Check the Apps Script execution logs for PHC-related errors
3. Verify PHCs sheet structure matches expected headers
4. Test with sample data first before adding real PHCs

## Migration from Hardcoded PHCs

If you're upgrading from a version with hardcoded PHCs:

1. **Backup your data** before running the update
2. Run `createSpreadsheetStructure()` to create the PHCs sheet
3. **Update existing patient records** to use exact PHC names from the sheet
4. **Update user assignments** to reference PHCs from the sheet
5. **Test thoroughly** with a few records before full deployment

## Performance Optimization

1. **Caching**: PHC data is cached for better performance
2. **Batch Operations**: Group PHC-related operations when possible
3. **Indexing**: Use proper data structures for PHC lookups
4. **Cleanup**: Regularly review and clean up inactive PHCs

## Support

For technical support or questions about PHC management:
1. Check the Apps Script execution logs for PHC-related errors
2. Verify PHCs sheet structure and data
3. Test PHC loading functions individually
4. Ensure proper user-PHC assignments

## Updates and Maintenance

1. **Regular Updates**: Keep PHC information current
2. **Data Validation**: Regularly validate PHC contact information
3. **Performance Monitoring**: Monitor PHC-related query performance
4. **User Training**: Train users on new PHC management features