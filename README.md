# Epilepsy Management System - East Singhbhum

## Overview
A comprehensive epilepsy management system for tracking patients, follow-ups, and PHC (Primary Health Center) data. This is a monolithic application with a single HTML frontend and Google Apps Script backend.

## ✨ Key Features

### Patient Management
- Complete patient registration with medical history
- Track treatment progress and medication adherence
- Monitor seizure frequency and patterns
- Record patient vitals and side effects
- Support for multiple languages (English/Hindi)

### Follow-up System
- Automated follow-up scheduling
- Treatment adherence tracking
- Side effect monitoring
- Breakthrough seizure documentation
- Referral management

### Reporting & Analytics
- Real-time dashboard with key metrics
- Treatment outcome analysis
- PHC performance tracking
- Medicine stock management
- Exportable reports

### User Management
- Role-based access control
- PHC-specific data access
- Activity logging
- Secure authentication

## 🚀 Quick Start

### Prerequisites
- Google Account
- Google Sheets access
- Modern web browser

### Setup Instructions

1. **Create Google Spreadsheet**
   - Create a new Google Sheet
   - Name it "Epilepsy Management System - East Singhbhum"
   - Note the Spreadsheet ID from the URL (between /d/ and /edit)

2. **Set up Google Apps Script**
   - Go to [script.google.com](https://script.google.com)
   - Create new project
   - Copy contents of `code.gs` into the editor
   - Update `SPREADSHEET_ID` constant with your Sheet ID

3. **Deploy as Web App**
   - Click "Deploy" → "New deployment"
   - Select "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone"
   - Click "Deploy"
   - Copy the Web App URL

4. **Configure Frontend**
   - Open `index.html`
   - Update the `SCRIPT_URL` constant with your Web App URL

5. **Initialize Data**
   - In the Apps Script editor, run `createSpreadsheetStructure()`
   - This sets up all necessary sheets with default data

## 🛠 System Structure

### Frontend (`index.html` & `script.js`)
- Single-page application architecture
- Responsive design with mobile-first approach
- Built with vanilla JavaScript (no frameworks)
- Chart.js for interactive data visualization
- Modern ES6+ JavaScript features
- Form validation and error handling
- Progressive disclosure forms for better UX
- Real-time data updates
- Accessibility features (ARIA labels, keyboard navigation)
- Print-friendly reports
- Offline support with service workers
- Multi-language support (English/Hindi)

### Backend (Google Apps Script)

#### Core Modules
1. **Main Handler (`main.gs`)**
   - `doGet()`: Handles all GET requests
   - `doPost()`: Handles all POST requests
   - `getSheetData()`: Universal data fetcher
   - `filterDataByUserAccess()`: Role-based data filtering
   - `getActivePHCNames()`: Cached PHC list retrieval

2. **Patient Management (`patients.gs`)**
   - `addPatient()`: Register new patients
   - `updatePatient()`: Modify patient records
   - `getPatientById()`: Retrieve patient details
   - `getActivePatients()`: List active patients

3. **Follow-up System (`followups.gs`)**
   - `addFollowUp()`: Record patient follow-up
   - `getPatientFollowUps()`: View patient history
   - `resetFollowUpsByPhc()`: Monthly reset for PHCs
   - `getFollowUpStats()`: Generate follow-up metrics

4. **User Management (`users.gs`)**
   - `authenticateUser()`: Login verification
   - `addUser()`: Create new users
   - `updateUser()`: Modify user permissions
   - `getUserByUsername()`: Retrieve user details

5. **PHC Management (`phcs.gs`)**
   - `addPHC()`: Register new PHCs
   - `updatePHC()`: Modify PHC details
   - `getPHCStock()`: Check medicine inventory
   - `updatePHCStock()`: Update medicine levels

6. **Utility Functions (`utils.gs`)**
   - `sendEmailNotification()`: Alerts and reminders
   - `generateReport()`: Data export functionality
   - `validateInput()`: Data sanitization
   - `logActivity()`: Audit trail

### Data Storage (Google Sheets)

#### 1. Patients
- Basic info, medical history, and contact details
- Tracks treatment status and follow-ups

#### 2. Follow-ups
- Detailed records of patient interactions
- Treatment adherence and outcomes
- Referral tracking

#### 3. Users
- Role-based access control
- PHC assignments
- Authentication and permissions

#### 4. PHCs (Primary Health Centers)
- PHC details and contact information
- Status tracking
- Assignment to users

## 🔌 API Reference

### Authentication
- JWT-based authentication
- Role-based access control
- Session timeout after 24 hours
- Secure password hashing

### Endpoints

#### Patient Endpoints
- `GET ?action=getPatients` - List all patients (filtered by role)
- `GET ?action=getPatient&id={id}` - Get patient details
- `POST ?action=addPatient` - Add new patient
- `POST ?action=updatePatient` - Update patient record
- `POST ?action=deactivatePatient` - Mark patient as inactive

#### Follow-up Endpoints
- `GET ?action=getFollowUps` - List all follow-ups
- `GET ?action=getPatientFollowUps&patientId={id}` - Get patient's follow-up history
- `POST ?action=addFollowUp` - Record new follow-up
- `POST ?action=updateFollowUp` - Update follow-up record

#### User Management
- `GET ?action=getUsers` - List all users (admin only)
- `POST ?action=addUser` - Add new user (admin only)
- `POST ?action=updateUser` - Update user permissions
- `POST ?action=resetPassword` - Password reset

#### PHC Management
- `GET ?action=getPHCs` - List all PHCs
- `GET ?action=getPHCStock&phc={name}` - Get PHC stock levels
- `POST ?action=updatePHCStock` - Update medicine stock
- `POST ?action=addPHC` - Add new PHC (admin only)

#### Reporting
- `GET ?action=getDashboardStats` - Get dashboard metrics
- `GET ?action=exportData&type={type}` - Export data as CSV
- `GET ?action=getAuditLogs` - View system activity logs

## 🔐 User Roles

### Access Matrix
| Feature | Master Admin | PHC Admin | PHC Staff | Viewer |
|---------|-------------|-----------|-----------|--------|
| View All Patients | ✅ | ✅ (Assigned PHC) | ✅ (Assigned PHC) | ✅ (De-identified) |
| Add/Edit Patients | ✅ | ✅ | ✅ | ❌ |
| View All Follow-ups | ✅ | ✅ (Assigned PHC) | ✅ (Assigned PHC) | ❌ |
| Record Follow-ups | ✅ | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Manage PHCs | ✅ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ❌ | ✅ (Limited) |
| Export Data | ✅ | ✅ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |

## User Roles

### 1. Master Admin
- Full system access
- User management
- PHC management
- All data access

### 2. PHC Admin
- Manage assigned PHC data
- View PHC-specific reports
- Cannot access system settings

### 3. PHC Staff
- Basic data entry
- View patient records
- Limited to assigned PHC

### 4. Viewer
- Read-only access
- De-identified data only
- No data modification

## 📊 Data Models

### Patient Schema
```javascript
{
  id: String,                 // Unique patient ID
  name: String,               // Patient's full name
  age: Number,                // Current age
  gender: String,             // M/F/Other
  phone: String,              // Contact number
  address: String,            // Full address
  phc: String,                // Assigned PHC
  registrationDate: Date,     // Date of registration
  diagnosis: String,          // Medical diagnosis
  medications: [String],      // Prescribed medications
  lastFollowUp: Date,         // Date of last follow-up
  nextFollowUp: Date,         // Next scheduled follow-up
  status: String,             // Active/Inactive/Referred
  notes: String,              // Additional notes
  createdBy: String,          // User who created record
  updatedAt: Date             // Last update timestamp
}
```

### Follow-up Schema
```javascript
{
  id: String,                 // Follow-up ID
  patientId: String,          // Reference to patient
  date: Date,                 // Follow-up date
  provider: String,           // Healthcare provider
  seizureFrequency: String,   // Since last visit
  adherence: String,          // Medication adherence
  sideEffects: [String],      // Reported side effects
  medicationChanges: Object,  // Any medication adjustments
  notes: String,              // Clinical notes
  nextAppointment: Date,      // Next follow-up date
  referredToMO: Boolean,      // Referred to medical officer
  referralNotes: String,      // Referral details
  createdBy: String,          // User who recorded
  createdAt: Date             // Timestamp
}
```

## 🛠 Maintenance

### Common Tasks
1. **Backup Data**
   - Export Google Sheets regularly
   - Keep multiple backup copies

2. **User Management**
   - Review active users periodically
   - Update permissions as needed

3. **PHC Updates**
   - Keep PHC information current
   - Mark inactive PHCs appropriately

### Troubleshooting

#### Common Issues
1. **Login Failures**
   - Verify username/password
   - Check user status in Users sheet

2. **Data Not Loading**
   - Check internet connection
   - Verify Google Sheets access
   - Check Apps Script quotas

3. **Slow Performance**
   - Reduce open browser tabs
   - Clear browser cache
   - Check Google Sheets size

## 🚀 Development

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Google Cloud Project with Apps Script API enabled
- OAuth 2.0 credentials

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Configure environment variables:
   ```
   GOOGLE_CLOUD_PROJECT=your-project-id
   SPREADSHEET_ID=your-sheet-id
   ```
4. Run development server: `npm run dev`

### Testing
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`
- Linting: `npm run lint`

### Deployment
1. Build for production: `npm run build`
2. Deploy to Apps Script: `npm run deploy`
3. Set up triggers in Apps Script dashboard

## 📞 Support

For technical assistance:
1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Contact system administrator
3. Review Apps Script logs in GCP Console
4. Email: support@example.com

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📝 License
This project is licensed under the [Apache License 2.0](LICENSE)

---

*Last Updated: July 2025*"# trigger redeploy" 
"# trigger redeploy" 
