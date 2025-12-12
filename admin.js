// admin.js
const API_URL = '/api/bookings';
document.addEventListener('DOMContentLoaded', function () {

    // Elemen Statistik
    const statTotal = document.getElementById('statTotal');
    const statPending = document.getElementById('statPending');
    const statApproved = document.getElementById('statApproved');
    const statRejected = document.getElementById('statRejected');
    const reqCount = document.getElementById('reqCount');
    const container = document.getElementById('requestListContainer');

    // --- FUNGSI UTAMA: AMBIL DATA DARI SERVER ---
    async function fetchAndRender() {
        try {
            const response = await fetch(API_URL); // GET
            let allBookings = [];

            if (response.ok) {
                allBookings = await response.json();
                window.allBookings = allBookings; // Simpan global untuk conflict check
            }
            // ... (rest of render logic remains implicitly handled by original function structure, we only target specific lines if possible, but handleAction is global so we might need a bigger chunk or careful replacing)

            // Hitung Statistik
            let counts = { total: allBookings.length, pending: 0, approved: 0, rejected: 0 };
            let pendingList = [];

            allBookings.forEach(data => {
                if (data.status === 'Pending') {
                    counts.pending++;
                    pendingList.push(data);
                }
                if (data.status === 'Approved') counts.approved++;
                if (data.status === 'Rejected' || data.status === 'Cancelled') counts.rejected++;
            });

            // Update Angka UI
            statTotal.innerText = counts.total;
            statPending.innerText = counts.pending;
            statApproved.innerText = counts.approved;
            statRejected.innerText = counts.rejected;
            reqCount.innerText = counts.pending;

            // Render Kartu Request
            container.innerHTML = '';
            if (pendingList.length === 0) {
                container.innerHTML = `<p class="text-muted" style="text-align: center; padding: 20px;">No pending requests.</p>`;
            } else {
                pendingList.forEach(data => renderRequestCard(data));
            }

        } catch (error) {
            console.error("Gagal ambil data:", error);
            container.innerHTML = `<p style="text-align:center; color:red;">Gagal koneksi ke server.</p>`;
        }
    }

    // --- RENDER KARTU ---
    function renderRequestCard(data) {
        // Format Tanggal
        const dateObj = new Date(data.bookingDate);
        const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

        const html = `
            <div class="request-item" id="card-${data.ticketNumber}">
                <div class="req-header">
                    <div>
                        <span class="req-id">${data.ticketNumber}</span>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="req-user">${data.borrowerName} • ${data.department}</span>
                            ${data.whatsapp ? (() => {
                let num = data.whatsapp.replace(/\D/g, '');
                if (num.startsWith('0')) num = '62' + num.slice(1);
                return `<a href="https://wa.me/${num}" target="_blank" title="Chat WhatsApp" style="text-decoration:none; font-size:16px;">💬</a>`;
            })() : ''}
                        </div>
                    </div>
                    <span class="badge badge-black" style="background:#F59E0B; color:white;">Pending</span>
                </div>
                <div class="req-body">
                    <div class="req-info-group">
                        <h4>Purpose:</h4>
                        <p>${data.purpose}</p>
                    </div>
                    <div class="req-info-group">
                        <h4>Date & Time:</h4>
                        <p>${dateStr}<br><span style="font-size:12px;">${data.startTime} - ${data.endTime}</span></p>
                    </div>
                    <div class="req-info-group">
                        <h4>Room:</h4>
                        <p>${data.roomName}</p>
                    </div>
                </div>
                <div class="req-actions">
                    <button class="btn-action btn-approve" onclick="handleAction('${data.ticketNumber}', 'Approved')">✅ Approve</button>
                    <button class="btn-action btn-reject" onclick="handleAction('${data.ticketNumber}', 'Rejected')">⛔ Reject</button>
                </div>
            </div>
        `;
        container.innerHTML += html;
    }

    // Jalankan saat load
    fetchAndRender();

    // --- FUNGSI HANDLE ACTION (Global) ---
    window.handleAction = async (ticketID, newStatus) => {

        // 1. Cek Conflict jika mau Approve
        if (newStatus === 'Approved') {
            const currentRequest = window.allBookings.find(b => b.ticketNumber === ticketID);
            if (currentRequest) {
                const conflict = window.allBookings.find(b =>
                    b.ticketNumber !== ticketID && // Bukan diri sendiri
                    b.status === 'Approved' && // Sudah diapprove
                    b.roomName === currentRequest.roomName && // Ruangan sama
                    b.bookingDate === currentRequest.bookingDate && // Tanggal sama
                    isOverlap(currentRequest.startTime, currentRequest.endTime, b.startTime, b.endTime) // Jam bentrok
                );

                if (conflict) {
                    const modal = document.getElementById('conflictModal');
                    const pText = modal.querySelector('p');
                    if (pText) pText.innerHTML = `Ruangan ini sudah dibooking untuk <b>${conflict.purpose}</b> oleh <b>${conflict.borrowerName} - ${conflict.department}</b>pada jam ${conflict.startTime} - ${conflict.endTime}.`;
                    modal.style.display = 'flex';
                    return; // Stop proses
                }
            }
        }

        // 2. Tampilkan Konfirmasi MODAL
        showConfirmation(
            newStatus === 'Approved' ? 'Setujui Request?' : 'Tolak Request?',
            `Anda akan mengubah status tiket <b>${ticketID}</b> menjadi <b>${newStatus}</b>.`,
            async () => {
                // Callback jika user pilih "Ya"
                try {
                    const response = await fetch(`${API_URL}/${encodeURIComponent(ticketID)}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });

                    if (response.ok) {
                        showStatusModal(true, 'Berhasil!', `Status request berhasil diubah menjadi ${newStatus}.`);
                        fetchAndRender(); // Refresh tampilan
                    } else {
                        showStatusModal(false, 'Gagal!', 'Terjadi kesalahan saat menghubungi server.');
                    }
                } catch (error) {
                    console.error("Error:", error);
                    showStatusModal(false, 'Error!', 'Terjadi kesalahan koneksi.');
                }
            }
        );
    };

    // Helper: Modal Logic
    function showConfirmation(title, msg, onConfirm) {
        const modal = document.getElementById('confirmationModal');
        document.getElementById('confirmTitle').innerText = title;
        document.getElementById('confirmMessage').innerHTML = msg;

        const btn = document.getElementById('confirmBtn');
        // Reset Event Listener biar gak numpuk (cloning node trik paling aman/cepat)
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.onclick = () => {
            modal.style.display = 'none';
            onConfirm();
        };

        modal.style.display = 'flex';
    }

    function showStatusModal(isSuccess, title, msg) {
        const modal = document.getElementById('statusModal');
        const iconWrapper = document.getElementById('statusIcon');
        const iconSpan = iconWrapper.querySelector('.modal-icon');

        document.getElementById('statusTitle').innerText = title;
        document.getElementById('statusMessage').innerText = msg;

        if (isSuccess) {
            iconWrapper.className = 'modal-icon-wrapper success-bg';
            iconSpan.innerText = '✅';
        } else {
            iconWrapper.className = 'modal-icon-wrapper error-bg';
            iconSpan.innerText = '❌';
        }

        modal.style.display = 'flex';
    }

    // Helper: Cek Overlap Jam (Format HH:MM)
    function isOverlap(start1, end1, start2, end2) {
        return (start1 < end2 && start2 < end1);
    }
});