// GANTI DENGAN LINK API VERCEL ANDA
const API_URL = 'https://pinjam-ruang-bumi-auto.vercel.app/api/bookings';

// ==========================================
// SATPAM HALAMAN (Taruh Paling Atas app.js)
// ==========================================
(function() {
    const user = localStorage.getItem('currentUser');
    
    // Cek: Apakah kita sedang di halaman Form Booking?
    // Caranya: Cek apakah ada elemen form dengan ID 'bookingForm'
    const isDashboardPage = document.getElementById('bookingForm'); 

    // ATURAN: Jika ini Halaman Form TAPI tidak ada User Login
    if (isDashboardPage && !user) {
        console.warn("⛔ Intruder detected! Redirecting to login...");
        alert("Anda harus login untuk mengakses halaman ini!");
        
        // TENDANG KE LOGIN
        window.location.href = '/'; 
        
        // Hentikan semua proses di bawahnya
        throw new Error("Access Denied"); 
    }
})();
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 App.js Dimulai...");

    // ============================================================
    // 1. AUTH & INITIALIZATION
    // ============================================================
    const savedName = localStorage.getItem('currentUser');
    const currentPath = window.location.pathname;

    // DAFTAR HALAMAN YANG WAJIB LOGIN (PROTECTED)
    // Jika nama filenya mengandung kata ini, maka wajib login
    const isProtectedPage = currentPath.includes('dashboard') || 
                            currentPath.includes('submit') || 
                            currentPath.includes('index.html'); 

    // LOGIKA PENJAGA PINTU:
    // Hanya tendang JIKA: (User Belum Login) DAN (Sedang di Halaman Terlarang)
    if (!savedName && isProtectedPage) {
        console.warn("⛔ Akses Ditolak: Anda belum login.");
        window.location.href = '/'; // Tendang ke Login
        return; // Stop script biar gak jalan lanjut
    }

    if (!savedName) {
        if (!window.location.pathname.includes('calendar.html') && !window.location.pathname.endsWith('/calendar')) {
             // window.location.href = '/'; 
        }
    }

    const headerName = document.getElementById('headerUserName');
    if(headerName) headerName.innerText = savedName || 'Guest';

    const formName = document.getElementById('formBorrowerName');
    if(formName) formName.value = savedName || '';

    // === KODE BARU: AUTO-FILL DIVISI ===
    const savedDivision = localStorage.getItem('userDivision');
    const sbuSelect = document.querySelector('select[name="sbu"]'); // Dropdown Divisi

    // === KODE BARU: AUTO-FILL WHATSAPP (FINAL FIX) ===
    const savedPhone = localStorage.getItem('userPhone');
    
    // Cari input WA dengan berbagai kemungkinan ID atau NAME
    // (Biar gak salah panggil, kita coba semua kemungkinan)
    const waInput = document.getElementById('whatsapp') || 
                    document.querySelector('input[name="whatsappNumber"]') || 
                    document.querySelector('input[name="whatsapp"]');

    if (waInput && savedPhone) {
        console.log("Auto-filling WhatsApp:", savedPhone); // Cek Console untuk debugging
        waInput.value = savedPhone;
        // waInput.readOnly = true; // Opsional: Matikan jika ingin dikunci
    } else {
        console.log("Info: WhatsApp tidak terisi. Input tidak ketemu atau data kosong.");
    }

    if (sbuSelect && savedDivision) {
        console.log("Auto-filling Division:", savedDivision); // Cek di console
        sbuSelect.value = savedDivision; 
    }

    // Tombol Sign Out
    const signOutBtn = document.querySelector('.sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            localStorage.clear(); 
            window.location.href = '/login'; // Ke Halaman Login
        });
    }

    // Admin Mode Setup
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin') {
        const pageTitle = document.querySelector('.page-title h1');
        if (pageTitle) {
            pageTitle.innerText = "Admin Booking Mode";
            pageTitle.style.color = "#Eab308";
        }
        
        const backArrow = document.querySelector('.back-arrow');
        if (backArrow) {
            backArrow.onclick = () => window.location.href = '/admin';
        }
    }

    // ============================================================
    // 2. FORM HELPERS
    // ============================================================
    
    // Auto-fill Date
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    if (dateParam) {
        const dateInput = document.querySelector('input[name="date"]');
        if(dateInput) { dateInput.value = dateParam; dateInput.classList.add('input-highlight'); }
    }

    // Time Picker Logic
    const startSelect = document.getElementById('startTime');
    const endSelect = document.getElementById('endTime');
    const startHour = 8; const endHour = 18;

    function populateTimeSelect(el) {
        el.innerHTML = '<option value="">Select time</option>';
        for (let h = startHour; h <= endHour; h++) {
            for (let m = 0; m < 60; m += 30) {
                if (h === endHour && m > 0) break;
                const val = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                const opt = document.createElement('option');
                opt.value = val; opt.text = val;
                el.appendChild(opt);
            }
        }
    }
    if (startSelect && endSelect) {
        populateTimeSelect(startSelect); populateTimeSelect(endSelect);
        startSelect.addEventListener('change', function() {
            if(!this.value) return;
            let [h, m] = this.value.split(':').map(Number);
            h += 1;
            const next = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
            const exist = [...endSelect.options].some(o => o.value === next);
            if(exist) endSelect.value = next;
        });
    }

    // Dynamic Addons Logic
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
    // 3. VALIDASI KAPASITAS (SOFT BLOCK)
    // ============================================================
    const roomSelectEl = document.getElementById('roomSelect');
    const participantsInput = document.getElementById('numParticipants');
    const capacityMsg = document.getElementById('capacityMsg');

    function checkCapacityVisual() {
        if(!roomSelectEl || !participantsInput) return false;

        const sel = roomSelectEl.options[roomSelectEl.selectedIndex];
        const max = parseInt(sel.getAttribute('data-capacity')) || 0;
        const current = parseInt(participantsInput.value) || 0;

        if (max > 0 && current > 0 && current > max) {
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
    // 4. ROOM AVAILABILITY (DASHBOARD WIDGET)
    // ============================================================
    async function updateRoomStatus() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) return;
            const allBookings = await response.json();
            if (!Array.isArray(allBookings)) return;

            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            
            const bookedRooms = allBookings
                .filter(b => b.bookingDate === todayStr && b.status === 'Approved')
                .map(b => b.roomName.trim());

            document.querySelectorAll('.room-card-item').forEach(card => {
                const titleEl = card.querySelector('h4');
                const badgeEl = card.querySelector('span.badge');
                const descEl = card.querySelector('p');

                if (titleEl && badgeEl) {
                    const roomName = titleEl.innerText.trim();
                    if (bookedRooms.includes(roomName)) {
                        badgeEl.innerText = 'Booked';
                        badgeEl.className = 'badge badge-red';
                        if (descEl) { descEl.innerText = 'Not Available Today'; descEl.style.color = '#EF4444'; }
                    } else {
                        badgeEl.innerText = 'Available';
                        badgeEl.className = 'badge badge-black';
                        if (descEl) { descEl.innerText = 'Ready to use'; descEl.style.color = ''; }
                    }
                }
            });

            // UPDATE RECENT BOOKINGS & STATS
            updateDashboardStats(allBookings);

        } catch (error) {
            console.error("Gagal update status:", error);
        }
    }
    updateRoomStatus(); 

    function updateDashboardStats(allBookings) {
        const statsList = document.querySelector('.quick-stats .stats-list');
        if (statsList) {
            const total = allBookings.length;
            const approved = allBookings.filter(b => b.status === 'Approved').length;
            const pending = allBookings.filter(b => b.status === 'Pending').length;
            statsList.children[0].querySelector('.stat-value').innerText = total;
            statsList.children[1].querySelector('.stat-value').innerText = approved;
            statsList.children[2].querySelector('.stat-value').innerText = pending;
        }

        const recentContainer = document.querySelector('.recent-bookings');
        if (recentContainer) {
            const recentData = allBookings.slice(0, 5);
            let htmlContent = '<h3>Recent Bookings</h3>';
            if (recentData.length === 0) {
                htmlContent += '<p style="color:#999; font-size:13px;">No bookings yet.</p>';
            } else {
                htmlContent += '<ul style="list-style:none; padding:0; margin-top:10px;">';
                recentData.forEach(b => {
                    let color = b.status === 'Approved' ? '#10B981' : (b.status === 'Pending' ? '#F59E0B' : '#EF4444');
                    htmlContent += `
                        <li style="margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:8px;">
                            <div style="display:flex; justify-content:space-between;">
                                <span style="font-weight:bold; font-size:13px;">${b.borrowerName}</span>
                                <span style="font-size:10px; font-weight:bold; color:${color}; border:1px solid ${color}; padding:1px 4px; border-radius:4px;">${b.status}</span>
                            </div>
                            <div style="font-size:11px; color:#64748B;">${b.roomName}</div>
                            <div style="font-size:11px; color:#64748B;">📅 ${b.bookingDate} (${b.startTime}-${b.endTime})</div>
                        </li>`;
                });
                htmlContent += '</ul>';
            }
            recentContainer.innerHTML = htmlContent;
        }
    }

    // ============================================================
    // 5. MODAL HELPERS
    // ============================================================
    window.showErrorModal = (title, message) => {
        const m = document.getElementById('statusModal');
        if(m) {
            document.getElementById('modalTitle').innerText = title;
            document.getElementById('modalMessage').innerHTML = message;
            m.style.display = 'flex';
        } else { alert(title + "\n" + message); }
    };
    
    window.closeStatusModal = () => { const m = document.getElementById('statusModal'); if(m) m.style.display = 'none'; };
    
    const capModal = document.getElementById('capacityModal');
    window.closeCapacityModal = () => { if(capModal) capModal.style.display = 'none'; };
    
    // Tombol "Tetap Lanjut" di Modal Kapasitas
    const btnProceed = document.getElementById('btnProceedCapacity');
    if(btnProceed) {
        btnProceed.onclick = () => {
            closeCapacityModal();
            processBooking(); // Panggil fungsi inti
        };
    }

    // ============================================================
    // 6. LOGIKA SUBMIT UTAMA
    // ============================================================
    const form = document.getElementById('bookingForm');
    const submitBtn = document.querySelector('.submit-btn'); // Ambil Tombol Submit

    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();

            // 1. Cek Integrity
            const integrity = form.querySelector('input[name="integrity"]');
            if (integrity && !integrity.checked) {
                alert('Please agree to the Integrity Pact Agreement.');
                return;
            }

            // 2. Cek Kapasitas (Soft Block)
            if (checkCapacityVisual() && capModal) {
                const sel = roomSelectEl.options[roomSelectEl.selectedIndex];
                const max = parseInt(sel.getAttribute('data-capacity'));
                const cur = parseInt(participantsInput.value);
                document.getElementById('capModalMessage').innerHTML = `Ruangan ini maksimal <b>${max} orang</b>, tapi Anda memasukkan <b>${cur} orang</b>.<br>Yakin ingin tetap melanjutkan?`;
                capModal.style.display = 'flex';
                return; 
            }

            // Jika aman, lanjut
            processBooking();
        });
    }

    // ============================================================
    // 7. FUNGSI INTI PROSES BOOKING (ASYNC)
    // ============================================================
    async function processBooking() {
        // --- A. SET LOADING STATE ---
        const originalBtnText = submitBtn.innerText;
        submitBtn.innerText = "⏳ Sending Request...";
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.7";
        submitBtn.style.cursor = "not-allowed";

        try {
            // Ambil Data Form
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            const roomSelect = document.getElementById('roomSelect');
            const selectedRoomText = roomSelect.options[roomSelect.selectedIndex].text;
            const toMinutes = (s) => { const [h,m]=s.split(':').map(Number); return h*60+m; };

            // --- B. CEK BENTROK KE SERVER ---
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error("Gagal terhubung ke server");
            
            const allBookings = await response.json();
            if (!Array.isArray(allBookings)) throw new Error("Format data salah");

            const newStart = toMinutes(data.startTime);
            const newEnd = toMinutes(data.endTime);

            const conflictingBooking = allBookings.find(b => {
                if (b.status === 'Rejected' || b.status === 'Cancelled') return false;
                if (b.roomName === selectedRoomText && b.bookingDate === data.date) {
                    const exStart = toMinutes(b.startTime); const exEnd = toMinutes(b.endTime);
                    return (newStart < exEnd && newEnd > exStart);
                }
                return false;
            });

            // --- C. LOGIC OVERRIDE ---
            if (conflictingBooking) {
                const userRole = localStorage.getItem('userRole');
                const isPriorityDept = ['TOP MANAGEMENT', 'C-Level', 'General Manager'].includes(data.sbu);

                if (userRole === 'admin' && isPriorityDept) {
                    if (confirm(`⚠️ PRIORITY OVERRIDE!\n\nRuangan dipakai: ${conflictingBooking.borrowerName}\nTimpa jadwal mereka?`)) {
                        await fetch(`${API_URL}/${encodeURIComponent(conflictingBooking.ticketNumber)}`, {
                            method: 'PUT',
                            headers: {'Content-Type':'application/json'},
                            body: JSON.stringify({ status: 'Cancelled', notes: 'Override by Admin' })
                        });
                    } else {
                        resetButton(); return;
                    }
                } else {
                    showErrorModal("Jadwal Bentrok!", `Ruangan <b>${selectedRoomText}</b> sudah terisi.`);
                    resetButton(); return;
                }
            }

            // --- D. SIMPAN DATA BARU ---
            const ticketID = `#BA-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(1000+Math.random()*9000)}`;
            
            let addonsData = [];
            document.querySelectorAll('select[name="addonType[]"]').forEach((sel, i) => {
                const det = document.querySelectorAll('input[name="addonDetail[]"]')[i].value;
                if(det.trim()) addonsData.push({ type: sel.value, detail: det });
            });

            const initialStatus = (localStorage.getItem('userRole') === 'admin') ? 'Approved' : 'Pending';

            const newBooking = {
                ticketNumber: ticketID,
                borrowerName: data.borrowerName,
                department: data.sbu,
                purpose: data.purpose,
                roomName: selectedRoomText,
                bookingDate: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                addOns: addonsData,
                notes: data.notes || '',
                status: initialStatus
            };

            const saveRes = await fetch(API_URL, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify(newBooking)
            });

            if (saveRes.ok) {
                localStorage.setItem('lastBookingData', JSON.stringify(newBooking));
                window.location.href = '/submit'; // Redirect ke halaman sukses
            } else {
                const errData = await saveRes.json();
                alert(`Gagal menyimpan: ${errData.message}`);
                resetButton();
            }

        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan koneksi (Cek Console).");
            resetButton();
        }

        // Helper Reset Button
        function resetButton() {
            submitBtn.innerText = originalBtnText;
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
            submitBtn.style.cursor = "pointer";
        }
    }

});