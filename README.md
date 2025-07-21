# Epilepsy Management System - East Singhbhum

## Overview
A comprehensive epilepsy management system for tracking patients, follow-ups, and PHC (Primary Health Center) data. This is a monolithic application with a single HTML frontend and Google Apps Script backend.

## Quick Start

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

## System Structure

### Frontend (`index.html`)
- Single HTML file with embedded CSS and JavaScript
- Responsive design for desktop and mobile
- Built with vanilla JavaScript (no frameworks)
- Uses Chart.js for data visualization

### Backend (`code.gs`)
- Google Apps Script for data operations
- Connected to Google Sheets for data storage
- REST API endpoints for CRUD operations

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

## API Reference

### Authentication
- All requests require valid user credentials
- Session management handled via Google Apps Script

### Endpoints

#### GET Parameters
- `?action=getPatients` - Get patient list
- `?action=getFollowUps` - Get follow-up records
- `?action=getUsers` - Get user list (admin only)
- `?action=getPHCs` - Get PHC list

#### POST Data
- `action=addPatient` - Add new patient
- `action=addFollowUp` - Record follow-up
- `action=addUser` - Add new user (admin only)
- `action=addPHC` - Add new PHC (admin only)

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

## Maintenance

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

## Support

For technical assistance:
1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Contact system administrator
3. Review Apps Script logs

---

*Last Updated: July 2025*"# trigger redeploy" 
