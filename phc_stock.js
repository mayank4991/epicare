document.addEventListener('DOMContentLoaded', function () {
    const API_URL = 'YOUR_GOOGLE_APPS_SCRIPT_API_URL'; // IMPORTANT: Replace with your actual API URL
    let currentUserPHC = null; // This needs to be set from your main app

    const medicines = {
        'Carbamazepine(CR/Plain)': ['200mg', '300mg', '400mg', 'Syrup'],
        'Sodium Valproate': ['200mg', '300mg', '500mg'],
        'Phenytoin': ['50mg', '100mg', '300mg'],
        'Phenobarbitone': ['30mg', '60mg'],
        'Levetiracetam': ['250mg', '500mg', '750mg', '1000mg'],
        'Clobazam': ['5mg', '10mg']
    };

    function renderPhcStockForm(stockData) {
        const container = document.getElementById('phcStockFormContainer');
        if (!container) return;
        container.innerHTML = '';
        let lastUpdated = 'Never';

        Object.keys(medicines).forEach(medName => {
            const medDiv = document.createElement('div');
            medDiv.className = 'mb-3';
            medDiv.innerHTML = `<h5>${medName}</h5>`;

            medicines[medName].forEach(dosage => {
                const stockItem = stockData.find(item => item.MedicineName === medName && item.Dosage === dosage);
                const stockCount = stockItem ? stockItem.StockCount : '0';
                if (stockItem && stockItem.LastUpdated) {
                    lastUpdated = new Date(stockItem.LastUpdated).toLocaleString();
                }

                const formGroup = document.createElement('div');
                formGroup.className = 'form-group form-inline mb-2';
                formGroup.innerHTML = `
                    <label class="mr-2">${dosage}:</label>
                    <input type="number" class="form-control mr-2" data-med-name="${medName}" data-dosage="${dosage}" value="${stockCount}" style="width: 100px;">
                `;
                medDiv.appendChild(formGroup);
            });
            container.appendChild(medDiv);
        });

        const lastUpdatedSpan = document.getElementById('stockLastUpdated');
        if(lastUpdatedSpan) lastUpdatedSpan.textContent = lastUpdated;
        
        const notification = document.getElementById('stock-notification');
        if(notification) {
            const lastUpdatedDate = new Date(lastUpdated);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            if (lastUpdated === 'Never' || lastUpdatedDate < thirtyDaysAgo) {
                notification.textContent = 'Please update the stock information for the current month.';
                notification.style.display = 'block';
            } else {
                notification.style.display = 'none';
            }
        }
    }

    async function loadPhcStockData(phc) {
        if (!phc) return;
        currentUserPHC = phc; // Set the current PHC
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'getPhcStock', data: { phc } }),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.status === 'success') {
                renderPhcStockForm(result.data);
            } else {
                console.error('Error loading stock data:', result.message);
            }
        } catch (error) {
            console.error('Error in loadPhcStockData:', error);
        }
    }

    async function savePhcStockData() {
        if (!currentUserPHC) return;

        const stockEntries = [];
        const inputs = document.querySelectorAll('#phcStockFormContainer input[type="number"]');
        inputs.forEach(input => {
            stockEntries.push({
                medicineName: input.dataset.medName,
                dosage: input.dataset.dosage,
                stockCount: input.value
            });
        });

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'updatePhcStock', data: { phc: currentUserPHC, stockEntries } }),
                headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            if (result.status === 'success') {
                alert('Stock data saved successfully!');
                loadPhcStockData(currentUserPHC);
            } else {
                alert('Error saving stock data: ' + result.message);
            }
        } catch (error) {
            console.error('Error in savePhcStockData:', error);
            alert('An error occurred while saving stock data.');
        }
    }

    const saveStockButton = document.getElementById('savePhcStockButton');
    if (saveStockButton) {
        saveStockButton.addEventListener('click', savePhcStockData);
    }

    // Expose the load function to be called from your main app
    window.loadPhcStockModule = function(phc) {
        loadPhcStockData(phc);
    };
});
