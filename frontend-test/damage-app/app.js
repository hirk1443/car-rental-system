const API_BASE = 'http://localhost:8080/api/damage-reports';
const RENTAL_API_BASE = 'http://localhost:8081/api/rentals';

const rentalsById = new Map();

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('create-form').addEventListener('submit', createDamageReport);
    document.getElementById('penalty-form').addEventListener('submit', updateDamageStatus);
    document.getElementById('rentalSelect').addEventListener('change', onRentalChange);
    loadRentalsForCreate();
    loadDamages();
});

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    if (tabName === 'list' || tabName === 'penalty') loadDamages();
}

async function loadRentalsForCreate() {
    try {
        const response = await fetch(`${RENTAL_API_BASE}?page=0&size=200`);
        const data = await parseApiResponse(response);
        if (!response.ok) throw new Error(getErrorMessage(data));

        const rentals = (data.content || []).filter(
            rental => rental.status === 'INSPECTION' || rental.status === 'PENALTY_DUE'
        );
        rentalsById.clear();
        rentals.forEach(rental => rentalsById.set(rental.rentalId, rental));
        renderRentalOptions(rentals);
        updateSelectedRentalStatus('');
    } catch (error) {
        showResponse('error', `❌ Không tải được rentals: ${error.message}`);
    }
}

function renderRentalOptions(rentals) {
    const select = document.getElementById('rentalSelect');
    select.innerHTML = [
        '<option value="">-- Chọn rental đang INSPECTION/PENALTY_DUE --</option>',
        ...rentals.map(rental => `<option value="${rental.rentalId}">${rental.rentalId} | ${rental.customerId} | ${rental.status}</option>`)
    ].join('');
}

function onRentalChange() {
    const rentalId = document.getElementById('rentalSelect').value;
    const rental = rentalsById.get(rentalId);
    document.getElementById('vehicleId').value = rental?.vehicleId || '';
    document.getElementById('customerId').value = rental?.customerId || '';
    updateSelectedRentalStatus(rentalId);
}

function updateSelectedRentalStatus(rentalId) {
    const statusText = document.getElementById('selectedRentalStatus');
    if (!rentalId) {
        statusText.textContent = 'Trạng thái hiện tại: (chưa chọn rental)';
        return;
    }
    const rental = rentalsById.get(rentalId);
    statusText.textContent = `Trạng thái hiện tại: ${rental?.status || 'Không xác định'}`;
}

async function createDamageReport(e) {
    e.preventDefault();
    const data = {
        rentalId: document.getElementById('rentalSelect').value,
        vehicleId: document.getElementById('vehicleId').value,
        customerId: document.getElementById('customerId').value,
        damageType: document.getElementById('damageType').value,
        severity: document.getElementById('severity').value,
        description: document.getElementById('description').value,
        locationOnVehicle: document.getElementById('locationOnVehicle').value.trim() || null,
        reportedBy: document.getElementById('reportedBy').value.trim() || null,
        imageUrls: parseImageUrls(document.getElementById('imageUrls').value)
    };

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await parseApiResponse(response);

        if (response.ok) {
            await syncRentalPenalty(result);
            showResponse('success', `✅ Tạo damage report thành công: ${result.damageId}`, result);
            appendDamageOption(result);
            document.getElementById('create-form').reset();
            document.getElementById('vehicleId').value = '';
            document.getElementById('customerId').value = '';
            updateSelectedRentalStatus('');
            loadDamages();
            loadRentalsForCreate();
            return;
        }

        showResponse('error', `❌ ${getErrorMessage(result)}`, result);
    } catch (error) {
        showResponse('error', `❌ Không kết nối được API: ${error.message}`);
    }
}

async function loadDamages() {
    const status = document.getElementById('statusFilter').value;
    let url = `${API_BASE}?page=0&size=50`;
    if (status) url += `&status=${encodeURIComponent(status)}`;

    try {
        const response = await fetch(url);
        const data = await parseApiResponse(response);
        if (!response.ok) throw new Error(getErrorMessage(data));

        const damages = data.content || [];
        const listDiv = document.getElementById('damages-list');

        renderDamageOptions(damages);
        if (!damages.length) {
            listDiv.innerHTML = '<p class="empty">Không có báo cáo hư hại nào</p>';
            return;
        }

        listDiv.innerHTML = damages.map(dmg => `
            <div class="rental-item">
                <div class="rental-header">
                    <strong>ID: ${dmg.damageId}</strong>
                    <span class="status status-${String(dmg.status).toLowerCase()}">${dmg.status}</span>
                </div>
                <div class="rental-details">
                    <p>🚗 Rental: ${dmg.rentalId}</p>
                    <p>🚙 Vehicle: ${dmg.vehicleId}</p>
                    <p>👤 Customer: ${dmg.customerId}</p>
                    <p>⚠️ Loại: ${dmg.damageType} - Mức độ: ${dmg.severity}</p>
                    <p>📝 ${dmg.description}</p>
                    ${dmg.locationOnVehicle ? `<p>📍 Vị trí: ${dmg.locationOnVehicle}</p>` : ''}
                    ${dmg.reportedBy ? `<p>👷 Ghi nhận bởi: ${dmg.reportedBy}</p>` : ''}
                    ${dmg.imageUrls?.length ? `<p>🖼️ Ảnh: ${dmg.imageUrls.length} file</p>` : ''}
                    <p>💰 Chi phí sửa chữa: ${formatMoney(dmg.repairCost)} VND</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showResponse('error', `❌ Không tải được damages: ${error.message}`);
    }
}

function renderDamageOptions(damages) {
    const select = document.getElementById('damageIdSelect');
    select.innerHTML = [
        '<option value="">-- Chọn damage report --</option>',
        ...damages.map(dmg => `<option value="${dmg.damageId}">${dmg.damageId} | rental ${dmg.rentalId}</option>`)
    ].join('');
}

function appendDamageOption(damage) {
    const select = document.getElementById('damageIdSelect');
    if (select.querySelector(`option[value="${damage.damageId}"]`)) return;
    const option = document.createElement('option');
    option.value = damage.damageId;
    option.textContent = `${damage.damageId} | rental ${damage.rentalId}`;
    select.appendChild(option);
}

async function updateDamageStatus(e) {
    e.preventDefault();
    const damageId = document.getElementById('damageIdSelect').value;
    const status = document.getElementById('newStatus').value;
    const repairCost = toNumber(document.getElementById('repairCost').value);

    try {
        const response = await fetch(`${API_BASE}/${damageId}?status=${status}&repairCost=${repairCost}`, { method: 'PATCH' });
        const result = await parseApiResponse(response);
        if (response.ok) {
            await syncRentalPenalty(result);
            showResponse('success', `✅ Cập nhật damage thành công: ${status}`, result);
            loadDamages();
            return;
        }
        showResponse('error', `❌ ${getErrorMessage(result)}`, result);
    } catch (error) {
        showResponse('error', `❌ Lỗi update damage: ${error.message}`);
    }
}

async function syncRentalPenalty(damage) {
    const rentalId = damage?.rentalId;
    const repairCost = toNumber(damage?.repairCost);
    if (!rentalId || repairCost <= 0) return;

    const response = await fetch(`${RENTAL_API_BASE}/${rentalId}/penalty?amount=${repairCost}`, { method: 'PATCH' });
    const result = await parseApiResponse(response);
    if (!response.ok) {
        throw new Error(getErrorMessage(result));
    }
}

function parseImageUrls(rawValue) {
    if (!rawValue) return [];
    return rawValue.split('\n').map(line => line.trim()).filter(Boolean);
}

function showResponse(type, message, data = null) {
    const div = document.getElementById('response');
    div.className = `response ${type}`;
    div.innerHTML = `
        <p><strong>${message}</strong></p>
        ${data ? `<pre>${JSON.stringify(data, null, 2)}</pre>` : ''}
    `;
    div.style.display = 'block';
    if (type === 'error') {
        alert(message);
    }
    setTimeout(() => div.style.display = 'none', 10000);
}

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(toNumber(amount));
}

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

async function parseApiResponse(response) {
    const raw = await response.text();
    if (!raw) return {};

    try {
        return JSON.parse(raw);
    } catch {
        return { message: raw };
    }
}

function getErrorMessage(result) {
    if (!result) return 'Lỗi không xác định';
    const fieldErrors = result.fieldErrors && typeof result.fieldErrors === 'object'
        ? Object.entries(result.fieldErrors).map(([field, message]) => `${field}: ${message}`).join(' | ')
        : '';
    return fieldErrors || result.message || result.error || 'Lỗi không xác định';
}
