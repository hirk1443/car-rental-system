const API_BASE = 'http://localhost:8081/api/rentals';
const PAYMENT_API_BASE = 'http://localhost:8082/api/payments';

const rentalsById = new Map();

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    document.getElementById('startDate').valueAsDate = tomorrow;
    document.getElementById('endDate').valueAsDate = nextWeek;

    document.getElementById('create-form').addEventListener('submit', createRental);
    document.getElementById('inspection-form').addEventListener('submit', submitInspection);
    document.getElementById('actionRentalId').addEventListener('change', onActionRentalChange);

    loadRentals();
    loadActionRentals();
});

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    if (tabName === 'list') {
        loadRentals();
    }
    if (tabName === 'actions') {
        loadActionRentals();
    }
}

async function createRental(e) {
    e.preventDefault();

    const data = {
        customerId: document.getElementById('customerId').value.trim(),
        vehicleId: document.getElementById('vehicleId').value.trim(),
        startDate: `${document.getElementById('startDate').value}T00:00:00`,
        endDate: `${document.getElementById('endDate').value}T23:59:59`,
        pickupLocation: document.getElementById('pickupLocation').value.trim(),
        returnLocation: document.getElementById('returnLocation').value.trim(),
        dailyRate: toNumber(document.getElementById('rentalAmount').value),
        depositAmount: toNumber(document.getElementById('depositAmount').value)
    };

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await parseApiResponse(response);

        if (response.ok) {
            showResponse('success', `✅ Tạo đơn thuê thành công! Rental ID: ${result.rentalId}`, result);
            document.getElementById('create-form').reset();
            loadRentals();
            loadActionRentals();
            return;
        }

        showResponse('error', `❌ ${getErrorMessage(result)}`, result);
    } catch (error) {
        showResponse('error', `❌ Không kết nối được API: ${error.message}`);
    }
}

async function loadRentals() {
    const status = document.getElementById('statusFilter').value;
    let url = `${API_BASE}?page=0&size=50`;
    if (status) url += `&status=${encodeURIComponent(status)}`;

    try {
        const response = await fetch(url);
        const data = await parseApiResponse(response);
        if (!response.ok) {
            throw new Error(getErrorMessage(data));
        }

        const rentals = data.content || [];
        const listDiv = document.getElementById('rentals-list');

        if (!rentals.length) {
            listDiv.innerHTML = '<p class="empty">Không có đơn thuê nào</p>';
            return;
        }

        listDiv.innerHTML = rentals.map(rental => {
            const totalCost = getDisplayTotalCost(rental);
            const depositAmount = toNumber(rental.depositAmount);
            const penaltyAmount = toNumber(rental.penaltyAmount);
            return `
            <div class="rental-item">
                <div class="rental-header">
                    <strong>ID: ${rental.rentalId}</strong>
                    <span class="status status-${String(rental.status || '').toLowerCase()}">${rental.status || 'N/A'}</span>
                </div>
                <div class="rental-details">
                    <p>👤 Customer: ${rental.customerId}</p>
                    <p>🚗 Vehicle: ${rental.vehicleId}</p>
                    <p>📅 ${formatDate(rental.startDate)} → ${formatDate(rental.endDate)}</p>
                    <p>💰 Tổng tiền: ${formatMoney(totalCost)} VND</p>
                    <p>💵 Đặt cọc: ${formatMoney(depositAmount)} VND</p>
                    ${penaltyAmount > 0 ? `<p class="penalty">⚠️ Phạt: ${formatMoney(penaltyAmount)} VND</p>` : ''}
                    ${rental.hasDamage ? `<p class="penalty">🛠️ Có hư hại | DamageReport: ${rental.damageReportId || '(chưa gắn)'}</p>` : ''}
                </div>
            </div>
        `;
        }).join('');
    } catch (error) {
        showResponse('error', `❌ Không tải được danh sách: ${error.message}`);
    }
}

async function loadActionRentals() {
    try {
        const response = await fetch(`${API_BASE}?page=0&size=100`);
        const data = await parseApiResponse(response);
        if (!response.ok) {
            throw new Error(getErrorMessage(data));
        }

        const rentals = data.content || [];
        rentalsById.clear();
        rentals.forEach(rental => rentalsById.set(rental.rentalId, rental));

        const options = [
            '<option value="">-- Chọn Rental ID --</option>',
            ...rentals.map(rental => `<option value="${rental.rentalId}">${rental.rentalId} | ${rental.status}</option>`)
        ];

        document.getElementById('actionRentalId').innerHTML = options.join('');
        document.getElementById('inspectionRentalId').innerHTML = options.join('');
        updateActionRentalStatus('');
    } catch (error) {
        showResponse('error', `❌ Không tải được danh sách rental: ${error.message}`);
    }
}

function onActionRentalChange() {
    const rentalId = document.getElementById('actionRentalId').value;
    updateActionRentalStatus(rentalId);
    document.getElementById('inspectionRentalId').value = rentalId;
}

function updateActionRentalStatus(rentalId) {
    const statusTag = document.getElementById('actionRentalStatus');
    if (!rentalId) {
        statusTag.textContent = 'Trạng thái hiện tại: (chưa chọn rental)';
        return;
    }

    const rental = rentalsById.get(rentalId);
    statusTag.textContent = `Trạng thái hiện tại: ${rental?.status || 'Không xác định'}`;
}

async function performAction(action) {
    const rentalId = document.getElementById('actionRentalId').value;
    if (!rentalId) {
        showResponse('error', '❌ Vui lòng chọn Rental ID');
        return;
    }

    if (action === 'confirm' || action === 'complete') {
        const paymentCheck = await validatePaymentPrerequisites(action, rentalId);
        if (!paymentCheck.allowed) {
            showResponse('error', `❌ ${paymentCheck.message}`);
            return;
        }
    }

    const actions = {
        confirm: { method: 'PATCH', url: `${API_BASE}/${rentalId}/confirm` },
        pickup: { method: 'PATCH', url: `${API_BASE}/${rentalId}/pickup` },
        return: { method: 'PATCH', url: `${API_BASE}/${rentalId}/return` },
        complete: { method: 'PATCH', url: `${API_BASE}/${rentalId}/complete` },
        cancel: { method: 'PATCH', url: `${API_BASE}/${rentalId}/cancel?reason=Cancelled%20from%20frontend-test` }
    };

    const config = actions[action];
    if (!config) return;

    try {
        const response = await fetch(config.url, { method: config.method });
        const result = await parseApiResponse(response);

        if (response.ok) {
            showResponse('success', `✅ ${action.toUpperCase()} thành công!`, result);
            loadRentals();
            loadActionRentals();
            return;
        }

        showResponse('error', `❌ ${getErrorMessage(result)}`, result);
    } catch (error) {
        showResponse('error', `❌ Lỗi: ${error.message}`);
    }
}

async function validatePaymentPrerequisites(action, rentalId) {
    try {
        const rental = await fetchRentalById(rentalId);
        const payments = await fetchPaymentsByRental(rentalId);

        if (action === 'confirm') {
            const requiredDeposit = toNumber(rental.depositAmount);
            const paidDeposit = getCompletedPaidAmount(payments, 'DEPOSIT');

            if (requiredDeposit > 0 && paidDeposit < requiredDeposit) {
                return {
                    allowed: false,
                    message: `Chưa thanh toán đủ tiền đặt cọc (${formatMoney(paidDeposit)}/${formatMoney(requiredDeposit)} VND), chưa thể xác nhận.`
                };
            }
            return { allowed: true };
        }

        const requiredRentalFee = getDisplayTotalCost(rental);
        const paidRentalFee = getCompletedPaidAmount(payments, 'RENTAL_FEE');
        if (requiredRentalFee > 0 && paidRentalFee < requiredRentalFee) {
            return {
                allowed: false,
                message: `Chưa thanh toán đủ tiền thuê xe (${formatMoney(paidRentalFee)}/${formatMoney(requiredRentalFee)} VND), chưa thể completed.`
            };
        }

        const requiredPenalty = toNumber(rental.penaltyAmount);
        const paidPenalty = getCompletedPaidAmount(payments, 'PENALTY');
        if (requiredPenalty > 0 && paidPenalty < requiredPenalty) {
            return {
                allowed: false,
                message: `Rental có phí phạt nhưng chưa thanh toán đủ (${formatMoney(paidPenalty)}/${formatMoney(requiredPenalty)} VND), chưa thể completed.`
            };
        }

        return { allowed: true };
    } catch (error) {
        return { allowed: false, message: `Không kiểm tra được trạng thái payment: ${error.message}` };
    }
}

async function fetchRentalById(rentalId) {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(rentalId)}`);
    const result = await parseApiResponse(response);
    if (!response.ok) {
        throw new Error(getErrorMessage(result));
    }
    return result;
}

async function fetchPaymentsByRental(rentalId) {
    const response = await fetch(`${PAYMENT_API_BASE}/rental/${encodeURIComponent(rentalId)}`);
    const result = await parseApiResponse(response);
    if (!response.ok) {
        throw new Error(getErrorMessage(result));
    }
    return Array.isArray(result) ? result : [];
}

function getCompletedPaidAmount(payments, paymentType) {
    return payments
        .filter(payment => payment.paymentType === paymentType && payment.status === 'COMPLETED')
        .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
}

async function loadRentalHistory() {
    const rentalId = document.getElementById('actionRentalId').value;
    if (!rentalId) {
        showResponse('error', '❌ Vui lòng chọn Rental ID để xem lịch sử');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${rentalId}/history`);
        const result = await parseApiResponse(response);
        if (!response.ok) {
            showResponse('error', `❌ ${getErrorMessage(result)}`, result);
            return;
        }

        const history = Array.isArray(result) ? result : [];
        const container = document.getElementById('rental-history');
        if (!history.length) {
            container.innerHTML = '<p class="empty">Chưa có lịch sử trạng thái</p>';
            return;
        }

        container.innerHTML = history.map(item => `
            <p>• ${formatDate(item.changedAt)}: ${item.fromStatus || 'INIT'} → ${item.toStatus} (${item.notes || 'N/A'})</p>
        `).join('');
    } catch (error) {
        showResponse('error', `❌ Lỗi tải lịch sử: ${error.message}`);
    }
}

async function submitInspection(e) {
    e.preventDefault();

    const rentalId = document.getElementById('inspectionRentalId').value;
    const data = {
        hasDamage: document.getElementById('hasDamage').checked,
        inspectionNotes: document.getElementById('inspectionNotes').value
    };

    try {
        const response = await fetch(`${API_BASE}/${rentalId}/inspection`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await parseApiResponse(response);

        if (response.ok) {
            showResponse('success', '✅ Hoàn tất kiểm tra!', result);
            document.getElementById('inspection-form').reset();
            loadRentals();
            loadActionRentals();

            if (data.hasDamage) {
                alert('⚠️ Phát hiện hư hại! Hãy tạo báo cáo hư hại trong Damage App');
            }
            return;
        }

        showResponse('error', `❌ ${getErrorMessage(result)}`, result);
    } catch (error) {
        showResponse('error', `❌ Lỗi: ${error.message}`);
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
    if (type === 'error') {
        alert(message);
    }

    setTimeout(() => {
        div.style.display = 'none';
    }, 10000);
}

function getDisplayTotalCost(rental) {
    const direct = toNumber(rental.totalCost);
    if (direct > 0) return direct;

    const dailyRate = toNumber(rental.dailyRate);
    if (dailyRate <= 0) return 0;

    const start = new Date(rental.startDate);
    const end = new Date(rental.endDate);
    const ms = end.getTime() - start.getTime();
    const days = Number.isFinite(ms) && ms > 0 ? Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24))) : 1;
    return dailyRate * days;
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('vi-VN');
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

// Ensure inline onclick handlers always resolve from global scope.
window.loadActionRentals = loadActionRentals;
window.loadRentalHistory = loadRentalHistory;
window.performAction = performAction;
window.loadRentals = loadRentals;
window.showTab = showTab;
