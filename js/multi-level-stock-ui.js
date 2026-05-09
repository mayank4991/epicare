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
        </style>
    `;

    let activeTab = 'facility'; // 'facility' or 'aam'
    let currentData = [];

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
        container.innerHTML = `
            <div class="stock-ops-container">
                <div class="stock-ops-tabs">
                    <div class="stock-ops-tab ${activeTab === 'facility' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('facility')">
                        <i class="fas fa-city"></i> Facility Management (District &rsaquo; Block)
                    </div>
                    <div class="stock-ops-tab ${activeTab === 'aam' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('aam')">
                        <i class="fas fa-house-medical"></i> AAM Center Management (Block &rsaquo; AAM)
                    </div>
                </div>
                <div class="stock-ops-content">
                    <div id="stock-metrics-row" style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
                        <!-- Metrics will be injected here -->
                    </div>
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
                            <thead>
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
        `;
    }

    /**
     * Switch between tabs
     */
    function switchTab(tab) {
        activeTab = tab;
        const container = document.getElementById('stockComparisonDashboard');
        renderStructure(container);
        loadData();
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
                stockData = result || [];
            } else {
                // Block level view: Show AAM centers for this PHC
                const response = await fetch(`${apiUrl}?action=getPHCStock&phcName=${encodeURIComponent(phcName)}`);
                const result = await response.json();
                stockData = result || [];
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
        filterStatus
    };
})();

// Export
window.MultiLevelStockUI = MultiLevelStockUI;
