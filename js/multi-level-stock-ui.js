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

    // Full formulary fallback — matches ClinicalDecisionSupport.gs + procurement normalization
    const DEFAULT_MEDICINE_LIST = [
        'Carbamazepine 100mg', 'Carbamazepine 200mg', 'Carbamazepine 400mg', 'Carbamazepine Syrup',
        'Clobazam 5mg', 'Clobazam 10mg',
        'Levetiracetam 250mg', 'Levetiracetam 500mg', 'Levetiracetam Syrup',
        'Phenobarbitone 30mg', 'Phenobarbitone 60mg',
        'Phenytoin 100mg',
        'Sodium Valproate 200mg', 'Sodium Valproate 300mg', 'Sodium Valproate 500mg', 'Sodium Valproate Syrup'
    ];

    let activeTab = 'facility'; // 'facility', 'aam', 'indents', 'cho-indent', 'cho-history', 'phc-requests', 'phc-district-indent', 'admin-dashboard'
    let lastResolvedRole = '';
    let currentData = [];
    let indentStep = 1;
    // Tracks which PHC/CHO is expanded in the admin drill-down
    let adminDrilldownPHC = null;
    let adminDrilldownCHO = null;

    // PHASE 2: Persist wizard state across steps
    let indentWizardState = {
        selectedPatients: [],
        reconciliation: {},
        calculatedDemand: {},
        followUpConsumption: {},
        totalPatients: 0,
        medicines: []
    };

    // Cache of indent objects keyed by IndentID, populated when PHC request table renders
    const _indentDataCache = {};

    // PHC → District wizard state
    let districtWizardState = {
        selectedIndentIds: [],
        consolidatedMedicines: {},
        choIndents: []
    };

    function getIndentSelectionStorageKey() {
        const { username, phc, aamCenter } = getCurrentUserContext();
        return `epicare-indent-selection:${String(username || 'unknown').toLowerCase()}:${String(phc || 'all').toLowerCase()}:${String(aamCenter || 'all').toLowerCase()}`;
    }

    /**
     * Fetch the last indent submitted by the current user from backend
     * @return {Promise<Array>} Array of patient IDs from last indent, or empty array
     */
    async function fetchLastIndentPatients() {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username } = getCurrentUserContext();
            
            const response = await fetch(`${apiUrl}?action=getLastIndentForUser&username=${encodeURIComponent(username || '')}`);
            const result = await response.json();
            
            if (result && result.status === 'success' && result.patientIds && Array.isArray(result.patientIds)) {
                return result.patientIds.map(id => String(id));
            }
            return [];
        } catch (error) {
            window.Logger && window.Logger.debug('[Wizard] Could not fetch last indent from backend:', error);
            return [];
        }
    }

    function loadSavedIndentSelection() {
        try {
            // First, try to get from backend (last submitted indent)
            // For now, fall back to localStorage as it's synchronous
            const raw = localStorage.getItem(getIndentSelectionStorageKey());
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(id => String(id)) : [];
        } catch (e) {
            return [];
        }
    }

    function saveIndentSelection(patientIds) {
        try {
            const uniqueIds = Array.from(new Set((patientIds || []).map(id => String(id))));
            localStorage.setItem(getIndentSelectionStorageKey(), JSON.stringify(uniqueIds));
        } catch (e) {
            // Best effort only; continue if storage is unavailable.
        }
    }

    /**
     * Navigate back to a specific wizard step (e.g. after a duplicate-patient rejection).
     */
    function goBackToStep(step) {
        indentStep = step;
        const body = document.getElementById('indent-wizard-body');
        const footer = document.getElementById('indent-wizard-footer');
        if (!body || !footer) return;
        body.innerHTML = renderIndentStep(indentStep);
        const nextLabels = ['', 'Select Patients &rsaquo;', 'Calculate Requirement &rsaquo;', 'Final Review &rsaquo;'];
        footer.innerHTML = `
            <button class="btn-dispatch" style="background:#f1f5f9; color:#64748b;" onclick="document.getElementById('stock-modal-container').innerHTML=''">Cancel</button>
            <button class="btn-dispatch" onclick="MultiLevelStockUI.nextIndentStep()">Next: ${nextLabels[indentStep] || ''}</button>
        `;
        // Re-run the step 2 post-render setup
        if (indentStep === 2) {
            setTimeout(() => applyStep2EventListeners(), 0);
        }
    }

    /**
     * Fetch already-claimed patient IDs for this facility this month from the backend,
     * and apply visual warnings to their checkboxes in step 2.
     */
    async function loadClaimedPatients() {
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { phc } = getCurrentUserContext();
            const res = await fetch(`${apiUrl}?action=getIndents&facility=${encodeURIComponent(phc)}&status=Pending`);
            const result = await res.json();
            const indents = (result && result.data && Array.isArray(result.data)) ? result.data : [];
            const { username } = getCurrentUserContext();

            indentWizardState.claimedPatientIds = {};
            indents.forEach(indent => {
                // Skip own pending indents (same CHO)
                if ((indent.RequestedBy || '') === username) return;
                let ids = [];
                try { ids = JSON.parse(indent.PatientIDsJSON || '[]'); } catch(e) {}
                ids.forEach(id => {
                    indentWizardState.claimedPatientIds[String(id)] = indent.RequestedBy || 'another CHO';
                });
            });

            // Apply visual indicators to any already-rendered checkboxes
            applyClaimedPatientWarnings();
        } catch (e) {
            window.Logger && window.Logger.warn('[IndentWizard] Could not load claimed patients:', e);
        }
    }

    /**
     * Grey out / warn checkboxes for patients already claimed by another CHO this month.
     */
    function applyClaimedPatientWarnings() {
        const claimed = indentWizardState.claimedPatientIds || {};
        Object.entries(claimed).forEach(([pid, choName]) => {
            document.querySelectorAll(`.patient-checkbox[value="${pid}"]`).forEach(cb => {
                cb.checked = false;
                cb.disabled = true;
                cb.title = `Already in ${choName}'s indent this month`;
                const row = cb.closest('.patient-list-item');
                if (row) {
                    row.style.opacity = '0.55';
                    if (!row.querySelector('.claimed-badge')) {
                        const badge = document.createElement('span');
                        badge.className = 'claimed-badge';
                        badge.style.cssText = 'background:#e2e8f0; color:#64748b; font-size:0.7rem; padding:2px 6px; border-radius:8px; margin-left:6px; white-space:nowrap;';
                        badge.textContent = `In ${choName}'s indent`;
                        const label = row.querySelector('label');
                        if (label) label.appendChild(badge);
                    }
                }
            });
        });
        // Remove claimed patients from the selectedPatients state
        if (Object.keys(claimed).length > 0) {
            indentWizardState.selectedPatients = indentWizardState.selectedPatients.filter(
                id => !claimed[String(id)]
            );
            saveIndentSelection(indentWizardState.selectedPatients);
            const countEl = document.getElementById('selected-count');
            if (countEl) countEl.textContent = document.querySelectorAll('.patient-checkbox:checked').length;
        }
    }

    function getFacilityScopedPatients(patients) {
        const allPatients = Array.isArray(patients) ? patients : [];
        const { phc, aamCenter } = getCurrentUserContext();
        const targetPhc = String(phc || '').trim().toLowerCase();
        const targetAam = String(aamCenter || '').trim().toLowerCase();

        if (!targetPhc && !targetAam) {
            return allPatients;
        }

        const filtered = allPatients.filter(p => {
            const patientPhc = String(p.PHC || p.phc || p.Facility || p.AssignedPHC || p.assignedPHC || p.PHCName || '').trim().toLowerCase();
            const patientAam = String(p.NearestAAMCenter || p.AAMCenter || p.AAM || p.aamCenter || '').trim().toLowerCase();
            const phcMatch = targetPhc && patientPhc === targetPhc;
            const aamMatch = targetAam && patientAam === targetAam;
            return phcMatch || aamMatch;
        });

        // Fallback to all patients if facility metadata is missing on records.
        return filtered.length > 0 ? filtered : allPatients;
    }

    function getPatientMedicineNames(patient) {
        const rawFields = [
            patient.Medications,
            patient.medications,
            patient.CurrentMedicines,
            patient.currentMedicines,
            patient.CurrentMedication,
            patient.currentMedication,
            patient.Medicines,
            patient.medicines,
            patient.PrescribedMedicines,
            patient.prescribedMedicines
        ];

        const names = [];
        rawFields.forEach(field => {
            if (!field) return;
            if (Array.isArray(field)) {
                field.forEach(item => {
                    if (typeof item === 'string') {
                        names.push(item);
                    } else if (item && typeof item === 'object') {
                        names.push(item.name || item.medicine || item.Medicine || '');
                    }
                });
                return;
            }
            if (typeof field === 'string') {
                const value = field.trim();
                if (!value) return;
                if (value.startsWith('[') || value.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(value);
                        if (Array.isArray(parsed)) {
                            parsed.forEach(item => {
                                if (typeof item === 'string') {
                                    names.push(item);
                                } else if (item && typeof item === 'object') {
                                    names.push(item.name || item.medicine || item.Medicine || '');
                                }
                            });
                            return;
                        }
                    } catch (e) {
                        // Fall back to delimiter parsing below.
                    }
                }
                value.split(/[,;|]/).forEach(token => names.push(token));
            }
        });

        return Array.from(new Set(names.map(n => String(n || '').trim().toLowerCase()).filter(Boolean)));
    }

    /**
     * ROBUST: Extract patient medicines WITH dosage information for indent display
     * Handles malformed JSON, missing fields, null values, and plain string medicines
     * Returns array of objects: { name: "...", dosage: "...", display: "Medicine Dosage" }
     */
    function getPatientMedicinesWithDosage(patient) {
        const rawFields = [
            patient.Medications,
            patient.medications,
            patient.CurrentMedicines,
            patient.currentMedicines,
            patient.CurrentMedication,
            patient.currentMedication,
            patient.Medicines,
            patient.medicines,
            patient.PrescribedMedicines,
            patient.prescribedMedicines
        ];

        const medicines = [];
        const seenNames = new Set(); // Prevent duplicates

        rawFields.forEach(field => {
            if (!field) return; // Skip empty/null fields
            
            // Handle arrays directly
            if (Array.isArray(field)) {
                field.forEach(item => {
                    if (typeof item === 'object' && item !== null) {
                        const name = (item.name || item.medicine || item.Medicine || '').toString().trim();
                        if (!name || seenNames.has(name)) return;
                        seenNames.add(name);
                        
                        const dosage = (item.dosage || item.Dosage || item.dose || '').toString().trim();
                        medicines.push({
                            name: name,
                            dosage: dosage,
                            display: dosage ? `${name} ${dosage}` : name
                        });
                    } else if (typeof item === 'string' && item.trim()) {
                        // Treat simple string as medicine name with possible dosage
                        processMedicineString(item.trim());
                    }
                });
                return;
            }
            
            if (typeof field === 'string') {
                const value = String(field || '').trim();
                if (!value) return;
                
                // First try JSON parsing if it looks like JSON
                if (value.startsWith('[') || value.startsWith('{')) {
                    try {
                        let jsonStr = value;
                        if (jsonStr.endsWith(',')) {
                            jsonStr = jsonStr.slice(0, -1);
                        }
                        
                        const parsed = JSON.parse(jsonStr);
                        const items = Array.isArray(parsed) ? parsed : [parsed];
                        
                        items.forEach(item => {
                            if (item && typeof item === 'object' && item !== null) {
                                const name = (item.name || item.medicine || item.Medicine || '').toString().trim();
                                if (!name || seenNames.has(name)) return;
                                seenNames.add(name);
                                
                                const dosage = (item.dosage || item.Dosage || item.dose || '').toString().trim();
                                medicines.push({
                                    name: name,
                                    dosage: dosage,
                                    display: dosage ? `${name} ${dosage}` : name
                                });
                            }
                        });
                    } catch (e) {
                        // If strict JSON parsing fails, try lenient extraction with regex
                        const objPattern = /\{[^{}]*\}/g;
                        const matches = value.match(objPattern) || [];
                        
                        matches.forEach(match => {
                            try {
                                const obj = JSON.parse(match);
                                if (obj && typeof obj === 'object') {
                                    const name = (obj.name || obj.medicine || obj.Medicine || '').toString().trim();
                                    if (!name || seenNames.has(name)) return;
                                    seenNames.add(name);
                                    
                                    const dosage = (obj.dosage || obj.Dosage || obj.dose || '').toString().trim();
                                    medicines.push({
                                        name: name,
                                        dosage: dosage,
                                        display: dosage ? `${name} ${dosage}` : name
                                    });
                                }
                            } catch (innerErr) {
                                // Skip malformed objects
                            }
                        });
                    }
                } else {
                    // Not JSON, try to parse as delimited plain text medicines
                    // Split by comma, semicolon, or pipe
                    value.split(/[,;|]/).forEach(token => {
                        const trimmed = token.trim();
                        if (trimmed) {
                            processMedicineString(trimmed);
                        }
                    });
                }
            }
        });

        function processMedicineString(medicineStr) {
            if (!medicineStr) return;
            
            // Try to extract medicine name and dosage from string like "Valproate 200 BD"
            // Pattern: MedicineName [Dosage] [Frequency]
            
            // Match: "Word Word 200 BD" → name="Valproate", dosage="200 BD"
            // or "Valproate200BD" → name="Valproate", dosage="200 BD"
            
            const parts = medicineStr.split(/\s+/);
            if (parts.length === 0) return;
            
            // Try to find where the dosage starts (looks for a number or "Syrup")
            let nameParts = [];
            let dosageParts = [];
            let foundDosage = false;
            
            for (const part of parts) {
                if (!foundDosage) {
                    // Check if this part starts with a digit or is a frequency indicator
                    if (/^\d/.test(part) || /^(OD|BD|TDS|QID|ONCE|TWICE|SYRUP)/i.test(part)) {
                        foundDosage = true;
                        dosageParts.push(part);
                    } else {
                        nameParts.push(part);
                    }
                } else {
                    dosageParts.push(part);
                }
            }
            
            const name = nameParts.join(' ').trim();
            const dosage = dosageParts.join(' ').trim();
            
            if (!name) return;
            if (seenNames.has(name)) return;
            seenNames.add(name);
            
            medicines.push({
                name: name,
                dosage: dosage,
                display: dosage ? `${name} ${dosage}` : name
            });
        }

        return medicines;
    }

    function normalizeMedicineName(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/\([^)]*\)/g, '')
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9]/g, '');
    }

    /**
     * ROBUST FIX: Map patient medicine prescriptions to EXACT system medicine list
     * Returns BASE name (for calculations) and FULL name with dosage (for display)
     * @param {string} patientMedicineName - Medicine name from patient record (can be variant)
     * @param {string} dosage - Dosage from patient record (may include frequency like "200 BD")
     * @returns {object|null} Matched medicine {baseName, fullName, dosage} or null if no match
     */
    function mapPatientMedicineToSystemMedicine(patientMedicineName, dosage) {
        if (!patientMedicineName || !patientMedicineName.trim()) return null;
        
        const normalized = normalizeMedicineName(patientMedicineName);
        let dosageStr = String(dosage || '').trim().toUpperCase();
        
        // Extract just the dose part, removing frequency indicators (BD, OD, TDS, etc)
        // Converts "200 BD" → "200MG", "500 TDS" → "500MG", "Syrup OD" → "SYRUP"
        const extractDosePart = (d) => {
            if (!d) return '';
            // Remove frequency indicators (BD, OD, TDS, QID, etc.) and extra spaces
            const cleaned = d.replace(/\b(OD|BD|TDS|QID|ONCE|TWICE|THRICE|DAILY|WEEKLY)\b/gi, '').trim();
            // If it doesn't have "mg" or "syrup", add "mg"
            if (cleaned && !cleaned.toLowerCase().includes('mg') && !cleaned.toLowerCase().includes('syrup') && !cleaned.toLowerCase().includes('ml')) {
                return cleaned + 'MG';
            }
            return cleaned;
        };
        
        dosageStr = extractDosePart(dosageStr);
        
        // Define mapping: variant -> {baseName, possibleDosages}
        // baseName is what StockComparison.calculateMonthlyRequirement expects
        const medicineMapping = {
            'carbamazepine': { baseName: 'Carbamazepine', dosages: ['100mg', '200mg', '400mg', 'Syrup'] },
            'cbz': { baseName: 'Carbamazepine', dosages: ['100mg', '200mg', '400mg', 'Syrup'] },
            
            'valproate': { baseName: 'Sodium Valproate', dosages: ['200mg', '300mg', '500mg', 'Syrup'] },
            'sodiumvalproate': { baseName: 'Sodium Valproate', dosages: ['200mg', '300mg', '500mg', 'Syrup'] },
            'svp': { baseName: 'Sodium Valproate', dosages: ['200mg', '300mg', '500mg', 'Syrup'] },
            'depakote': { baseName: 'Sodium Valproate', dosages: ['200mg', '300mg', '500mg', 'Syrup'] },
            
            'levetiracetam': { baseName: 'Levetiracetam', dosages: ['250mg', '500mg', 'Syrup'] },
            'keppra': { baseName: 'Levetiracetam', dosages: ['250mg', '500mg', 'Syrup'] },
            'lev': { baseName: 'Levetiracetam', dosages: ['250mg', '500mg', 'Syrup'] },
            
            'clobazam': { baseName: 'Clobazam', dosages: ['5mg', '10mg'] },
            'frisium': { baseName: 'Clobazam', dosages: ['5mg', '10mg'] },
            
            'phenytoin': { baseName: 'Phenytoin', dosages: ['100mg'] },
            'dilantin': { baseName: 'Phenytoin', dosages: ['100mg'] },
            'phytoin': { baseName: 'Phenytoin', dosages: ['100mg'] },
            
            'phenobarbitone': { baseName: 'Phenobarbitone', dosages: ['30mg', '60mg'] },
            'barbiturate': { baseName: 'Phenobarbitone', dosages: ['30mg', '60mg'] }
        };
        
        // Try to match medicine variant
        for (const [variant, info] of Object.entries(medicineMapping)) {
            if (normalized.includes(variant)) {
                // Determine dosage to use
                let finalDose = dosageStr;
                
                // If we have a cleaned dosage string, try to match it exactly
                if (finalDose) {
                    const matchedDosage = info.dosages.find(d => 
                        d.toUpperCase().replace(/\s+/g, '') === finalDose.replace(/\s+/g, '')
                    );
                    
                    if (matchedDosage) {
                        return {
                            baseName: info.baseName,
                            fullName: `${info.baseName} ${matchedDosage}`,
                            dosage: matchedDosage
                        };
                    }
                }
                
                // If no match, try to extract numeric dose from patient record
                const doseMatch = String(dosage || '').match(/(\d+)\s*(mg|ml|syrup)/i);
                if (doseMatch) {
                    const numericDose = doseMatch[1];
                    const unit = doseMatch[2].toLowerCase();
                    const searchDose = numericDose + (unit === 'syrup' ? ' Syrup' : unit.toUpperCase());
                    
                    const matchedDosage = info.dosages.find(d => 
                        d.toUpperCase() === searchDose.toUpperCase()
                    );
                    
                    if (matchedDosage) {
                        return {
                            baseName: info.baseName,
                            fullName: `${info.baseName} ${matchedDosage}`,
                            dosage: matchedDosage
                        };
                    }
                }
                
                // Last resort: use first available dosage
                const defaultDosage = info.dosages[0];
                return {
                    baseName: info.baseName,
                    fullName: `${info.baseName} ${defaultDosage}`,
                    dosage: defaultDosage
                };
            }
        }
        
        return null; // No match found
    }

    /**
     * ROBUST FIX: Filter and normalize medicines to ONLY the official system medicine list
     * Accepts medicine objects with name/dosage and returns only valid medicines from system
     * @param {array} medicineObjects - Array of {name, dosage} objects from patient records
     * @returns {array} Filtered array with {baseName, fullName, dosage} objects
     */
    function filterValidSystemMedicines(medicineObjects) {
        if (!Array.isArray(medicineObjects)) return [];
        
        const filtered = [];
        const seenMedicines = new Set(); // Prevent duplicates by base name
        
        medicineObjects.forEach(med => {
            if (!med || !med.name) return;
            
            // Try to map this patient medicine to system medicine
            const matched = mapPatientMedicineToSystemMedicine(med.name, med.dosage);
            
            if (matched) {
                const key = matched.baseName; // Use base name as unique key
                if (!seenMedicines.has(key)) {
                    seenMedicines.add(key);
                    filtered.push({
                        baseName: matched.baseName,  // For calculations (e.g., "Carbamazepine")
                        name: matched.fullName,       // Full name with dosage (e.g., "Carbamazepine 100mg")
                        dosage: matched.dosage,
                        display: matched.fullName
                    });
                }
            }
            // If not matched, skip it (exclude non-system medicines)
        });
        
        return filtered;
    }

    function patientUsesMedicine(patient, medicineBaseName) {
        // medicineBaseName is like "Carbamazepine" (without dosage)
        if (!medicineBaseName || !medicineBaseName.trim()) return false;
        
        const patientMeds = getPatientMedicinesWithDosage(patient);
        
        // Check if any patient medicine maps to this system medicine base name
        for (const patientMed of patientMeds) {
            const matched = mapPatientMedicineToSystemMedicine(patientMed.name, patientMed.dosage);
            if (matched && matched.baseName === medicineBaseName) {
                return true;
            }
        }
        
        return false;
    }

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

    function getDefaultTabForRole({ isCHO, isPHC, isMasterAdmin }) {
        return isCHO ? 'cho-indent' : isPHC ? 'phc-requests' : isMasterAdmin ? 'admin-dashboard' : 'facility';
    }

    function ensureActiveTabForRole() {
        const { isCHO, isPHC, isMasterAdmin, normalizedRole } = getRoleFlags();
        const allowedTabs = new Set(
            isCHO
                ? ['cho-indent', 'cho-history']
                : isPHC
                    ? ['phc-requests', 'phc-district-indent', 'facility']
                    : isMasterAdmin
                        ? ['admin-dashboard', 'admin-dispatch', 'facility']
                        : ['facility', 'aam', 'indents', 'approvals']
        );
        const defaultTab = getDefaultTabForRole({ isCHO, isPHC, isMasterAdmin });
        const roleKey = normalizedRole || 'guest';

        if (lastResolvedRole !== roleKey || !activeTab || !allowedTabs.has(activeTab)) {
            activeTab = defaultTab;
        }

        lastResolvedRole = roleKey;
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
        } else if (activeTab === 'phc-district-indent') {
            loadPHCDistrictIndentTab();
        } else if (activeTab === 'admin-dashboard') {
            loadAdminIndentDashboard();
        } else if (activeTab === 'admin-dispatch') {
            loadAdminDispatchDashboard();
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
                        <div class="stock-ops-tab ${activeTab === 'cho-indent' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('cho-indent')" style="background: linear-gradient(135deg, rgba(102,126,234,0.6) 0%, rgba(118,75,162,0.6) 100%); color:#1e293b; border:none;">
                            <i class="fas fa-file-invoice"></i> <strong>Monthly Indent</strong> <span style="position:absolute; top:-8px; right:-8px; background:#ef4444; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:bold;" id="cho-indent-badge"></span>
                        </div>
                        <div class="stock-ops-tab ${activeTab === 'cho-history' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('cho-history')">
                            <i class="fas fa-history"></i> My Indent History
                        </div>
                    ` : ''}
                    ${isPHC ? `
                        <!-- PHC-specific tabs -->
                        <div class="stock-ops-tab ${activeTab === 'phc-requests' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('phc-requests')" style="background: linear-gradient(135deg, rgba(240,147,251,0.6) 0%, rgba(245,87,108,0.6) 100%); color:#1e293b; border:none;">
                            <i class="fas fa-inbox"></i> <strong>CHO Requests</strong> <span style="position:absolute; top:-8px; right:-8px; background:#ef4444; color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:bold;" id="phc-requests-badge"></span>
                        </div>
                        <div class="stock-ops-tab ${activeTab === 'phc-district-indent' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('phc-district-indent')" style="${activeTab === 'phc-district-indent' ? 'background: linear-gradient(135deg, rgba(67,233,123,0.6) 0%, rgba(56,249,215,0.6) 100%); color:#1e293b; border:none;' : ''}">
                            <i class="fas fa-paper-plane"></i> Submit to District
                        </div>
                        <div class="stock-ops-tab ${activeTab === 'facility' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('facility')">
                            <i class="fas fa-city"></i> Facility View
                        </div>
                    ` : ''}
                    ${isMasterAdmin ? `
                        <!-- Master Admin tabs -->
                        <div class="stock-ops-tab ${activeTab === 'admin-dashboard' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('admin-dashboard')" style="${activeTab === 'admin-dashboard' ? 'background: linear-gradient(135deg, rgba(250,112,154,0.6) 0%, rgba(254,225,64,0.6) 100%); color:#1e293b; border:none;' : ''}">
                            <i class="fas fa-chart-bar"></i> <strong>Indent Overview</strong>
                        </div>
                        <div class="stock-ops-tab ${activeTab === 'admin-dispatch' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('admin-dispatch')" style="${activeTab === 'admin-dispatch' ? 'background: linear-gradient(135deg, rgba(48,207,208,0.6) 0%, rgba(51,8,103,0.6) 100%); color:#1e293b; border:none;' : ''}">
                            <i class="fas fa-truck"></i> Dispatch to PHCs
                        </div>
                        <div class="stock-ops-tab ${activeTab === 'facility' ? 'active' : ''}" onclick="MultiLevelStockUI.switchTab('facility')">
                            <i class="fas fa-city"></i> Facility Stock
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
                            <small style="color: #64748b;">Facility: ${facilityLabel}</small>
                        </div>
                        ${isCHO && activeTab === 'cho-indent' ? `
                            <button class="btn-dispatch" onclick="MultiLevelStockUI.openIndentWizard()" style="padding: 10px 20px; font-size: 0.9rem; background: linear-gradient(135deg, rgba(102,126,234,0.6), rgba(118,75,162,0.6)); color:#1e293b;">
                                <i class="fas fa-plus-circle"></i> Start Indent Process
                            </button>
                        ` : ''}
                    </div>
                    
                    ${isCHO && activeTab === 'cho-indent' ? `
                        <!-- CHO Indent Dashboard with Next Action Card -->
                        <div id="cho-next-action-container"></div>

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            <div class="metric-card" style="background: linear-gradient(135deg, rgba(102,126,234,0.6) 0%, rgba(118,75,162,0.6) 100%); color:#1e293b;">
                                <div class="metric-value" id="cho-pending-count">0</div>
                                <div class="metric-label">Pending Requests</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, rgba(240,147,251,0.6) 0%, rgba(245,87,108,0.6) 100%); color:#1e293b;">
                                <div class="metric-value" id="cho-approved-count">0</div>
                                <div class="metric-label">Approved This Month</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, rgba(79,172,254,0.6) 0%, rgba(0,242,254,0.6) 100%); color:#1e293b;">
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
                            <div class="metric-card" style="background: linear-gradient(135deg, rgba(240,147,251,0.6) 0%, rgba(245,87,108,0.6) 100%); color:#1e293b;">
                                <div class="metric-value" id="phc-total-pending">0</div>
                                <div class="metric-label">Pending from CHOs</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, rgba(79,172,254,0.6) 0%, rgba(0,242,254,0.6) 100%); color:#1e293b;">
                                <div class="metric-value" id="phc-total-chos">0</div>
                                <div class="metric-label">CHOs Under This PHC</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, rgba(67,233,123,0.6) 0%, rgba(56,249,215,0.6) 100%); color:#1e293b;">
                                <div class="metric-value" id="phc-total-medicines">0</div>
                                <div class="metric-label">Medicines in Requests</div>
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 15px 0; color: #1e293b;">CHO Indent Requests from this facility</h4>
                            <div id="phc-requests-list"></div>
                        </div>
                    ` : ''}

                    ${isMasterAdmin && activeTab === 'admin-dashboard' ? `
                        <!-- Master Admin Dashboard -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            <div class="metric-card" style="background: linear-gradient(135deg, rgba(250,112,154,0.6) 0%, rgba(254,225,64,0.6) 100%); color:#1e293b;">
                                <div class="metric-value" id="admin-total-indents">0</div>
                                <div class="metric-label">Total Indent Requests</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, rgba(48,207,208,0.6) 0%, rgba(51,8,103,0.6) 100%); color:#1e293b;">
                                <div class="metric-value" id="admin-pending-indents">0</div>
                                <div class="metric-label">Pending Approval</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, rgba(168,237,234,0.6) 0%, rgba(254,214,227,0.6) 100%); color:#1e293b;">
                                <div class="metric-value" id="admin-total-phcs">0</div>
                                <div class="metric-label">PHCs Reporting</div>
                            </div>
                            <div class="metric-card" style="background: linear-gradient(135deg, rgba(255,154,86,0.6) 0%, rgba(255,106,136,0.6) 100%); color:#1e293b;">
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

                    <div id="tab-content-area" ${(activeTab === 'admin-dashboard' || activeTab === 'cho-indent' || activeTab === 'cho-history') ? 'style="display:none;"' : ''}>
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
        // Reset wizard state (clear claimed-patient cache too)
        indentWizardState = {
            selectedPatients: loadSavedIndentSelection(),
            reconciliation: {},
            calculatedDemand: {},
            followUpConsumption: {},
            totalPatients: 0,
            medicines: window.MEDICINE_LIST || DEFAULT_MEDICINE_LIST,
            claimedPatientIds: {}   // patientId -> CHO name (loaded async in step 2)
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
            const { aamCenter, isCHO } = Object.assign(getCurrentUserContext(), getRoleFlags());
            const aamValue = indentWizardState.aamCenterOverride !== undefined ? indentWizardState.aamCenterOverride : aamCenter;
            html += `
                <h5>Step 1: End-of-Month Reconciliation</h5>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 12px;">
                    Based on follow-ups in the past 30 days, here's the consumption. Enter your remaining physical stock to verify accuracy.
                </p>

                ${isCHO ? `
                <div style="margin-bottom:14px; padding:12px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px;">
                    <label style="display:block; font-weight:600; margin-bottom:6px; color:#334155;">
                        <i class="fas fa-map-marker-alt" style="color:#ef4444;"></i> AAM Center <span style="color:#ef4444;">*</span>
                    </label>
                    <input type="text" id="wizard-aam-center" list="aamCentersList"
                        value="${aamValue}"
                        placeholder="Type or select your AAM center…"
                        style="width:100%; padding:10px 12px; border:${aamValue ? '1px solid #e2e8f0' : '2px solid #ef4444'}; border-radius:6px; font-size:0.95rem; box-sizing:border-box;"
                        oninput="this.style.border='1px solid #e2e8f0'">
                    ${!aamValue ? '<p style="color:#ef4444; font-size:0.82rem; margin:4px 0 0 0;"><i class="fas fa-exclamation-circle"></i> AAM Center is required to submit an indent.</p>' : ''}
                </div>` : ''}

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
                                        <td><input type="number" class="dispatch-input" style="width:120px;" min="0" placeholder="Enter remaining" data-medicine="${m}" data-reconciliation-input="true"></td>
                                        <td><span data-recon-alert="${m}"></span></td>
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
            // Step 2 - Patient selection: active patients followed up in last 6 months
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Helper: is patient active?
            const isActivePatient = (p) => {
                const status = String(p.PatientStatus || p.Status || p.status || '').toLowerCase();
                return !status.includes('deceased') && !status.includes('inactive') &&
                       !status.includes('dead') && !status.includes('expired') &&
                       !status.includes('lost') && !status.includes('transferred out');
            };

            const facilityPatients = getFacilityScopedPatients(window.patientData || []);
            const activePatients = facilityPatients.filter(isActivePatient);

            // Main list: active patients followed up in last 6 months (most recent first)
            let mainListPatients = activePatients.filter(p => {
                const lastFU = p.LastFollowUpDate || p.lastFollowUpDate || p.LastFollowUp || p.lastFollowUp;
                const lastFUDate = lastFU ? new Date(lastFU) : null;
                return lastFUDate && lastFUDate >= sixMonthsAgo;
            });
            mainListPatients.sort((a, b) => {
                const da = new Date(a.LastFollowUpDate || a.lastFollowUpDate || a.LastFollowUp || a.lastFollowUp || 0);
                const db = new Date(b.LastFollowUpDate || b.lastFollowUpDate || b.LastFollowUp || b.lastFollowUp || 0);
                return db - da;
            });

            // Search list: active patients NOT in the main list (no recent FU or new)
            const mainIds = new Set(mainListPatients.map(p => String(p.ID)));
            const searchListPatients = activePatients.filter(p => !mainIds.has(String(p.ID)));

            html += `
                <h5>Step 2: Select Patients for Indent</h5>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 12px;">
                    Showing <strong>${mainListPatients.length}</strong> active patients followed up in the past 6 months (most recent first).
                    Deceased and inactive patients are excluded.
                </p>
                <div style="margin-bottom:12px;">
                    <input type="text" id="main-patient-search" class="stock-search"
                        placeholder="🔍 Search by patient name, ID, or phone…"
                        style="width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:6px; font-size:0.9rem; box-sizing:border-box;">
                </div>
                <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; align-items: center;">
                    <button type="button" id="select-all-patients-btn" class="btn-dispatch" style="padding: 6px 12px;">
                        <i class="fas fa-check-double"></i> Select All (${mainListPatients.length})
                    </button>
                    <button type="button" id="clear-all-patients-btn" class="btn-dispatch" style="padding: 6px 12px; background:#64748b;">
                        <i class="fas fa-eraser"></i> Clear Selection
                    </button>
                    <span style="font-size:0.85rem; color:#64748b; margin-left:4px;">
                        <i class="fas fa-info-circle"></i> "Select All" only selects patients from the recent follow-up list below.
                    </span>
                </div>
                <div style="max-height: 320px; overflow-y: auto; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px;">
                    ${mainListPatients.length > 0 ? mainListPatients.map(p => {
                        const lastFU = new Date(p.LastFollowUpDate || p.lastFollowUpDate || p.LastFollowUp || p.lastFollowUp || 0);
                        const isRecent = lastFU >= thirtyDaysAgo;
                        const daysAgo = Math.floor((Date.now() - lastFU.getTime()) / (1000 * 60 * 60 * 24));
                        const searchText = `${String(p.PatientName || p.Name || p.name || '').toLowerCase()} ${String(p.ID).toLowerCase()} ${String(p.Phone || '').toLowerCase()}`;
                        return `
                            <div class="patient-list-item main-list-patient" data-search-text="${searchText}" style="padding: 8px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: ${isRecent ? '#f0f9ff' : '#fff'};">
                                <label style="flex: 1; display: flex; align-items: center; gap: 8px; cursor:pointer;">
                                    <input type="checkbox" class="patient-checkbox main-list-patient" value="${p.ID}" ${indentWizardState.selectedPatients.includes(String(p.ID)) ? 'checked' : ''}>
                                    <strong>${p.PatientName || p.Name || p.name || ('Patient ' + p.ID)}</strong>
                                    <span style="color: #64748b; font-size: 0.82rem;">(${p.ID})</span>
                                    ${p.Phone ? `<span style="color: #94a3b8; font-size: 0.82rem; margin-left: 4px;"><i class="fas fa-phone"></i> ${p.Phone}</span>` : ''}
                                </label>
                                <div style="display: flex; gap: 6px; align-items: center; flex-shrink:0;">
                                    <span class="pill" style="background: ${isRecent ? '#dcfce7' : '#f1f5f9'}; color: ${isRecent ? '#10b981' : '#64748b'}; font-size:0.72rem;">
                                        ${daysAgo}d ago
                                    </span>
                                    <span class="pill" style="font-size:0.72rem;">${p.Diagnosis || 'Epilepsy'}</span>
                                </div>
                            </div>
                        `;
                    }).join('') : '<p style="padding:20px; text-align:center; color:#64748b;"><i class="fas fa-info-circle"></i> No active patients with follow-ups in the past 6 months found for your facility.</p>'}
                </div>

                <!-- Search to add: collapsed by default, expands on interaction -->
                <div style="margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 8px; overflow:hidden;">
                    <button type="button" id="toggle-search-patients"
                        style="width:100%; display:flex; align-items:center; gap:8px; padding:10px 14px; background:#f8fafc; border:none; cursor:pointer; font-size:0.9rem; color:#334155; font-weight:500; text-align:left;">
                        <i class="fas fa-search"></i> Search &amp; Add Patient Not in List Above
                        <span style="margin-left:auto; font-size:0.8rem; color:#94a3b8;">${searchListPatients.length} patients available</span>
                        <i class="fas fa-chevron-down" id="search-chevron" style="font-size:0.8rem; color:#94a3b8;"></i>
                    </button>
                    <div id="patient-search-panel" style="display:none; padding:12px;">
                        <input type="text" id="patient-search-input" class="stock-search"
                            placeholder="Type patient name or ID…"
                            style="width:100%; min-width:0; margin-bottom:8px;">
                        <div id="patient-search-results"
                            style="max-height: 200px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px; background:#fff;">
                            ${searchListPatients.length > 0 ? searchListPatients.map(p => {
                                const searchText = `${String(p.PatientName || p.Name || '').toLowerCase()} ${String(p.ID || '')}`;
                                return `
                                    <div class="patient-list-item search-patient-item" data-search-text="${searchText}"
                                        style="padding: 8px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                                        <label style="flex: 1; display: flex; align-items: center; gap: 8px; cursor:pointer;">
                                            <input type="checkbox" class="patient-checkbox search-list-patient" value="${p.ID}" ${indentWizardState.selectedPatients.includes(String(p.ID)) ? 'checked' : ''}>
                                            <strong>${p.PatientName || p.Name || ('Patient ' + p.ID)}</strong>
                                            <span style="color: #64748b; font-size: 0.82rem;">(${p.ID})</span>
                                        </label>
                                        <span class="pill" style="font-size:0.72rem; background:#fef9c3; color:#92400e;">No recent FU</span>
                                    </div>
                                `;
                            }).join('') : '<p style="padding:10px 12px; color:#64748b; font-size:0.9rem;">No additional patients found.</p>'}
                        </div>
                    </div>
                </div>

                <div style="margin-top: 12px; padding: 12px 14px; background: #f0f9ff; border-radius: 8px; border-left: 3px solid #2563eb; font-size: 0.9rem; line-height: 1.5;">
                    <div id="selected-count" style="color: #334155;">
                        <strong>0</strong> patients
                    </div>
                </div>
            `;
        } else if (step === 3) {
            // PHASE 2: Step 3 - Requirement Calculation with PILFERAGE TRANSPARENCY
            const selectedIds = indentWizardState.selectedPatients;
            const filteredPatients = (window.patientData || []).filter(p => selectedIds.includes(String(p.ID)));
            
            // FIX: Collect medicines WITH DOSAGE from patient records, then filter to ONLY system medicines
            const allMedicinesWithDosage = [];
            filteredPatients.forEach(patient => {
                getPatientMedicinesWithDosage(patient).forEach(med => {
                    if (med && med.name && med.name.trim()) {
                        allMedicinesWithDosage.push(med);
                    }
                });
            });
            
            // ROBUST: Map all patient medicines to official system medicine list, exclude everything else
            const validSystemMedicines = filterValidSystemMedicines(allMedicinesWithDosage);
            
            let medicineRequirements = [];
            // Only calculate requirements for medicines in official system list
            validSystemMedicines.forEach(m => {
                // Use baseName for calculations (e.g., "Carbamazepine" not "Carbamazepine 100mg")
                const baseName = m.baseName;
                
                let base = StockComparison.calculateMonthlyRequirement(filteredPatients, baseName);
                const patientsNeedingMedicine = filteredPatients.filter(p => patientUsesMedicine(p, baseName)).length;
                const isSyrupMedicine = /syrup/i.test(String(m.dosage || '') + String(m.name || ''));

                if (base <= 0 && patientsNeedingMedicine > 0) {
                    // Fallback: Calculate based on frequency and medicine type
                    // BD medicines (Valproate, Levetiracetam, Carbamazepine): 2× daily
                    // OD medicines (Clobazam, Phenytoin): 1× daily
                    // Syrups: 1 bottle per month
                    const isBDMedicine = ['sodium valproate', 'levetiracetam', 'carbamazepine'].some(m => baseName.toLowerCase().includes(m));
                    const dailyFrequency = isSyrupMedicine ? 1 : (isBDMedicine ? 2 : 1);
                    base = patientsNeedingMedicine * dailyFrequency * 30;
                }

                if (base > 0) {
                    const withPilferage = Math.ceil(base * 1.05);
                    medicineRequirements.push({
                        name: m.display,  // Display full name with dosage (e.g., "Carbamazepine 100mg")
                        quantity: withPilferage,
                        base: base,
                        pilferage: withPilferage - base,
                        patientCount: patientsNeedingMedicine,
                        unitLabel: isSyrupMedicine ? 'bottles' : 'units'
                    });
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
                                    <td>${m.patientCount}</td>
                                    <td style="background: #f0f9ff;">${m.base} ${m.unitLabel}</td>
                                    <td style="background: #fff8e6; color: #f59e0b; font-weight: bold;">+${m.pilferage} (${((m.pilferage / m.base) * 100).toFixed(0)}%)</td>
                                    <td style="background: #f0fdf4; font-weight: bold; font-size: 1.05rem; color: #10b981;">${m.quantity} ${m.unitLabel}</td>
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
            // Validate and save AAM center (only required for CHO role)
            const aamInput = document.getElementById('wizard-aam-center');
            if (aamInput) {
                const aamVal = (aamInput.value || '').trim();
                if (!aamVal) {
                    aamInput.style.border = '2px solid #ef4444';
                    aamInput.focus();
                    window.showNotification && window.showNotification('AAM Center is required before proceeding', 'warning');
                    return;
                }
                indentWizardState.aamCenterOverride = aamVal;
            }
            // Save reconciliation data before moving to step 2
            const reconciliationInputs = document.querySelectorAll('[data-reconciliation-input="true"]');
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
                const alertSpan = Array.from(document.querySelectorAll('[data-recon-alert]'))
                    .find(alertNode => alertNode.dataset.reconAlert === medicine);
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
            // Load claimed patients from other CHOs (async) and apply warnings
            loadClaimedPatients();
            
            // Fetch last indent patients from backend and auto-select them
            fetchLastIndentPatients().then(lastIndentPatients => {
                if (lastIndentPatients && lastIndentPatients.length > 0) {
                    // Auto-select last indent patients
                    document.querySelectorAll('.patient-checkbox').forEach(cb => {
                        if (lastIndentPatients.includes(cb.value)) {
                            cb.checked = true;
                        }
                    });
                    indentWizardState.selectedPatients = lastIndentPatients;
                    // Update the display
                    updateSelectedCountWithIds();
                    window.showNotification && window.showNotification('✓ Previous indent patients pre-selected', 'info');
                }
            }).catch(err => {
                window.Logger && window.Logger.debug('[Wizard] Could not auto-select last indent patients:', err);
            });
            
            setTimeout(() => {
                const countEl = document.getElementById('selected-count');
                        const updateSelectedCountWithIds = () => {
                            const selectedIds = Array.from(document.querySelectorAll('.patient-checkbox:checked')).map(el => el.value);
                            const count = selectedIds.length;
                            if (countEl) {
                                const idsDisplay = count > 0 ? ` (${selectedIds.join(', ')})` : '';
                                countEl.innerHTML = `<strong>${count}</strong> patient${count !== 1 ? 's' : ''}${idsDisplay}`;
                            }
                        };
                        updateSelectedCountWithIds();

                        // Restore checkbox state for both lists
                        document.querySelectorAll('.patient-checkbox').forEach(cb => {
                            if (indentWizardState.selectedPatients.includes(cb.value)) cb.checked = true;
                        });

                        // Change listener for all checkboxes
                        document.querySelectorAll('.patient-checkbox').forEach(cb => {
                            cb.addEventListener('change', () => {
                                const selectedIds = Array.from(document.querySelectorAll('.patient-checkbox:checked')).map(el => el.value);
                                indentWizardState.selectedPatients = selectedIds;
                                saveIndentSelection(selectedIds);
                                updateSelectedCountWithIds();
                            });
                        });

                        // Select All — only selects main list (recent FU patients), NOT search results
                        const selectAllBtn = document.getElementById('select-all-patients-btn');
                        if (selectAllBtn) {
                            selectAllBtn.addEventListener('click', () => {
                                document.querySelectorAll('.patient-checkbox.main-list-patient').forEach(cb => { cb.checked = true; });
                                const selectedIds = Array.from(document.querySelectorAll('.patient-checkbox:checked')).map(el => el.value);
                                indentWizardState.selectedPatients = selectedIds;
                                saveIndentSelection(selectedIds);
                                updateSelectedCountWithIds();
                            });
                        }

                        // Clear All — clears both lists
                        const clearAllBtn = document.getElementById('clear-all-patients-btn');
                        if (clearAllBtn) {
                            clearAllBtn.addEventListener('click', () => {
                                document.querySelectorAll('.patient-checkbox').forEach(cb => { cb.checked = false; });
                                indentWizardState.selectedPatients = [];
                                saveIndentSelection([]);
                                updateSelectedCountWithIds();
                            });
                        }

                        // Search panel toggle (collapsed by default)
                        const toggleBtn = document.getElementById('toggle-search-patients');
                        const searchPanel = document.getElementById('patient-search-panel');
                        const chevron = document.getElementById('search-chevron');
                        if (toggleBtn && searchPanel) {
                            toggleBtn.addEventListener('click', () => {
                                const isHidden = searchPanel.style.display === 'none';
                                searchPanel.style.display = isHidden ? 'block' : 'none';
                                if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : '';
                                if (isHidden) {
                                    const input = document.getElementById('patient-search-input');
                                    if (input) input.focus();
                                }
                            });
                        }

                        // Search input live filtering
                        const searchInput = document.getElementById('patient-search-input');
                        if (searchInput) {
                            searchInput.addEventListener('input', (e) => {
                                const query = e.target.value.toLowerCase().trim();
                                document.querySelectorAll('.search-patient-item').forEach(item => {
                                    const text = (item.dataset.searchText || '').toLowerCase();
                                    item.style.display = !query || text.includes(query) ? '' : 'none';
                                });
                            });
                        }

                        // Main patient list search filtering
                        const mainSearchInput = document.getElementById('main-patient-search');
                        if (mainSearchInput) {
                            mainSearchInput.addEventListener('input', (e) => {
                                const query = e.target.value.toLowerCase().trim();
                                document.querySelectorAll('.patient-list-item.main-list-patient').forEach(item => {
                                    const text = (item.dataset.searchText || '').toLowerCase();
                                    item.style.display = !query || text.includes(query) ? '' : 'none';
                                });
                            });
                        }
            }, 0);
        }
        
        if (indentStep === 4) {
            footer.innerHTML = `
                <button class="btn-dispatch" style="background:#f1f5f9; color:#64748b;" onclick="MultiLevelStockUI.goBackToStep(3)"><i class="fas fa-arrow-left"></i> Back</button>
                <button class="btn-dispatch" onclick="MultiLevelStockUI.nextIndentStep()" style="background: #10b981;">
                    <i class="fas fa-paper-plane"></i> Submit Indent Request
                </button>
            `;
        } else if (indentStep === 1) {
            const nextLabels = ['', 'Select Patients &rsaquo;', 'Calculate Requirement &rsaquo;', 'Final Review &rsaquo;'];
            footer.innerHTML = `
                <button class="btn-dispatch" style="background:#f1f5f9; color:#64748b;" onclick="document.getElementById('stock-modal-container').innerHTML=''" title="Discard changes and close modal">Cancel</button>
                <button class="btn-dispatch" onclick="MultiLevelStockUI.nextIndentStep()">Next: ${nextLabels[indentStep]}</button>
            `;
        } else {
            const nextLabels = ['', 'Select Patients &rsaquo;', 'Calculate Requirement &rsaquo;', 'Final Review &rsaquo;'];
            footer.innerHTML = `
                <button class="btn-dispatch" style="background:#f1f5f9; color:#64748b;" onclick="MultiLevelStockUI.goBackToStep(${indentStep - 1})"><i class="fas fa-arrow-left"></i> Back</button>
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
                aamCenter: indentWizardState.aamCenterOverride || aamCenter || '',
                requestedBy: username || 'Unknown',
                totalPatients: indentWizardState.totalPatients,
                patientIds: indentWizardState.selectedPatients,   // ← for duplicate detection
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

            // Handle duplicate patient error — show actionable UI, not just a toast
            if (indentResult.code === 'DUPLICATE_PATIENTS') {
                const conflicting = indentResult.conflictingPatientIds || [];
                // Highlight conflicting patients in the wizard body if still mounted
                conflicting.forEach(pid => {
                    const cb = document.querySelector(`.patient-checkbox[value="${pid}"]`);
                    if (cb) {
                        cb.checked = false;
                        const row = cb.closest('.patient-list-item');
                        if (row) {
                            row.style.background = '#fff1f2';
                            row.style.border = '1px solid #fca5a5';
                            const badge = document.createElement('span');
                            badge.style.cssText = 'background:#ef4444; color:white; font-size:0.72rem; padding:2px 6px; border-radius:8px; margin-left:6px; white-space:nowrap;';
                            badge.textContent = 'Already in another CHO\'s indent';
                            const label = row.querySelector('label');
                            if (label) label.appendChild(badge);
                        }
                    }
                });
                // Restore footer with back button so CHO can fix selection
                footer.innerHTML = `
                    <div style="background:#fff1f2; border:1px solid #fca5a5; border-radius:8px; padding:12px; margin-bottom:8px; font-size:0.9rem; color:#991b1b;">
                        <strong><i class="fas fa-exclamation-triangle"></i> ${conflicting.length} patient(s) already claimed by another CHO this month.</strong>
                        They have been deselected (highlighted in red above). Please go back, review and submit again.
                    </div>
                    <button class="btn-dispatch" style="background:#64748b;" onclick="MultiLevelStockUI.goBackToStep(2)">
                        <i class="fas fa-arrow-left"></i> Back to Patient Selection
                    </button>
                `;
                return;
            }

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
            let patientIds = [];
            try {
                patientIds = JSON.parse(ind.PatientIDsJSON || '[]');
            } catch (e) {}
            _indentDataCache[ind.IndentID] = { medicines, patientIds, raw: ind };
            
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
                    <td><span class="pill" style="cursor:pointer;" onclick="MultiLevelStockUI.showIndentDetails('${ind.IndentID}')">${medicines.length} medicines</span></td>
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
    async function quickApproveIndent(indentId, aamCenter, btnEl) {
        // Accept button element directly or fall back to event.target for inline handlers
        const btn = (btnEl instanceof Element) ? btnEl : (typeof event !== 'undefined' && event && event.target ? event.target.closest('.btn-dispatch') : null);
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        }
        
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username } = getCurrentUserContext();
            
            // Approve and dispatch in one action
            const response = await fetch(`${apiUrl}?action=updateIndentStatus&indentId=${indentId}&status=Dispatched&processedBy=${encodeURIComponent(username || 'Unknown')}`);
            const result = await response.json();
            
            if (result.status === 'success') {
                window.showNotification && window.showNotification(`✓ Indent ${indentId} approved & dispatched!`, 'success');
                setTimeout(() => loadActiveTabData(), 500);
            } else {
                throw new Error(result.message || 'Approval failed');
            }
        } catch (error) {
            window.Logger && window.Logger.error('[Approvals] Error approving indent:', error);
            window.showNotification && window.showNotification('✗ Failed to approve: ' + error.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Approve & Dispatch';
            }
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
     * Process data and render the facility dispatch table from REAL indent data.
     * Target locations = CHO names (or PHC names for admin) who raised pending indents.
     */
    async function processAndRender(stockData, patients) {
        if (!Array.isArray(stockData)) stockData = [];

        const tbody = document.getElementById('stock-ops-tbody');
        const metricsRow = document.getElementById('stock-metrics-row');
        const thead = document.getElementById('stock-ops-thead');

        if (!tbody || !thead) return;

        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem; color:#2563eb;"></i></td></tr>`;

        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const flags = getRoleFlags();
            const { phc } = getCurrentUserContext();
            const facilityFilter = flags.isMasterAdmin ? '' : (phc || '');

            // For master_admin: read-only stock overview from all PHC stock records
            if (flags.isMasterAdmin) {
                thead.innerHTML = `
                    <tr>
                        <th>PHC</th>
                        <th>Medicine</th>
                        <th>Current Stock</th>
                        <th>Monthly Demand</th>
                        <th>Coverage</th>
                        <th>Stock Status</th>
                    </tr>
                `;

                // Use stockData (already fetched for facility tab = all PHC stock)
                if (!stockData || stockData.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:#64748b;"><i class="fas fa-box-open"></i> No stock data available across PHCs.</td></tr>`;
                    if (metricsRow) metricsRow.innerHTML = '';
                    return;
                }

                let html = '';
                let criticalCount = 0, lowCount = 0;
                const phcSet = new Set();

                stockData.forEach(entry => {
                    const phcName = entry.PHC || entry.Facility || '—';
                    const medName = entry.Medicine || entry.MedicineName || '—';
                    const currentStock = parseInt(entry.CurrentStock || entry.Stock || 0, 10);
                    const monthlyDemand = parseInt(entry.MonthlyDemand || entry.Demand || 0, 10);
                    const coverage = monthlyDemand > 0 ? (currentStock / monthlyDemand).toFixed(1) : '—';
                    const status = coverage === '—' ? 'No Data' :
                        parseFloat(coverage) < 0.5 ? 'Critical' :
                        parseFloat(coverage) < 1 ? 'Low' : 'Adequate';
                    const statusClass = status === 'Critical' ? 'status-critical' : status === 'Low' ? 'status-warning' : 'status-adequate';
                    if (status === 'Critical') criticalCount++;
                    if (status === 'Low') lowCount++;
                    phcSet.add(phcName);

                    html += `
                        <tr>
                            <td><strong>${phcName}</strong></td>
                            <td>${medName}</td>
                            <td style="font-weight:600;">${currentStock}</td>
                            <td>${monthlyDemand || '—'}</td>
                            <td>${coverage === '—' ? '—' : coverage + ' mo'}</td>
                            <td><span class="status-badge ${statusClass}">${status}</span></td>
                        </tr>
                    `;
                });

                tbody.innerHTML = html;

                if (metricsRow) {
                    metricsRow.innerHTML = `
                        <div class="metric-card">
                            <div class="metric-value">${phcSet.size}</div>
                            <div class="metric-label">PHCs Tracked</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value" style="color:${criticalCount > 0 ? '#ef4444' : '#10b981'};">${criticalCount}</div>
                            <div class="metric-label">Critical Stockout</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value" style="color:${lowCount > 0 ? '#f59e0b' : '#10b981'};">${lowCount}</div>
                            <div class="metric-label">Low Stock</div>
                        </div>
                        <div class="metric-card">
                            <div class="metric-value">${stockData.length}</div>
                            <div class="metric-label">Total Items</div>
                        </div>
                    `;
                }
                return;
            }

            // Non-admin: load pending indents and show dispatch table for PHC admins
            const indentsRes = await fetch(`${apiUrl}?action=getIndents&status=Pending&facility=${encodeURIComponent(facilityFilter)}`);
            const indentsResult = await indentsRes.json();
            const indents = (indentsResult && indentsResult.data && Array.isArray(indentsResult.data)) ? indentsResult.data : [];

            thead.innerHTML = `
                <tr>
                    <th>CHO Name</th>
                    <th>Medicine</th>
                    <th>Facility Stock</th>
                    <th>Monthly Demand</th>
                    <th>Coverage</th>
                    <th>Dispatch Qty</th>
                    <th>Action</th>
                </tr>
            `;

            if (indents.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#10b981;"><i class="fas fa-check-circle"></i> No pending indent requests to dispatch.</td></tr>`;
                if (metricsRow) metricsRow.innerHTML = '';
                return;
            }

            // Build rows from indent × medicine combinations
            let html = '';
            let totalItems = 0, criticalCount = 0;
            const uniqueCHOs = new Set();

            indents.forEach(indent => {
                let medicines = [];
                try { medicines = JSON.parse(indent.MedicinesJSON || '[]'); } catch (e) {}

                const targetLabel = indent.RequestedBy || 'Unknown';
                const aamLabel = indent.AAMCenter || '';
                const parentPHC = indent.Facility || phc || '';
                uniqueCHOs.add(targetLabel);

                medicines.forEach(med => {
                    const medName = med.name || med.medicine || (typeof med === 'string' ? med : '');
                    const demand = parseInt(med.quantity || med.Quantity || 0, 10);
                    const stockEntry = stockData.find(s =>
                        s.PHC === parentPHC && String(s.Medicine || '').trim().toLowerCase() === medName.toLowerCase()
                    );
                    const parentStock = stockEntry ? (parseInt(stockEntry.CurrentStock, 10) || 0) : 0;
                    const coverageMonths = demand > 0 ? (parentStock / demand).toFixed(1) : '—';
                    const status = coverageMonths === '—' ? 'No Data' :
                        parseFloat(coverageMonths) < 0.5 ? 'Critical' :
                        parseFloat(coverageMonths) < 1 ? 'Low' : 'Adequate';
                    const statusClass = status === 'Critical' ? 'status-critical' : status === 'Low' ? 'status-warning' : 'status-adequate';

                    if (status === 'Critical') criticalCount++;
                    totalItems++;

                    html += `
                        <tr>
                            <td>
                                <strong>${targetLabel}</strong>
                                ${aamLabel ? `<br><small style="color:#64748b;">${aamLabel}</small>` : ''}
                            </td>
                            <td>${medName}</td>
                            <td>${parentStock}</td>
                            <td>${demand}</td>
                            <td>
                                <span class="status-badge ${statusClass}">${coverageMonths === '—' ? '—' : coverageMonths + ' mo'}</span>
                            </td>
                            <td><input type="number" class="dispatch-input" value="${demand}" min="0" style="width:70px;"></td>
                            <td>
                                <button class="btn-dispatch" onclick="MultiLevelStockUI.dispatchToIndent('${indent.IndentID}', this)">
                                    <i class="fas fa-truck"></i> Dispatch
                                </button>
                            </td>
                        </tr>
                    `;
                });
            });

            tbody.innerHTML = html;

            if (metricsRow) {
                metricsRow.innerHTML = `
                    <div class="metric-card">
                        <div class="metric-value">${totalItems}</div>
                        <div class="metric-label">Pending Items</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value" style="color:${criticalCount > 0 ? '#ef4444' : '#10b981'};">${criticalCount}</div>
                        <div class="metric-label">Critical Shortage</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${uniqueCHOs.size}</div>
                        <div class="metric-label">CHOs with Pending</div>
                    </div>
                `;
            }
        } catch (err) {
            window.Logger && window.Logger.error('[Facility Mgmt] processAndRender error:', err);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red; padding:40px;">Error loading dispatch data. Please refresh.</td></tr>`;
        }
    }

    /**
     * Dispatch an indent to the requesting CHO/facility by calling the real backend API.
     */
    async function dispatchToIndent(indentId, btn) {
        if (!btn) return;
        const row = btn.closest('tr');
        const qty = row ? parseInt((row.querySelector('.dispatch-input') || {}).value, 10) || 0 : 0;

        if (qty <= 0) {
            window.showNotification && window.showNotification('Enter a dispatch quantity greater than 0', 'warning');
            return;
        }

        if (!confirm(`Confirm dispatch of ${qty} units for indent ${indentId}? This will update the stock ledger.`)) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username } = getCurrentUserContext();
            const sessionToken = window.currentSessionToken || localStorage.getItem('epicare_session_token') || '';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'updateIndentStatus',
                    sessionToken: sessionToken,
                    indentId: indentId,
                    status: 'Dispatched',
                    processedBy: username || 'Unknown'
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                btn.innerHTML = '<i class="fas fa-check"></i> Dispatched';
                btn.style.background = '#10b981';
                window.showNotification && window.showNotification(`✓ Indent ${indentId} dispatched. Stock ledger updated.`, 'success');
            } else {
                throw new Error(result.message || 'Dispatch failed');
            }
        } catch (err) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-truck"></i> Dispatch';
            window.showNotification && window.showNotification('✗ Dispatch failed: ' + err.message, 'error');
        }
    }

    /**
     * Legacy dispatch wrapper (kept for backward compatibility)
     */
    function dispatch(location, medicine, btn) {
        // Delegate to real API-backed implementation
        dispatchToIndent('FACILITY-' + location.replace(/\s+/g, '-') + '-' + Date.now(), btn);
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
                let patientIds = [];
                try {
                    patientIds = JSON.parse(ind.PatientIDsJSON || '[]');
                } catch (e) {}
                // Cache indent data for partial dispatch modal and detail view
                _indentDataCache[ind.IndentID] = { medicines, patientIds, raw: ind };
                
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
                        <td><span class="pill" style="cursor:pointer;" onclick="MultiLevelStockUI.showIndentDetails('${ind.IndentID}')">${medicines.length} medicines</span></td>
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
    /**
     * Show indent medicine & patient details modal (clicking "N medicines" pill)
     */
    function showIndentDetails(indentId) {
        const cached = _indentDataCache[indentId];
        const medicines = (cached && cached.medicines) || [];
        const patientIds = (cached && cached.patientIds) || [];
        const raw = (cached && cached.raw) || {};

        // Build patient name lookup from patientData
        const patientMap = {};
        (window.patientData || []).forEach(p => {
            patientMap[String(p.ID || '')] = p.PatientName || p.Name || p.name || ('Patient ' + p.ID);
        });

        const modalId = 'indent-detail-modal-' + Date.now();
        const modal = document.createElement('div');
        modal.id = modalId;

        let medicineRows = medicines.length > 0
            ? medicines.map(med => {
                const name = med.name || med.medicine || med.Medicine || String(med);
                const qty = med.quantity || med.qty || med.Quantity || '—';
                return `<tr><td style="padding:8px 12px; border-bottom:1px solid #f1f5f9;">${name}</td><td style="padding:8px 12px; border-bottom:1px solid #f1f5f9; text-align:right; font-weight:600;">${qty}</td></tr>`;
            }).join('')
            : '<tr><td colspan="2" style="padding:12px; text-align:center; color:#64748b;">No medicines recorded</td></tr>';

        let patientRows = patientIds.length > 0
            ? patientIds.map(pid => {
                const name = patientMap[String(pid)] || '—';
                return `<tr><td style="padding:8px 12px; border-bottom:1px solid #f1f5f9; font-size:0.85rem; color:#64748b;">${pid}</td><td style="padding:8px 12px; border-bottom:1px solid #f1f5f9; font-size:0.85rem;">${name}</td></tr>`;
            }).join('')
            : '<tr><td colspan="2" style="padding:12px; text-align:center; color:#64748b;">No patient IDs recorded</td></tr>';

        modal.innerHTML = `
            <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px;">
                <div style="background:white; border-radius:12px; padding:24px; max-width:600px; width:100%; box-shadow:0 20px 25px rgba(0,0,0,0.15); max-height:90vh; overflow-y:auto;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
                        <h4 style="margin:0; color:#2563eb;"><i class='fas fa-prescription-bottle-alt'></i> Indent Details</h4>
                        <button onclick="document.getElementById('${modalId}').remove()" style="border:none; background:none; cursor:pointer; font-size:1.3rem; color:#64748b;">&times;</button>
                    </div>
                    <p style="color:#64748b; margin-bottom:16px; font-size:0.9rem;">
                        <strong>${indentId}</strong> &nbsp;|&nbsp; ${raw.RequestedBy || '—'} &nbsp;|&nbsp; ${raw.AAMCenter || '—'} &nbsp;|&nbsp; ${raw.Date ? new Date(raw.Date).toLocaleDateString() : '—'}
                    </p>

                    <h6 style="margin:0 0 8px 0; color:#334155;">Medicines (${medicines.length})</h6>
                    <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:0.9rem; border:1px solid #f1f5f9; border-radius:8px; overflow:hidden;">
                        <thead><tr style="background:#f8fafc;">
                            <th style="padding:8px 12px; text-align:left; color:#475569; font-weight:600;">Medicine</th>
                            <th style="padding:8px 12px; text-align:right; color:#475569; font-weight:600;">Quantity</th>
                        </tr></thead>
                        <tbody>${medicineRows}</tbody>
                    </table>

                    <h6 style="margin:0 0 8px 0; color:#334155;">Patients (${patientIds.length})</h6>
                    <table style="width:100%; border-collapse:collapse; font-size:0.9rem; border:1px solid #f1f5f9; border-radius:8px; overflow:hidden;">
                        <thead><tr style="background:#f8fafc;">
                            <th style="padding:8px 12px; text-align:left; color:#475569; font-weight:600;">Patient ID</th>
                            <th style="padding:8px 12px; text-align:left; color:#475569; font-weight:600;">Patient Name</th>
                        </tr></thead>
                        <tbody>${patientRows}</tbody>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    function showRejectModal(indentId, choName) {
        const modalId = 'reject-modal-' + Date.now();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; box-shadow: 0 20px 25px rgba(0,0,0,0.15);">
                    <h4 style="margin: 0 0 16px 0; color: #ef4444;"><i class="fas fa-times-circle"></i> Reject Indent Request</h4>
                    <p style="color: #64748b; margin-bottom: 16px;">Rejecting indent <strong>${indentId}</strong> from <strong>${choName}</strong></p>
                    
                    <label style="display: block; margin-bottom: 12px; font-weight: 500;">Reason for Rejection:</label>
                    <textarea id="reject-reason-${modalId}" placeholder="e.g., Insufficient stock, Quality issues, etc." style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; resize: vertical; min-height: 80px; box-sizing: border-box;"></textarea>
                    
                    <div style="margin-top: 20px; display: flex; gap: 12px;">
                        <button class="btn-cancel" style="flex: 1;" onclick="document.getElementById('${modalId}').remove()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button class="btn-dispatch" style="flex: 1; background: #ef4444;" onclick="MultiLevelStockUI.rejectIndent('${indentId}', document.getElementById('reject-reason-${modalId}').value)">
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
        const modalId = 'partial-dispatch-modal-' + Date.now();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div style="background: white; border-radius: 12px; padding: 24px; max-width: 500px; width: 90%; box-shadow: 0 20px 25px rgba(0,0,0,0.15);">
                    <h4 style="margin: 0 0 16px 0; color: #f59e0b;"><i class='fas fa-box'></i> Partial Dispatch</h4>
                    <p style="color: #64748b; margin-bottom: 16px;">Dispatch partial quantities for indent <strong>${indentId}</strong> from <strong>${choName}</strong></p>
                    
                    <label style="display: block; margin-bottom: 12px; font-weight: 500;">Dispatch Quantities:</label>
                    <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 12px;">Enter the quantity to dispatch for each medicine (0 = skip).</p>
                    
                    <div id="partial-quantities-${modalId}" style="max-height: 250px; overflow-y: auto; margin-bottom: 16px; border: 1px solid #f1f5f9; border-radius: 8px; padding: 12px;">
                        <p style="text-align: center; color: #cbd5e1;">Loading medicines...</p>
                    </div>
                    
                    <label style="display: block; margin-bottom: 12px; font-weight: 500;">Note:</label>
                    <textarea id="partial-note-${modalId}" placeholder="e.g., Remaining stock will be available next month" style="width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; resize: vertical; min-height: 60px; box-sizing: border-box;"></textarea>
                    
                    <div style="margin-top: 20px; display: flex; gap: 12px;">
                        <button class="btn-cancel" style="flex: 1;" onclick="document.getElementById('${modalId}').remove()">
                            <i class='fas fa-times'></i> Cancel
                        </button>
                        <button class="btn-dispatch" style="flex: 1; background: #f59e0b;" onclick="MultiLevelStockUI.processPartialDispatch('${indentId}', '${modalId}')">
                            <i class='fas fa-check'></i> Confirm Partial Dispatch
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Populate medicines from cache or fetch from API
        const cached = _indentDataCache[indentId];
        if (cached && cached.medicines && cached.medicines.length > 0) {
            _renderPartialMedicineInputs(modalId, cached.medicines);
        } else {
            // Fetch from API
            const apiUrl = (window.AppConfig && window.AppConfig.BACKEND_URL) || (window.CONFIG && window.CONFIG.DEPLOYMENT_URL) || '';
            const token = window.currentSessionToken || localStorage.getItem('epicare_session_token') || '';
            fetch(`${apiUrl}?action=getIndents&indentId=${encodeURIComponent(indentId)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(r => r.json())
            .then(result => {
                const indents = (result && result.data && Array.isArray(result.data)) ? result.data : [];
                const ind = indents.find(i => i.IndentID === indentId);
                if (ind) {
                    let medicines = [];
                    try { medicines = JSON.parse(ind.MedicinesJSON || '[]'); } catch (e) {}
                    _indentDataCache[indentId] = { medicines, raw: ind };
                    _renderPartialMedicineInputs(modalId, medicines);
                } else {
                    const el = document.getElementById('partial-quantities-' + modalId);
                    if (el) el.innerHTML = '<p style="color:#ef4444; text-align:center;">Could not load medicines for this indent.</p>';
                }
            })
            .catch(() => {
                const el = document.getElementById('partial-quantities-' + modalId);
                if (el) el.innerHTML = '<p style="color:#ef4444; text-align:center;">Error loading medicines.</p>';
            });
        }
    }

    function _renderPartialMedicineInputs(modalId, medicines) {
        const container = document.getElementById('partial-quantities-' + modalId);
        if (!container) return;
        if (!medicines || medicines.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#64748b;">No medicines in this indent.</p>';
            return;
        }
        let html = '<table style="width:100%; border-collapse:collapse; font-size:0.9rem;">';
        html += '<thead><tr><th style="text-align:left; padding:6px 8px; color:#475569; border-bottom:1px solid #e2e8f0;">Medicine</th><th style="text-align:right; padding:6px 8px; color:#475569; border-bottom:1px solid #e2e8f0;">Requested</th><th style="text-align:right; padding:6px 8px; color:#475569; border-bottom:1px solid #e2e8f0;">Dispatch</th></tr></thead><tbody>';
        medicines.forEach(med => {
            const name = med.name || med.medicine || med.Medicine || String(med);
            const qty = parseInt(med.quantity || med.qty || med.Quantity || 0, 10);
            html += `<tr>
                <td style="padding:6px 8px;">${name}</td>
                <td style="padding:6px 8px; text-align:right; color:#64748b;">${qty}</td>
                <td style="padding:6px 8px; text-align:right;">
                    <input type="number" class="partial-medicine-input" data-medicine="${name}" data-requested="${qty}"
                        min="0" max="${qty}" value="${qty}"
                        style="width:70px; padding:4px 6px; border:1px solid #e2e8f0; border-radius:4px; text-align:right;">
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    /**
     * Process Partial Dispatch
     */
    async function processPartialDispatch(indentId, modalId) {
        const modalEl = document.getElementById(modalId);
        const note = modalEl ? (modalEl.querySelector('textarea') || {}).value || '' : '';
        const quantities = {};
        const inputs = modalEl ? modalEl.querySelectorAll('.partial-medicine-input') : [];
        inputs.forEach(input => {
            const medicine = input.dataset.medicine;
            const qty = parseInt(input.value, 10) || 0;
            quantities[medicine] = qty;
        });
        
        const hasAny = Object.values(quantities).some(q => q > 0);
        if (!hasAny) {
            window.showNotification && window.showNotification('Please enter at least one dispatch quantity', 'warning');
            return;
        }
        
        await partialDispatchIndent(indentId, quantities, note);
        if (modalEl) modalEl.remove();
    }

    /**
     * Switch to Quick Tally Mode (from Step 1)
     */
    function switchToQuickTallyMode() {
        const wizardBody = document.getElementById('indent-wizard-body');
        if (!wizardBody) return;
        
        wizardBody.innerHTML = `
            <div style="padding: 20px; text-align: center; margin-bottom: 20px;">
                <button class="btn-dispatch" style="background: #f1f5f9; color: #2563eb; border: 1px solid #2563eb; margin-bottom: 20px;" onclick="MultiLevelStockUI.goBackToStep(1)">
                    <i class="fas fa-arrow-left"></i> Back to Standard View
                </button>
            </div>
            ${renderQuickTallyMode()}
            <div style="margin-top: 20px; display: flex; gap: 12px;">
                <button class="btn-cancel" style="flex: 1;" onclick="MultiLevelStockUI.goBackToStep(1)">
                    <i class="fas fa-arrow-left"></i> Back
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
        const btn = event && event.target ? event.target.closest('.btn-dispatch') : null;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rejecting...';
        }
        
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username } = getCurrentUserContext();
            
            if (!feedbackReason || feedbackReason.trim() === '') {
                window.showNotification && window.showNotification('Please provide a reason for rejection', 'error');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-check"></i> Confirm Rejection';
                }
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
                // Remove modal and reload data instead of full page reload
                const modalEl = btn ? btn.closest('[style*="position"]') : null;
                if (modalEl) modalEl.remove();
                setTimeout(() => loadActiveTabData(), 500);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            window.Logger && window.Logger.error('[Reject] Error:', error);
            window.showNotification && window.showNotification('Failed to reject indent: ' + error.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Confirm Rejection';
            }
        }
    }

    /**
     * Partial Dispatch (PHC partial approval)
     */
    async function partialDispatchIndent(indentId, medicineUpdates, note = '') {
        const btn = event && event.target ? event.target.closest('.btn-dispatch') : null;
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Dispatching...';
        }
        
        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username } = getCurrentUserContext();
            
            const partialData = {
                indentId: indentId,
                status: 'Partially Dispatched',
                medicineUpdates: medicineUpdates,  // { 'Phenytoin': 50, 'Sodium Valproate': 30 }
                dispatchedBy: username || 'Unknown',
                dispatchDate: new Date().toISOString(),
                note: note || 'Partial dispatch'
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
                // Remove modal and reload data instead of full page reload
                const modalEl = btn ? btn.closest('[style*="position"]') : null;
                if (modalEl) modalEl.remove();
                setTimeout(() => loadActiveTabData(), 500);
            } else {
                throw new Error('Failed to process partial dispatch: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            window.Logger && window.Logger.error('[Partial Dispatch] Error:', error);
            window.showNotification && window.showNotification('Failed to dispatch partially: ' + error.message, 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-check"></i> Confirm Partial Dispatch';
            }
        }
    }

    /**
     * Export Indent Report as CSV (client-side)
     */
    async function exportIndentReport(filters = {}) {
        try {
            window.showNotification && window.showNotification('Preparing export…', 'info');

            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const response = await fetch(`${apiUrl}?action=getIndents`);
            const result = await response.json();
            const allIndents = (result && result.data && Array.isArray(result.data)) ? result.data : [];

            if (allIndents.length === 0) {
                window.showNotification && window.showNotification('No indent data to export.', 'warning');
                return;
            }

            // Build CSV rows
            const headers = ['IndentID', 'Facility', 'Requested By', 'AAM Center', 'Date', 'Status', 'Total Patients', 'Medicines', 'Notes'];
            const rows = allIndents.map(ind => {
                let medNames = '';
                try {
                    const meds = JSON.parse(ind.MedicinesJSON || '[]');
                    medNames = meds.map(m => (m.name || m.medicine || '') + 'x' + (m.quantity || m.Quantity || '')).join('; ');
                } catch(e) {}
                return [
                    ind.IndentID || '',
                    ind.Facility || '',
                    ind.RequestedBy || '',
                    ind.AAMCenter || '',
                    ind.Date ? new Date(ind.Date).toLocaleDateString() : '',
                    ind.Status || '',
                    ind.TotalPatients || '',
                    medNames,
                    (ind.Notes || '').replace(/,/g, ';')
                ];
            });

            const csvContent = [headers, ...rows]
                .map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(','))
                .join('\n');

            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'IndentReport_' + new Date().toISOString().slice(0, 10) + '.csv';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            window.showNotification && window.showNotification('✓ Exported ' + allIndents.length + ' indent records to CSV', 'success');
        } catch (error) {
            window.Logger && window.Logger.error('[Export] Error:', error);
            window.showNotification && window.showNotification('Failed to export report: ' + error.message, 'error');
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // PHC → DISTRICT INDENT WORKFLOW (User Request 5)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Load the PHC Admin "Submit to District" tab
     */
    async function loadPHCDistrictIndentTab() {
        const contentArea = document.getElementById('tab-content-area');
        if (!contentArea) return;

        contentArea.innerHTML = `<div style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem; color:#2563eb;"></i></div>`;

        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { phc } = getCurrentUserContext();

            // Load CHO indents AND existing district submissions in parallel
            const [indentsRes, districtRes] = await Promise.all([
                fetch(`${apiUrl}?action=getIndents&facility=${encodeURIComponent(phc)}`),
                fetch(`${apiUrl}?action=getDistrictIndents&facility=${encodeURIComponent(phc)}`)
            ]);
            const [indentsResult, districtResult] = await Promise.all([indentsRes.json(), districtRes.json()]);
            const allIndents = (indentsResult && indentsResult.data && Array.isArray(indentsResult.data)) ? indentsResult.data : [];
            const districtIndents = (districtResult && districtResult.data && Array.isArray(districtResult.data)) ? districtResult.data : [];

            // Build set of CHOs already submitted to district this month
            const currentMonthStart = new Date(); currentMonthStart.setDate(1); currentMonthStart.setHours(0,0,0,0);
            const submittedCHOs = new Set();
            districtIndents.forEach(di => {
                const diDate = di.Date ? new Date(di.Date) : null;
                if (diDate && diDate >= currentMonthStart) {
                    try {
                        const names = JSON.parse(di.SourceCHONames || '[]');
                        names.forEach(n => submittedCHOs.add(n));
                    } catch(e) {}
                }
            });

            renderPHCDistrictTabContent(allIndents, phc, submittedCHOs);
        } catch (err) {
            document.getElementById('tab-content-area').innerHTML = `<p style="color:red; padding:20px;"><i class="fas fa-exclamation-circle"></i> Error loading CHO indents: ${err.message}</p>`;
        }
    }

    function renderPHCDistrictTabContent(allIndents, phc, submittedCHOs) {
        const contentArea = document.getElementById('tab-content-area');
        if (!contentArea) return;
        if (!submittedCHOs) submittedCHOs = new Set();

        const today = new Date().getDate();
        const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const deadlineWarning = today > 25
            ? `<div style="background:#fee2e2; border-left:4px solid #ef4444; padding:12px; border-radius:8px; margin-bottom:16px;"><strong>⚠️ Deadline Passed:</strong> District indent was due by the 25th. Please contact district office.</div>`
            : today >= 22
            ? `<div style="background:#fff8e1; border-left:4px solid #f59e0b; padding:12px; border-radius:8px; margin-bottom:16px;"><strong>⏰ Deadline Approaching:</strong> Submit to district by <strong>25th ${month}</strong> (${25 - today} days left).</div>`
            : `<div style="background:#f0fdf4; border-left:4px solid #10b981; padding:12px; border-radius:8px; margin-bottom:16px;"><strong>✓ On Track:</strong> Submit your consolidated indent to district by <strong>25th ${month}</strong>.</div>`;

        // Group indents by CHO
        const choMap = {};
        allIndents.forEach(indent => {
            const cho = indent.RequestedBy || 'Unknown';
            if (!choMap[cho]) choMap[cho] = [];
            choMap[cho].push(indent);
        });

        // Split into available vs already submitted
        const availableCHOs = Object.entries(choMap).filter(([choName]) => !submittedCHOs.has(choName));
        const alreadySubmittedCHOs = Object.entries(choMap).filter(([choName]) => submittedCHOs.has(choName));

        // Build available CHO rows
        let choTableRows = '';
        availableCHOs.forEach(([choName, indents]) => {
            const pending = indents.filter(i => i.Status === 'Pending').length;
            const total = indents.length;
            let totalMeds = 0;
            indents.forEach(i => {
                try { totalMeds += JSON.parse(i.MedicinesJSON || '[]').length; } catch(e) {}
            });
            choTableRows += `
                <tr>
                    <td>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" class="cho-select-checkbox" data-cho="${choName}" onchange="MultiLevelStockUI.onCHOCheckboxChange()">
                            <strong>${choName}</strong>
                        </label>
                    </td>
                    <td>${total} indent(s)</td>
                    <td><span style="background:${pending > 0 ? '#fef9c3' : '#dcfce7'}; color:${pending > 0 ? '#92400e' : '#166534'}; padding:2px 8px; border-radius:10px; font-size:0.82rem; font-weight:600;">${pending} pending</span></td>
                    <td>${totalMeds} medicines</td>
                </tr>
            `;
        });

        // Build already-submitted CHO rows (grayed out)
        let submittedRows = '';
        alreadySubmittedCHOs.forEach(([choName, indents]) => {
            let totalMeds = 0;
            indents.forEach(i => {
                try { totalMeds += JSON.parse(i.MedicinesJSON || '[]').length; } catch(e) {}
            });
            submittedRows += `
                <tr style="opacity:0.5; background:#f8fafc;">
                    <td style="display:flex; align-items:center; gap:8px; padding:10px 16px;">
                        <input type="checkbox" disabled style="cursor:not-allowed;">
                        <strong style="color:#64748b;">${choName}</strong>
                        <span style="background:#10b981; color:white; font-size:0.72rem; padding:2px 7px; border-radius:10px; margin-left:4px;">✓ Submitted</span>
                    </td>
                    <td style="color:#64748b;">${indents.length} indent(s)</td>
                    <td><span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:10px; font-size:0.82rem; font-weight:600;">Sent to district</span></td>
                    <td style="color:#64748b;">${totalMeds} medicines</td>
                </tr>
            `;
        });

        contentArea.innerHTML = `
            ${deadlineWarning}
            <h4 style="margin:0 0 16px 0; color:#1e293b;"><i class="fas fa-layer-group"></i> Consolidate CHO Indents for District Submission</h4>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;">
                <!-- Step A: Select CHOs -->
                <div style="border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                    <h5 style="margin:0 0 12px 0; color:#334155;"><span style="background:#667eea; color:white; padding:2px 8px; border-radius:10px; font-size:0.8rem; margin-right:8px;">Step 1</span> Select CHO(s)</h5>
                    <table class="stock-table" style="font-size:0.88rem;">
                        <thead><tr><th>CHO Name</th><th>Indents</th><th>Status</th><th>Medicines</th></tr></thead>
                        <tbody id="cho-selection-table">${choTableRows || '<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748b;">No CHO indents this month.</td></tr>'}
                        ${alreadySubmittedCHOs.length > 0 ? `
                        <tr><td colspan="4" style="padding:8px 16px; background:#f0fdf4; border-top:2px solid #10b981;">
                            <strong style="color:#166534; font-size:0.82rem;"><i class="fas fa-check-circle"></i> Already Submitted to District This Month</strong>
                        </td></tr>
                        ${submittedRows}
                        ` : ''}
                        </tbody>
                    </table>
                </div>

                <!-- Step B: Consolidated view -->
                <div style="border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                    <h5 style="margin:0 0 12px 0; color:#334155;"><span style="background:#10b981; color:white; padding:2px 8px; border-radius:10px; font-size:0.8rem; margin-right:8px;">Step 2</span> Consolidated Requirement</h5>
                    <p style="font-size:0.85rem; color:#64748b; margin-bottom:10px;">Select CHOs above to aggregate their demands. You can edit quantities before submitting.</p>
                    <div id="consolidated-medicines-list">
                        <p style="text-align:center; color:#94a3b8; font-size:0.9rem; padding:20px;"><i class="fas fa-arrow-left"></i> Select CHOs to see consolidated demand</p>
                    </div>
                </div>
            </div>

            <div id="district-submit-section" style="display:none; margin-top:8px;">
                <div style="background:#f0f9ff; padding:16px; border-radius:8px; border-left:4px solid #2563eb; margin-bottom:16px;">
                    <strong><i class="fas fa-info-circle"></i> Submit to District:</strong> This will create a district-level indent request. The District Drug Store will review and dispatch medicines to your facility, you should recieve these by the 1st of next month.
                </div>
                <textarea id="district-indent-notes" placeholder="Add any notes for the district (optional, e.g. critical shortage for specific medicine)…"
                    style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px; min-height:70px; font-size:0.9rem; box-sizing:border-box; resize:vertical; margin-bottom:12px;"></textarea>
                <button class="btn-dispatch" onclick="MultiLevelStockUI.submitDistrictConsolidatedIndent()"
                    style="padding:12px 24px; font-size:1rem; background: linear-gradient(135deg, #43e97b, #38f9d7);">
                    <i class="fas fa-paper-plane"></i> Submit Consolidated Indent to District
                </button>
            </div>
        `;

        // Store cho indents data for later use
        districtWizardState.choIndents = allIndents;
    }

    /**
     * Called when a CHO checkbox is changed — recalculates consolidated demand
     */
    function onCHOCheckboxChange() {
        const selected = Array.from(document.querySelectorAll('.cho-select-checkbox:checked')).map(cb => cb.dataset.cho);
        districtWizardState.selectedIndentIds = selected;

        const relevantIndents = districtWizardState.choIndents.filter(i => selected.includes(i.RequestedBy || 'Unknown'));

        // Aggregate medicine quantities across selected CHOs' indents
        const consolidated = {};
        relevantIndents.forEach(indent => {
            let medicines = [];
            try { medicines = JSON.parse(indent.MedicinesJSON || '[]'); } catch(e) {}
            medicines.forEach(med => {
                const name = med.name || med.medicine || (typeof med === 'string' ? med : '');
                const qty = parseInt(med.quantity || med.Quantity || 0, 10);
                consolidated[name] = (consolidated[name] || 0) + qty;
            });
        });
        districtWizardState.consolidatedMedicines = consolidated;

        const listEl = document.getElementById('consolidated-medicines-list');
        const submitEl = document.getElementById('district-submit-section');

        if (Object.keys(consolidated).length === 0) {
            if (listEl) listEl.innerHTML = '<p style="text-align:center; color:#94a3b8; font-size:0.9rem; padding:20px;"><i class="fas fa-arrow-left"></i> Select CHOs to see consolidated demand</p>';
            if (submitEl) submitEl.style.display = 'none';
            return;
        }

        let html = '<table class="stock-table" style="font-size:0.88rem;"><thead><tr><th>Medicine</th><th>Total Quantity</th></tr></thead><tbody>';
        Object.entries(consolidated).forEach(([med, qty]) => {
            html += `
                <tr>
                    <td>${med}</td>
                    <td><input type="number" class="district-qty-input" data-medicine="${med}" value="${qty}" min="0"
                        style="width:90px; padding:4px 8px; border:1px solid #e2e8f0; border-radius:4px; text-align:center;"
                        onchange="MultiLevelStockUI.updateDistrictQty('${med}', this.value)"></td>
                </tr>
            `;
        });
        html += '</tbody></table><p style="font-size:0.8rem; color:#64748b; margin-top:8px;"><i class="fas fa-pencil-alt"></i> Edit quantities if needed before submitting.</p>';
        if (listEl) listEl.innerHTML = html;
        if (submitEl) submitEl.style.display = '';
    }

    function updateDistrictQty(medicine, value) {
        districtWizardState.consolidatedMedicines[medicine] = parseInt(value, 10) || 0;
    }

    /**
     * Submit consolidated PHC indent to district
     */
    async function submitDistrictConsolidatedIndent() {
        const notes = (document.getElementById('district-indent-notes') || {}).value || '';
        const medicines = Object.entries(districtWizardState.consolidatedMedicines)
            .filter(([, qty]) => qty > 0)
            .map(([name, quantity]) => ({ name, quantity }));

        if (medicines.length === 0) {
            window.showNotification && window.showNotification('No medicines to submit. Please select CHOs first.', 'warning');
            return;
        }

        const btn = document.querySelector('[onclick*="submitDistrictConsolidatedIndent"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…'; }

        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { phc, username } = getCurrentUserContext();
            const sessionToken = window.currentSessionToken || localStorage.getItem('epicare_session_token') || '';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'submitDistrictIndent',
                    sessionToken: sessionToken,
                    facility: phc || '',
                    submittedBy: username || 'Unknown',
                    medicines: medicines,
                    notes: notes,
                    choNames: districtWizardState.selectedIndentIds
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                window.showNotification && window.showNotification(`✓ District indent submitted successfully (${result.indentId}). District will dispatch by 1st of next month.`, 'success');
                districtWizardState = { selectedIndentIds: [], consolidatedMedicines: {}, choIndents: [] };
                setTimeout(() => loadPHCDistrictIndentTab(), 1000);
            } else {
                throw new Error(result.message || 'Submission failed');
            }
        } catch (err) {
            window.showNotification && window.showNotification('✗ Failed to submit: ' + err.message, 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Consolidated Indent to District'; }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // MASTER ADMIN DISPATCH DASHBOARD (User Request 6)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Load district-level dispatch dashboard (master admin: all PHC demands, drill-down, dispatch)
     */
    async function loadAdminDispatchDashboard() {
        const contentArea = document.getElementById('tab-content-area');
        if (!contentArea) return;

        contentArea.innerHTML = `<div style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem; color:#30cfd0;"></i></div>`;

        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';

            // Fetch district-level indents from PHCs
            const res = await fetch(`${apiUrl}?action=getDistrictIndents`);
            const result = await res.json();
            const districtIndents = (result && result.data && Array.isArray(result.data)) ? result.data : [];

            renderAdminDispatchDashboard(districtIndents);
        } catch (err) {
            contentArea.innerHTML = `<p style="color:red; padding:20px;"><i class="fas fa-exclamation-circle"></i> Error loading district data: ${err.message}</p>`;
        }
    }

    function renderAdminDispatchDashboard(districtIndents) {
        const contentArea = document.getElementById('tab-content-area');
        if (!contentArea) return;

        const today = new Date().getDate();
        const month = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        const deadlineNote = today > 25
            ? `<div style="background:#fee2e2; border-left:4px solid #ef4444; padding:10px 14px; border-radius:8px; margin-bottom:16px; font-size:0.9rem;">⚠️ Dispatch deadline of 25th ${month} has passed. Dispatch immediately to avoid shortages.</div>`
            : `<div style="background:#f0fdf4; border-left:4px solid #10b981; padding:10px 14px; border-radius:8px; margin-bottom:16px; font-size:0.9rem;">📦 Dispatch to PHCs by <strong>25th ${month}</strong> so medicines are available at facilities by 1st.</div>`;

        if (districtIndents.length === 0) {
            contentArea.innerHTML = `${deadlineNote}<p style="text-align:center; padding:40px; color:#10b981;"><i class="fas fa-check-circle"></i> No pending district indent requests from PHCs.</p>`;
            return;
        }

        // Group by facility
        const phcMap = {};
        districtIndents.forEach(indent => {
            const phc = indent.Facility || 'Unknown';
            if (!phcMap[phc]) phcMap[phc] = [];
            phcMap[phc].push(indent);
        });

        let html = `${deadlineNote}
            <h4 style="margin:0 0 16px 0; color:#1e293b;"><i class="fas fa-truck"></i> District → PHC Dispatch Queue</h4>
            <p style="font-size:0.88rem; color:#64748b; margin-bottom:16px;">Click <strong>▶ Expand</strong> on a PHC to drill down to CHO details. Click <strong>Dispatch</strong> to send medicines to that PHC.</p>
        `;

        Object.entries(phcMap).forEach(([phcName, indents]) => {
            const pending = indents.filter(i => i.Status === 'Pending').length;
            const totalMeds = {};
            indents.forEach(indent => {
                let medicines = [];
                try { medicines = JSON.parse(indent.MedicinesJSON || '[]'); } catch(e) {}
                medicines.forEach(med => {
                    const name = med.name || med.medicine || '';
                    const qty = parseInt(med.quantity || med.Quantity || 0, 10);
                    totalMeds[name] = (totalMeds[name] || 0) + qty;
                });
            });

            const phcKey = phcName.replace(/[^a-zA-Z0-9]/g, '_');

            html += `
                <div style="border:1px solid #e2e8f0; border-radius:10px; margin-bottom:14px; overflow:hidden;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 16px; background:linear-gradient(135deg, rgba(48,207,208,0.1), rgba(51,8,103,0.05)); cursor:pointer;"
                        onclick="MultiLevelStockUI.togglePHCDrilldown('${phcKey}')">
                        <div>
                            <strong style="font-size:1rem;">${phcName}</strong>
                            <small style="color:#64748b; margin-left:10px;">${indents.length} indent(s) · ${pending} pending · ${Object.keys(totalMeds).length} medicine types</small>
                        </div>
                        <div style="display:flex; gap:10px; align-items:center;">
                            ${pending > 0 ? `
                                <button class="btn-dispatch" onclick="event.stopPropagation(); MultiLevelStockUI.dispatchAllForPHC('${phcName}')"
                                    style="padding:6px 14px; font-size:0.85rem; background: linear-gradient(135deg, #30cfd0, #330867);">
                                    <i class="fas fa-truck"></i> Dispatch All to ${phcName}
                                </button>
                            ` : '<span style="color:#10b981; font-size:0.85rem;"><i class="fas fa-check"></i> Dispatched</span>'}
                            <i class="fas fa-chevron-down" id="chevron-${phcKey}" style="color:#94a3b8; font-size:0.85rem; transition:transform 0.2s;"></i>
                        </div>
                    </div>

                    <!-- PHC Drill-down (collapsed by default) -->
                    <div id="drilldown-${phcKey}" style="display:none; padding:14px 16px; background:#fafafa; border-top:1px solid #f1f5f9;">
                        <h6 style="margin:0 0 10px 0; color:#334155;">CHO-level breakdown:</h6>
                        <table class="stock-table" style="font-size:0.86rem;">
                            <thead><tr><th>CHO / Submitter</th><th>AAM Center</th><th>Date</th><th>Medicines Requested</th><th>Status</th></tr></thead>
                            <tbody>
                                ${indents.map(indent => {
                                    let medicines = [];
                                    try { medicines = JSON.parse(indent.MedicinesJSON || '[]'); } catch(e) {}
                                    const statusColor = { 'Pending': '#f59e0b', 'Dispatched': '#10b981', 'Rejected': '#ef4444' }[indent.Status] || '#64748b';
                                    return `
                                        <tr>
                                            <td><strong>${indent.SubmittedBy || indent.Facility || 'Unknown'}</strong></td>
                                            <td>${indent.Notes || '—'}</td>
                                            <td>${indent.Date ? new Date(indent.Date).toLocaleDateString() : '—'}</td>
                                            <td>
                                                ${medicines.slice(0, 3).map(m => `${m.name || m}: ${m.quantity || '?'}`).join(', ')}
                                                ${medicines.length > 3 ? ` +${medicines.length - 3} more` : ''}
                                            </td>
                                            <td><span style="background:${statusColor}; color:white; padding:2px 8px; border-radius:10px; font-size:0.78rem; font-weight:600;">${indent.Status}</span></td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        <div style="margin-top:14px;">
                            <h6 style="margin:0 0 8px 0; color:#334155;">Consolidated medicines for this PHC:</h6>
                            <div style="display:flex; flex-wrap:wrap; gap:8px;">
                                ${Object.entries(totalMeds).map(([med, qty]) => `
                                    <span style="background:#f0f9ff; border:1px solid #bae6fd; padding:4px 10px; border-radius:8px; font-size:0.82rem;">
                                        ${med}: <strong>${qty}</strong>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        contentArea.innerHTML = html;
    }

    function togglePHCDrilldown(phcKey) {
        const el = document.getElementById(`drilldown-${phcKey}`);
        const chevron = document.getElementById(`chevron-${phcKey}`);
        if (!el) return;
        const isHidden = el.style.display === 'none';
        el.style.display = isHidden ? 'block' : 'none';
        if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : '';
    }

    async function dispatchAllForPHC(phcName) {
        if (!confirm(`Dispatch all pending district indents to ${phcName}? This will update the district stock ledger.`)) return;

        try {
            const apiUrl = window.API_CONFIG ? window.API_CONFIG.MAIN_SCRIPT_URL : '';
            const { username } = getCurrentUserContext();
            const sessionToken = window.currentSessionToken || localStorage.getItem('epicare_session_token') || '';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({
                    action: 'dispatchDistrictIndent',
                    sessionToken: sessionToken,
                    facility: phcName,
                    processedBy: username || 'Unknown'
                })
            });
            const result = await response.json();

            if (result.status === 'success') {
                window.showNotification && window.showNotification(`✓ All indents dispatched to ${phcName}. Stock ledger updated.`, 'success');
                setTimeout(() => loadAdminDispatchDashboard(), 800);
            } else {
                throw new Error(result.message || 'Dispatch failed');
            }
        } catch (err) {
            window.showNotification && window.showNotification('✗ Dispatch failed: ' + err.message, 'error');
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // ENHANCED ADMIN DASHBOARD (User Request 6 - drill-down by PHC)
    // ─────────────────────────────────────────────────────────────────

    /**
     * Enhanced Master Admin Dashboard with clickable PHC drill-down
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

            const totalEl = document.getElementById('admin-total-indents');
            const pendingEl = document.getElementById('admin-pending-indents');
            const phcsEl = document.getElementById('admin-total-phcs');
            const chosEl = document.getElementById('admin-total-chos');
            if (totalEl) totalEl.textContent = totalIndents;
            if (pendingEl) pendingEl.textContent = pending;
            if (phcsEl) phcsEl.textContent = uniquePHCs;
            if (chosEl) chosEl.textContent = uniqueCHOs;

            // Build PHC breakdown with clickable drill-down
            const phcBreakdown = {};
            allIndents.forEach(ind => {
                const phc = ind.Facility || 'Unknown';
                if (!phcBreakdown[phc]) phcBreakdown[phc] = { total: 0, pending: 0, dispatched: 0, chos: new Set(), indents: [] };
                phcBreakdown[phc].total++;
                if (ind.Status === 'Pending') phcBreakdown[phc].pending++;
                if (ind.Status === 'Dispatched') phcBreakdown[phc].dispatched++;
                phcBreakdown[phc].chos.add(ind.RequestedBy || 'Unknown');
                phcBreakdown[phc].indents.push(ind);
            });

            let breakdownHtml = '';
            Object.entries(phcBreakdown).forEach(([phc, stats]) => {
                const phcKey = 'admin_' + phc.replace(/[^a-zA-Z0-9]/g, '_');

                // CHO breakdown for drill-down
                const choBreakdown = {};
                stats.indents.forEach(ind => {
                    const cho = ind.RequestedBy || 'Unknown';
                    if (!choBreakdown[cho]) choBreakdown[cho] = { count: 0, pending: 0, medicines: 0 };
                    choBreakdown[cho].count++;
                    if (ind.Status === 'Pending') choBreakdown[cho].pending++;
                    try { choBreakdown[cho].medicines += JSON.parse(ind.MedicinesJSON || '[]').length; } catch(e) {}
                });

                breakdownHtml += `
                    <div style="background: linear-gradient(135deg, rgba(250, 112, 154, 0.08) 0%, rgba(254, 225, 64, 0.08) 100%); border-left: 4px solid #fa709a; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;"
                            onclick="MultiLevelStockUI.toggleAdminPHCDrilldown('${phcKey}')">
                            <div>
                                <strong>${phc}</strong>
                                <small style="color:#64748b; margin-left:8px;">${stats.total} requests · ${stats.chos.size} CHOs</small>
                            </div>
                            <div style="display:flex; gap:8px; align-items:center;">
                                <span style="background:${stats.pending > 0 ? '#fef9c3' : '#dcfce7'}; color:${stats.pending > 0 ? '#92400e' : '#166534'}; padding:2px 8px; border-radius:10px; font-size:0.8rem; font-weight:600;">${stats.pending} pending</span>
                                <i class="fas fa-chevron-down" id="admin-chevron-${phcKey}" style="color:#94a3b8; font-size:0.8rem; transition:transform 0.2s;"></i>
                            </div>
                        </div>

                        <!-- PHC drill-down: list of CHOs -->
                        <div id="admin-drilldown-${phcKey}" style="display:none; margin-top:12px;">
                            <table class="stock-table" style="font-size:0.84rem;">
                                <thead><tr><th>CHO Name</th><th>Indents Raised</th><th>Pending</th><th>Medicines Requested</th></tr></thead>
                                <tbody>
                                    ${Object.entries(choBreakdown).map(([cho, s]) => `
                                        <tr>
                                            <td><strong>${cho}</strong></td>
                                            <td>${s.count}</td>
                                            <td><span style="background:${s.pending > 0 ? '#fef9c3' : '#dcfce7'}; color:${s.pending > 0 ? '#92400e' : '#166534'}; padding:1px 6px; border-radius:8px; font-size:0.78rem;">${s.pending}</span></td>
                                            <td>${s.medicines}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            });

            const breakdownEl = document.getElementById('admin-phc-breakdown');
            if (breakdownEl) breakdownEl.innerHTML = breakdownHtml || '<p style="text-align: center; color: #64748b;">No indent data yet.</p>';

        } catch (error) {
            window.Logger && window.Logger.error('[Admin Dashboard] Error:', error);
            const breakdownEl = document.getElementById('admin-phc-breakdown');
            if (breakdownEl) breakdownEl.innerHTML = `<p style="color: red;">Error loading dashboard data.</p>`;
        }
    }

    function toggleAdminPHCDrilldown(phcKey) {
        const el = document.getElementById(`admin-drilldown-${phcKey}`);
        const chevron = document.getElementById(`admin-chevron-${phcKey}`);
        if (!el) return;
        const isHidden = el.style.display === 'none';
        el.style.display = isHidden ? 'block' : 'none';
        if (chevron) chevron.style.transform = isHidden ? 'rotate(180deg)' : '';
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
        showIndentDetails,
        processPartialDispatch,
        exportIndentReport,
        dispatchToIndent,
        loadPHCDistrictIndentTab,
        loadAdminDispatchDashboard,
        onCHOCheckboxChange,
        updateDistrictQty,
        submitDistrictConsolidatedIndent,
        togglePHCDrilldown,
        dispatchAllForPHC,
        toggleAdminPHCDrilldown,
        goBackToStep,
        applyClaimedPatientWarnings
    };
})();

// Export
window.MultiLevelStockUI = MultiLevelStockUI;
