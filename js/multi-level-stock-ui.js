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

            /* Mobile-First Enhancements */
            @media (max-width: 768px) {
                .stock-ops-tabs { display: none; } /* Use bottom nav on mobile */
                .stock-ops-content { padding: 12px; padding-bottom: 80px; }
                .metric-card { min-width: 140px; }
            }

            .bottom-nav {
                position: fixed;
                bottom: 0; left: 0; width: 100%;
                background: white;
                display: flex;
                justify-content: space-around;
                padding: 10px 0;
                box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
                z-index: 100;
                border-top: 1px solid #f1f5f9;
            }
            .nav-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                color: #94a3b8;
                font-size: 0.75rem;
                cursor: pointer;
            }
            .nav-item.active { color: #2563eb; }
            .nav-item i { font-size: 1.2rem; }

            .radial-gauge {
                width: 100px; height: 100px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                position: relative;
                background: conic-gradient(#10b981 var(--p), #f1f5f9 0);
            }
            .radial-gauge::before {
                content: '';
                position: absolute;
                width: 80px; height: 80px;
                background: white;
                border-radius: 50%;
            }
            .gauge-value {
                position: relative;
                font-size: 1.2rem;
                font-weight: 700;
                color: #1e293b;
            }

            .next-action-card {
                background: linear-gradient(135deg, #1d4ed8, #2563eb);
                color: white;
                padding: 20px;
                border-radius: 16px;
                margin-bottom: 24px;
                display: flex;
                align-items: center;
                gap: 16px;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
            }
            .action-icon {
                width: 50px; height: 50px;
                background: rgba(255,255,255,0.2);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
            }

            .timeline {
                position: relative;
                padding-left: 30px;
                margin-top: 20px;
            }
            .timeline::before {
                content: '';
                position: absolute;
                left: 10px; top: 0; width: 2px; height: 100%;
                background: #e2e8f0;
            }
            .timeline-item {
                position: relative;
                margin-bottom: 20px;
                padding-bottom: 10px;
            }
            .timeline-dot {
                position: absolute;
                left: -25px; top: 2px;
                width: 12px; height: 12px;
                border-radius: 50%;
                background: #e2e8f0;
                border: 2px solid white;
                z-index: 2;
            }
            .timeline-item.active .timeline-dot { background: #2563eb; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1); }
            .timeline-item.completed .timeline-dot { background: #10b981; }
            .timeline-content { font-size: 0.85rem; }
            .timeline-title { font-weight: 600; color: #1e293b; margin-bottom: 2px; }
            .timeline-desc { color: #64748b; font-size: 0.75rem; }
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

    function getCurrentUserContext() {
        const currentUser = window.currentUser || {};
        const role = String(currentUser.Role || window.currentUserRole || '').trim();
        const normalizedRole = role.toLowerCase();
        const username = String(currentUser.Username || window.currentUserName || '').trim();
        const phc = String(currentUser.PHC || window.currentUserPHC || window.currentUserAssignedPHC || '').trim();
        const aamCenter = String(currentUser.AAM || currentUser.AAMCenter || window.currentUserAAM || '').trim();

        return {
            currentUser,
            role,
            normalizedRole,
            username,
            phc,
            aamCenter,
            phcMoEmail: currentUser.PHC_MO_Email || currentUser.PhcMoEmail || ''
        };
    }

    function getRoleFlags() {
        const userContext = getCurrentUserContext();
        const role = userContext.normalizedRole;

        const isMasterAdmin = role === 'master_admin' || role === 'admin' || role === 'administrator';
        const isPHC = role === 'phc_admin' || role === 'medical officer' || role === 'pharmacist';
        const isCHO = role === 'phc' || role === 'cho' || role === 'aam' || role === 'facility_staff';

        return {
            ...userContext,
            isCHO,
            isPHC,
            isMasterAdmin,
            isApprover: isPHC || isMasterAdmin
        };
    }

    function ensureActiveTabForRole() {
        const { isCHO, isPHC, isMasterAdmin } = getRoleFlags();
        const allowedTabs = new Set(
            isCHO
                ? ['cho-indent', 'cho-history']
                : isPHC
                    ? ['phc-requests', 'facility']
                    : isMasterAdmin
                        ? ['admin-dashboard', 'facility']
                        : ['facility', 'aam', 'indents', 'approvals']
        );

        if (!allowedTabs.has(activeTab)) {
            activeTab = isCHO ? 'cho-indent' : isPHC ? 'phc-requests' : isMasterAdmin ? 'admin-dashboard' : 'facility';
        }
    }

    function loadActiveTabData() {
        if (activeTab === 'indents') {
            loadIndents();
        } else if (activeTab === 'approvals') {
            loadApprovalsTab();
        } else if (activeTab === 'cho-indent') {
            loadCHOIndentDashboard();
        } else if (activeTab === 'cho-history') {
            loadCHOIndentHistory();
        } else if (activeTab === 'phc-requests') {
            loadPHCIndentRequests();
        } else if (activeTab === 'admin-dashboard') {
            loadAdminIndentDashboard();
        } else {
            loadData();
        }
    }

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

        ensureActiveTabForRole();
        renderStructure(container);
        loadActiveTabData();
    }

    /**
     * Render the main structure
     */
    function renderStructure(container) {
        const { isCHO, isPHC, isMasterAdmin, role, phc } = getRoleFlags();
        const roleLabel = role || 'Guest';
        const facilityLabel = phc || 'All Facilities';

        container.innerHTML = `
            <div class="stock-ops-container">
                <div class="stock-ops-tabs">
                    ${isCHO ? `
                        <!-- CHO-specific tabs -->
                        <div class="stock-ops-tab ${activeTab === 'cho-indent' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('cho-indent')" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; border:none;">
                            <i class="fas fa-file-invoice"></i> <strong>Monthly Indent</strong> <span style="position:absolute; top:-8px; right:-8px; background:#ef4444; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:bold;" id="cho-indent-badge"></span>
                        </div>
                        <div class="stock-ops-tab ${activeTab === 'cho-history' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('cho-history')">
                            <i class="fas fa-history"></i> My Indent History
                        </div>
                    ` : ''}
                    ${isPHC ? `
                        <!-- PHC-specific tabs -->
                        <div class="stock-ops-tab ${activeTab === 'phc-requests' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('phc-requests')" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color:white; border:none;">
                            <i class="fas fa-inbox"></i> <strong>CHO Indent Requests</strong> <span style="position:absolute; top:-8px; right:-8px; background:#ef4444; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:bold;" id="phc-requests-badge"></span>
                        </div>
                        <div class="stock-ops-tab ${activeTab === 'facility' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('facility')">
                            <i class="fas fa-city"></i> Facility Management
                        </div>
                    ` : ''}
                    ${isMasterAdmin ? `
                        <!-- Master Admin tabs -->
                        <div class="stock-ops-tab ${activeTab === 'admin-dashboard' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('admin-dashboard')" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color:white; border:none;">
                            <i class="fas fa-chart-bar"></i> <strong>Indent Overview</strong>
                        </div>
                        <div class="stock-ops-tab ${activeTab === 'facility' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('facility')">
                            <i class="fas fa-city"></i> Facility Management
                        </div>
                    ` : ''}
                    ${!isCHO && !isPHC && !isMasterAdmin ? `
                        <div class="stock-ops-tab ${activeTab === 'facility' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('facility')">
                            <i class="fas fa-city"></i> Facility Management (District › Block)
                        </div>
                        <div class="stock-ops-tab ${activeTab === 'aam' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('aam')">
                            <i class="fas fa-house-medical"></i> AAM Center Management (Block › AAM)
                        </div>
                    ` : ''}
                </div>
                <div class="stock-ops-content">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
                        <div>
                            <h3 style="margin:0; color: #1e293b;">
                                ${isCHO ? '📋 Monthly Indent Request' : isPHC ? '📥 CHO Indent Requests' : isMasterAdmin ? '📊 District Indent Overview' : 'Stock Management'}
                            </h3>
                            <small style="color: #64748b;">Role: ${roleLabel} | Facility: ${facilityLabel}</small>
                        </div>
                        ${isCHO && activeTab === 'cho-indent' ? `
                            <button class="btn-dispatch" onclick="MultiLevelStockUI.openIndentWizard()" style="padding: 10px 20px; font-size: 0.9rem; background: linear-gradient(135deg, #667eea, #764ba2);">
                                <i class="fas fa-plus-circle"></i> Start Indent Process
                            </button>
                        ` : ''}
                    </div>
                    
                    ${isCHO && activeTab === 'cho-indent' ? `
                        <!-- CHO Indent Dashboard with Next Action Card -->
                        <div id="cho-next-action-container"></div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            <div class="metric-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white;">
                                <div class="metric-value" id="cho-pending-count">0</div>
                                <div class="metric-label">Pending Requests</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color:white;">
                                <div class="metric-value" id="cho-approved-count">0</div>
                                <div class="metric-label">Approved This Month</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color:white;">
                                <div class="metric-value" id="cho-next-due">
                                    ${new Date().getDate() === 15 ? '🔔 TODAY' : new Date().getDate() > 15 && new Date().getDate() <= 21 ? '📋 Open' : 'On 15th'}
                                </div>
                                <div class="metric-label">Next Indent Due</div>
                            </div>
                        </div>

                        <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%); border-left: 4px solid #667eea; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                            <h5 style="margin: 0 0 10px 0; color: #667eea;">
                                <i class="fas fa-info-circle"></i> When to Raise Indent?
                            </h5>
                            <p style="margin: 0; color: #64748b; font-size: 0.9rem;">
                                Raise your monthly indent on the <strong>15th of each month</strong>. The system will help you:
                                <br/>✓ Verify medicines given to patients in past month (via follow-ups)
                                <br/>✓ Select patients requiring medicines for next month
                                <br/>✓ Auto-calculate requirements (with 5% safety buffer)
                                <br/>✓ Submit for PHC approval
                            </p>
                        </div>

                        <div id="cho-indent-list"></div>
                    ` : ''}

                    ${isPHC && activeTab === 'phc-requests' ? `
                        <!-- PHC Indent Requests Dashboard -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            <div class="metric-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color:white;">
                                <div class="metric-value" id="phc-total-pending">0</div>
                                <div class="metric-label">Pending from CHOs</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color:white;">
                                <div class="metric-value" id="phc-total-chos">0</div>
                                <div class="metric-label">CHOs Under This PHC</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color:white;">
                                <div class="metric-value" id="phc-total-medicines">0</div>
                                <div class="metric-label">Medicines in Requests</div>
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: #1e293b;">CHO Indent Requests from This PHC</h4>
                            <div id="phc-requests-list"></div>
                        </div>
                    ` : ''}

                    ${isMasterAdmin && activeTab === 'admin-dashboard' ? `
                        <!-- Master Admin Dashboard -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            <div class="metric-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color:white;">
                                <div class="metric-value" id="admin-total-indents">0</div>
                                <div class="metric-label">Total Indent Requests</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); color:white;">
                                <div class="metric-value" id="admin-pending-indents">0</div>
                                <div class="metric-label">Pending Approval</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color:white;">
                                <div class="metric-value" id="admin-total-phcs">0</div>
                                <div class="metric-label">PHCs Reporting</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%); color:white;">
                                <div class="metric-value" id="admin-total-chos">0</div>
                                <div class="metric-label">CHOs Requesting</div>
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <h4 style="margin: 0; color: #1e293b;">Monthly Indent Distribution by PHC</h4>
                                <button class="btn-dispatch" style="padding: 8px 16px; font-size: 0.9rem;" onclick="MultiLevelStockUI.exportIndentReport()">
                                    <i class="fas fa-download"></i> Export Report
                                </button>
                            </div>
                            <div id="admin-phc-breakdown"></div>
                        </div>
                    ` : ''}
                    
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
        ensureActiveTabForRole();
        renderStructure(container);
        loadActiveTabData();
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
            const { phc, aamCenter } = getCurrentUserContext();
            const facility = phc || 'PHC Central';
            
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
            // PHASE 2: Step 1 - Reconciliation with Predictive Variance Alerting
            html += `
                <h5>Step 1: End-of-Month Reconciliation</h5>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 12px;">
                    Based on follow-ups in the past 30 days, here's the consumption. Enter your remaining physical stock to verify accuracy.
                </p>

                <button class="btn-dispatch" style="width:100%; margin-bottom: 12px; background:#f8fafc; color:#2563eb; border:2px solid #2563eb;" onclick="MultiLevelStockUI.switchToQuickTallyMode()">
                    <i class="fas fa-mobile-alt"></i> Switch to Quick Tally Mode (Large Buttons)
                </button>

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
                    <i class="fas fa-info-circle"></i> Discrepancies >10% (red) or 5-10% (yellow) will be flagged for investigation.
                    <br/><i class="fas fa-lightbulb"></i> <strong>Tip:</strong> Consistent high variances suggest counting errors or unrecorded consumption.
                </p>
            `;
        } else if (step === 2) {
            // PHASE 2: Step 2 - Patient selection with RECENCY SORTING
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            let recentPatients = (window.patientData || []).filter(p => {
                const lastFollowUp = p.LastFollowUpDate || p.lastFollowUpDate || p.LastFollowUp || p.lastFollowUp;
                const lastFollowUpDate = lastFollowUp ? new Date(lastFollowUp) : null;
                return lastFollowUpDate && lastFollowUpDate > sixMonthsAgo;
            });

            // RECENCY SORTING: Sort by last follow-up date (most recent first)
            recentPatients.sort((a, b) => {
                const dateA = new Date(a.LastFollowUpDate || a.lastFollowUpDate || a.LastFollowUp || a.lastFollowUp || 0);
                const dateB = new Date(b.LastFollowUpDate || b.lastFollowUpDate || b.LastFollowUp || b.lastFollowUp || 0);
                return dateB - dateA;
            });

            // Highlight recent (last 30 days) vs older
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            html += `
                <h5>Step 2: Select Patients for Indent (Sorted by Recency)</h5>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 12px;">
                    Found ${recentPatients.length} patients followed up in the past 6 months (sorted by most recent first). 
                    <i class="fas fa-calendar-check"></i> <strong>Recent:</strong> Seen in last 30 days | <i class="fas fa-calendar"></i> <strong>Older:</strong> Earlier visits
                </p>
                <div style="max-height: 350px; overflow-y: auto; border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px;">
                    ${recentPatients.length > 0 ? recentPatients.map(p => {
                        const lastFollowUp = new Date(p.LastFollowUpDate || p.lastFollowUpDate || p.LastFollowUp || p.lastFollowUp || 0);
                        const isRecent = lastFollowUp > thirtyDaysAgo;
                        const daysAgo = Math.floor((Date.now() - lastFollowUp) / (1000 * 60 * 60 * 24));
                        
                        return `
                            <div class="patient-list-item" style="padding: 8px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: ${isRecent ? '#f0f9ff' : '#fff'};">
                                <label style="flex: 1; display: flex; align-items: center; gap: 8px;">
                                    <input type="checkbox" class="patient-checkbox" value="${p.ID}" ${indentWizardState.selectedPatients.includes(String(p.ID)) ? 'checked' : ''}>
                                    <strong>${p.PatientName}</strong>
                                    <span style="color: #64748b; font-size: 0.85rem;">(ID: ${p.ID})</span>
                                </label>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <span class="pill" style="background: ${isRecent ? '#dcfce7' : '#f1f5f9'}; color: ${isRecent ? '#10b981' : '#64748b'};">
                                        ${isRecent ? '📅 ' : ''}${daysAgo} days ago
                                    </span>
                                    <span class="pill">${p.Diagnosis || 'Epilepsy'}</span>
                                </div>
                            </div>
                        `;
                    }).join('') : '<p style="padding:20px; text-align:center; color:#64748b;">No patients found in past 6 months.</p>'}
                </div>
                <div style="margin-top: 15px; padding: 12px; background: #f0f9ff; border-radius: 8px; border-left: 3px solid #2563eb;">
                    <strong>Selected: <span id="selected-count">0</span> patients</strong> (Most recent at top for faster selection)
                </div>
            `;
        } else if (step === 3) {
            // PHASE 2: Step 3 - Requirement Calculation with PILFERAGE TRANSPARENCY
            const selectedIds = indentWizardState.selectedPatients;
            const filteredPatients = (window.patientData || []).filter(p => selectedIds.includes(String(p.ID)));
            
            let medicineRequirements = [];
            indentWizardState.medicines.forEach(m => {
                const base = StockComparison.calculateMonthlyRequirement(filteredPatients, m);
                if (base > 0) {
                    const withPilferage = Math.ceil(base * 1.05);
                    medicineRequirements.push({ name: m, quantity: withPilferage, base: base, pilferage: withPilferage - base });
                }
            });
            
            indentWizardState.calculatedDemand = medicineRequirements;
            indentWizardState.totalPatients = filteredPatients.length;

            html += `
                <h5>Step 3: Requirement Calculation with Safety Buffer</h5>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 12px;">
                    Based on ${filteredPatients.length} selected patients' current dosages, here's the 1-month requirement.
                    <br/>The <strong style="color: #f59e0b;">+5% buffer</strong> accounts for potential pilferage/wastage to ensure continuous supply.
                </p>
                <div class="stock-table-container" style="max-height: 350px; overflow-y: auto;">
                    <table class="stock-table">
                        <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 10;">
                            <tr>
                                <th>Medicine</th>
                                <th>Patients Needing</th>
                                <th style="background: #f0f9ff;">Base Requirement</th>
                                <th style="background: #fff8e6;"><i class="fas fa-shield-alt"></i> 5% Buffer</th>
                                <th style="background: #f0fdf4; font-weight: bold;">Final Order</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${medicineRequirements.length > 0 ? medicineRequirements.map(m => `
                                <tr>
                                    <td><strong>${m.name}</strong></td>
                                    <td>${filteredPatients.filter(p => p.CurrentMedicines && p.CurrentMedicines.includes(m.name)).length}</td>
                                    <td style="background: #f0f9ff;">${m.base} units</td>
                                    <td style="background: #fff8e6; color: #f59e0b; font-weight: bold;">+${m.pilferage} (${((m.pilferage / m.base) * 100).toFixed(0)}%)</td>
                                    <td style="background: #f0fdf4; font-weight: bold; font-size: 1.05rem; color: #10b981;">${m.quantity} units</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" style="padding: 20px; text-align: center; color: #64748b;"><i class="fas fa-exclamation-circle"></i> No medicine requirements calculated. Please go back and select patients.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                <div style="background: #f9fafb; padding: 12px; border-radius: 8px; border-left: 3px solid #f59e0b; margin-top: 12px; font-size: 0.85rem; color: #64748b;">
                    <strong>📋 Transparency Note:</strong> The 5% buffer is transparently shown above. Stakeholders can see the actual demand vs. the ordered quantity, ensuring accountability in supply chain management.
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
            const { phc, aamCenter, username, phcMoEmail } = getCurrentUserContext();
            
            // Use real calculated data from wizard state
            const indentData = {
                facility: phc || 'PHC Central',
                aamCenter: aamCenter || '',
                requestedBy: username || 'Unknown',
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
            
            // PHASE 2: Send email notification to Block Pharmacist
            if (phcMoEmail && indentResult.indentId) {
                const emailData = {
                    indentId: indentResult.indentId,
                    facility: indentData.facility,
                    totalPatients: indentData.totalPatients,
                    medicines: indentData.medicines,
                    submittedBy: indentData.requestedBy
                };
                await sendEmailNotification(indentResult.indentId, phcMoEmail, emailData, 'submission');
            }
            
            window.showNotification && window.showNotification('✓ Monthly Indent & Reconciliation submitted! Notification sent to Block Pharmacist.', 'success');
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
            const { username } = getCurrentUserContext();
            await fetch(`${apiUrl}?action=updateIndentStatus&indentId=${indentId}&status=${status}&processedBy=${encodeURIComponent(username || 'Unknown')}`);
            
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
            const { phc } = getCurrentUserContext();
            
            // Get all pending indents (no facility filter for district view)
            const indentsResponse = await fetch(`${apiUrl}?action=getIndents&status=Pending`);
            const indentsResult = await indentsResponse.json();
            const indents = (indentsResult && indentsResult.data && Array.isArray(indentsResult.data)) ? indentsResult.data : [];
            
            // Get demand trends (3-month pattern)
            const facility = phc || '';
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
            const { username } = getCurrentUserContext();
            
            // Approve and dispatch in one action
            const response = await fetch(`${apiUrl}?action=updateIndentStatus&indentId=${indentId}&status=Dispatched&processedBy=${encodeURIComponent(username || 'Unknown')}`);
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
            const { phc } = getCurrentUserContext();
            const phcName = phc || 'PHC Central';
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
     * CHO Dashboard: Load indent status and history
     */
    async function loadCHOIndentDashboard() {
        try {
            // Render Next Action Card
            const nextActionContainer = document.getElementById('cho-next-action-container');
            if (nextActionContainer) {
                nextActionContainer.innerHTML = renderNextActionCard();
            }

            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username, phc } = getCurrentUserContext();
            const choName = username || '';
            
            // Get all indents for this CHO
            const response = await fetch(`${apiUrl}?action=getIndents&status=&requestedBy=${encodeURIComponent(choName)}&facility=${encodeURIComponent(phc)}`);
            const result = await response.json();
            const indents = (result && result.data && Array.isArray(result.data)) ? result.data : [];
            
            const pending = indents.filter(i => i.Status === 'Pending').length;
            const approved = indents.filter(i => i.Status === 'Dispatched').length;
            
            // Update badges and counts
            document.getElementById('cho-pending-count').textContent = pending;
            document.getElementById('cho-approved-count').textContent = approved;
            
            // Render recent indents list
            const listHtml = indents.slice(0, 10).map(ind => {
                let medicines = [];
                try {
                    medicines = JSON.parse(ind.MedicinesJSON || '[]');
                } catch (e) {}
                
                const statusColor = {
                    'Pending': '#f59e0b',
                    'Dispatched': '#10b981',
                    'Rejected': '#ef4444'
                }[ind.Status] || '#64748b';
                
                return `
                    <div style="background: white; border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${ind.IndentID}</strong>
                            <br/>
                            <small style="color: #64748b;">
                                <i class="fas fa-calendar"></i> ${new Date(ind.Date).toLocaleDateString()} | 
                                <i class="fas fa-pills"></i> ${medicines.length || 0} medicines | 
                                <i class="fas fa-users"></i> ${ind.TotalPatients} patients
                            </small>
                        </div>
                        <div>
                            <span style="background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">
                                ${ind.Status}
                            </span>
                        </div>
                    </div>
                `;
            }).join('');
            
            document.getElementById('cho-indent-list').innerHTML = listHtml || '<p style="text-align: center; color: #64748b; padding: 20px;">No indent requests yet. Click "Start Indent Process" above to create one.</p>';
            
        } catch (error) {
            window.Logger && window.Logger.error('[CHO Dashboard] Error loading data:', error);
            document.getElementById('cho-indent-list').innerHTML = `<p style="color: red; padding: 20px;">Error loading indent history.</p>`;
        }
    }

    /**
     * CHO History: Show all past indents with timeline lifecycle
     */
    async function loadCHOIndentHistory() {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username, phc } = getCurrentUserContext();
            const choName = username || '';
            
            const response = await fetch(`${apiUrl}?action=getIndents&requestedBy=${encodeURIComponent(choName)}&facility=${encodeURIComponent(phc)}`);
            const result = await response.json();
            const indents = (result && result.data && Array.isArray(result.data)) ? result.data : [];
            
            // Render as timeline cards instead of table
            let html = '';
            indents.forEach((ind, idx) => {
                let medicines = [];
                try {
                    medicines = JSON.parse(ind.MedicinesJSON || '[]');
                } catch (e) {}
                
                const statusColor = {
                    'Pending': '#f59e0b',
                    'Dispatched': '#10b981',
                    'Rejected': '#ef4444'
                }[ind.Status] || '#64748b';
                
                html += `
                    <div style="background: white; border: 1px solid #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                            <div>
                                <h4 style="margin: 0 0 4px 0; color: #1e293b;">${ind.IndentID}</h4>
                                <small style="color: #64748b;">
                                    <i class="fas fa-calendar-alt"></i> Raised: ${new Date(ind.Date).toLocaleDateString()} | 
                                    <i class="fas fa-pills"></i> ${medicines.length} medicines | 
                                    <i class="fas fa-users"></i> ${ind.TotalPatients} patients
                                </small>
                            </div>
                            <span style="background: ${statusColor}; color: white; padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">
                                ${ind.Status}
                            </span>
                        </div>

                        ${renderIndentTimeline(ind)}

                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 0.85rem; color: #64748b;">
                            <strong>Medicines:</strong> ${medicines.slice(0, 3).map(m => m.name || m).join(', ')}${medicines.length > 3 ? ` +${medicines.length - 3} more` : ''}
                        </div>
                    </div>
                `;
            });
            
            const contentArea = document.getElementById('tab-content-area');
            if (contentArea) {
                contentArea.innerHTML = html || '<p style="text-align: center; color: #64748b; padding: 40px;"><i class="fas fa-inbox"></i> No indent history yet.</p>';
            } else {
                // Fallback for direct table rendering
                const thead = document.getElementById('stock-ops-thead');
                const tbody = document.getElementById('stock-ops-tbody');
                
                if (!thead || !tbody) return;
                
                thead.innerHTML = `
                    <tr>
                        <th>Indent ID</th>
                        <th>Date</th>
                        <th>Patients</th>
                        <th>Medicines</th>
                        <th>Status</th>
                        <th>Timeline</th>
                    </tr>
                `;
                
                tbody.innerHTML = indents.length > 0 ? indents.map(ind => {
                    let medicines = [];
                    try {
                        medicines = JSON.parse(ind.MedicinesJSON || '[]');
                    } catch (e) {}
                    
                    const statusColor = {
                        'Pending': '#f59e0b',
                        'Dispatched': '#10b981',
                        'Rejected': '#ef4444'
                    }[ind.Status] || '#64748b';
                    
                    return `
                        <tr>
                            <td><strong>${ind.IndentID}</strong></td>
                            <td>${new Date(ind.Date).toLocaleDateString()}</td>
                            <td>${ind.TotalPatients}</td>
                            <td><span class="pill">${medicines.length} medicines</span></td>
                            <td><span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${ind.Status}</span></td>
                            <td><small>${ind.Status}</small></td>
                        </tr>
                    `;
                }).join('') : '<tr><td colspan="6" style="text-align:center; padding: 40px; color: #10b981;"><i class="fas fa-inbox"></i> No indent history yet.</td></tr>';
            }
            
        } catch (error) {
            window.Logger && window.Logger.error('[CHO History] Error loading data:', error);
            const tbody = document.getElementById('stock-ops-tbody');
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red; padding: 40px;">Error loading history.</td></tr>`;
        }
    }

    /**
     * PHC Dashboard: Show all CHO indent requests for this PHC
     */
    async function loadPHCIndentRequests() {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { phc } = getCurrentUserContext();
            
            const response = await fetch(`${apiUrl}?action=getIndents&facility=${encodeURIComponent(phc)}`);
            const result = await response.json();
            const indents = (result && result.data && Array.isArray(result.data)) ? result.data : [];
            
            // Calculate metrics
            const pending = indents.filter(i => i.Status === 'Pending').length;
            const uniqueCHOs = new Set(indents.map(i => i.RequestedBy)).size;
            let totalMedicines = 0;
            indents.forEach(ind => {
                try {
                    const medicines = JSON.parse(ind.MedicinesJSON || '[]');
                    totalMedicines += medicines.length;
                } catch (e) {}
            });
            
            document.getElementById('phc-total-pending').textContent = pending;
            document.getElementById('phc-total-chos').textContent = uniqueCHOs;
            document.getElementById('phc-total-medicines').textContent = totalMedicines;
            
            if (document.getElementById('phc-requests-badge')) {
                document.getElementById('phc-requests-badge').textContent = pending;
            }
            
            // Render table
            const thead = document.getElementById('stock-ops-thead');
            const tbody = document.getElementById('stock-ops-tbody');
            
            thead.innerHTML = `
                <tr>
                    <th>Indent ID</th>
                    <th>CHO Name</th>
                    <th>AAM Center</th>
                    <th>Date</th>
                    <th>Patients</th>
                    <th>Medicines</th>
                    <th>Status</th>
                    <th>Action</th>
                </tr>
            `;
            
            let html = '';
            indents.forEach(ind => {
                let medicines = [];
                try {
                    medicines = JSON.parse(ind.MedicinesJSON || '[]');
                } catch (e) {}
                
                const statusColor = {
                    'Pending': '#f59e0b',
                    'Dispatched': '#10b981',
                    'Rejected': '#ef4444'
                }[ind.Status] || '#64748b';
                
                html += `
                    <tr>
                        <td><strong>${ind.IndentID}</strong></td>
                        <td>${ind.RequestedBy}</td>
                        <td>${ind.AAMCenter || '—'}</td>
                        <td>${new Date(ind.Date).toLocaleDateString()}</td>
                        <td>${ind.TotalPatients}</td>
                        <td><span class="pill">${medicines.length} medicines</span></td>
                        <td><span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem;">${ind.Status}</span></td>
                        <td>
                            ${ind.Status === 'Pending' ? `
                                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                    <button class="btn-dispatch" style="padding: 4px 8px; font-size: 0.8rem;" onclick="MultiLevelStockUI.quickApproveIndent('${ind.IndentID}', '${ind.AAMCenter}')">
                                        <i class="fas fa-check"></i> Approve
                                    </button>
                                    <button class="btn-dispatch" style="padding: 4px 8px; font-size: 0.8rem; background: #f59e0b;" onclick="MultiLevelStockUI.showPartialDispatchModal('${ind.IndentID}', '${ind.RequestedBy}')">
                                        <i class="fas fa-box"></i> Partial
                                    </button>
                                    <button class="btn-dispatch" style="padding: 4px 8px; font-size: 0.8rem; background: #ef4444;" onclick="MultiLevelStockUI.showRejectModal('${ind.IndentID}', '${ind.RequestedBy}')">
                                        <i class="fas fa-times"></i> Reject
                                    </button>
                                </div>
                            ` : '<span style="color: #10b981;"><i class="fas fa-check"></i> Processed</span>'}
                        </td>
                    </tr>
                `;
            });
            
            tbody.innerHTML = html || '<tr><td colspan="8" style="text-align:center; padding: 40px; color: #10b981;"><i class="fas fa-check"></i> No pending indent requests from CHOs.</td></tr>';
            
        } catch (error) {
            window.Logger && window.Logger.error('[PHC Requests] Error:', error);
            document.getElementById('stock-ops-tbody').innerHTML = `<tr><td colspan="8" style="text-align:center; color:red; padding: 40px;">Error loading requests.</td></tr>`;
        }
    }

    /**
     * Master Admin Dashboard: Overall indent summary across all PHCs
     */
    async function loadAdminIndentDashboard() {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            
            const response = await fetch(`${apiUrl}?action=getIndents`);
            const result = await response.json();
            const allIndents = (result && result.data && Array.isArray(result.data)) ? result.data : [];
            
            // Calculate metrics
            const totalIndents = allIndents.length;
            const pending = allIndents.filter(i => i.Status === 'Pending').length;
            const uniquePHCs = new Set(allIndents.map(i => i.Facility)).size;
            const uniqueCHOs = new Set(allIndents.map(i => i.RequestedBy)).size;
            
            document.getElementById('admin-total-indents').textContent = totalIndents;
            document.getElementById('admin-pending-indents').textContent = pending;
            document.getElementById('admin-total-phcs').textContent = uniquePHCs;
            document.getElementById('admin-total-chos').textContent = uniqueCHOs;
            
            // Build PHC breakdown
            const phcBreakdown = {};
            allIndents.forEach(ind => {
                const phc = ind.Facility || 'Unknown';
                if (!phcBreakdown[phc]) {
                    phcBreakdown[phc] = { total: 0, pending: 0, approved: 0, medicines: 0 };
                }
                phcBreakdown[phc].total++;
                if (ind.Status === 'Pending') phcBreakdown[phc].pending++;
                if (ind.Status === 'Dispatched') phcBreakdown[phc].approved++;
                try {
                    const medicines = JSON.parse(ind.MedicinesJSON || '[]');
                    phcBreakdown[phc].medicines += medicines.length;
                } catch (e) {}
            });
            
            let breakdownHtml = '';
            Object.entries(phcBreakdown).forEach(([phc, stats]) => {
                breakdownHtml += `
                    <div style="background: linear-gradient(135deg, rgba(250, 112, 154, 0.1) 0%, rgba(254, 225, 64, 0.1) 100%); border-left: 4px solid #fa709a; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong>${phc}</strong>
                            <span style="background: #fa709a; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">${stats.total} requests</span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; font-size: 0.85rem;">
                            <div>
                                <span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${stats.pending}</span>
                                <br/><small style="color: #64748b;">Pending</small>
                            </div>
                            <div>
                                <span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${stats.approved}</span>
                                <br/><small style="color: #64748b;">Approved</small>
                            </div>
                            <div>
                                <span style="background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${stats.medicines}</span>
                                <br/><small style="color: #64748b;">Medicines</small>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            document.getElementById('admin-phc-breakdown').innerHTML = breakdownHtml || '<p style="text-align: center; color: #64748b;">No indent data yet.</p>';
            
        } catch (error) {
            window.Logger && window.Logger.error('[Admin Dashboard] Error:', error);
            document.getElementById('admin-phc-breakdown').innerHTML = `<p style="color: red;">Error loading dashboard data.</p>`;
        }
    }

    /**
     * Generate Dynamic Next Action Card based on role and date
     */
    function renderNextActionCard() {
        const { isCHO, isPHC, isMasterAdmin } = getRoleFlags();
        const today = new Date().getDate();
        
        let action = '', icon = '', bgGradient = '';
        
        if (isCHO) {
            if (today === 15) {
                action = '🔔 TODAY - Time to Tally & Indent - Complete your monthly reconciliation now';
                icon = '📋';
                bgGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            } else if (today > 15 && today <= 21) {
                action = '⏰ Indent Window Open - You have until the 21st to submit';
                icon = '⏰';
                bgGradient = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
            } else {
                action = '📊 Track Your Recent Indents - View approval status and next indent due on 15th';
                icon = '📊';
                bgGradient = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
            }
        } else if (isPHC) {
            action = '🔔 Check Pending Indents - Review & approve CHO requests (submitted 15th-21st)';
            icon = '🔔';
            bgGradient = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        } else if (isMasterAdmin) {
            action = '📈 Monitor District Performance - Track indent trends and CHO compliance (cycle: 15th-21st)';
            icon = '📈';
            bgGradient = 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)';
        }
        
        return `
            <div class="next-action-card" style="background: ${bgGradient};">
                <div class="action-icon">${icon}</div>
                <div>
                    <h4 style="margin: 0 0 4px 0; font-size: 1rem;">${action}</h4>
                    <p style="margin: 0; font-size: 0.85rem; opacity: 0.9;">Click below to proceed →</p>
                </div>
            </div>
        `;
    }

    /**
     * Render Supply Health Radial Gauge
     */
    function renderSupplyHealthGauge(percentage, label) {
        const clampedPercent = Math.min(100, Math.max(0, percentage));
        const color = clampedPercent >= 70 ? '#10b981' : clampedPercent >= 40 ? '#f59e0b' : '#ef4444';
        
        return `
            <div style="text-align: center;">
                <div class="radial-gauge" style="--p: ${clampedPercent}%; background: conic-gradient(${color} 0deg ${clampedPercent * 3.6}deg, #f1f5f9 0deg);">
                    <div style="position: absolute; width: 80px; height: 80px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
                        <div class="gauge-value">${Math.round(clampedPercent)}%</div>
                        <small style="font-size: 0.7rem; color: #64748b;">${label}</small>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render Quick Tally Mode for Mobile
     */
    function renderQuickTallyMode() {
        const medicines = indentWizardState.medicines || [];
        
        return `
            <div style="padding: 20px;">
                <h5 style="margin: 0 0 20px 0; text-align: center;">📱 Quick Tally Mode - Large Touch Buttons</h5>
                <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
                    ${medicines.map(m => {
                        const consumed = indentWizardState.followUpConsumption[m] || 0;
                        return `
                            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 2px solid #f1f5f9;">
                                <div style="font-weight: 600; margin-bottom: 8px;">${m}</div>
                                <div style="color: #64748b; margin-bottom: 12px;">Given: ${consumed} units</div>
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <button class="tally-btn-minus" data-medicine="${m}" style="flex: 0 0 50px; height: 50px; font-size: 1.5rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">−</button>
                                    <input type="number" class="quick-tally-input" data-medicine="${m}" min="0" style="flex: 1; padding: 12px; font-size: 1.1rem; text-align: center; border: 2px solid #e2e8f0; border-radius: 8px;" placeholder="0">
                                    <button class="tally-btn-plus" data-medicine="${m}" style="flex: 0 0 50px; height: 50px; font-size: 1.5rem; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">+</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <style>
                    .tally-btn-minus:active, .tally-btn-plus:active {
                        transform: scale(0.95);
                    }
                </style>
            </div>
        `;
    }

    /**
     * Render Indent Lifecycle Timeline
     */
    function renderIndentTimeline(indent) {
        const statuses = ['Raised', 'Approved', 'Dispatched', 'Received'];
        const currentStatusIndex = statuses.indexOf(indent.Status || 'Raised');
        
        return `
            <div class="timeline" style="margin: 20px 0;">
                ${statuses.map((status, idx) => {
                    const isCompleted = idx < currentStatusIndex;
                    const isActive = idx === currentStatusIndex;
                    const timestamp = idx === 0 ? new Date(indent.Date).toLocaleDateString() : 
                                     idx === 1 ? (indent.ApprovedDate ? new Date(indent.ApprovedDate).toLocaleDateString() : '—') :
                                     idx === 2 ? (indent.DispatchedDate ? new Date(indent.DispatchedDate).toLocaleDateString() : '—') : '—';
                    
                    return `
                        <div class="timeline-item ${isCompleted ? 'completed' : isActive ? 'active' : ''}">
                            <div class="timeline-dot"></div>
                            <div class="timeline-content">
                                <div class="timeline-title">${status}</div>
                                <div class="timeline-desc">${timestamp}</div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    /**
     * Show Reject Modal
     */
    function showRejectModal(indentId, choName) {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; box-shadow: 0 20px 25px rgba(0,0,0,0.15);">
                    <h4 style="margin: 0 0 16px 0; color: #ef4444;"><i class="fas fa-times-circle"></i> Reject Indent Request</h4>
                    <p style="color: #64748b; margin-bottom: 16px;">Rejecting indent <strong>${indentId}</strong> from <strong>${choName}</strong></p>
                    
                    <label style="display: block; margin-bottom: 12px; font-weight: 500;">Reason for Rejection:</label>
                    <textarea id="reject-reason" placeholder="e.g., Insufficient stock, Quality issues, etc." style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; resize: vertical; min-height: 80px; box-sizing: border-box;"></textarea>
                    
                    <div style="margin-top: 20px; display: flex; gap: 12px;">
                        <button class="btn-cancel" style="flex: 1;" onclick="this.closest('[style*=\"position: fixed\"]').remove()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button class="btn-dispatch" style="flex: 1; background: #ef4444;" onclick="MultiLevelStockUI.rejectIndent('${indentId}', document.getElementById('reject-reason').value)">
                            <i class="fas fa-check"></i> Confirm Rejection
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Show Partial Dispatch Modal
     */
    function showPartialDispatchModal(indentId, choName) {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; box-shadow: 0 20px 25px rgba(0,0,0,0.15);">
                    <h4 style="margin: 0 0 16px 0; color: #f59e0b;"><i class="fas fa-box"></i> Partial Dispatch</h4>
                    <p style="color: #64748b; margin-bottom: 16px;">Dispatch partial quantities for indent <strong>${indentId}</strong> from <strong>${choName}</strong></p>
                    
                    <label style="display: block; margin-bottom: 12px; font-weight: 500;">Dispatch Quantity Percentages:</label>
                    <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 12px;">Enter the percentage (0-100%) of requested quantity you can dispatch for each medicine.</p>
                    
                    <div id="partial-quantities" style="max-height: 200px; overflow-y: auto; margin-bottom: 16px; border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px;">
                        <p style="text-align: center; color: #cbd5e1;">Loading medicines...</p>
                    </div>
                    
                    <label style="display: block; margin-bottom: 12px; font-weight: 500;">Note:</label>
                    <textarea id="partial-note" placeholder="e.g., Remaining stock will be available next month" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; resize: vertical; min-height: 60px; box-sizing: border-box;"></textarea>
                    
                    <div style="margin-top: 20px; display: flex; gap: 12px;">
                        <button class="btn-cancel" style="flex: 1;" onclick="this.closest('[style*=\"position: fixed\"]').remove()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button class="btn-dispatch" style="flex: 1; background: #f59e0b;" onclick="MultiLevelStockUI.processPartialDispatch('${indentId}', document.getElementById('partial-note').value)">
                            <i class="fas fa-check"></i> Confirm Partial Dispatch
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // TODO: Load medicines and quantities from indent
        // For now, just show the modal structure
    }

    /**
     * Process Partial Dispatch
     */
    async function processPartialDispatch(indentId, note) {
        const percentages = {};
        document.querySelectorAll('.partial-medicine-input').forEach(input => {
            const medicine = input.dataset.medicine;
            const percentage = parseInt(input.value, 10) || 0;
            percentages[medicine] = percentage;
        });
        
        const hasPartial = Object.values(percentages).some(p => p > 0);
        if (!hasPartial) {
            window.showNotification && window.showNotification('Please enter at least one quantity', 'warning');
            return;
        }
        
        await partialDispatchIndent(indentId, percentages);
    }

    /**
     * Switch to Quick Tally Mode (from Step 1)
     */
    function switchToQuickTallyMode() {
        const wizardBody = document.getElementById('indent-wizard-body');
        if (!wizardBody) return;
        
        wizardBody.innerHTML = `
            <div style="padding: 20px; text-align: center; margin-bottom: 20px;">
                <button class="btn-dispatch" style="background: #f1f5f9; color: #2563eb; border: 1px solid #2563eb; margin-bottom: 20px;" onclick="MultiLevelStockUI.nextIndentStep(1)">
                    <i class="fas fa-arrow-left"></i> Back to Standard View
                </button>
            </div>
            ${renderQuickTallyMode()}
            <div style="margin-top: 20px; display: flex; gap: 12px;">
                <button class="btn-cancel" style="flex: 1;" onclick="MultiLevelStockUI.nextIndentStep(1)">
                    <i class="fas fa-times"></i> Back
                </button>
                <button class="btn-dispatch" style="flex: 1;" onclick="MultiLevelStockUI.saveQuickTallyData()">
                    <i class="fas fa-check"></i> Save Tallies & Continue
                </button>
            </div>
        `;
        
        activateQuickTallyMode();
    }

    /**
     * Save Quick Tally Mode data and move to next step
     */
    function saveQuickTallyData() {
        const inputs = document.querySelectorAll('.quick-tally-input');
        let hasData = false;
        
        inputs.forEach(input => {
            const medicine = input.dataset.medicine;
            const value = parseInt(input.value, 10) || 0;
            indentWizardState.reconciliation[medicine] = value;
            if (value > 0) hasData = true;
        });
        
        if (!hasData) {
            window.showNotification && window.showNotification('Please enter at least one tally value', 'warning');
            return;
        }
        
        window.showNotification && window.showNotification('✓ Reconciliation data saved', 'success');
        nextIndentStep(2);
    }

    /**
     * Activate Quick Tally Mode +/- buttons
     */
    function activateQuickTallyMode() {
        setTimeout(() => {
            const minusButtons = document.querySelectorAll('.tally-btn-minus');
            const plusButtons = document.querySelectorAll('.tally-btn-plus');
            
            minusButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const medicine = btn.dataset.medicine;
                    const input = document.querySelector(`.quick-tally-input[data-medicine="${medicine}"]`);
                    if (input) {
                        const currentVal = parseInt(input.value, 10) || 0;
                        input.value = Math.max(0, currentVal - 1);
                        input.style.background = '#fff8e6';
                        setTimeout(() => input.style.background = '', 300);
                    }
                });
            });
            
            plusButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const medicine = btn.dataset.medicine;
                    const input = document.querySelector(`.quick-tally-input[data-medicine="${medicine}"]`);
                    if (input) {
                        const currentVal = parseInt(input.value, 10) || 0;
                        input.value = currentVal + 1;
                        input.style.background = '#f0fdf4';
                        setTimeout(() => input.style.background = '', 300);
                    }
                });
            });
            
            window.Logger && window.Logger.debug('[Quick Tally] Buttons activated');
        }, 100);
    }

    /**
     * Send Email Notification (calls backend endpoint)
     */
    async function sendEmailNotification(indentId, recipientEmail, indentData, notificationType = 'submission') {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username } = getCurrentUserContext();
            
            const emailPayload = {
                recipientEmail: recipientEmail,
                indentId: indentId,
                indentData: indentData,
                notificationType: notificationType,  // 'submission', 'approval', 'rejection', 'partial_dispatch'
                timestamp: new Date().toISOString(),
                senderName: username || 'EpiCare System'
            };
            
            window.Logger && window.Logger.debug('[Email] Sending notification:', emailPayload);
            
            const response = await fetch(`${apiUrl}?action=sendEmailNotification`, {
                method: 'POST',
                body: JSON.stringify(emailPayload)
            });
            
            const result = await response.json();
            if (result.status === 'success') {
                window.Logger && window.Logger.debug('[Email] Notification sent successfully');
                return true;
            } else {
                window.Logger && window.Logger.warn('[Email] Notification send failed:', result.message);
                return false;
            }
        } catch (error) {
            window.Logger && window.Logger.error('[Email] Error sending notification:', error);
            return false;
        }
    }

    /**
     * Reject Indent (PHC function with feedback)
     */
    async function rejectIndent(indentId, feedbackReason) {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username } = getCurrentUserContext();
            
            if (!feedbackReason || feedbackReason.trim() === '') {
                window.showNotification && window.showNotification('Please provide a reason for rejection', 'error');
                return;
            }
            
            const rejectData = {
                indentId: indentId,
                status: 'Rejected',
                rejectionReason: feedbackReason,
                rejectedBy: username || 'Unknown',
                rejectedDate: new Date().toISOString()
            };
            
            const response = await fetch(`${apiUrl}?action=updateIndentStatus`, {
                method: 'POST',
                body: JSON.stringify(rejectData)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Send rejection email to CHO
                await sendEmailNotification(indentId, result.choEmail, rejectData, 'rejection');
                
                window.showNotification && window.showNotification(`✓ Indent rejected with feedback: "${feedbackReason}"`, 'success');
                setTimeout(() => location.reload(), 1500);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            window.Logger && window.Logger.error('[Reject] Error:', error);
            window.showNotification && window.showNotification('Failed to reject indent: ' + error.message, 'error');
        }
    }

    /**
     * Partial Dispatch (PHC partial approval)
     */
    async function partialDispatchIndent(indentId, medicineUpdates) {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username } = getCurrentUserContext();
            
            const partialData = {
                indentId: indentId,
                status: 'Partially Dispatched',
                medicineUpdates: medicineUpdates,  // { 'Phenytoin': 50, 'Sodium Valproate': 30 }
                dispatchedBy: username || 'Unknown',
                dispatchDate: new Date().toISOString(),
                note: 'Partial dispatch due to stock constraints'
            };
            
            const response = await fetch(`${apiUrl}?action=partialDispatchIndent`, {
                method: 'POST',
                body: JSON.stringify(partialData)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                // Send partial dispatch notification
                await sendEmailNotification(indentId, result.choEmail, partialData, 'partial_dispatch');
                
                window.showNotification && window.showNotification('✓ Partial dispatch completed. CHO notified of quantities.', 'success');
                setTimeout(() => location.reload(), 1500);
            }
        } catch (error) {
            window.Logger && window.Logger.error('[Partial Dispatch] Error:', error);
            window.showNotification && window.showNotification('Failed to dispatch partially: ' + error.message, 'error');
        }
    }

    /**
     * Export Indent Report to Excel
     */
    async function exportIndentReport(filters = {}) {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username } = getCurrentUserContext();
            
            const response = await fetch(`${apiUrl}?action=exportIndentReport`, {
                method: 'POST',
                body: JSON.stringify({
                    filters: filters,  // { dateFrom, dateTo, facility, status, etc }
                    exportedBy: username || 'Unknown'
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'success' && result.downloadUrl) {
                // Open download link
                window.open(result.downloadUrl, '_blank');
                window.showNotification && window.showNotification('✓ Report exported successfully', 'success');
                
                window.Logger && window.Logger.debug('[Export] Report downloaded:', result.fileName);
            } else {
                throw new Error(result.message || 'Export failed');
            }
        } catch (error) {
            window.Logger && window.Logger.error('[Export] Error:', error);
            window.showNotification && window.showNotification('Failed to export report: ' + error.message, 'error');
        }
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
        processIndent,
        quickApproveIndent,
        loadCHOIndentDashboard,
        loadCHOIndentHistory,
        loadPHCIndentRequests,
        loadAdminIndentDashboard,
        renderNextActionCard,
        renderSupplyHealthGauge,
        renderQuickTallyMode,
        renderIndentTimeline,
        switchToQuickTallyMode,
        saveQuickTallyData,
        activateQuickTallyMode,
        sendEmailNotification,
        rejectIndent,
        showRejectModal,
        partialDispatchIndent,
        showPartialDispatchModal,
        processPartialDispatch,
        exportIndentReport
    };
})();

// Export
window.MultiLevelStockUI = MultiLevelStockUI;
