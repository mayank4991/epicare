/**
 * Custom Reports Module
 * Provides 6 pre-configured report generators for public health professionals
 * Supports drill-down analytics and data export from generated lists
 */

class CustomReports {
  constructor() {
    this.currentReport = null;
    this.currentReportData = null;
    this.reportViewSettings = {
      itemsPerPage: 100,
      currentPage: 1,
      sortBy: 'name',
      sortAsc: true
    };
  }

  /**
   * Initialize custom reports UI
   */
  init() {
    this.setupReportButtons();
    this.setupReportViewHandlers();
  }

  /**
   * Setup quick report template buttons
   */
  setupReportButtons() {
    const reports = [
      {
        id: 'seizureFrequency',
        title: 'Patients by Seizure Frequency',
        description: 'Find patients with specific seizure patterns for targeted intervention',
        icon: '⚡'
      },
      {
        id: 'medicinesStopped',
        title: 'Patients Who Stopped Medicines',
        description: 'Identify patients with poor medication compliance for re-engagement',
        icon: '💊'
      },
      {
        id: 'choPerformance',
        title: 'CHOs by Patient Load & Performance',
        description: 'Rank health workers by caseload and performance metrics',
        icon: '👥'
      },
      {
        id: 'medicineSource',
        title: 'Private vs Government Medicine Use',
        description: 'Analyze medicine access patterns by facility and location',
        icon: '🏥'
      },
      {
        id: 'nonCompliant',
        title: 'Non-Compliant Patients',
        description: 'Find patients with poor adherence for intervention programs',
        icon: '⚠️'
      },
      {
        id: 'sideEffects',
        title: 'Patients with Side Effects',
        description: 'Monitor adverse effects and manage medication adjustments',
        icon: '🔔'
      }
    ];

    const container = document.getElementById('quickReportsContainer');
    if (!container) return;

    let html = '<div class="quick-reports-grid">';
    reports.forEach(report => {
      html += `
        <div class="quick-report-card" data-report-id="${report.id}">
          <span class="report-icon">${report.icon}</span>
          <h4>${report.title}</h4>
          <p>${report.description}</p>
          <button class="btn-generate-report" data-report-id="${report.id}">Generate List</button>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;

    // Event listeners for report buttons
    container.querySelectorAll('.btn-generate-report').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const reportId = e.target.dataset.reportId;
        this.generateReport(reportId);
      });
    });
  }

  /**
   * Generate a specific report
   */
  async generateReport(reportId) {
    // Show loading state
    this.showReportLoading(reportId);

    try {
      let reportData;

      switch (reportId) {
        case 'seizureFrequency':
          reportData = await this.generateSeizureFrequencyReport();
          break;
        case 'medicinesStopped':
          reportData = await this.generateMedicinesStoppedReport();
          break;
        case 'choPerformance':
          reportData = await this.generateCHOPerformanceReport();
          break;
        case 'medicineSource':
          reportData = await this.generateMedicineSourceReport();
          break;
        case 'nonCompliant':
          reportData = await this.generateNonCompliantReport();
          break;
        case 'sideEffects':
          reportData = await this.generateSideEffectsReport();
          break;
        default:
          throw new Error(`Unknown report type: ${reportId}`);
      }

      this.displayReport(reportData);
    } catch (error) {
      if (window.Logger) window.Logger.error(`Error generating report ${reportId}:`, error);
      alert(`Error generating report: ${error.message}`);
    }
  }

  /**
   * Report 1: Patients by Seizure Frequency
   */
  async generateSeizureFrequencyReport() {
    const frequencies = ['Seizure Free', 'Rarely', 'Monthly', 'Weekly', 'Daily'];
    const selectedFrequency = prompt('Select seizure frequency to report on:\n\n' + 
      frequencies.map((f, i) => `${i+1}. ${f}`).join('\n'));

    if (!selectedFrequency) return null;

    const frequencyMap = { '1': 'Seizure Free', '2': 'Rarely', '3': 'Monthly', '4': 'Weekly', '5': 'Daily' };
    const frequency = frequencyMap[selectedFrequency];

    try {
      const response = await fetch(DEPLOYMENT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'getPatientsBySeizureFrequency',
          frequency: frequency,
          phcFilter: document.getElementById('advancedPhcFilter')?.value || 'All'
        })
      });

      const result = await response.json();
      return {
        id: 'seizureFrequency',
        title: `Patients with ${frequency} Seizures`,
        filters: `Seizure Frequency = "${frequency}"`,
        columns: ['PatientID', 'PatientName', 'Age', 'Gender', 'Phone', 'PHC', 'SeizureFrequency', 'LastFollowUp', 'CHOAssigned', 'CurrentMedicine'],
        data: result.data || [],
        summary: result.summary || {}
      };
    } catch (error) {
      if (window.Logger) window.Logger.error('Error generating seizure frequency report:', error);
      throw error;
    }
  }

  /**
   * Report 2: Patients Who Stopped Medicines
   */
  async generateMedicinesStoppedReport() {
    const daysOption = prompt('Check patients who stopped medicines:\n\n1. Last 30 days\n2. Last 90 days\n3. All time');
    if (!daysOption) return null;

    const daysMap = { '1': 30, '2': 90, '3': 999999 };
    const daysToCheck = daysMap[daysOption];

    try {
      const response = await fetch(DEPLOYMENT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'getPatientsMedicinesStopped',
          daysInactive: daysToCheck,
          phcFilter: document.getElementById('advancedPhcFilter')?.value || 'All'
        })
      });

      const result = await response.json();
      return {
        id: 'medicinesStopped',
        title: 'Patients Who Stopped Medicines',
        filters: `Adherence = "Completely Stopped" (Last ${daysToCheck === 999999 ? 'all' : daysToCheck} days)`,
        columns: ['PatientID', 'PatientName', 'Phone', 'Address', 'PHC', 'Age', 'Gender', 'LastFollowUp', 'CHOAssigned'],
        data: result.data || [],
        summary: result.summary || {}
      };
    } catch (error) {
      if (window.Logger) window.Logger.error('Error generating medicines stopped report:', error);
      throw error;
    }
  }

  /**
   * Report 3: CHOs by Patient Load & Performance
   * Enhanced with date range and metric filtering
   */
  async generateCHOPerformanceReport() {
    // Prompt for metric selection
    const metricOption = prompt('Rank CHOs by:\n\n1. Patient Load\n2. Seizure Control (%)\n3. Follow-Up Rate\n4. Adherence Rate (%)');
    if (!metricOption || !['1','2','3','4'].includes(metricOption)) return null;

    const metricMap = { '1': 'patientLoad', '2': 'seizureControl', '3': 'followUpRate', '4': 'adherenceRate' };
    const metricLabels = { '1': 'Patient Load', '2': 'Seizure Control', '3': 'Follow-Up Rate', '4': 'Adherence Rate' };
    const metric = metricMap[metricOption];

    // Get date range from user
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
    
    const startDateInput = prompt('Enter start date (YYYY-MM-DD):', thirtyDaysAgo);
    if (!startDateInput) return null;
    
    const endDateInput = prompt('Enter end date (YYYY-MM-DD):', today);
    if (!endDateInput) return null;

    try {
      const response = await fetch(DEPLOYMENT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'getCHOPerformanceRanking',
          metric: metric,
          phcFilter: document.getElementById('advancedPhcFilter')?.value || 'All',
          dateRange: {
            startDate: startDateInput,
            endDate: endDateInput
          }
        })
      });

      const result = await response.json();
      
      if (result.status === 'error') {
        throw new Error(result.message || 'Failed to fetch CHO performance data');
      }

      return {
        id: 'choPerformance',
        title: `CHOs Ranked by ${metricLabels[metricOption]}`,
        filters: `Metric=${metric}, Date Range=${startDateInput} to ${endDateInput}, PHC=${document.getElementById('advancedPhcFilter')?.value || 'All'}`,
        columns: ['CHOName', 'PHC', 'PatientCount', 'TotalFollowUps', 'SeizureControlPercent', 'FollowUpRatePercent', 'AdherenceRatePercent', 'PerformanceTier', 'LastFollowUpDate'],
        data: result.data || [],
        summary: result.summary || {}
      };
    } catch (error) {
      if (window.Logger) window.Logger.error('Error generating CHO performance report:', error);
      throw error;
    }
  }

  /**
   * Report 4: Private vs Government Medicine Use
   */
  async generateMedicineSourceReport() {
    try {
      const response = await fetch(DEPLOYMENT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'getPrivateVsGovMedicineUsage',
          phcFilter: document.getElementById('advancedPhcFilter')?.value || 'All'
        })
      });

      const result = await response.json();
      return {
        id: 'medicineSource',
        title: 'Private vs Government Medicine Usage by PHC',
        filters: 'Aggregated by PHC location',
        columns: ['PHC', 'Location', 'PatientsOnPrivate', 'PatientsOnGovt', 'PatientsOnMixed', 'PercentPrivate', 'PercentGovt'],
        data: result.data || [],
        summary: result.summary || {}
      };
    } catch (error) {
      if (window.Logger) window.Logger.error('Error generating medicine source report:', error);
      throw error;
    }
  }

  /**
   * Report 5: Non-Compliant Patients
   */
  async generateNonCompliantReport() {
    try {
      const response = await fetch(DEPLOYMENT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'getNonCompliantPatients',
          phcFilter: document.getElementById('advancedPhcFilter')?.value || 'All'
        })
      });

      const result = await response.json();
      return {
        id: 'nonCompliant',
        title: 'Non-Compliant Patients (Poor Adherence)',
        filters: 'Adherence = "Frequently Miss" OR "Occasionally Miss" AND Last Follow-Up > 90 days',
        columns: ['PatientID', 'PatientName', 'Phone', 'PHC', 'CurrentAdherence', 'LastFollowUp', 'DaysSinceFollowUp', 'CHOAssigned', 'RiskLevel'],
        data: result.data || [],
        summary: result.summary || {}
      };
    } catch (error) {
      if (window.Logger) window.Logger.error('Error generating non-compliant report:', error);
      throw error;
    }
  }

  /**
   * Report 6: Patients with Side Effects
   */
  async generateSideEffectsReport() {
    const sideEffects = ['Tremor', 'Rash', 'Dizziness', 'Drowsiness', 'Nausea', 'Headache', 'Hair Loss', 'Weight Change', 'Behavioral', 'Other'];
    const selectedEffect = prompt('Select side effect to report on:\n\n' + 
      sideEffects.map((f, i) => `${i+1}. ${f}`).join('\n'));

    if (!selectedEffect) return null;

    const effectMap = Object.fromEntries(sideEffects.map((f, i) => [String(i+1), f]));
    const sideEffect = effectMap[selectedEffect];

    try {
      const response = await fetch(DEPLOYMENT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'getPatientsBySideEffect',
          sideEffect: sideEffect,
          phcFilter: document.getElementById('advancedPhcFilter')?.value || 'All'
        })
      });

      const result = await response.json();
      return {
        id: 'sideEffects',
        title: `Patients with ${sideEffect}`,
        filters: `Side Effects contains "${sideEffect}"`,
        columns: ['PatientID', 'PatientName', 'Phone', 'PHC', 'Age', 'SideEffect', 'CurrentMedicine', 'DateReported', 'ManagementPlan'],
        data: result.data || [],
        summary: result.summary || {}
      };
    } catch (error) {
      if (window.Logger) window.Logger.error('Error generating side effects report:', error);
      throw error;
    }
  }

  /**
   * Display the generated report in a modal/view
   */
  displayReport(reportData) {
    if (!reportData) return;

    this.currentReport = reportData;
    this.reportViewSettings.currentPage = 1;

    const viewContainer = document.getElementById('reportViewContainer');
    if (!viewContainer) return;

    let html = `
      <div class="report-view">
        <div class="report-header">
          <h3>${reportData.title}</h3>
          <p class="report-filters"><strong>Applied Filters:</strong> ${reportData.filters}</p>
          <p class="report-summary"><strong>Total Records:</strong> ${reportData.data.length}</p>
        </div>

        <div class="report-controls">
          <div class="report-search">
            <input type="text" id="reportSearchInput" placeholder="Search in results..." class="report-search-input">
          </div>
          <div class="report-export-buttons">
            <button class="btn-export-csv" data-report-id="${reportData.id}">Export as CSV</button>
            <button class="btn-export-excel" data-report-id="${reportData.id}">Export as Excel</button>
            <button class="btn-export-pdf" data-report-id="${reportData.id}">Export as PDF</button>
          </div>
        </div>

        <div class="report-table-container">
          <table class="report-table" id="reportTable">
            <thead>
              <tr>
                ${reportData.columns.map(col => `
                  <th class="sortable" data-column="${col}">
                    ${this.formatColumnName(col)}
                    <span class="sort-indicator">⇅</span>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody id="reportTableBody">
              <!-- Populated by renderReportData -->
            </tbody>
          </table>
        </div>

        <div class="report-pagination">
          <button class="btn-prev-page" id="prevPageBtn" disabled>← Previous</button>
          <span id="pageIndicator">Page 1 of X</span>
          <button class="btn-next-page" id="nextPageBtn">Next →</button>
        </div>
      </div>
    `;

    viewContainer.innerHTML = html;
    // Show the report container
    viewContainer.style.display = 'block';
    this.renderReportData();
    this.setupReportEventHandlers();
  }

  /**
   * Render report data table with pagination
   */
  renderReportData(filteredData = null) {
    if (!this.currentReport) return;

    let data = filteredData || this.currentReport.data;
    const { itemsPerPage, currentPage } = this.reportViewSettings;

    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    const pageData = data.slice(startIdx, endIdx);

    const tbody = document.getElementById('reportTableBody');
    if (!tbody) return;

    tbody.innerHTML = pageData.map((row, idx) => {
      let rowHtml = '<tr>';
      this.currentReport.columns.forEach(col => {
        const value = row[col] || '';
        rowHtml += `<td>${this.formatCellValue(value, col)}</td>`;
      });
      rowHtml += '</tr>';
      return rowHtml;
    }).join('');

    // Update pagination
    const totalPages = Math.ceil(data.length / itemsPerPage);
    const pageIndicator = document.getElementById('pageIndicator');
    if (pageIndicator) {
      pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
  }

  /**
   * Setup event handlers for report view
   */
  setupReportEventHandlers() {
    // Search functionality
    const searchInput = document.getElementById('reportSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = this.currentReport.data.filter(row => {
          return this.currentReport.columns.some(col => {
            const value = String(row[col] || '').toLowerCase();
            return value.includes(term);
          });
        });
        this.reportViewSettings.currentPage = 1;
        this.renderReportData(filtered);
      });
    }

    // Pagination
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
      if (this.reportViewSettings.currentPage > 1) {
        this.reportViewSettings.currentPage--;
        this.renderReportData();
      }
    });

    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
      this.reportViewSettings.currentPage++;
      this.renderReportData();
    });

    // Export buttons
    document.querySelectorAll('.btn-export-csv').forEach(btn => {
      btn.addEventListener('click', () => this.exportReport('csv'));
    });
    document.querySelectorAll('.btn-export-excel').forEach(btn => {
      btn.addEventListener('click', () => this.exportReport('excel'));
    });
    document.querySelectorAll('.btn-export-pdf').forEach(btn => {
      btn.addEventListener('click', () => this.exportReport('pdf'));
    });

    // Sorting
    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', (e) => {
        const column = e.currentTarget.dataset.column;
        this.sortReportData(column);
      });
    });
  }

  /**
   * Sort report data by column
   */
  sortReportData(column) {
    const { sortBy, sortAsc } = this.reportViewSettings;

    if (sortBy === column) {
      this.reportViewSettings.sortAsc = !sortAsc;
    } else {
      this.reportViewSettings.sortBy = column;
      this.reportViewSettings.sortAsc = true;
    }

    const data = [...this.currentReport.data];
    data.sort((a, b) => {
      let aVal = a[column];
      let bVal = b[column];

      // Handle numeric values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return this.reportViewSettings.sortAsc ? aVal - bVal : bVal - aVal;
      }

      // Handle string values
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();

      if (this.reportViewSettings.sortAsc) {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });

    this.currentReport.data = data;
    this.reportViewSettings.currentPage = 1;
    this.renderReportData();
  }

  /**
   * Export report data in specified format
   */
  async exportReport(format) {
    if (!this.currentReport) return;

    if (window.ExportHandlers) {
      await window.ExportHandlers.exportList(this.currentReport, format);
    } else {
      alert('Export handlers not loaded. Please refresh the page.');
    }
  }

  /**
   * Format column name for display
   */
  formatColumnName(col) {
    return col
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Format cell value for display
   */
  formatCellValue(value, column) {
    if (!value) return '-';
    if (typeof value === 'number') return value.toFixed(2);
    return String(value);
  }

  /**
   * Show loading state for report generation
   */
  showReportLoading(reportId) {
    const container = document.getElementById('reportViewContainer');
    if (container) {
      container.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Generating report...</p>
        </div>
      `;
      // Show the report container
      container.style.display = 'block';
    }
  }

  /**
   * Generate a custom filtered list from query builder
   */
  async generateCustomFilteredList(filterObj) {
    this.showReportLoading('custom');

    try {
      const response = await fetch(DEPLOYMENT_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: 'executeCustomFilter',
          filters: filterObj
        })
      });

      const result = await response.json();

      const reportData = {
        id: 'customFilter',
        title: 'Custom Filtered Report',
        filters: this.buildFilterDescription(filterObj),
        columns: result.columns || ['PatientID', 'PatientName', 'PHC'],
        data: result.data || [],
        summary: result.summary || {}
      };

      this.displayReport(reportData);
    } catch (error) {
      if (window.Logger) window.Logger.error('Error generating custom filtered report:', error);
      alert(`Error: ${error.message}`);
    }
  }

  /**
   * Build human-readable filter description
   */
  buildFilterDescription(filterObj) {
    const conditions = filterObj.conditions
      .map(c => `${c.field} ${c.operator} ${c.value}`)
      .join(` ${filterObj.logic} `);
    return `Custom Filters: ${conditions}`;
  }

  /**
   * Setup initial report view handlers
   */
  setupReportViewHandlers() {
    // Can be extended for additional interactions
  }
}

// Export for use in other modules
window.CustomReports = new CustomReports();
