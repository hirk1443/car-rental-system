const API_BASE = 'http://localhost:8080/api/damage-reports';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('create-form').addEventListener('submit', createDamageReport);
    document.getElementById('penalty-form').addEventListener('submit', updateDamageStatus);
    loadDamages();
});

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    if (tabName === 'list') loadDamages();
}

async function createDamageReport(e) {
    e.preventDefault();
    
    const data = {
        rentalId: document.getElementById('rentalId').value,
        vehicleId: document.getElementById('vehicleId').value,
        damageType: document.getElementById('damageType').value,
        severity: document.getElementById('severity').value,
        description: document.getElementById('description').value,
        estimatedCost: parseFloat(document.getElementById('estimatedCost').value)
    };
    
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showResponse('success', `✅ Tạo báo cáo hư hại thành công! ID: ${result.damageId}`, result);
            document.getElementById('create-form').reset();
        } else {
            showResponse('error', '❌ Lỗi: ' + (result.message || 'Unknown error'), result);
        }
    } catch (error) {
        showResponse('error', '❌ Không kết nối được API: ' + error.message);
    }
}

async function loadDamages() {
    const status = document.getElementById('statusFilter').value;
    let url = API_BASE + '?page=0&size=20';
    if (status) url += `&status=${status}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const damages = data.content || [];
        const listDiv = document.getElementById('damages-list');
        
        if (damages.length === 0) {
            listDiv.innerHTML = '<p class="empty">Không có báo cáo hư hại nào</p>';
            return;
        }
        
        listDiv.innerHTML = damages.map(dmg => `
            <div class="rental-item">
                <div class="rental-header">
                    <strong>ID: ${dmg.damageId}</strong>
                    <span class="status status-${dmg.status.toLowerCase()}">${dmg.status}</span>
                </div>
                <div class="rental-details">
                    <p>🚗 Rental: ${dmg.rentalId}</p>
                    <p>🚙 Vehicle: ${dmg.vehicleId}</p>
                    <p>⚠️ Loại: ${dmg.damageType} - Mức độ: ${dmg.severity}</p>
                    <p>📝 ${dmg.description}</p>
                    <p>💰 Ước tính: ${formatMoney(dmg.estimatedCost)} VND</p>
                    ${dmg.actualRepairCost ? `<p class="penalty">💵 Chi phí thực: ${formatMoney(dmg.actualRepairCost)} VND</p>` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        showResponse('error', '❌ Không tải được danh sách: ' + error.message);
    }
}

async function updateDamageStatus(e) {
    e.preventDefault();
    
    const damageId = document.getElementById('damageId').value;
    const status = document.getElementById('newStatus').value;
    const repairCost = document.getElementById('repairCost').value;
    
    try {
        const response = await fetch(
            `${API_BASE}/${damageId}?status=${status}&repairCost=${repairCost}`,
            { method: 'PATCH' }
        );
        
        const result = await response.json();
        
        if (response.ok) {
            showResponse('success', `✅ Cập nhật thành công! Status: ${status}`, result);
            
            if (status === 'APPROVED') {
                showResponse('success', '🔔 Đã gửi event tính phạt! Kiểm tra Rental và Payment Service.', result);
            }
            
            document.getElementById('penalty-form').reset();
            loadDamages();
        } else {
            showResponse('error', '❌ Lỗi: ' + (result.message || 'Unknown error'), result);
        }
    } catch (error) {
        showResponse('error', '❌ Lỗi: ' + error.message);
    }
}

function showResponse(type, message, data = null) {
    const div = document.getElementById('response');
    div.className = `response ${type}`;
    div.innerHTML = `
        <p><strong>${message}</strong></p>
        ${data ? `<pre>${JSON.stringify(data, null, 2)}</pre>` : ''}
    `;
    div.style.display = 'block';
    setTimeout(() => div.style.display = 'none', 10000);
}

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}
