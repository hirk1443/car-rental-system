const API_BASE = 'http://localhost:8082/api/payments';
const INVOICE_API_BASE = 'http://localhost:8082/api/invoices';
const RENTAL_API_BASE = 'http://localhost:8081/api/rentals';

const rentalsById = new Map();

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('create-form').addEventListener('submit', createPayment);
    document.getElementById('process-form').addEventListener('submit', processPayment);
    document.getElementById('refund-form').addEventListener('submit', createRefund);
    document.getElementById('invoice-form').addEventListener('submit', createInvoice);
    document.getElementById('rentalSelect').addEventListener('change', onRentalChange);
    document.getElementById('paymentType').addEventListener('change', updateDefaultPaymentAmount);
    document.getElementById('invoiceRentalSelect').addEventListener('change', onInvoiceRentalChange);
    loadRentalsForCreate();
    loadPayments();
});

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    if (tabName === 'list') loadPayments();
    if (tabName === 'invoice') loadInvoices();
}

async function loadRentalsForCreate() {
    try {
        const response = await fetch(`${RENTAL_API_BASE}?page=0&size=100`);
        const data = await parseApiResponse(response);
        if (!response.ok) throw new Error(getErrorMessage(data));

        const rentals = data.content || [];
        rentalsById.clear();
        rentals.forEach(rental => rentalsById.set(rental.rentalId, rental));

        renderRentalOptions('rentalSelect', rentals);
        renderRentalOptions('invoiceRentalSelect', rentals);
        renderRentalFilterOptions(rentals);
        updateDefaultPaymentAmount();
    } catch (error) {
        showResponse('error', `❌ Không tải được rentals: ${error.message}`);
    }
}

function renderRentalOptions(elementId, rentals) {
    const select = document.getElementById(elementId);
    const options = [
        '<option value="">-- Chọn rental --</option>',
        ...rentals.map(rental =>
            `<option value="${rental.rentalId}">${rental.rentalId} | ${rental.customerId} | ${rental.status}</option>`)
    ];
    select.innerHTML = options.join('');
}

function renderRentalFilterOptions(rentals) {
    const select = document.getElementById('rentalIdFilter');
    select.innerHTML = [
        '<option value="">Tất cả rental</option>',
        ...rentals.map(rental => `<option value="${rental.rentalId}">${rental.rentalId}</option>`)
    ].join('');
}

function onRentalChange() {
    const rentalId = document.getElementById('rentalSelect').value;
    const rental = rentalsById.get(rentalId);
    document.getElementById('customerId').value = rental?.customerId || '';
    document.getElementById('invoiceRentalSelect').value = rentalId || '';
    document.getElementById('invoiceCustomerId').value = rental?.customerId || '';
    updateDefaultPaymentAmount();
}

function onInvoiceRentalChange() {
    const rentalId = document.getElementById('invoiceRentalSelect').value;
    const rental = rentalsById.get(rentalId);
    document.getElementById('invoiceCustomerId').value = rental?.customerId || '';
}

async function createPayment(e) {
    e.preventDefault();

    const data = {
        rentalId: document.getElementById('rentalSelect').value,
        customerId: document.getElementById('customerId').value,
        paymentType: document.getElementById('paymentType').value,
        amount: toNumber(document.getElementById('amount').value),
        paymentMethod: document.getElementById('paymentMethod').value,
        description: document.getElementById('description').value
    };

    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await parseApiResponse(response);

        if (response.ok) {
            showResponse('success', `✅ Tạo payment thành công: ${result.paymentId}`, result);
            document.getElementById('create-form').reset();
            document.getElementById('customerId').value = '';
            updateDefaultPaymentAmount();
            loadPayments();
            return;
        }

        showResponse('error', `❌ ${getErrorMessage(result)}`, result);
    } catch (error) {
        showResponse('error', `❌ Không kết nối được API: ${error.message}`);
    }
}

async function loadPayments() {
    const status = document.getElementById('statusFilter').value;
    const rentalId = document.getElementById('rentalIdFilter').value;

    let url = `${API_BASE}?page=0&size=20`;
    if (status) url += `&status=${encodeURIComponent(status)}`;

    try {
        const response = await fetch(url);
        const data = await parseApiResponse(response);
        if (!response.ok) throw new Error(getErrorMessage(data));

        const payments = data.content || [];
        const listDiv = document.getElementById('payments-list');

        let filtered = payments;
        if (rentalId) filtered = payments.filter(p => p.rentalId === rentalId);

        if (!filtered.length) {
            listDiv.innerHTML = '<p class="empty">Không có thanh toán nào</p>';
            return;
        }

        listDiv.innerHTML = filtered.map(payment => `
            <div class="rental-item">
                <div class="rental-header">
                    <strong>ID: ${payment.paymentId}</strong>
                    <span class="status status-${String(payment.status).toLowerCase()}">${payment.status}</span>
                </div>
                <div class="rental-details">
                    <p>📋 Rental: ${payment.rentalId}</p>
                    <p>👤 Customer: ${payment.customerId}</p>
                    <p>💳 Loại: ${payment.paymentType} - ${payment.paymentMethod}</p>
                    <p>💰 Số tiền: ${formatMoney(payment.amount)} VND</p>
                    ${payment.description ? `<p>📝 ${payment.description}</p>` : ''}
                    ${payment.transactionReference ? `<p>🔖 Ref: ${payment.transactionReference}</p>` : ''}
                    <p>📅 ${formatDate(payment.createdAt)}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showResponse('error', `❌ Không tải được danh sách payment: ${error.message}`);
    }
}

async function processPayment(e) {
    e.preventDefault();
    const paymentId = document.getElementById('processPaymentId').value;
    const data = {
        transactionReference: document.getElementById('transactionReference').value,
        notes: document.getElementById('processNotes').value
    };

    try {
        const response = await fetch(`${API_BASE}/${paymentId}/process`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await parseApiResponse(response);
        if (response.ok) {
            showResponse('success', '✅ Xử lý payment thành công', result);
            loadPayments();
            return;
        }
        showResponse('error', `❌ ${getErrorMessage(result)}`, result);
    } catch (error) {
        showResponse('error', `❌ Lỗi: ${error.message}`);
    }
}

async function createRefund(e) {
    e.preventDefault();
    const paymentId = document.getElementById('refundPaymentId').value;
    const amount = toNumber(document.getElementById('refundAmount').value);
    const reason = encodeURIComponent(document.getElementById('refundReason').value || 'Refund requested');

    try {
        const response = await fetch(`${API_BASE}/${paymentId}/refund?amount=${amount}&reason=${reason}`, {
            method: 'POST'
        });
        const result = await parseApiResponse(response);
        if (response.ok) {
            showResponse('success', '✅ Tạo refund thành công', result);
            loadPayments();
            return;
        }
        showResponse('error', `❌ ${getErrorMessage(result)}`, result);
    } catch (error) {
        showResponse('error', `❌ Lỗi refund: ${error.message}`);
    }
}

async function createInvoice(e) {
    e.preventDefault();
    const data = {
        rentalId: document.getElementById('invoiceRentalSelect').value,
        customerId: document.getElementById('invoiceCustomerId').value,
        rentalFee: toNumber(document.getElementById('invoiceRentalFee').value),
        depositAmount: toNumber(document.getElementById('invoiceDeposit').value),
        penaltyAmount: toNumber(document.getElementById('invoicePenalty').value),
        notes: document.getElementById('invoiceNotes').value
    };

    try {
        const response = await fetch(INVOICE_API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await parseApiResponse(response);
        if (response.ok) {
            showResponse('success', `✅ Tạo invoice thành công: ${result.invoiceNumber}`, result);
            loadInvoices();
            return;
        }
        showResponse('error', `❌ ${getErrorMessage(result)}`, result);
    } catch (error) {
        showResponse('error', `❌ Lỗi invoice: ${error.message}`);
    }
}

async function performInvoiceAction(action) {
    const invoiceId = document.getElementById('invoiceIdAction').value.trim();
    const amount = toNumber(document.getElementById('invoiceAmountAction').value);
    if (!invoiceId) {
        showResponse('error', '❌ Vui lòng nhập invoiceId');
        return;
    }

    const actionMap = {
        penalty: `${INVOICE_API_BASE}/${invoiceId}/penalty?amount=${amount}`,
        paid: `${INVOICE_API_BASE}/${invoiceId}/paid`,
        refund: `${INVOICE_API_BASE}/${invoiceId}/refund?amount=${amount}`
    };

    try {
        const response = await fetch(actionMap[action], { method: 'PATCH' });
        const result = await parseApiResponse(response);
        if (response.ok) {
            showResponse('success', `✅ Thao tác invoice (${action}) thành công`, result);
            loadInvoices();
            return;
        }
        showResponse('error', `❌ ${getErrorMessage(result)}`, result);
    } catch (error) {
        showResponse('error', `❌ Lỗi invoice action: ${error.message}`);
    }
}

async function loadInvoices() {
    try {
        const response = await fetch(`${INVOICE_API_BASE}?page=0&size=20`);
        const data = await parseApiResponse(response);
        if (!response.ok) throw new Error(getErrorMessage(data));

        const invoices = data.content || [];
        const container = document.getElementById('invoices-list');

        if (!invoices.length) {
            container.innerHTML = '<p class="empty">Chưa có invoice</p>';
            return;
        }

        container.innerHTML = invoices.map(invoice => `
            <div class="rental-item">
                <div class="rental-header">
                    <strong>${invoice.invoiceNumber}</strong>
                    <span class="status ${invoice.isPaid ? 'status-completed' : 'status-pending'}">
                        ${invoice.isPaid ? 'PAID' : 'UNPAID'}
                    </span>
                </div>
                <div class="rental-details">
                    <p>🆔 Invoice ID: ${invoice.invoiceId}</p>
                    <p>📋 Rental: ${invoice.rentalId} | 👤 ${invoice.customerId}</p>
                    <p>💰 Total: ${formatMoney(invoice.totalAmount)} | Paid: ${formatMoney(invoice.paidAmount)} | Refund: ${formatMoney(invoice.refundAmount)}</p>
                    <p>⚠️ Penalty: ${formatMoney(invoice.penaltyAmount)} | Deposit: ${formatMoney(invoice.depositAmount)}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showResponse('error', `❌ Không tải được invoices: ${error.message}`);
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
    setTimeout(() => div.style.display = 'none', 10000);
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(toNumber(amount));
}

function updateDefaultPaymentAmount() {
    const rentalId = document.getElementById('rentalSelect').value;
    const paymentType = document.getElementById('paymentType').value;
    const amountInput = document.getElementById('amount');
    const rental = rentalsById.get(rentalId);

    if (!rental) {
        amountInput.value = '0';
        return;
    }

    let defaultAmount = 0;
    if (paymentType === 'DEPOSIT') {
        defaultAmount = toNumber(rental.depositAmount);
    } else if (paymentType === 'RENTAL_FEE') {
        defaultAmount = getDisplayTotalCost(rental);
    } else if (paymentType === 'PENALTY') {
        defaultAmount = toNumber(rental.penaltyAmount);
    }

    amountInput.value = String(Math.max(0, defaultAmount));
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
