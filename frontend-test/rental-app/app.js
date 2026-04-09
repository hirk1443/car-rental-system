// API Base URL - Change this to your service endpoint
const API_BASE = 'http://localhost:8081/api/rentals';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    document.getElementById('startDate').valueAsDate = tomorrow;
    document.getElementById('endDate').valueAsDate = nextWeek;
    
    // Event listeners
    document.getElementById('create-form').addEventListener('submit', createRental);
    document.getElementById('inspection-form').addEventListener('submit', submitInspection);
    
    loadRentals();
});

// Tab switching
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'list') {
        loadRentals();
    }
}

// Create Rental
async function createRental(e) {
    e.preventDefault();
    
    const data = {
        customerId: document.getElementById('customerId').value.trim(),
        vehicleId: document.getElementById('vehicleId').value.trim(),
        startDate: document.getElementById('startDate').value + 'T00:00:00',
        endDate: document.getElementById('endDate').value + 'T23:59:59',
        pickupLocation: document.getElementById('pickupLocation').value.trim(),
        returnLocation: document.getElementById('returnLocation').value.trim(),
        dailyRate: parseFloat(document.getElementById('rentalAmount').value),
        depositAmount: parseFloat(document.getElementById('depositAmount').value)
    };
    
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showResponse('success', `✅ Tạo đơn thuê thành công! Rental ID: ${result.rentalId}`, result);
            document.getElementById('create-form').reset();
        } else {
            showResponse('error', '❌ Lỗi: ' + (result.message || 'Unknown error'), result);
        }
    } catch (error) {
        showResponse('error', '❌ Không kết nối được API: ' + error.message);
    }
}

// Load Rentals
async function loadRentals() {
    const status = document.getElementById('statusFilter').value;
    let url = API_BASE + '?page=0&size=20';
    if (status) url += `&status=${status}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const rentals = data.content || [];
        const listDiv = document.getElementById('rentals-list');
        
        if (rentals.length === 0) {
            listDiv.innerHTML = '<p class="empty">Không có đơn thuê nào</p>';
            return;
        }
        
        listDiv.innerHTML = rentals.map(rental => `
            <div class="rental-item">
                <div class="rental-header">
                    <strong>ID: ${rental.rentalId}</strong>
                    <span class="status status-${rental.status.toLowerCase()}">${rental.status}</span>
                </div>
                <div class="rental-details">
                    <p>👤 Customer: ${rental.customerId}</p>
                    <p>🚗 Vehicle: ${rental.vehicleId}</p>
                    <p>📅 ${formatDate(rental.startDate)} → ${formatDate(rental.endDate)}</p>
                    <p>💰 Tổng tiền: ${formatMoney(rental.totalAmount)} VND</p>
                    ${rental.penaltyAmount > 0 ? `<p class="penalty">⚠️ Phạt: ${formatMoney(rental.penaltyAmount)} VND</p>` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        showResponse('error', '❌ Không tải được danh sách: ' + error.message);
    }
}

// Perform Actions
async function performAction(action) {
    const rentalId = document.getElementById('actionRentalId').value.trim();
    if (!rentalId) {
        alert('Vui lòng nhập Rental ID');
        return;
    }
    
    const actions = {
        'confirm': { method: 'PATCH', url: `${API_BASE}/${rentalId}/confirm` },
        'pickup': { method: 'PATCH', url: `${API_BASE}/${rentalId}/pickup` },
        'return': { method: 'PATCH', url: `${API_BASE}/${rentalId}/return` },
        'complete': { method: 'PATCH', url: `${API_BASE}/${rentalId}/complete` },
        'cancel': { method: 'PATCH', url: `${API_BASE}/${rentalId}/cancel?reason=User cancelled` }
    };
    
    const config = actions[action];
    if (!config) return;
    
    try {
        const response = await fetch(config.url, { method: config.method });
        const result = await response.json();
        
        if (response.ok) {
            showResponse('success', `✅ ${action.toUpperCase()} thành công!`, result);
            loadRentals();
        } else {
            showResponse('error', '❌ Lỗi: ' + (result.message || 'Unknown error'), result);
        }
    } catch (error) {
        showResponse('error', '❌ Lỗi: ' + error.message);
    }
}

// Get Rental History
async function getRentalHistory() {
    const rentalId = document.getElementById('actionRentalId').value.trim();
    if (!rentalId) {
        alert('Vui lòng nhập Rental ID');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/${rentalId}/history`);
        const history = await response.json();
        
        if (response.ok) {
            showResponse('success', `📜 Lịch sử đơn thuê ${rentalId}`, history);
        } else {
            showResponse('error', '❌ Không tìm thấy lịch sử', history);
        }
    } catch (error) {
        showResponse('error', '❌ Lỗi: ' + error.message);
    }
}

// Submit Inspection
async function submitInspection(e) {
    e.preventDefault();
    
    const rentalId = document.getElementById('inspectionRentalId').value;
    const data = {
        hasDamage: document.getElementById('hasDamage').checked,
        notes: document.getElementById('inspectionNotes').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/${rentalId}/inspection`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showResponse('success', '✅ Hoàn tất kiểm tra!', result);
            document.getElementById('inspection-form').reset();
            
            if (data.hasDamage) {
                alert('⚠️ Phát hiện hư hại! Hãy tạo báo cáo hư hại trong Damage App');
            }
        } else {
            showResponse('error', '❌ Lỗi: ' + (result.message || 'Unknown error'), result);
        }
    } catch (error) {
        showResponse('error', '❌ Lỗi: ' + error.message);
    }
}

// Utility functions
function showResponse(type, message, data = null) {
    const div = document.getElementById('response');
    div.className = `response ${type}`;
    div.innerHTML = `
        <p><strong>${message}</strong></p>
        ${data ? `<pre>${JSON.stringify(data, null, 2)}</pre>` : ''}
    `;
    div.style.display = 'block';
    
    setTimeout(() => {
        div.style.display = 'none';
    }, 10000);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('vi-VN');
}

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}
