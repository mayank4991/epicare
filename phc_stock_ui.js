// PHC Medicine Stock UI rendering logic
// This file is intended to be included in index.html

// --- PHC STOCK UI CONFIG ---
const PHC_STOCK_MEDICINES = [
    { name: 'Carbamazepine', dosages: ['200 mg', '300 mg', '400 mg'], forms: ['Tablet'] },
    { name: 'Sodium Valproate', dosages: ['200 mg', '300 mg', '500 mg'], forms: ['Tablet'] },
    { name: 'Phenytoin', dosages: ['100 mg'], forms: ['Tablet'] },
    { name: 'Phenobarbitone', dosages: ['30 mg', '60 mg'], forms: ['Tablet'] },
    { name: 'Levetiracetam', dosages: ['250 mg', '500 mg', '750 mg', '1000 mg'], forms: ['Tablet'] },
    { name: 'Clobazam', dosages: ['5 mg', '10 mg', '15 mg', '20 mg'], forms: ['Tablet'] }
];

// --- MAIN ENTRYPOINT ---
async function renderPHCStockUI() {
    const container = document.getElementById('phcStockUI');
    if (!container) return;
    container.innerHTML = '';

    // Role-based: Only CHO, PHC Admin, Master Admin can edit
    const canEdit = ['phc', 'phc_admin', 'master_admin'].includes(currentUserRole);
    const assignedPHC = currentUserPHC || '';
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // UI: PHC, Month, Year selectors (PHC locked for CHO)
    const filterRow = document.createElement('div');
    filterRow.className = 'phc-stock-filter-row';
    filterRow.style = 'display: flex; gap: 1rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem;';

    // PHC selector
    const phcSelect = document.createElement('select');
    phcSelect.id = 'phcStockPhcSelect';
    phcSelect.className = 'form-group select';
    phcSelect.style = 'min-width: 200px;';
    phcSelect.disabled = (currentUserRole === 'phc' || currentUserRole === 'phc_admin');
    filterRow.appendChild(phcSelect);

    // Month selector
    const monthSelect = document.createElement('select');
    monthSelect.id = 'phcStockMonthSelect';
    monthSelect.className = 'form-group select';
    for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' });
        if (m === currentMonth) opt.selected = true;
        monthSelect.appendChild(opt);
    }
    filterRow.appendChild(monthSelect);

    // Year selector
    const yearSelect = document.createElement('select');
    yearSelect.id = 'phcStockYearSelect';
    yearSelect.className = 'form-group select';
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === currentYear) opt.selected = true;
        yearSelect.appendChild(opt);
    }
    filterRow.appendChild(yearSelect);

    // Fetch PHC names (from global userData)
    phcSelect.innerHTML = '';
    if (currentUserRole === 'phc' || currentUserRole === 'phc_admin') {
        const opt = document.createElement('option');
        opt.value = assignedPHC;
        opt.textContent = assignedPHC;
        opt.selected = true;
        phcSelect.appendChild(opt);
    } else {
        // Admin: show all PHCs in dropdown
        const phcNames = userData.filter(u => u.PHC).map(u => u.PHC).filter((v, i, a) => a.indexOf(v) === i);
        phcNames.forEach(phc => {
            const opt = document.createElement('option');
            opt.value = phc;
            opt.textContent = phc;
            if (phc === assignedPHC) opt.selected = true;
            phcSelect.appendChild(opt);
        });
    }

    // Refresh button
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'btn btn-secondary';
    refreshBtn.innerHTML = '<i class="fas fa-sync"></i> Refresh';
    refreshBtn.onclick = () => renderPHCStockUI();
    filterRow.appendChild(refreshBtn);

    container.appendChild(filterRow);

    // Stock Table container
    const tableContainer = document.createElement('div');
    tableContainer.id = 'phcStockTableContainer';
    container.appendChild(tableContainer);

    // Load and render table
    await loadAndRenderPHCStockTable({
        phc: phcSelect.value,
        month: monthSelect.value,
        year: yearSelect.value,
        canEdit
    });

    // Change handlers
    phcSelect.onchange = monthSelect.onchange = yearSelect.onchange = () => {
        loadAndRenderPHCStockTable({
            phc: phcSelect.value,
            month: monthSelect.value,
            year: yearSelect.value,
            canEdit
        });
    };
}

// --- LOAD AND RENDER PHC STOCK TABLE ---
async function loadAndRenderPHCStockTable({ phc, month, year, canEdit }) {
    const tableContainer = document.getElementById('phcStockTableContainer');
    tableContainer.innerHTML = '<div style="text-align:center; padding:2rem; color:#888;"><i class="fas fa-spinner fa-spin"></i> Loading stock data...</div>';
    try {
        // Fetch stock data from backend
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getPHCStock',
                data: { phc, month, year }
            })
        });
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);
        const stockData = result.data || [];
        renderPHCStockTable(stockData, { phc, month, year, canEdit });

        // --- Notification Logic for Stock Reminder ---
        const allowedRoles = ['phc', 'phc_admin', 'master_admin'];
        if (allowedRoles.includes(currentUserRole)) {
            // Build a map for quick lookup
            const entryMap = {};
            stockData.forEach(entry => {
                const key = `${entry.Medicine}|${entry.Dosage}|${entry.Form}`;
                entryMap[key] = entry;
            });
            // Check for missing or not-updated entries
            let missingOrNotAvailable = [];
            PHC_STOCK_MEDICINES.forEach(med => {
                med.dosages.forEach(dosage => {
                    med.forms.forEach(form => {
                        const key = `${med.name}|${dosage}|${form}`;
                        const entry = entryMap[key];
                        if (!entry || entry.Status === 'Not available' || entry.Quantity === undefined || entry.Quantity === null || entry.Quantity === '') {
                            missingOrNotAvailable.push(`${med.name} ${dosage} ${form}`);
                        }
                    });
                });
            });
            if (missingOrNotAvailable.length > 0) {
                const monthName = new Date(year, month-1, 1).toLocaleString('default', { month: 'long' });
                showNotification(`Monthly stock update is pending for <b>${phc}</b>, <b>${monthName} ${year}</b>. Please fill in the medicine stock data.`, 'warning');
            }
        }
        // --- End Notification Logic ---
    } catch (err) {
        tableContainer.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Could not load stock data: ${err.message}</div>`;
    }
}


// --- RENDER PHC STOCK TABLE ---
function renderPHCStockTable(stockData, { phc, month, year, canEdit }) {
    const tableContainer = document.getElementById('phcStockTableContainer');
    // Build a map: medicine+dosage+form -> entry
    const entryMap = {};
    stockData.forEach(entry => {
        const key = `${entry.Medicine}|${entry.Dosage}|${entry.Form}`;
        entryMap[key] = entry;
    });

    // Table
    let html = `<div style="overflow-x:auto;"><table class="report-table phc-stock-table">
        <thead>
            <tr>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Form</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Submitted By</th>
                ${canEdit ? '<th>Action</th>' : ''}
            </tr>
        </thead>
        <tbody>`;
    PHC_STOCK_MEDICINES.forEach(med => {
        med.dosages.forEach(dosage => {
            med.forms.forEach(form => {
                const key = `${med.name}|${dosage}|${form}`;
                const entry = entryMap[key] || {};
                html += `<tr>
                    <td>${med.name}</td>
                    <td>${dosage}</td>
                    <td>${form}</td>
                    <td>${canEdit ? `<input type='number' min='0' value='${entry.Quantity || ''}' style='width:80px;' data-medicine='${med.name}' data-dosage='${dosage}' data-form='${form}' class='phc-stock-qty-input'>` : (entry.Quantity || '')}</td>
                    <td>${canEdit ? `<select data-medicine='${med.name}' data-dosage='${dosage}' data-form='${form}' class='phc-stock-status-input'>
                        <option value='Available' ${entry.Status === 'Available' ? 'selected' : ''}>Available</option>
                        <option value='Not available' ${(entry.Status === 'Not available' || !entry.Status) ? 'selected' : ''}>Not available</option>
                    </select>` : (entry.Status || 'Not available')}</td>
                    <td>${entry.SubmissionDate ? new Date(entry.SubmissionDate).toLocaleString() : ''}</td>
                    <td>${entry.SubmittedBy || ''}</td>
                    ${canEdit ? `<td><button class='btn btn-primary btn-sm' onclick='savePHCStockEntry(this, "${med.name}", "${dosage}", "${form}", "${phc}", "${month}", "${year}")'><i class="fas fa-save"></i> Save</button></td>` : ''}
                </tr>`;
            });
        });
    });
    html += '</tbody></table></div>';
    tableContainer.innerHTML = html;
}

// --- SAVE PHC STOCK ENTRY ---
async function savePHCStockEntry(btn, medicine, dosage, form, phc, month, year) {
    const row = btn.closest('tr');
    const qtyInput = row.querySelector('.phc-stock-qty-input');
    const statusInput = row.querySelector('.phc-stock-status-input');
    const quantity = qtyInput ? parseInt(qtyInput.value, 10) || 0 : 0;
    const status = statusInput ? statusInput.value : 'Not available';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'addOrUpdatePHCStock',
                data: {
                    phc, month, year, medicine, dosage, form, quantity, status,
                    submittedBy: currentUserName
                }
            })
        });
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message);
        showNotification('Stock entry saved!', 'success');
        // Refresh table to show updated submission date/by
        await loadAndRenderPHCStockTable({ phc, month, year, canEdit: true });
    } catch (err) {
        showNotification('Could not save stock entry: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> Save';
    }
}

// --- INIT ON TAB SHOW ---
document.addEventListener('DOMContentLoaded', function() {
    const phcStockTab = document.getElementById('phcStockTab');
    if (phcStockTab) {
        phcStockTab.addEventListener('click', () => {
            renderPHCStockUI();
        });
    }
});
