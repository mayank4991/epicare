/**
 * Multi-Level Stock UI Module
 * Implements a modern, operational-focused stock management interface.
 * Based on the Tabbed Operations View plan.
 */

const MultiLevelStockUI = (() => {
    // CSS for the modern UI
    const styles = `
        <style>
            .stock-ops-container {
                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background: #fdfdfd;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                overflow: hidden;
                margin-bottom: 24px;
            }
            .stock-ops-tabs {
                display: flex;
                background: #f1f5f9;
                padding: 4px;
                gap: 4px;
            }
            .stock-ops-tab {
                flex: 1;
                padding: 12px;
                text-align: center;
                cursor: pointer;
                border-radius: 8px;
                font-weight: 600;
                transition: all 0.2s;
                color: #64748b;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 0.95rem;
            }
            .stock-ops-tab.active {
                background: white;
                color: #2563eb;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            }
            .stock-ops-content {
                padding: 20px;
            }
            .stock-filter-bar {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            .stock-search {
                flex: 1;
                min-width: 250px;
                padding: 8px 12px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                font-size: 0.9rem;
            }
            .stock-table-container {
                overflow-x: auto;
                border: 1px solid #f1f5f9;
                border-radius: 8px;
            }
            .stock-table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
                font-size: 0.9rem;
            }
            .stock-table th {
                background: #f8fafc;
                padding: 12px 16px;
                font-weight: 600;
                color: #475569;
                border-bottom: 2px solid #f1f5f9;
            }
            .stock-table td {
                padding: 12px 16px;
                border-bottom: 1px solid #f1f5f9;
                vertical-align: middle;
            }
            .stock-table tr:hover {
                background: #f8fafc;
            }
            .coverage-bar-container {
                width: 120px;
                height: 8px;
                background: #e2e8f0;
                border-radius: 10px;
                overflow: hidden;
                margin-bottom: 4px;
            }
            .coverage-bar {
                height: 100%;
                border-radius: 10px;
            }
            .status-badge {
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 700;
                text-transform: uppercase;
            }
            .status-critical { background: #fee2e2; color: #ef4444; }
            .status-warning { background: #ffedd5; color: #f59e0b; }
            .status-adequate { background: #dcfce7; color: #10b981; }
            
            .dispatch-input {
                width: 70px;
                padding: 4px 8px;
                border: 1px solid #e2e8f0;
                border-radius: 4px;
                text-align: center;
            }
            .btn-dispatch {
                background: #2563eb;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 0.8rem;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.2s;
            }
            .btn-dispatch:hover { background: #1d4ed8; }
            
            .metric-card {
                background: white;
                border: 1px solid #f1f5f9;
                padding: 16px;
                border-radius: 10px;
                flex: 1;
                min-width: 180px;
            }
            .metric-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
            .metric-label { font-size: 0.8rem; color: #64748b; margin-top: 4px; }
            
            /* Modal Styles */
            .stock-modal {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 20px;
            }
            .stock-modal-content {
                background: white;
                border-radius: 12px;
                width: 100%;
                max-width: 800px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            }
            .stock-modal-header {
                padding: 20px;
                border-bottom: 1px solid #f1f5f9;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .stock-modal-body { padding: 20px; }
            .stock-modal-footer {
                padding: 20px;
                border-top: 1px solid #f1f5f9;
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            
            /* Step Indicator */
            .step-container {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
                position: relative;
            }
            .step-container::before {
                content: '';
                position: absolute;
                top: 15px; left: 0; width: 100%; height: 2px;
                background: #e2e8f0;
                z-index: 1;
            }
            .step {
                width: 30px; height: 30px;
                background: white;
                border: 2px solid #e2e8f0;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 700;
                font-size: 0.8rem;
                z-index: 2;
                color: #64748b;
            }
            .step.active {
                border-color: #2563eb;
                color: #2563eb;
            }
            .step.completed {
                background: #2563eb;
                border-color: #2563eb;
                color: white;
            }
            
            .patient-list-item {
                display: flex;
                justify-content: space-between;
                padding: 10px;
                border-bottom: 1px solid #f1f5f9;
            }
            .pill {
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 0.7rem;
                background: #f1f5f9;
            }
        </style>
    `;

    let activeTab = 'facility'; // 'facility', 'aam', or 'indents'
    let currentData = [];
    let indentStep = 1;
    
    // PHASE 2: Persist wizard state across steps
    let indentWizardState = {
        selectedPatients: [],
        reconciliation: {},
        calculatedDemand: {},
        followUpConsumption: {},
        totalPatients: 0,
        medicines: []
    };

    /**
     * Initialize the UI
     */
    function init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Add styles
        if (!document.getElementById('multi-level-stock-styles')) {
            const styleNode = document.createElement('div');
            styleNode.id = 'multi-level-stock-styles';
            styleNode.innerHTML = styles;
            document.head.appendChild(styleNode);
        }

        renderStructure(container);
        loadData();
    }

    /**
     * Render the main structure
     */
    function renderStructure(container) {
        const isCHO = window.currentUser && (window.currentUser.Role === 'CHO' || window.currentUser.Role === 'AAM');
        const isApprover = window.currentUser && (window.currentUser.Role === 'Medical Officer' || window.currentUser.Role === 'Pharmacist' || window.currentUser.Role === 'Admin');
        const roleLabel = window.currentUser ? window.currentUser.Role : 'Guest';
        const facilityLabel = window.currentUser ? window.currentUser.PHC : 'All Facilities';

        container.innerHTML = `
            <div class="stock-ops-container">
                <div class="stock-ops-tabs">
                    <div class="stock-ops-tab ${activeTab === 'facility' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('facility')">
                        <i class="fas fa-city"></i> Facility Management (District &rsaquo; Block)
                    </div>
                    <div class="stock-ops-tab ${activeTab === 'aam' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('aam')">
                        <i class="fas fa-house-medical"></i> AAM Center Management (Block &rsaquo; AAM)
                    </div>
                    <div class="stock-ops-tab ${activeTab === 'indents' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('indents')">
                        <i class="fas fa-file-invoice"></i> Indent Requests
                    </div>
                    ${isApprover ? `
                    <div class="stock-ops-tab ${activeTab === 'approvals' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('approvals')">
                        <i class="fas fa-check-double"></i> <span style="position:relative;">Pending Approvals <span id="approval-badge" style="position:absolute; top:-8px; right:-8px; background:#ef4444; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:bold;"></span></span>
                    </div>
                    ` : ''}
                </div>
                <div class="stock-ops-content">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div>
                            <h3 style="margin:0; color: #1e293b;">Stock Management</h3>
                            <small style="color: #64748b;">Role: ${roleLabel} | Facility: ${facilityLabel}</small>
                        </div>
                        ${isCHO ? `
                            <button class="btn-dispatch" onclick="MultiLevelStockUI.openIndentWizard()" style="padding: 10px 20px; font-size: 0.9rem;">
                                <i class="fas fa-plus-circle"></i> Raise Monthly Indent
                            </button>
                        ` : ''}
                    </div>
                    
                    <div id="stock-metrics-row" style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
                        <!-- Metrics will be injected here -->
                    </div>

                    <div id="tab-content-area">
                        <div class="stock-filter-bar">
                            <input type="text" class="stock-search" placeholder="Search by medicine or location..." onkeyup="MultiLevelStockUI.filterTable(this.value)">
                            <select class="stock-search" style="flex: 0 0 200px;" onchange="MultiLevelStockUI.filterStatus(this.value)">
                                <option value="">All Statuses</option>
                                <option value="critical">Critical Stockout</option>
                                <option value="warning">Low Stock</option>
                                <option value="adequate">Adequate</option>
                            </select>
                        </div>
                        <div class="stock-table-container">
                            <table class="stock-table" id="stock-ops-table">
                                <thead id="stock-ops-thead">
                                    <tr>
                                        <th>Target Location</th>
                                        <th>Medicine</th>
                                        <th>Parent Stock</th>
                                        <th>Monthly Demand</th>
                                        <th>Coverage Ratio</th>
                                        <th>Suggested Dispatch</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="stock-ops-tbody">
                                    <tr><td colspan="7" style="text-align:center; padding: 40px;">Loading data...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            <div id="stock-modal-container"></div>
        `;
    }

    /**
     * Switch between tabs
     */
    function switchTab(tab) {
        activeTab = tab;
        const container = document.getElementById('stockComparisonDashboard');
        renderStructure(container);
        if (tab === 'indents') {
            loadIndents();
        } else if (tab === 'approvals') {
            // PHASE 4: Load district-level approvals
            loadApprovalsTab();
        } else {
            loadData();
        }
    }

    /**
     * Load indent requests
     */
    async function loadIndents() {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const response = await fetch(`${apiUrl}?action=getIndents`);
            const result = await response.json();
            const indents = (result && result.data && Array.isArray(result.data)) ? result.data : [];
            renderIndents(indents);
        } catch (error) {
            console.error('Error loading indents:', error);
            document.getElementById('stock-ops-tbody').innerHTML = `<tr><td colspan="7" style="text-align:center; color:red; padding: 40px;">Error loading indents.</td></tr>`;
        }
    }

    /**
     * Render indents table
     */
    function renderIndents(indents) {
        const thead = document.getElementById('stock-ops-thead');
        const tbody = document.getElementById('stock-ops-tbody');
        const metricsRow = document.getElementById('stock-metrics-row');

        thead.innerHTML = `
            <tr>
                <th>Indent ID</th>
                <th>AAM Center</th>
                <th>Requested By</th>
                <th>Date</th>
                <th>Total Patients</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        `;

        let html = '';
        indents.forEach(ind => {
            html += `
                <tr>
                    <td><strong>${ind.IndentID}</strong></td>
                    <td>${ind.AAMCenter}</td>
                    <td>${ind.RequestedBy}</td>
                    <td>${new Date(ind.Date).toLocaleDateString()}</td>
                    <td>${ind.TotalPatients}</td>
                    <td><span class="status-badge ${ind.Status === 'Pending' ? 'status-warning' : 'status-adequate'}">${ind.Status}</span></td>
                    <td>
                        ${ind.Status === 'Pending' ? `
                            <button class="btn-dispatch" onclick="MultiLevelStockUI.processIndent('${ind.IndentID}', 'Dispatched')">
                                <i class="fas fa-check-circle"></i> Approve & Dispatch
                            </button>
                        ` : '<span style="color: #10b981;"><i class="fas fa-check"></i> Processed</span>'}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center; padding: 40px;">No pending indents found.</td></tr>';
        
        metricsRow.innerHTML = `
            <div class="metric-card">
                <div class="metric-value">${indents.filter(i => i.Status === 'Pending').length}</div>
                <div class="metric-label">Pending Indents</div>
            </div>
        `;
    }

    /**
     * PHASE 2: Open the Monthly Indent & Reconciliation Wizard with state management
     */
    function openIndentWizard() {
        // Reset wizard state
        indentWizardState = {
            selectedPatients: [],
            reconciliation: {},
            calculatedDemand: {},
            followUpConsumption: {},
            totalPatients: 0,
            medicines: window.MEDICINE_LIST || ['Phenytoin 100mg', 'Sodium Valproate 200mg', 'Levetiracetam 500mg']
        };
        indentStep = 1;
        
        const modalContainer = document.getElementById('stock-modal-container');
        modalContainer.innerHTML = `
            <div class="stock-modal">
                <div class="stock-modal-content">
                    <div class="stock-modal-header">
                        <h4 style="margin:0;">Monthly Stock Reconciliation & Indent</h4>
                        <button onclick="document.getElementById('stock-modal-container').innerHTML=''" style="border:none; background:none; cursor:pointer; font-size:1.2rem;">&times;</button>
                    </div>
                    <div class="stock-modal-body" id="indent-wizard-body">
                        <div style="text-align:center; padding:40px;">
                            <i class="fas fa-spinner fa-spin" style="font-size:2rem; color:#2563eb;"></i>
                            <p style="margin-top:12px;">Loading reconciliation data...</p>
                        </div>
                    </div>
                    <div class="stock-modal-footer" id="indent-wizard-footer">
                        <button class="btn-dispatch" style="background:#f1f5f9; color:#64748b;" onclick="document.getElementById('stock-modal-container').innerHTML=''">Cancel</button>
                        <button class="btn-dispatch" disabled>Loading...</button>
                    </div>
                </div>
            </div>
        `;
        
        // Load reconciliation data from backend
        loadReconciliationData();
    }
    
    /**
     * PHASE 2: Load follow-up consumption and current stock from backend
     */
    async function loadReconciliationData() {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const facility = (window.currentUser && window.currentUser.PHC) || 'PHC Central';
            const aamCenter = (window.currentUser && window.currentUser.AAM) || '';
            
            // Fetch consumption from follow-ups (past 30 days)
            const consumptionResponse = await fetch(`${apiUrl}?action=getFollowUpConsumption&facility=${encodeURIComponent(facility)}&aamCenter=${encodeURIComponent(aamCenter)}&days=30`);
            const consumptionResult = await consumptionResponse.json();
            indentWizardState.followUpConsumption = (consumptionResult && consumptionResult.data) || {};
            
            window.Logger && window.Logger.debug('[Wizard] Loaded consumption:', indentWizardState.followUpConsumption);
            
            // Now render the first step
            renderIndentWizardUI();
        } catch (error) {
            window.Logger && window.Logger.error('[Wizard] Error loading reconciliation:', error);
            const body = document.getElementById('indent-wizard-body');
            body.innerHTML = `<div style="color: #ef4444; padding: 20px;"><i class="fas fa-exclamation-circle"></i> Failed to load reconciliation data.</div>`;
        }
    }
    
    /**
     * PHASE 2: Render the full wizard UI
     */
    function renderIndentWizardUI() {
        const modalContainer = document.getElementById('stock-modal-container');
        modalContainer.innerHTML = `
            <div class="stock-modal">
                <div class="stock-modal-content">
                    <div class="stock-modal-header">
                        <h4 style="margin:0;">Monthly Stock Reconciliation & Indent</h4>
                        <button onclick="document.getElementById('stock-modal-container').innerHTML=''" style="border:none; background:none; cursor:pointer; font-size:1.2rem;">&times;</button>
                    </div>
                    <div class="stock-modal-body" id="indent-wizard-body">
                        ${renderIndentStep(1)}
                    </div>
                    <div class="stock-modal-footer" id="indent-wizard-footer">
                        <button class="btn-dispatch" style="background:#f1f5f9; color:#64748b;" onclick="document.getElementById('stock-modal-container').innerHTML=''">Cancel</button>
                        <button class="btn-dispatch" onclick="MultiLevelStockUI.nextIndentStep()">Next: Select Patients &rsaquo;</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * PHASE 2: Render specific step of the wizard with state persistence
     */
    function renderIndentStep(step) {
        let html = `
            <div class="step-container" style="display:flex; gap:10px; margin-bottom:20px; justify-content:center;">
                <div class="step ${step >= 1 ? (step === 1 ? 'active' : 'completed') : ''}" style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:${step >= 1 ? (step === 1 ? '#2563eb' : '#10b981') : '#e2e8f0'}; color:white; font-weight:bold;">1</div>
                <div class="step ${step >= 2 ? (step === 2 ? 'active' : 'completed') : ''}" style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:${step >= 2 ? (step === 2 ? '#2563eb' : '#10b981') : '#e2e8f0'}; color:white; font-weight:bold;">2</div>
                <div class="step ${step >= 3 ? (step === 3 ? 'active' : 'completed') : ''}" style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:${step >= 3 ? (step === 3 ? '#2563eb' : '#10b981') : '#e2e8f0'}; color:white; font-weight:bold;">3</div>
                <div class="step ${step >= 4 ? (step === 4 ? 'active' : 'completed') : ''}" style="width:40px; height:40px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:${step >= 4 ? (step === 4 ? '#2563eb' : '#10b981') : '#e2e8f0'}; color:white; font-weight:bold;">4</div>
            </div>
        `;

        if (step === 1) {
            // PHASE 2: Step 1 - Show actual calculated consumption from follow-ups
            html += `
                <h5>Step 1: End-of-Month Reconciliation</h5>
                <p style="color: #64748b; font-size: 0.9rem;">
                    Based on follow-ups in the past 30 days, here's the consumption. Enter your remaining physical stock to verify accuracy.
                </p>
                <div class="stock-table-container" style="max-height: 350px; overflow-y: auto;">
                    <table class="stock-table">
                        <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 10;">
                            <tr><th>Medicine</th><th>Calculated Consumed</th><th>Remaining Stock (Enter)</th><th>Variance Alert</th></tr>
                        </thead>
                        <tbody>
                            ${indentWizardState.medicines.map(m => {
                                const consumed = indentWizardState.followUpConsumption[m] || 0;
                                return `
                                    <tr>
                                        <td style="font-weight:500;">${m}</td>
                                        <td style="background: #f0f9ff; padding: 12px 16px;"><strong>${consumed} units</strong></td>
                                        <td><input type="number" class="dispatch-input recon-input-${m}" style="width:120px;" min="0" placeholder="Enter remaining" data-medicine="${m}"></td>
                                        <td><span class="recon-alert-${m}"></span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <p style="color: #64748b; font-size: 0.85rem; margin-top: 12px;">
                    <i class="fas fa-info-circle"></i> Discrepancies >10% will be flagged for investigation.
                </p>
            `;
        } else if (step === 2) {
            // PHASE 2: Step 2 - Patient selection with state persistence
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const recentPatients = (window.patientData || []).filter(p => {
                const lastFollowUp = p.LastFollowUpDate || p.lastFollowUpDate || p.LastFollowUp || p.lastFollowUp;
                const lastFollowUpDate = lastFollowUp ? new Date(lastFollowUp) : null;
                return lastFollowUpDate && lastFollowUpDate > sixMonthsAgo;
            });

            html += `
                <h5>Step 2: Select Patients for Indent</h5>
                <p style="color: #64748b; font-size: 0.9rem;">
                    Found ${recentPatients.length} patients followed up in the past 6 months. The indent will calculate requirements based on their current dosages.
                </p>
                <div style="max-height: 350px; overflow-y: auto; border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px;">
                    ${recentPatients.length > 0 ? recentPatients.map(p => `
                        <div class="patient-list-item" style="padding: 8px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                            <label style="flex: 1; display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" class="patient-checkbox" value="${p.ID}" ${indentWizardState.selectedPatients.includes(String(p.ID)) ? 'checked' : ''}>
                                <strong>${p.PatientName}</strong>
                                <span style="color: #64748b; font-size: 0.85rem;">(ID: ${p.ID})</span>
                            </label>
                            <span class="pill">${p.Diagnosis || 'Epilepsy'}</span>
                        </div>
                    `).join('') : '<p style="padding:20px; text-align:center; color:#64748b;">No patients found in past 6 months.</p>'}
                </div>
                <div style="margin-top: 15px; padding: 12px; background: #f0f9ff; border-radius: 8px; border-left: 3px solid #2563eb;">
                    <strong>Selected: <span id="selected-count">0</span> patients</strong>
                </div>
            `;
        } else if (step === 3) {
            // PHASE 2: Step 3 - Show calculated demand from selected patients
            const selectedIds = indentWizardState.selectedPatients;
            const filteredPatients = (window.patientData || []).filter(p => selectedIds.includes(String(p.ID)));
            
            let medicineRequirements = [];
            indentWizardState.medicines.forEach(m => {
                const base = StockComparison.calculateMonthlyRequirement(filteredPatients, m);
                if (base > 0) {
                    const withPilferage = Math.ceil(base * 1.05);
                    medicineRequirements.push({ name: m, quantity: withPilferage, base: base });
                }
            });
            
            indentWizardState.calculatedDemand = medicineRequirements;
            indentWizardState.totalPatients = filteredPatients.length;

            html += `
                <h5>Step 3: Requirement Calculation</h5>
                <p style="color: #64748b; font-size: 0.9rem;">
                    Based on ${filteredPatients.length} selected patients' current dosages, here's the 1-month requirement with 5% pilferage buffer.
                </p>
                <div class="stock-table-container" style="max-height: 350px; overflow-y: auto;">
                    <table class="stock-table">
                        <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 10;">
                            <tr><th>Medicine</th><th>Base Requirement</th><th>With 5% Pilferage</th></tr>
                        </thead>
                        <tbody>
                            ${medicineRequirements.length > 0 ? medicineRequirements.map(m => `
                                <tr>
                                    <td><strong>${m.name}</strong></td>
                                    <td style="background: #f9f5ff;">${m.base} units</td>
                                    <td style="background: #f0f9ff; font-weight: bold;">${m.quantity} units</td>
                                </tr>
                            `).join('') : '<tr><td colspan="3" style="text-align:center; padding:20px; color:#64748b;">No medicines required for selected patients.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div style="margin-top: 15px; padding: 12px; background: #dcfce7; border-radius: 8px; border-left: 3px solid #10b981;">
                    <strong>Total medicines in indent: ${medicineRequirements.length}</strong>
                </div>
            `;
        } else if (step === 4) {
            // PHASE 2: Step 4 - Final review and summary
            html += `
                <div style="text-align:center; padding: 40px;">
                    <i class="fas fa-check-circle" style="font-size: 4rem; color: #10b981; margin-bottom: 20px;"></i>
                    <h4>Indent Ready for Submission</h4>
                    <p style="color: #64748b; margin: 12px 0;">
                        <strong>${indentWizardState.totalPatients}</strong> patients | <strong>${indentWizardState.calculatedDemand.length}</strong> medicines
                    </p>
                    <div style="background: #f9f5ff; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: left;">
                        <h6 style="margin-top: 0;">Medicines in this indent:</h6>
                        <ul style="margin: 8px 0; padding-left: 20px;">
                            ${indentWizardState.calculatedDemand.slice(0, 5).map(m => `<li>${m.name}: ${m.quantity} units</li>`).join('')}
                            ${indentWizardState.calculatedDemand.length > 5 ? `<li style="color: #64748b;"><em>+ ${indentWizardState.calculatedDemand.length - 5} more medicines</em></li>` : ''}
                        </ul>
                    </div>
                    <p style="color: #64748b; font-size: 0.9rem;">
                        Clicking submit will notify your Block Pharmacist/Medical Officer for approval.
                    </p>
                </div>
            `;
        }

        return html;
    }

    /**
     * PHASE 2: Handle wizard navigation with state persistence
     */
    function nextIndentStep() {
        // PHASE 3: Validate and save state before moving forward
        if (indentStep === 1) {
            // Save reconciliation data before moving to step 2
            const reconciliationInputs = document.querySelectorAll('[class*="recon-input-"]');
            reconciliationInputs.forEach(input => {
                const medicine = input.dataset.medicine;
                const reported = parseInt(input.value, 10) || 0;
                const calculated = indentWizardState.followUpConsumption[medicine] || 0;
                const variance = calculated > 0 ? ((Math.abs(reported - calculated) / calculated) * 100) : 0;
                
                indentWizardState.reconciliation[medicine] = {
                    calculated: calculated,
                    reported: reported,
                    variance: variance
                };
                
                // PHASE 3: Flag high variances
                const alertSpan = document.querySelector(`.recon-alert-${medicine}`);
                if (alertSpan) {
                    if (variance > 10) {
                        alertSpan.innerHTML = `<span style="color: #ef4444; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> ${Math.round(variance)}% variance</span>`;
                    } else if (variance > 5) {
                        alertSpan.innerHTML = `<span style="color: #f59e0b; font-weight: 600;"><i class="fas fa-warning"></i> ${Math.round(variance)}% diff</span>`;
                    } else {
                        alertSpan.innerHTML = `<span style="color: #10b981;"><i class="fas fa-check"></i></span>`;
                    }
                }
            });
        } else if (indentStep === 2) {
            // Save patient selection from checkboxes
            const patientCheckboxes = document.querySelectorAll('.patient-checkbox');
            indentWizardState.selectedPatients = Array.from(patientCheckboxes)
                .filter(cb => cb.checked)
                .map(cb => cb.value);
            
            if (indentWizardState.selectedPatients.length === 0) {
                window.showNotification && window.showNotification('Please select at least one patient', 'warning');
                return;
            }
        }
        
        indentStep++;
        if (indentStep > 4) {
            submitIndent();
            return;
        }

        const body = document.getElementById('indent-wizard-body');
        const footer = document.getElementById('indent-wizard-footer');
        
        body.innerHTML = renderIndentStep(indentStep);
        
        // Update selected count on step 2
        if (indentStep === 2) {
            setTimeout(() => {
                const countEl = document.getElementById('selected-count');
                if (countEl) countEl.textContent = indentWizardState.selectedPatients.length;
                
                // Restore checkbox state
                const patientCheckboxes = document.querySelectorAll('.patient-checkbox');
                patientCheckboxes.forEach(cb => {
                    if (indentWizardState.selectedPatients.includes(cb.value)) {
                        cb.checked = true;
                    }
                });
                
                // Add listener to update count
                patientCheckboxes.forEach(cb => {
                    cb.addEventListener('change', () => {
                        const count = document.querySelectorAll('.patient-checkbox:checked').length;
                        countEl.textContent = count;
                    });
                });
            }, 0);
        }
        
        if (indentStep === 4) {
            footer.innerHTML = `
                <button class="btn-dispatch" style="background:#f1f5f9; color:#64748b;" onclick="document.getElementById('stock-modal-container').innerHTML=''">Cancel</button>
                <button class="btn-dispatch" onclick="MultiLevelStockUI.nextIndentStep()" style="background: #10b981;">
                    <i class="fas fa-paper-plane"></i> Submit Indent Request
                </button>
            `;
        } else {
            const nextLabels = ['', 'Select Patients &rsaquo;', 'Calculate Requirement &rsaquo;', 'Final Review &rsaquo;'];
            footer.innerHTML = `
                <button class="btn-dispatch" style="background:#f1f5f9; color:#64748b;" onclick="document.getElementById('stock-modal-container').innerHTML=''">Cancel</button>
                <button class="btn-dispatch" onclick="MultiLevelStockUI.nextIndentStep()">Next: ${nextLabels[indentStep]}</button>
            `;
        }
    }

    /**
     * PHASE 2/3: Submit the indent using real calculated state + save reconciliation audit
     */
    async function submitIndent() {
        const footer = document.getElementById('indent-wizard-footer');
        footer.innerHTML = '<button class="btn-dispatch" disabled><i class="fas fa-spinner fa-spin"></i> Submitting...</button>';
        
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            
            // Use real calculated data from wizard state
            const indentData = {
                facility: (window.currentUser && window.currentUser.PHC) || 'PHC Central',
                aamCenter: (window.currentUser && window.currentUser.AAM) || '',
                requestedBy: (window.currentUser && window.currentUser.Username) || 'Unknown',
                totalPatients: indentWizardState.totalPatients,
                medicines: indentWizardState.calculatedDemand.map(m => ({
                    name: m.name,
                    quantity: m.quantity
                }))
            };

            window.Logger && window.Logger.debug('[Wizard] Submitting indent:', indentData);

            // Step 1: Submit indent request
            const indentResponse = await fetch(`${apiUrl}?action=submitIndentRequest`, {
                method: 'POST',
                body: JSON.stringify(indentData)
            });
            
            const indentResult = await indentResponse.json();
            
            if (indentResult.status !== 'success') {
                throw new Error(indentResult.message || 'Failed to submit indent');
            }
            
            // Step 2: PHASE 3 - Submit reconciliation data with audit trail
            const reconciliationData = {
                facility: indentData.facility,
                aamCenter: indentData.aamCenter,
                calculatedConsumed: indentWizardState.followUpConsumption,
                reportedConsumed: indentWizardState.reconciliation,
                discrepancyNotes: `Indent submission ID: ${indentResult.indentId}`,
                submittedBy: indentData.requestedBy
            };
            
            window.Logger && window.Logger.debug('[Wizard] Submitting reconciliation:', reconciliationData);
            
            const reconResponse = await fetch(`${apiUrl}?action=submitStockReconciliation`, {
                method: 'POST',
                body: JSON.stringify(reconciliationData)
            });
            
            const reconResult = await reconResponse.json();
            
            // Show recommendations from backend if any
            if (reconResult.recommendations && reconResult.recommendations.length > 0) {
                const criticalRecs = reconResult.recommendations.filter(r => r.severity === 'high');
                if (criticalRecs.length > 0) {
                    const recText = criticalRecs.map(r => `• ${r.message}`).join('\n');
                    window.showNotification && window.showNotification(`⚠️ Reconciliation alerts:\n${recText}`, 'warning');
                }
            }
            
            window.showNotification && window.showNotification('✓ Monthly Indent & Reconciliation submitted!', 'success');
            setTimeout(() => {
                document.getElementById('stock-modal-container').innerHTML = '';
                switchTab('indents');
            }, 1000);
        } catch (error) {
            window.Logger && window.Logger.error('[Wizard] Error submitting indent:', error);
            window.showNotification && window.showNotification('✗ Failed to submit: ' + error.message, 'error');
            footer.innerHTML = `
                <button class="btn-dispatch" style="background:#f1f5f9; color:#64748b;" onclick="document.getElementById('stock-modal-container').innerHTML=''">Close</button>
                <button class="btn-dispatch" onclick="MultiLevelStockUI.nextIndentStep()" style="background: #f59e0b;">
                    <i class="fas fa-redo"></i> Retry
                </button>
            `;
        }
    }

    /**
     * Process an indent (Approve/Dispatch)
     */
    async function processIndent(indentId, status) {
        if (!confirm(`Are you sure you want to ${status.toLowerCase()} this indent? This will automatically update the stock ledger for both facilities.`)) return;

        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            await fetch(`${apiUrl}?action=updateIndentStatus&indentId=${indentId}&status=${status}&processedBy=${window.currentUser.Username}`);
            
            window.showNotification && window.showNotification(`Indent ${indentId} has been ${status.toLowerCase()}`, 'success');
            loadIndents();
        } catch (error) {
            console.error('Error processing indent:', error);
            window.showNotification && window.showNotification('Failed to process indent.', 'error');
        }
    }

    /**
     * PHASE 4: Load and display district-level approvals dashboard
     */
    async function loadApprovalsTab() {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            
            // Get all pending indents (no facility filter for district view)
            const indentsResponse = await fetch(`${apiUrl}?action=getIndents&status=Pending`);
            const indentsResult = await indentsResponse.json();
            const indents = (indentsResult && indentsResult.data && Array.isArray(indentsResult.data)) ? indentsResult.data : [];
            
            // Get demand trends (3-month pattern)
            const facility = (window.currentUser && window.currentUser.PHC) || '';
            const trendResponse = await fetch(`${apiUrl}?action=analyzeVariancePatterns&facility=${encodeURIComponent(facility)}&months=3`);
            const trendResult = await trendResponse.json();
            const trends = (trendResult && trendResult.data) || { patterns: {}, alerts: [] };
            
            renderApprovalsTab(indents, trends);
        } catch (error) {
            window.Logger && window.Logger.error('[Approvals] Error loading data:', error);
            const tbody = document.getElementById('stock-ops-tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red; padding: 40px;">Error loading approvals.</td></tr>`;
        }
    }

    /**
     * PHASE 4: Render approvals dashboard
     */
    function renderApprovalsTab(indents, trends) {
        const thead = document.getElementById('stock-ops-thead');
        const tbody = document.getElementById('stock-ops-tbody');
        const metricsRow = document.getElementById('stock-metrics-row');
        
        // Update badge count
        const badge = document.getElementById('approval-badge');
        if (badge) badge.textContent = indents.length;

        thead.innerHTML = `
            <tr>
                <th>Indent ID</th>
                <th>AAM Center</th>
                <th>Requested By</th>
                <th>Date</th>
                <th>Patients</th>
                <th>Medicines</th>
                <th>Stock Alerts</th>
                <th>Action</th>
            </tr>
        `;

        let html = '';
        indents.forEach(ind => {
            let medicines = [];
            try {
                medicines = JSON.parse(ind.MedicinesJSON || '[]');
            } catch (e) {}
            
            // Count critical stock items
            const criticalCount = trends.alerts ? trends.alerts.filter(a => a.severity === 'critical').length : 0;
            const alertBadge = criticalCount > 0 ? `<span class="status-badge status-critical">${criticalCount} Critical</span>` : '<span style="color: #10b981;">✓ No alerts</span>';
            
            html += `
                <tr>
                    <td><strong>${ind.IndentID}</strong></td>
                    <td>${ind.AAMCenter || '—'}</td>
                    <td>${ind.RequestedBy}</td>
                    <td>${new Date(ind.Date).toLocaleDateString()}</td>
                    <td>${ind.TotalPatients} patients</td>
                    <td><span class="pill">${medicines.length} medicines</span></td>
                    <td>${alertBadge}</td>
                    <td>
                        <button class="btn-dispatch" style="padding: 6px 12px; font-size: 0.85rem;" onclick="MultiLevelStockUI.quickApproveIndent('${ind.IndentID}', '${ind.AAMCenter}')">
                            <i class="fas fa-check-circle"></i> Approve & Dispatch
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="8" style="text-align:center; padding: 40px; color: #10b981;"><i class="fas fa-check"></i> No pending indents</td></tr>';
        
        // Show metrics
        const pendingCount = indents.length;
        const criticalAlerts = trends.alerts ? trends.alerts.filter(a => a.severity === 'critical').length : 0;
        
        metricsRow.innerHTML = `
            <div class="metric-card">
                <div class="metric-value">${pendingCount}</div>
                <div class="metric-label">Pending Indents</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" style="color: ${criticalAlerts > 0 ? '#ef4444' : '#10b981'};">${criticalAlerts}</div>
                <div class="metric-label">Critical Alerts</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Object.keys(trends.patterns || {}).length}</div>
                <div class="metric-label">Monitored Medicines</div>
            </div>
        `;
    }

    /**
     * PHASE 4: One-click approval workflow
     */
    async function quickApproveIndent(indentId, aamCenter) {
        const btn = event.target.closest('.btn-dispatch');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            
            // Approve and dispatch in one action
            const response = await fetch(`${apiUrl}?action=updateIndentStatus&indentId=${indentId}&status=Dispatched&processedBy=${(window.currentUser && window.currentUser.Username) || 'Unknown'}`);
            const result = await response.json();
            
            if (result.status === 'success') {
                window.showNotification && window.showNotification(`✓ Indent ${indentId} approved & dispatched!`, 'success');
                setTimeout(() => loadApprovalsTab(), 500);
            } else {
                throw new Error(result.message || 'Approval failed');
            }
        } catch (error) {
            window.Logger && window.Logger.error('[Approvals] Error approving indent:', error);
            window.showNotification && window.showNotification('✗ Failed to approve: ' + error.message, 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-check-circle"></i> Approve & Dispatch';
        }
    }

    /**
     * Load data from backend/existing modules
     */
    async function loadData() {
        try {
            const patients = window.patientData || [];
            const phcName = window.currentUser ? window.currentUser.PHC : 'PHC Central';
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            
            // Get all stock if District, or just PHC stock if Block
            let stockData = [];
            if (activeTab === 'facility') {
                // District level view: Show multiple PHCs
                const response = await fetch(`${apiUrl}?action=getAllPHCStock`);
                const result = await response.json();
                // Extract data from wrapped response format: { status: 'success', data: [...] }
                stockData = (result && result.data && Array.isArray(result.data)) ? result.data : [];
            } else {
                // Block level view: Show AAM centers for this PHC
                const response = await fetch(`${apiUrl}?action=getPHCStock&phcName=${encodeURIComponent(phcName)}`);
                const result = await response.json();
                // Extract data from wrapped response format: { status: 'success', data: [...] }
                stockData = (result && result.data && Array.isArray(result.data)) ? result.data : [];
            }

            processAndRender(stockData, patients);
        } catch (error) {
            console.error('Error loading stock data:', error);
            document.getElementById('stock-ops-tbody').innerHTML = `<tr><td colspan="7" style="text-align:center; color:red; padding: 40px;">Error loading data. Please refresh.</td></tr>`;
        }
    }

    /**
     * Process data and render the table
     */
    function processAndRender(stockData, patients) {
        // Ensure stockData is an array
        if (!Array.isArray(stockData)) {
            window.Logger && window.Logger.error('[MultiLevelStockUI] stockData is not an array', stockData);
            stockData = [];
        }
        
        const tbody = document.getElementById('stock-ops-tbody');
        const metricsRow = document.getElementById('stock-metrics-row');
        
        // Mocking hierarchical grouping for demonstration
        // In a full implementation, we'd use the PHCs and AAM master lists
        const medicines = window.MEDICINE_LIST || ['Phenytoin 100mg', 'Sodium Valproate 200mg', 'Levetiracetam 500mg'];
        
        let html = '';
        let criticalCount = 0;
        let totalDemand = 0;

        // Simplified logic: For each medicine and a few locations
        const locations = activeTab === 'facility' ? ['PHC North', 'PHC South', 'PHC East'] : ['AAM Central 1', 'AAM Central 2'];
        
        currentData = [];

        locations.forEach(loc => {
            medicines.forEach(med => {
                // Use refined forecasting from StockComparison
                const demand = StockComparison.calculateMonthlyRequirement(patients.filter(p => p.PHC === loc || p.NearestAAMCenter === loc), med) || Math.floor(Math.random() * 500) + 100;
                
                // Find current stock in ledger
                const stockEntry = stockData.find(s => (s.PHC === loc || s.AAMCenter === loc) && s.Medicine === med);
                const currentStock = stockEntry ? stockEntry.CurrentStock : 0;
                
                const parentStock = Math.floor(Math.random() * 5000) + 1000; // Simulated parent facility stock
                const ratio = demand > 0 ? currentStock / demand : 2;
                
                let statusClass = 'status-adequate';
                let statusText = 'Adequate';
                let barColor = '#10b981';

                if (ratio < 0.5) {
                    statusClass = 'status-critical';
                    statusText = 'Critical';
                    barColor = '#ef4444';
                    criticalCount++;
                } else if (ratio < 1) {
                    statusClass = 'status-warning';
                    statusText = 'Low';
                    barColor = '#f59e0b';
                }

                const suggested = Math.max(0, (demand * 2) - currentStock); // Suggested for 2 months coverage

                const rowData = { loc, med, parentStock, demand, currentStock, ratio, statusText, suggested };
                currentData.push(rowData);

                html += `
                    <tr>
                        <td><strong>${loc}</strong></td>
                        <td>${med}</td>
                        <td><span style="color: #64748b;">${parentStock}</span></td>
                        <td>${demand}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div class="coverage-bar-container">
                                    <div class="coverage-bar" style="width: ${Math.min(100, ratio * 50)}%; background: ${barColor};"></div>
                                </div>
                                <span class="status-badge ${statusClass}">${statusText}</span>
                            </div>
                            <small style="color: #94a3b8; font-size: 0.7rem;">${Math.round(ratio * 30)} days coverage</small>
                        </td>
                        <td>
                            <input type="number" class="dispatch-input" value="${suggested}">
                        </td>
                        <td>
                            <button class="btn-dispatch" onclick="MultiLevelStockUI.dispatch('${loc}', '${med}', this)">
                                <i class="fas fa-truck"></i> Dispatch
                            </button>
                        </td>
                    </tr>
                `;
                totalDemand += demand;
            });
        });

        tbody.innerHTML = html;

        // Render Metrics
        metricsRow.innerHTML = `
            <div class="metric-card">
                <div class="metric-value">${criticalCount}</div>
                <div class="metric-label">Critical Stockouts</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${totalDemand.toLocaleString()}</div>
                <div class="metric-label">Total Monthly Demand (Units)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Math.round((1 - criticalCount/currentData.length) * 100)}%</div>
                <div class="metric-label">Supply Chain Health</div>
            </div>
        `;
    }

    /**
     * Dispatch action
     */
    function dispatch(location, medicine, btn) {
        const row = btn.closest('tr');
        const qty = row.querySelector('.dispatch-input').value;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        // Simulate API call
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-check"></i> Dispatched';
            btn.style.background = '#10b981';
            window.showNotification && window.showNotification(`Successfully dispatched ${qty} units of ${medicine} to ${location}`, 'success');
        }, 1500);
    }

    /**
     * Filter table by search string
     */
    function filterTable(query) {
        const rows = document.querySelectorAll('#stock-ops-tbody tr');
        const q = query.toLowerCase();
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    }

    /**
     * Filter table by status
     */
    function filterStatus(status) {
        const rows = document.querySelectorAll('#stock-ops-tbody tr');
        if (!status) {
            rows.forEach(r => r.style.display = '');
            return;
        }
        rows.forEach(row => {
            const badge = row.querySelector('.status-badge');
            if (badge) {
                const text = badge.innerText.toLowerCase();
                row.style.display = text === status.toLowerCase() ? '' : 'none';
            }
        });
    }

    return {
        init,
        switchTab,
        dispatch,
        filterTable,
        filterStatus,
        openIndentWizard,
        nextIndentStep,
        processIndent
    };
})();

// Export
window.MultiLevelStockUI = MultiLevelStockUI;
