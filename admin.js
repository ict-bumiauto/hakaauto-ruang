// admin.js
const API_URL = 'http://localhost:5000/api/bookings';

document.addEventListener('DOMContentLoaded', function() {
    
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
            const allBookings = await response.json();
            
            // Hitung Statistik
            let counts = { total: allBookings.length, pending: 0, approved: 0, rejected: 0 };
            let pendingList = [];

            allBookings.forEach(data => {
                if(data.status === 'Pending') {
                    counts.pending++;
                    pendingList.push(data);
                }
                if(data.status === 'Approved') counts.approved++;
                if(data.status === 'Rejected' || data.status === 'Cancelled') counts.rejected++;
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
                        <span class="req-user">${data.borrowerName} • ${data.department}</span>
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
        if(!confirm(`Are you sure you want to ${newStatus} this request?`)) return;

        try {
            // PERBAIKAN DISINI: Tambahkan encodeURIComponent(ticketID)
            const response = await fetch(`${API_URL}/${encodeURIComponent(ticketID)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                alert(`Request ${newStatus}!`);
                fetchAndRender(); // Refresh tampilan otomatis
            } else {
                alert("Gagal update status. (Server Error)");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Terjadi kesalahan server.");
        }
    };
});