const API_BASE = 'http://localhost:8083/api/statistics';

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Yearly Report
async function loadYearlyReport() {
    const year = document.getElementById('yearInput').value;
    
    try {
        const response = await fetch(`${API_BASE}/revenue/yearly/${year}`);
        const data = await response.json();
        
        if (response.ok) {
            displayReport('yearly-result', data, 'Năm');
        } else {
            showResponse('error', '❌ Không tìm thấy dữ liệu năm ' + year);
        }
    } catch (error) {
        showResponse('error', '❌ Lỗi: ' + error.message);
    }
}

// Quarterly Reports
async function loadQuarterlyReport() {
    const year = document.getElementById('quarterYear').value;
    const quarter = document.getElementById('quarter').value;
    
    try {
        const response = await fetch(`${API_BASE}/revenue/quarterly/${year}/${quarter}`);
        const data = await response.json();
        
        if (response.ok) {
            displayReport('quarterly-result', data, `Quý ${quarter}/${year}`);
        } else {
            showResponse('error', `❌ Không tìm thấy dữ liệu quý ${quarter}/${year}`);
        }
    } catch (error) {
        showResponse('error', '❌ Lỗi: ' + error.message);
    }
}

async function loadAllQuarters() {
    const year = document.getElementById('quarterYear').value;
    
    try {
        const response = await fetch(`${API_BASE}/revenue/quarterly/${year}`);
        const data = await response.json();
        
        if (response.ok && data.length > 0) {
            displayMultipleReports('quarterly-result', data, 'Quý');
        } else {
            showResponse('error', '❌ Không có dữ liệu cho năm ' + year);
        }
    } catch (error) {
        showResponse('error', '❌ Lỗi: ' + error.message);
    }
}

// Monthly Reports
async function loadMonthlyReport() {
    const year = document.getElementById('monthYear').value;
    const month = document.getElementById('month').value;
    
    try {
        const response = await fetch(`${API_BASE}/revenue/monthly/${year}/${month}`);
        const data = await response.json();
        
        if (response.ok) {
            displayReport('monthly-result', data, `Tháng ${month}/${year}`);
        } else {
            showResponse('error', `❌ Không tìm thấy dữ liệu tháng ${month}/${year}`);
        }
    } catch (error) {
        showResponse('error', '❌ Lỗi: ' + error.message);
    }
}

async function loadAllMonths() {
    const year = document.getElementById('monthYear').value;
    
    try {
        const response = await fetch(`${API_BASE}/revenue/monthly/${year}`);
        const data = await response.json();
        
        if (response.ok && data.length > 0) {
            displayMultipleReports('monthly-result', data, 'Tháng');
        } else {
            showResponse('error', '❌ Không có dữ liệu cho năm ' + year);
        }
    } catch (error) {
        showResponse('error', '❌ Lỗi: ' + error.message);
    }
}

// Refresh Statistics
async function refreshStatistics() {
    try {
        const response = await fetch(`${API_BASE}/refresh`, { method: 'POST' });
        const result = await response.text();
        
        if (response.ok) {
            showResponse('success', '✅ Đã làm mới thống kê thành công!');
        } else {
            showResponse('error', '❌ Lỗi khi làm mới: ' + result);
        }
    } catch (error) {
        showResponse('error', '❌ Lỗi: ' + error.message);
    }
}

// Display Functions
function displayReport(elementId, data, label) {
    const div = document.getElementById(elementId);
    
    div.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">${label}</div>
            <div class="stat-value">${formatMoney(data.totalRevenue)} VND</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; font-size: 1.1em;">
                <div>
                    <div>💰 Tiền thuê</div>
                    <div style="font-size: 1.5em; font-weight: bold;">${formatMoney(data.rentalRevenue)}</div>
                </div>
                <div>
                    <div>⚠️ Phạt</div>
                    <div style="font-size: 1.5em; font-weight: bold;">${formatMoney(data.penaltyRevenue)}</div>
                </div>
                <div>
                    <div>📋 Số đơn</div>
                    <div style="font-size: 1.5em; font-weight: bold;">${data.totalRentals}</div>
                </div>
                <div>
                    <div>💵 TB/đơn</div>
                    <div style="font-size: 1.5em; font-weight: bold;">${formatMoney(data.averageRentalValue)}</div>
                </div>
            </div>
        </div>
        <div class="rental-details" style="background: #f7fafc; padding: 20px; border-radius: 10px;">
            <p><strong>Kỳ:</strong> ${data.period}</p>
            <p><strong>Năm:</strong> ${data.year}</p>
            ${data.month ? `<p><strong>Tháng:</strong> ${data.month}</p>` : ''}
            ${data.quarter ? `<p><strong>Quý:</strong> ${data.quarter}</p>` : ''}
            <p><strong>Cập nhật lúc:</strong> ${formatDate(data.lastUpdated)}</p>
        </div>
    `;
}

function displayMultipleReports(elementId, dataArray, type) {
    const div = document.getElementById(elementId);
    
    const max = Math.max(...dataArray.map(d => d.totalRevenue));
    
    div.innerHTML = `
        <div class="chart-container">
            ${dataArray.map(data => {
                const width = (data.totalRevenue / max * 100);
                return `
                    <div class="bar" style="width: ${width}%;">
                        ${type} ${data.month || data.quarter}: ${formatMoney(data.totalRevenue)} VND
                    </div>
                `;
            }).join('')}
        </div>
        <div class="stat-card">
            <div class="stat-label">Tổng cộng ${dataArray.length} ${type.toLowerCase()}</div>
            <div class="stat-value">
                ${formatMoney(dataArray.reduce((sum, d) => sum + d.totalRevenue, 0))} VND
            </div>
        </div>
    `;
}

function showResponse(type, message) {
    const div = document.getElementById('response');
    div.className = `response ${type}`;
    div.innerHTML = `<p><strong>${message}</strong></p>`;
    div.style.display = 'block';
    setTimeout(() => div.style.display = 'none', 5000);
}

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('vi-VN');
}
