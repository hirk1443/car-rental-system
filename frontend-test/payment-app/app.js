const API_BASE = 'http://localhost:8082/api/payments';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('create-form').addEventListener('submit', createPayment);
    document.getElementById('process-form').addEventListener('submit', processPayment);
    document.getElementById('refund-form').addEventListener('submit', createRefund);
    loadPayments();
});

function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    if (tabName === 'list') loadPayments();
}

async function createPayment(e) {
    e.preventDefault();
    
    const data = {
        rentalId: document.getElementById('rentalId').value,
        customerId: document.getElementById('customerId').value,
        paymentType: document.getElementById('paymentType').value,
        amount: parseFloat(document.getElementById('amount').value),
        method: document.getElementById('method').value,
        description: document.getElementById('description').value
    };
    
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showResponse('success', `✅ Tạo thanh toán thành công! Payment ID: ${result.paymentId}`, result);
            document.getElementById('create-form').reset();
        } else {
            showResponse('error', '❌ Lỗi: ' + (result.message || 'Unknown error'), result);
        }
    } catch (error) {
        showResponse('error', '❌ Không kết nối được API: ' + error.message);
    }
}

async function loadPayments() {
    const status = document.getElementById('statusFilter').value;
    const rentalId = document.getElementById('rentalIdFilter').value;
    
    let url = API_BASE + '?page=0&size=20';
    if (status) url += `&status=${status}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const payments = data.content || [];
        const listDiv = document.getElementById('payments-list');
        
        if (payments.length === 0) {
            listDiv.innerHTML = '<p class="empty">Không có thanh toán nào</p>';
            return;
        }
        
        let filtered = payments;
        if (rentalId) {
            filtered = payments.filter(p => p.rentalId.includes(rentalId));
        }
        
        listDiv.innerHTML = filtered.map(payment => `
            <div class="rental-item">
                <div class="rental-header">
                    <strong>ID: ${payment.paymentId}</strong>
                    <span class="status status-${payment.status.toLowerCase()}">${payment.status}</span>
                </div>
                <div class="rental-details">
                    <p>📋 Rental: ${payment.rentalId}</p>
                    <p>👤 Customer: ${payment.customerId}</p>
                    <p>💳 Loại: ${payment.paymentType} - ${payment.method}</p>
                    <p>💰 Số tiền: ${formatMoney(payment.amount)} VND</p>
                    ${payment.description ? `<p>📝 ${payment.description}</p>` : ''}
                    ${payment.transactionId ? `<p>🔖 Transaction: ${payment.transactionId}</p>` : ''}
                    <p>📅 ${formatDate(payment.createdAt)}</p>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        showResponse('error', '❌ Không tải được danh sách: ' + error.message);
    }
}

async function processPayment(e) {
    e.preventDefault();
    
    const paymentId = document.getElementById('processPaymentId').value;
    const data = {
        transactionId: document.getElementById('transactionId').value,
        reference: document.getElementById('reference').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/${paymentId}/process`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showResponse('success', '✅ Xử lý thanh toán thành công!', result);
            document.getElementById('process-form').reset();
            loadPayments();
        } else {
            showResponse('error', '❌ Lỗi: ' + (result.message || 'Unknown error'), result);
        }
    } catch (error) {
        showResponse('error', '❌ Lỗi: ' + error.message);
    }
}

async function createRefund(e) {
    e.preventDefault();
    
    const paymentId = document.getElementById('refundPaymentId').value;
    const amount = document.getElementById('refundAmount').value;
    const reason = document.getElementById('refundReason').value;
    
    try {
        const response = await fetch(
            `${API_BASE}/${paymentId}/refund?amount=${amount}&reason=${encodeURIComponent(reason)}`,
            { method: 'POST' }
        );
        
        const result = await response.json();
        
        if (response.ok) {
            showResponse('success', '✅ Tạo hoàn tiền thành công!', result);
            document.getElementById('refund-form').reset();
            loadPayments();
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

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatMoney(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}
