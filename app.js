// URL API BACKEND
const API_URL = '/api/bookings';
document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================================
    // 1. AUTH & INITIALIZATION
    // ============================================================
    const savedName = localStorage.getItem('currentUser');
    if (!savedName) { window.location.href = 'login.html'; return; }

    document.getElementById('headerUserName').innerText = savedName;
    const formNameEl = document.getElementById('formBorrowerName');
    if (formNameEl) formNameEl.value = savedName;

    document.querySelector('.sign-out-btn')?.addEventListener('click', (e) => {
        e.preventDefault(); localStorage.clear(); window.location.href = 'login.html';
    });

    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin') {
        document.querySelector('.page-title h1').innerText = "Admin Booking Mode";
        document.querySelector('.page-title h1').style.color = "#Eab308";
        document.querySelector('.back-arrow').onclick = () => window.location.href = 'admin.html';
    }

    // ============================================================
    // 2. FORM HELPERS (Date, Time, Addons)
    // ============================================================
    // Auto-fill Date
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    if (dateParam) {
        const dateInput = document.querySelector('input[name="date"]');
        if(dateInput) { dateInput.value = dateParam; dateInput.classList.add('input-highlight'); }
    }

    // Time Picker
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

    // Dynamic Addons
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
            addonsContainer.style.display = this.checked ? 'block' : 'none';
            if(this.checked && addonsList.children.length === 0) addonsList.appendChild(createAddonRow());
            if(!this.checked) addonsList.innerHTML = '';
        });
    }
    if (btnAddRow) btnAddRow.addEventListener('click', () => { if(addonsList.children.length < 2) addonsList.appendChild(createAddonRow()); });
    if (addonsList) addonsList.addEventListener('click', (e) => { if(e.target.classList.contains('btn-remove-row')) e.target.closest('.addon-row').remove(); });


    // ============================================================
    // 3. VALIDASI KAPASITAS (VISUAL ONLY)
    // ============================================================
    const roomSelectEl = document.getElementById('roomSelect');
    const participantsInput = document.getElementById('numParticipants');
    const capacityMsg = document.getElementById('capacityMsg');

    function checkCapacityVisual() {
        const sel = roomSelectEl.options[roomSelectEl.selectedIndex];
        const max = parseInt(sel.getAttribute('data-capacity')) || 0;
        const current = parseInt(participantsInput.value) || 0;

        if (max > 0 && current > 0 && current > max) {
            participantsInput.classList.add('input-error');
            if(capacityMsg) {
                capacityMsg.style.display = 'block';
                capacityMsg.innerText = `⚠️ Melebihi standar (${max} orang), namun tetap bisa diajukan.`;
            }
            return true; // Return true jika over capacity
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
    // 4. MODAL HELPERS
    // ============================================================
    window.showErrorModal = (title, message) => {
        const m = document.getElementById('statusModal');
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalMessage').innerHTML = message;
        m.style.display = 'flex';
    };
    window.closeStatusModal = () => document.getElementById('statusModal').style.display = 'none';
    
    // Modal Kapasitas
    const capModal = document.getElementById('capacityModal');
    window.closeCapacityModal = () => capModal.style.display = 'none';
    
    // Tombol "Tetap Lanjut" di dalam Modal
    document.getElementById('btnProceedCapacity').onclick = () => {
        closeCapacityModal();
        processBooking(true); // Panggil fungsi inti dengan flag 'force' (opsional)
    };

    // ============================================================
    // 5. LOGIKA SUBMIT UTAMA
    // ============================================================
    const form = document.getElementById('bookingForm');

    // CEK 1: Apakah form ditemukan?
    console.log("Status Form:", form); // Kalau ini null, berarti ID HTML salah

    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();

            // CEK 2: Apakah tombol berhasil diklik?
            console.log("🚀 Tombol Submit DIKLIK!");

            // 1. Cek Integrity
            const integrity = form.querySelector('input[name="integrity"]');
            if (!integrity || !integrity.checked) {
                alert('Please agree to the Integrity Pact Agreement.');
                return;
            }

            // 2. Cek Kapasitas (Soft Block)
            const isOverCapacity = checkCapacityVisual(); // Fungsi ini me-return true jika merah
            
            if (isOverCapacity) {
                // TAMPILKAN MODAL WARNING
                const sel = roomSelectEl.options[roomSelectEl.selectedIndex];
                const max = parseInt(sel.getAttribute('data-capacity'));
                const cur = parseInt(participantsInput.value);
                
                document.getElementById('capModalMessage').innerHTML = 
                    `Ruangan ini maksimal <b>${max} orang</b>, tapi Anda memasukkan <b>${cur} orang</b>.<br><br>Apakah Anda yakin ingin tetap melanjutkan?`;
                
                capModal.style.display = 'flex';
                return; // Stop di sini, tunggu user klik tombol di modal
            }

            // Jika aman, langsung proses
            processBooking();
        });
    }

    // ============================================================
    // 7. DASHBOARD STATS & RECENT BOOKINGS (REAL-TIME)
    // ============================================================
    async function updateDashboardStats() {
        // Indikator Loading (Opsional biar user tau lagi proses)
        const recentContainer = document.querySelector('.recent-bookings');
        if(recentContainer) recentContainer.innerHTML = '<p style="padding:20px; text-align:center;">Loading data...</p>';

        try {
            const response = await fetch(API_URL);
            if (!response.ok) return; // Silent fail biar gak ganggu user
            
            const allBookings = await response.json();
            if (!Array.isArray(allBookings)) return;

            // --- A. UPDATE QUICK STATS ---
            // Hitung jumlah berdasarkan status
            const total = allBookings.length;
            const approved = allBookings.filter(b => b.status === 'Approved').length;
            const pending = allBookings.filter(b => b.status === 'Pending').length;

            // Update Angka di HTML (Pastikan class selector-nya benar)
            // Kita cari elemen berdasarkan struktur HTML sidebar
            const statsList = document.querySelector('.quick-stats .stats-list');
            if (statsList) {
                // Total
                statsList.children[0].querySelector('.stat-value').innerText = total;
                // Approved
                statsList.children[1].querySelector('.stat-value').innerText = approved;
                // Pending
                statsList.children[2].querySelector('.stat-value').innerText = pending;
            }

            // --- B. UPDATE RECENT BOOKINGS (GLOBAL LIST) ---
            const recentContainer = document.querySelector('.recent-bookings');
            if (recentContainer) {
                // Ambil 5 data terbaru (karena dari server sudah urut created_at desc, tinggal slice)
                const recentData = allBookings.slice(0, 5);

                let htmlContent = '<h3>Recent Bookings</h3>';
                
                if (recentData.length === 0) {
                    htmlContent += '<p class="empty-state" style="color:#999; font-size:13px;">No bookings yet.</p>';
                } else {
                    htmlContent += '<ul style="list-style:none; padding:0; margin-top:10px;">';
                    
                    recentData.forEach(booking => {
                        // Tentukan warna status
                        let statusColor = '#64748B'; // Default gray
                        if(booking.status === 'Approved') statusColor = '#10B981'; // Green
                        if(booking.status === 'Pending') statusColor = '#F59E0B';  // Orange
                        if(booking.status === 'Rejected' || booking.status === 'Cancelled') statusColor = '#EF4444'; // Red

                        // Format tampilan: Nama - Ruang (Jam)
                        htmlContent += `
                            <li style="margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="font-weight:bold; font-size:13px; color:var(--text-main);">${booking.borrowerName}</span>
                                    <span style="font-size:10px; font-weight:bold; color:${statusColor}; border:1px solid ${statusColor}; padding:1px 4px; border-radius:4px;">${booking.status}</span>
                                </div>
                                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">
                                    ${booking.department} • ${booking.roomName}
                                </div>
                                <div style="font-size:11px; color:var(--text-muted);">
                                    📅 ${booking.bookingDate} (${booking.startTime}-${booking.endTime})
                                </div>
                            </li>
                        `;
                    });
                    htmlContent += '</ul>';
                }

                // Masukkan ke dalam container (Timpa isinya)
                recentContainer.innerHTML = htmlContent;
            }

        } catch (error) {
            console.error("Gagal update dashboard:", error);
        }
    }

    // Jalankan fungsi ini saat load
    updateDashboardStats();

    // ============================================================
    // 6. FUNGSI INTI PROSES BOOKING (KE SERVER)
    // ============================================================
    async function processBooking() {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const roomSelect = document.getElementById('roomSelect');
        const selectedRoomText = roomSelect.options[roomSelect.selectedIndex].text;
        const toMinutes = (s) => { const [h,m]=s.split(':').map(Number); return h*60+m; };

        try {
            // A. Cek Bentrok
            const response = await fetch(API_URL);
            const allBookings = await response.json();
            if (!Array.isArray(allBookings)) throw new Error("Data error");

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

            // B. Logic Override
            if (conflictingBooking) {
                const userRole = localStorage.getItem('userRole');
                const isPriorityDept = ['TOP MANAGEMENT', 'C-Level', 'General Manager'].includes(data.sbu);

                if (userRole === 'admin' && isPriorityDept) {
                    if (confirm(`⚠️ OVERRIDE?\nRuangan dipakai: ${conflictingBooking.borrowerName}\nTimpa?`)) {
                        await fetch(`${API_URL}/${encodeURIComponent(conflictingBooking.ticketNumber)}`, {
                            method: 'PUT',
                            headers: {'Content-Type':'application/json'},
                            body: JSON.stringify({ status: 'Cancelled', notes: 'Override by Admin' })
                        });
                    } else return;
                } else {
                    showErrorModal("Jadwal Bentrok!", `Ruangan <b>${selectedRoomText}</b> sudah terisi.`);
                    return;
                }
            }

            // C. Simpan Data
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
                window.location.href = 'submit.html';
            } else {
                alert("Gagal menyimpan data.");
            }

        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan koneksi.");
        }
    }

});