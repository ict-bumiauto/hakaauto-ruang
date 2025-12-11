// GANTI DENGAN LINK API VERCEL ANDA
const API_URL = '/api/bookings'; 

// ==========================================
// 1. SATPAM HALAMAN (Security)
// ==========================================
(function() {
    const user = localStorage.getItem('currentUser');
    const bookingForm = document.getElementById('bookingForm'); 

    // Jika ada Form Booking TAPI User belum login -> Tendang ke Login
    if (bookingForm && !user) {
        alert("Akses Ditolak: Anda harus login dulu!");
        window.location.href = '/login'; 
        throw new Error("Access Denied"); 
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 App.js Dimulai...");

    // ============================================================
    // 2. INITIALIZATION & AUTO-FILL
    // ============================================================
    const savedName = localStorage.getItem('currentUser');

    // Header Nama
    const headerName = document.getElementById('headerUserName');
    if(headerName) headerName.innerText = savedName || 'Guest';

    // Auto-fill Form
    const formName = document.getElementById('formBorrowerName');
    if(formName) formName.value = savedName || '';

    const savedDivision = localStorage.getItem('userDivision');
    const sbuSelect = document.querySelector('select[name="sbu"]'); 
    if (sbuSelect && savedDivision) sbuSelect.value = savedDivision; 

    const savedPhone = localStorage.getItem('userPhone');
    const waInput = document.getElementById('whatsapp') || document.querySelector('input[name="whatsappNumber"]');
    if (waInput && savedPhone) waInput.value = savedPhone;

    // Sign Out
    const signOutBtn = document.querySelector('.sign-out-btn');
    if (signOutBtn) {
        signOutBtn.onclick = (e) => {
            e.preventDefault(); localStorage.clear(); window.location.href = '/login'; 
        };
    }

    // ============================================================
    // 3. GENERATE TIME DROPDOWNS (JAM)
    // ============================================================
    function populateTimeSelects() {
        const startSelect = document.querySelector('select[name="startTime"]');
        const endSelect = document.querySelector('select[name="endTime"]');

        if (!startSelect || !endSelect) return;

        startSelect.innerHTML = '<option value="">Select time</option>';
        endSelect.innerHTML = '<option value="">Select time</option>';

        for (let i = 8; i <= 18; i++) { // 08:00 - 18:00
            const h = i.toString().padStart(2, '0');
            startSelect.add(new Option(`${h}:00`, `${h}:00`));
            endSelect.add(new Option(`${h}:00`, `${h}:00`));
            if (i < 18) {
                startSelect.add(new Option(`${h}:30`, `${h}:30`));
                endSelect.add(new Option(`${h}:30`, `${h}:30`));
            }
        }
        // Auto-select end time
        startSelect.addEventListener('change', function() {
            if(!this.value) return;
            let [h, m] = this.value.split(':').map(Number);
            h += 1; // Default durasi 1 jam
            const next = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
            const exist = [...endSelect.options].some(o => o.value === next);
            if(exist) endSelect.value = next;
        });
    }
    populateTimeSelects();

    // ============================================================
    // 4. FETCH DATA (UNTUK STATISTIK & CEK BENTROK) - INI YG HILANG TADI
    // ============================================================
    async function initDashboardData() {
        try {
            const res = await fetch(API_URL);
            if(!res.ok) return;
            const allBookings = await res.json();
            
            // Update Sidebar Statistik
            updateStatsAndRecent(allBookings);

        } catch(e) { console.error("Gagal load data dashboard:", e); }
    }
    initDashboardData(); // PANGGIL LANGSUNG SAAT LOAD

    function updateStatsAndRecent(allBookings) {
        // A. Update Angka Statistik
        const statsList = document.querySelector('.quick-stats .stats-list');
        if (statsList) { // Pastikan elemennya ada di dashboard.html
            const total = allBookings.length;
            const approved = allBookings.filter(b => b.status === 'Approved').length;
            const pending = allBookings.filter(b => b.status === 'Pending').length;
            
            // Asumsi urutan HTML: Total -> Approved -> Pending
            const items = statsList.querySelectorAll('.stat-item .stat-value');
            if(items.length >= 3) {
                items[0].innerText = total;
                items[1].innerText = approved;
                items[2].innerText = pending;
            }
        }

        // B. Update Recent Bookings Sidebar
        const recentContainer = document.querySelector('.recent-bookings'); // Wadah sidebar kanan
        if (recentContainer) {
            // Kita cari list di dalamnya atau buat baru
            let listDiv = recentContainer.querySelector('.recent-list') || recentContainer;
            
            const recentData = allBookings.slice(0, 5); // 5 Data terbaru
            
            if (recentData.length === 0) {
                listDiv.innerHTML = '<h3>Recent Bookings</h3><p style="color:#999; font-size:12px;">No bookings yet.</p>';
            } else {
                let html = '<h3>Recent Bookings</h3><ul style="list-style:none; padding:0;">';
                recentData.forEach(b => {
                    let color = b.status === 'Approved' ? '#10B981' : (b.status === 'Pending' ? '#F59E0B' : '#EF4444');
                    html += `
                    <li style="border-bottom:1px solid #eee; padding-bottom:8px; margin-bottom:8px;">
                        <div style="display:flex; justify-content:space-between;">
                            <strong style="font-size:13px;">${b.borrowerName}</strong>
                            <span style="font-size:10px; color:${color}; border:1px solid ${color}; padding:1px 4px; border-radius:4px;">${b.status}</span>
                        </div>
                        <div style="font-size:11px; color:#666;">${b.roomName}</div>
                        <div style="font-size:11px; color:#999;">${b.bookingDate}</div>
                    </li>`;
                });
                html += '</ul>';
                listDiv.innerHTML = html;
            }
        }
    }


    // ============================================================
    // 5. HANDLE SUBMIT FORM (BOOKING)
    // ============================================================
    const form = document.getElementById('bookingForm');
    const submitBtn = document.querySelector('.submit-btn');

    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            // Cek Integrity
            const integrity = form.querySelector('input[name="integrity"]');
            if (integrity && !integrity.checked) {
                alert('Please agree to the Integrity Pact.'); return;
            }

            // UI Loading
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "⏳ Sending...";
            submitBtn.disabled = true;

            try {
                // Ambil Addons
                let addonsData = [];
                document.querySelectorAll('select[name="addonType[]"]').forEach((sel, i) => {
                    const det = document.querySelectorAll('input[name="addonDetail[]"]')[i].value;
                    if(det.trim()) addonsData.push({ type: sel.value, detail: det });
                });

                // Siapkan Data
                const bookingData = {
                    ticketNumber: 'T-' + Date.now(),
                    borrowerName: document.getElementById('formBorrowerName').value,
                    borrowerEmail: localStorage.getItem('userEmail'), // EMAIL STAFF
                    department: document.querySelector('select[name="sbu"]').value,
                    whatsapp: document.querySelector('input[name="whatsappNumber"]').value,
                    purpose: document.getElementById('purpose').value,
                    bookingDate: document.querySelector('input[name="date"]').value,
                    startTime: document.querySelector('select[name="startTime"]').value,
                    endTime: document.querySelector('select[name="endTime"]').value,
                    roomName: document.querySelector('select[name="roomName"]').value,
                    participants: document.getElementById('participants')?.value || document.getElementById('numParticipants')?.value,
                    addOns: addonsData,
                    notes: document.getElementById('notes')?.value || "",
                    status: (localStorage.getItem('userRole') === 'admin') ? 'Approved' : 'Pending'
                };

                // Kirim ke Backend
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify(bookingData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert("✅ Booking Berhasil!");
                    window.location.href = '/calendar';
                } else {
                    alert("❌ Gagal: " + result.message);
                }

            } catch (error) {
                console.error(error);
                alert("Error Koneksi.");
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // ============================================================
    // 6. HELPER: ADD-ONS DYNAMIC ROW
    // ============================================================
    const btnAddRow = document.getElementById('btnAddRow');
    const addonsList = document.getElementById('addonsList');
    if (btnAddRow && addonsList) {
        btnAddRow.addEventListener('click', () => {
             const div = document.createElement('div');
             div.className = 'addon-row';
             div.innerHTML = `
                <select name="addonType[]" class="input-field addon-select"><option>Snack</option><option>Fasilitas</option></select>
                <input type="text" name="addonDetail[]" class="input-field addon-input" placeholder="Detail...">
                <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()">✕</button>
             `;
             addonsList.appendChild(div);
        });
    }
    const addonsToggle = document.getElementById('addonsToggle');
    if(addonsToggle) {
        addonsToggle.addEventListener('change', function() {
            document.getElementById('addonsContainer').style.display = this.checked ? 'block' : 'none';
        });
    }

    // ============================================================
    // 7. HELPER: KAPASITAS
    // ============================================================
    const roomSelect = document.getElementById('roomSelect');
    const partInput = document.getElementById('participants') || document.getElementById('numParticipants');
    const capMsg = document.getElementById('capacityMsg');
    
    if(roomSelect && partInput) {
        const checkCap = () => {
            const max = parseInt(roomSelect.options[roomSelect.selectedIndex].getAttribute('data-capacity')) || 0;
            const cur = parseInt(partInput.value) || 0;
            if(max > 0 && cur > max) {
                if(capMsg) { capMsg.style.display='block'; capMsg.innerText=`⚠️ Melebihi kapasitas (${max})`; }
            } else {
                if(capMsg) capMsg.style.display='none';
            }
        };
        roomSelect.addEventListener('change', checkCap);
        partInput.addEventListener('input', checkCap);
    }

});