// ============================================================
// KONFIGURASI API (PENTING!)
// ============================================================
// Jika tes di Vercel (Online), gunakan: '/api/bookings'
// Jika tes di Laptop (File Lokal), gunakan URL LENGKAP Vercel Anda:
const API_URL = 'https://pinjam-ruang-bumi-auto.vercel.app/api/bookings'; 

document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 App.js Dimulai...");

    // ============================================================
    // 1. AUTH & INITIALIZATION (DENGAN PENGAMAN)
    // ============================================================
    const savedName = localStorage.getItem('currentUser');
    if (!savedName) {
        // Cek dulu apakah kita sudah di halaman login? Kalau belum baru redirect
        if (!window.location.pathname.includes('/login') && !window.location.pathname.endsWith('/')) {
             // window.location.href = 'index.html'; // Opsional: Matikan jika mengganggu tes lokal
        }
    }

    // Gunakan '?' (Optional Chaining) agar tidak error jika elemen tidak ada
    const headerName = document.getElementById('headerUserName');
    if(headerName) headerName.innerText = savedName || 'Guest';

    const formName = document.getElementById('formBorrowerName');
    if(formName) formName.value = savedName || '';

    // Tombol Sign Out
    const signOutBtn = document.querySelector('.sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            localStorage.clear(); 
            window.location.href = '/login'; // Pastikan nama file login benar
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
    // 4. MODAL HELPERS
    // ============================================================
    window.showErrorModal = (title, message) => {
        const m = document.getElementById('statusModal');
        if(m) {
            document.getElementById('modalTitle').innerText = title;
            document.getElementById('modalMessage').innerHTML = message;
            m.style.display = 'flex';
        } else { alert(title + "\n" + message); }
    };
    
    window.closeStatusModal = () => {
        const m = document.getElementById('statusModal');
        if(m) m.style.display = 'none';
    }
    
    const capModal = document.getElementById('capacityModal');
    window.closeCapacityModal = () => { if(capModal) capModal.style.display = 'none'; }
    
    const btnProceed = document.getElementById('btnProceedCapacity');
    if(btnProceed) {
        btnProceed.onclick = () => {
            closeCapacityModal();
            processBooking(); // Lanjut proses
        };
    }

    // ============================================================
    // 5. LOGIKA SUBMIT UTAMA
    // ============================================================
    const form = document.getElementById('bookingForm');

    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();

            // 1. Cek Integrity
            const integrity = form.querySelector('input[name="integrity"]');
            if (integrity && !integrity.checked) {
                alert('Please agree to the Integrity Pact Agreement.');
                return;
            }

            // 2. Cek Kapasitas
            const isOverCapacity = checkCapacityVisual();
            
            if (isOverCapacity && capModal) {
                // TAMPILKAN MODAL WARNING
                const sel = roomSelectEl.options[roomSelectEl.selectedIndex];
                const max = parseInt(sel.getAttribute('data-capacity'));
                const cur = parseInt(participantsInput.value);
                
                const msgEl = document.getElementById('capModalMessage');
                if(msgEl) msgEl.innerHTML = `Ruangan ini maksimal <b>${max} orang</b>, tapi Anda memasukkan <b>${cur} orang</b>.<br><br>Apakah Anda yakin ingin tetap melanjutkan?`;
                
                capModal.style.display = 'flex';
                return; // Stop, tunggu konfirmasi modal
            }

            // Jika aman, langsung proses
            processBooking();
        });
    }

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
            console.log("Fetching data from:", API_URL); // Debugging
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
                window.location.href = '/submit';
            } else {
                alert("Gagal menyimpan data.");
            }

        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan koneksi (Cek Console).");
        }
    }

});