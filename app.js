// GANTI DENGAN LINK API VERCEL ANDA (Pastikan link ini benar)
const API_URL = '/api/bookings'; 

// ==========================================
// 1. SATPAM HALAMAN (Security Check)
// ==========================================
(function() {
    const user = localStorage.getItem('currentUser');
    
    // Cek apakah ini halaman Form Booking?
    const bookingForm = document.getElementById('bookingForm'); 

    // ATURAN: Jika ada Form TAPI tidak ada User Login -> TENDANG
    if (bookingForm && !user) {
        console.warn("⛔ Intruder detected! Redirecting to login...");
        alert("Akses Ditolak: Anda harus login untuk mengakses halaman ini!");
        window.location.href = '/login'; 
        throw new Error("Access Denied"); 
    }
})();

document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 App.js Dimulai...");

    // ============================================================
    // 2. AUTH & INITIALIZATION
    // ============================================================
    const savedName = localStorage.getItem('currentUser');

    // Setup Header Nama User
    const headerName = document.getElementById('headerUserName');
    if(headerName) headerName.innerText = savedName || 'Guest';

    // Auto-fill Nama Peminjam
    const formName = document.getElementById('formBorrowerName');
    if(formName) formName.value = savedName || '';

    // Auto-fill Divisi
    const savedDivision = localStorage.getItem('userDivision');
    const sbuSelect = document.querySelector('select[name="sbu"]'); 
    if (sbuSelect && savedDivision) sbuSelect.value = savedDivision; 

    // Auto-fill WhatsApp
    const savedPhone = localStorage.getItem('userPhone');
    const waInput = document.getElementById('whatsapp') || 
                    document.querySelector('input[name="whatsappNumber"]') || 
                    document.querySelector('input[name="whatsapp"]');

    if (waInput && savedPhone) {
        waInput.value = savedPhone;
    }

    // Tombol Sign Out
    const signOutBtn = document.querySelector('.sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            localStorage.clear(); 
            window.location.href = '/login'; 
        });
    }

    // Admin Mode Visual
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin') {
        const pageTitle = document.querySelector('.page-title h1');
        if (pageTitle) {
            pageTitle.innerText = "Admin Booking Mode";
            pageTitle.style.color = "#Eab308";
        }
    }

    // ============================================================
    // 3. GENERATE JAM (TIME PICKER FIX)
    // ============================================================
    function populateTimeSelects() {
        // Kita pakai querySelector agar lebih kebal (bisa baca name="" atau id="")
        const startSelect = document.querySelector('select[name="startTime"]') || document.getElementById('startTime');
        const endSelect = document.querySelector('select[name="endTime"]') || document.getElementById('endTime');

        if (!startSelect || !endSelect) return;

        // Reset isi
        startSelect.innerHTML = '<option value="">Select time</option>';
        endSelect.innerHTML = '<option value="">Select time</option>';

        const startHour = 8; // 08:00
        const endHour = 18;  // 18:00

        for (let i = startHour; i <= endHour; i++) {
            const hour = i.toString().padStart(2, '0');
            
            // Opsi :00
            const val00 = `${hour}:00`;
            startSelect.add(new Option(val00, val00));
            endSelect.add(new Option(val00, val00));

            // Opsi :30 (Kecuali jam terakhir)
            if (i < endHour) {
                const val30 = `${hour}:30`;
                startSelect.add(new Option(val30, val30));
                endSelect.add(new Option(val30, val30));
            }
        }

        // Logika Pintar: Kalau Start dipilih, End otomatis maju
        startSelect.addEventListener('change', function() {
            if(!this.value) return;
            let [h, m] = this.value.split(':').map(Number);
            
            // Tambah 1 jam otomatis
            h += 1; 
            const nextTime = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
            
            // Cek apakah jam itu ada di opsi endSelect?
            const exist = [...endSelect.options].some(o => o.value === nextTime);
            if(exist) endSelect.value = nextTime;
        });
    }

    // PANGGIL FUNGSINYA AGAR JAM MUNCUL
    populateTimeSelects();


    // ============================================================
    // 4. ADD-ONS LOGIC
    // ============================================================
    const addonsToggle = document.getElementById('addonsToggle');
    const addonsContainer = document.getElementById('addonsContainer');
    const addonsList = document.getElementById('addonsList');
    const btnAddRow = document.getElementById('btnAddRow');

    function createAddonRow() {
        const row = document.createElement('div');
        row.className = 'addon-row';
        row.innerHTML = `
            <select name="addonType[]" class="input-field addon-select"><option value="Snack">Snack</option><option value="Fasilitas">Fasilitas</option></select>
            <input type="text" name="addonDetail[]" class="input-field addon-input" placeholder="Detail...">
            <button type="button" class="btn-remove-row">✕</button>`;
        return row;
    }
    
    if (addonsToggle) {
        addonsToggle.addEventListener('change', function() {
            if(addonsContainer) {
                addonsContainer.style.display = this.checked ? 'block' : 'none';
                if(this.checked && addonsList && addonsList.children.length === 0) addonsList.appendChild(createAddonRow());
                if(!this.checked && addonsList) addonsList.innerHTML = '';
            }
        });
    }
    if (btnAddRow) btnAddRow.addEventListener('click', () => { 
        if(addonsList && addonsList.children.length < 2) addonsList.appendChild(createAddonRow()); 
    });
    if (addonsList) addonsList.addEventListener('click', (e) => { 
        if(e.target.classList.contains('btn-remove-row')) e.target.closest('.addon-row').remove(); 
    });


    // ============================================================
    // 5. KAPASITAS RUANGAN (SOFT BLOCK)
    // ============================================================
    const roomSelectEl = document.getElementById('roomSelect'); // Pastikan ID di HTML id="roomSelect"
    const participantsInput = document.getElementById('participants') || document.getElementById('numParticipants');
    const capacityMsg = document.getElementById('capacityMsg');

    function checkCapacityVisual() {
        if(!roomSelectEl || !participantsInput) return false;

        const sel = roomSelectEl.options[roomSelectEl.selectedIndex];
        // Pastikan di HTML option ada data-capacity="10"
        const max = parseInt(sel.getAttribute('data-capacity')) || 0; 
        const current = parseInt(participantsInput.value) || 0;

        if (max > 0 && current > max) {
            participantsInput.classList.add('input-error');
            if(capacityMsg) {
                capacityMsg.style.display = 'block';
                capacityMsg.innerText = `⚠️ Melebihi standar (${max} orang), namun tetap bisa diajukan.`;
            }
            return true; // Over capacity
        } else {
            participantsInput.classList.remove('input-error');
            if(capacityMsg) capacityMsg.style.display = 'none';
            return false;
        }
    }

    if (roomSelectEl && participantsInput) {
        roomSelectEl.addEventListener('change', checkCapacityVisual);
        participantsInput.addEventListener('input', checkCapacityVisual);
    }


    // ============================================================
    // 6. DASHBOARD WIDGET (ROOM STATUS)
    // ============================================================
    async function updateRoomStatus() {
        try {
            // Cek apakah ada widget ruangan di halaman ini? Kalau gak ada, skip.
            if(!document.querySelector('.room-card-item')) return;

            const response = await fetch(API_URL);
            if (!response.ok) return;
            const allBookings = await response.json();
            
            const now = new Date();
            const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
            
            const bookedRooms = allBookings
                .filter(b => b.bookingDate === todayStr && b.status === 'Approved')
                .map(b => b.roomName.trim());

            document.querySelectorAll('.room-card-item').forEach(card => {
                const titleEl = card.querySelector('h4');
                const badgeEl = card.querySelector('span.badge');
                
                if (titleEl && badgeEl) {
                    const roomName = titleEl.innerText.trim();
                    if (bookedRooms.includes(roomName)) {
                        badgeEl.innerText = 'Booked';
                        badgeEl.className = 'badge badge-red';
                    } else {
                        badgeEl.innerText = 'Available';
                        badgeEl.className = 'badge badge-black';
                    }
                }
            });
            
            // Update Statistik
            updateDashboardStats(allBookings);

        } catch (error) {
            console.error("Gagal update widget:", error);
        }
    }
    // Jalankan update widget
    updateRoomStatus();

    function updateDashboardStats(allBookings) {
        const statsList = document.querySelector('.quick-stats .stats-list');
        if (statsList) {
            statsList.children[0].querySelector('.stat-value').innerText = allBookings.length;
            statsList.children[1].querySelector('.stat-value').innerText = allBookings.filter(b => b.status === 'Approved').length;
            statsList.children[2].querySelector('.stat-value').innerText = allBookings.filter(b => b.status === 'Pending').length;
        }
    }


    // ============================================================
    // 7. HANDLE SUBMIT FORM
    // ============================================================
    const form = document.getElementById('bookingForm');
    const submitBtn = document.querySelector('.submit-btn');

    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault(); // Stop Refresh

            // A. Cek Integrity Pact
            const integrity = form.querySelector('input[name="integrity"]');
            if (integrity && !integrity.checked) {
                alert('Please agree to the Integrity Pact Agreement.');
                return;
            }

            // B. Cek Kapasitas (Modal Konfirmasi)
            if (checkCapacityVisual()) {
                if(!confirm("⚠️ PERINGATAN KAPASITAS\n\nJumlah peserta melebihi kapasitas ruangan.\nApakah Anda yakin ingin tetap melanjutkan?")) {
                    return; // Batal submit kalau user klik Cancel
                }
            }

            // C. UI Loading
            const originalBtnText = submitBtn.innerText;
            submitBtn.innerText = "⏳ Sending Request...";
            submitBtn.disabled = true;

            try {
                // D. Siapkan Data Add-ons
                let addonsData = [];
                document.querySelectorAll('select[name="addonType[]"]').forEach((sel, i) => {
                    const det = document.querySelectorAll('input[name="addonDetail[]"]')[i].value;
                    if(det.trim()) addonsData.push({ type: sel.value, detail: det });
                });

                // E. Siapkan Data Booking
                const bookingData = {
                    ticketNumber: 'T-' + Date.now(),
                    borrowerName: document.getElementById('formBorrowerName').value,
                    
                    // --- PENTING: EMAIL STAFF ---
                    borrowerEmail: localStorage.getItem('userEmail'), 
                    // ----------------------------

                    department: document.querySelector('select[name="sbu"]').value,
                    whatsapp: document.querySelector('input[name="whatsappNumber"]').value,
                    purpose: document.getElementById('purpose').value,
                    
                    // Gunakan querySelector agar aman (name="...")
                    roomName: document.querySelector('select[name="roomName"]').value,
                    bookingDate: document.querySelector('input[name="date"]').value, // atau ID bookingDate
                    startTime: document.querySelector('select[name="startTime"]').value,
                    endTime: document.querySelector('select[name="endTime"]').value,
                    participants: document.getElementById('participants')?.value || document.getElementById('numParticipants')?.value,

                    addOns: addonsData,
                    notes: document.getElementById('notes')?.value || "",
                    status: (localStorage.getItem('userRole') === 'admin') ? 'Approved' : 'Pending'
                };

                // F. Kirim ke Backend
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify(bookingData)
                });

                const result = await response.json();

                if (response.ok) {
                    alert("✅ Booking Berhasil Terkirim!");
                    window.location.href = '/calendar'; // Redirect ke Kalender
                } else {
                    alert(`❌ Gagal: ${result.message}`);
                }

            } catch (error) {
                console.error(error);
                alert("⚠️ Terjadi kesalahan koneksi.");
            } finally {
                submitBtn.innerText = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }

});