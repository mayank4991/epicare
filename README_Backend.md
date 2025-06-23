# Google Apps Script Backend Setup Guide

## Overview
This Google Apps Script serves as the backend for the Epilepsy Management System for East Singhbhum District. It handles all data operations including patient management, follow-ups, and user authentication.

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
4. Replace the default code with the contents of `Code.gs`
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
2. This will create the necessary sheets and headers

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
- **PHC**: Primary Health Center
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
- **PHC**: Assigned PHC (for PHC staff)
- **Name**: Full name
- **Email**: Email address
- **Status**: Active/Inactive

## API Endpoints

### GET Requests
- `?action=getPatients` - Retrieve all patients
- `?action=getFollowUps` - Retrieve all follow-ups
- `?action=getUsers` - Retrieve all users

### POST Requests
- `action=addPatient` - Add new patient
- `action=addFollowUp` - Add new follow-up

## Security Considerations

### 1. Access Control
- The script uses role-based access control
- Different user roles have different permissions
- Viewer role only sees de-identified data

### 2. Data Validation
- All input data is validated before storage
- Phone numbers are validated for 10 digits
- Required fields are enforced

### 3. Error Handling
- Comprehensive error handling for all operations
- Detailed error messages for debugging
- Graceful failure handling

## Maintenance Functions

### Backup Data
```javascript
function backupData() {
  // Creates a backup copy of the spreadsheet
  // Can be scheduled to run automatically
}
```

### System Statistics
```javascript
function getSystemStats() {
  // Returns system statistics
  // Useful for monitoring and reporting
}
```

### Test Connection
```javascript
function testConnection() {
  // Tests the connection to the spreadsheet
  // Useful for troubleshooting
}
```

## Troubleshooting

### Common Issues

1. **"Spreadsheet not found" error**
   - Verify the SPREADSHEET_ID is correct
   - Ensure the script has access to the spreadsheet

2. **"Permission denied" error**
   - Check that the script is deployed as a web app
   - Verify "Who has access" is set to "Anyone"

3. **"Sheet not found" error**
   - Run `createSpreadsheetStructure()` to create sheets
   - Verify sheet names match the constants

4. **Data not saving**
   - Check the console for error messages
   - Verify all required fields are filled
   - Check spreadsheet permissions

### Debugging Tips

1. Use `console.log()` statements in the script
2. Check the Apps Script execution logs
3. Test individual functions in the script editor
4. Verify data format matches expected structure

## Performance Optimization

1. **Batch Operations**: Group multiple operations when possible
2. **Caching**: Cache frequently accessed data
3. **Indexing**: Use proper data structures for lookups
4. **Cleanup**: Regularly clean up old data

## Backup and Recovery

1. **Regular Backups**: Schedule automatic backups
2. **Version Control**: Keep track of script versions
3. **Data Export**: Export data regularly for external backup
4. **Recovery Plan**: Have a plan for data recovery

## Support

For technical support or questions:
1. Check the Apps Script execution logs
2. Review the browser console for frontend errors
3. Verify all configuration settings
4. Test with sample data first

## Updates and Maintenance

1. **Regular Updates**: Keep the script updated with new features
2. **Security Patches**: Apply security updates promptly
3. **Performance Monitoring**: Monitor system performance
4. **User Training**: Provide training for new features 