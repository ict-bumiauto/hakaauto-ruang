// URL API BACKEND
const API_URL = 'http://localhost:5000/api/bookings';

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================================
    // 1. AUTH & INITIALIZATION
    // ============================================================
    const savedName = localStorage.getItem('currentUser');
    if (!savedName) {
        window.location.href = 'login.html';
        return;
    }

    const headerNameElement = document.getElementById('headerUserName');
    if (headerNameElement) headerNameElement.innerText = savedName;

    const formNameElement = document.getElementById('formBorrowerName');
    if (formNameElement) formNameElement.value = savedName;

    // Logout
    const signOutBtn = document.querySelector('.sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            localStorage.removeItem('currentUser'); 
            localStorage.removeItem('userRole'); 
            window.location.href = 'login.html'; 
        });
    }

    // Admin Mode Check
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'admin') {
        const pageTitle = document.querySelector('.page-title h1');
        if (pageTitle) {
            pageTitle.innerText = "Admin Booking Mode";
            pageTitle.style.color = "#Eab308";
        }
        const backArrow = document.querySelector('.back-arrow');
        if (backArrow) {
            backArrow.onclick = function() { window.location.href = 'admin.html'; };
        }
    }

    // ============================================================
    // 2. AUTO-FILL DATE & TIME PICKER
    // ============================================================
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    if (dateParam) {
        const dateInput = document.querySelector('input[name="date"]');
        if (dateInput) {
            dateInput.value = dateParam;
            dateInput.classList.add('input-highlight'); 
        }
    }

    const startSelect = document.getElementById('startTime');
    const endSelect = document.getElementById('endTime');
    const startHour = 8; const endHour = 18;

    function populateTimeSelect(selectElement) {
        selectElement.innerHTML = '<option value="">Select time</option>';
        for (let hour = startHour; hour <= endHour; hour++) {
            for (let min = 0; min < 60; min += 30) {
                if (hour === endHour && min > 0) break;
                const val = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                const option = document.createElement('option');
                option.value = val; option.text = val;
                selectElement.appendChild(option);
            }
        }
    }

    if (startSelect && endSelect) {
        populateTimeSelect(startSelect);
        populateTimeSelect(endSelect);
        startSelect.addEventListener('change', function() {
            if (!this.value) return;
            let [h, m] = this.value.split(':').map(Number);
            h += 1; 
            const nextTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const exists = [...endSelect.options].some(o => o.value === nextTime);
            if (exists) endSelect.value = nextTime;
        });
    }

    // ============================================================
    // 3. DYNAMIC ADD-ONS
    // ============================================================
    const addonsToggle = document.getElementById('addonsToggle');
    const addonsContainer = document.getElementById('addonsContainer');
    const addonsList = document.getElementById('addonsList');
    const btnAddRow = document.getElementById('btnAddRow');
    const MAX_ITEMS = 2;

    function createAddonRow() {
        const row = document.createElement('div');
        row.className = 'addon-row';
        row.innerHTML = `
            <select name="addonType[]" class="input-field addon-select">
                <option value="Snack">Snack</option>
                <option value="Fasilitas">Fasilitas</option>
            </select>
            <input type="text" name="addonDetail[]" class="input-field addon-input" placeholder="Detail...">
            <button type="button" class="btn-remove-row">✕</button>
        `;
        return row;
    }

    function checkAddonLimit() {
        if (!addonsList || !btnAddRow) return;
        if (addonsList.children.length >= MAX_ITEMS) btnAddRow.style.display = 'none';
        else btnAddRow.style.display = 'block';
    }

    if (addonsToggle) {
        addonsToggle.addEventListener('change', function() {
            if (this.checked) {
                addonsContainer.style.display = 'block';
                if (addonsList.children.length === 0) addonsList.appendChild(createAddonRow());
            } else {
                addonsContainer.style.display = 'none';
                addonsList.innerHTML = '';
            }
            checkAddonLimit();
        });
    }

    if (btnAddRow) {
        btnAddRow.addEventListener('click', () => {
            if (addonsList.children.length < MAX_ITEMS) {
                addonsList.appendChild(createAddonRow());
                checkAddonLimit();
            }
        });
    }

    if (addonsList) {
        addonsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-row')) {
                e.target.closest('.addon-row').remove();
                checkAddonLimit();
                if (addonsList.children.length === 0) {
                    addonsToggle.checked = false;
                    addonsContainer.style.display = 'none';
                }
            }
        });
    }

    // ============================================================
    // 4. VALIDASI KAPASITAS RUANGAN
    // ============================================================
    const roomSelectEl = document.getElementById('roomSelect');
    const participantsInput = document.getElementById('numParticipants'); 
    const capacityMsg = document.getElementById('capacityMsg');

    function checkCapacity() {
        const selectedOption = roomSelectEl.options[roomSelectEl.selectedIndex];
        const maxCapacity = parseInt(selectedOption.getAttribute('data-capacity')) || 0;
        const currentVal = parseInt(participantsInput.value) || 0;

        if (maxCapacity > 0 && currentVal > 0) {
            if (currentVal > maxCapacity) {
                participantsInput.classList.add('input-error');
                if(capacityMsg) {
                    capacityMsg.style.display = 'block';
                    capacityMsg.innerText = `⚠️ Maksimal ${maxCapacity} orang untuk ruangan ini.`;
                }
            } else {
                participantsInput.classList.remove('input-error');
                if(capacityMsg) capacityMsg.style.display = 'none';
            }
        } else {
            participantsInput.classList.remove('input-error');
            if(capacityMsg) capacityMsg.style.display = 'none';
        }
    }

    if (roomSelectEl && participantsInput) {
        roomSelectEl.addEventListener('change', checkCapacity);
        participantsInput.addEventListener('input', checkCapacity);
    }

    // ============================================================
    // 5. ROOM AVAILABILITY (FETCH FROM SERVER - DENGAN PENGAMAN)
    // ============================================================
    async function updateRoomStatus() {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        try {
            const response = await fetch(API_URL);
            
            // CEK 1: Apakah Server Error?
            if (!response.ok) {
                console.error("Server Error:", response.statusText);
                return;
            }

            const allBookings = await response.json();

            // CEK 2: Apakah Datanya Array?
            if (!Array.isArray(allBookings)) {
                console.error("Data dari server BUKAN array (Kemungkinan Error Object):", allBookings);
                return; // Stop disini biar gak error 'filter is not a function'
            }

            const bookedRooms = allBookings
                .filter(b => b.bookingDate === todayStr && b.status === 'Approved')
                .map(b => b.roomName.trim());

            const roomCards = document.querySelectorAll('.room-card-item');
            roomCards.forEach(card => {
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
        } catch (error) {
            console.error("Gagal koneksi ke API:", error);
        }
    }
    updateRoomStatus(); 

    // ============================================================
    // 6. FORM SUBMIT & CONFLICT CHECK (DENGAN PENGAMAN)
    // ============================================================
    const form = document.getElementById('bookingForm');
    const toMinutes = (str) => { const [h, m] = str.split(':').map(Number); return h * 60 + m; };

    // Modal Helper
    window.showErrorModal = (title, message) => {
        const modal = document.getElementById('statusModal');
        if (modal) {
            document.getElementById('modalTitle').innerText = title;
            document.getElementById('modalMessage').innerHTML = message;
            modal.style.display = 'flex';
        } else alert(title + "\n" + message);
    };
    window.closeStatusModal = () => document.getElementById('statusModal').style.display = 'none';
    window.onclick = (event) => { if (event.target == document.getElementById('statusModal')) closeStatusModal(); };

    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            const integrity = form.querySelector('input[name="integrity"]');
            if (!integrity || !integrity.checked) {
                alert('Please agree to the Integrity Pact Agreement.');
                return;
            }

            const roomSelect = document.getElementById('roomSelect');
            const selectedRoomText = roomSelect.options[roomSelect.selectedIndex].text;

            // --- CEK BENTROK VIA FETCH ---
            try {
                const response = await fetch(API_URL); 
                
                if (!response.ok) {
                    alert("Gagal terhubung ke server (Cek Console).");
                    return;
                }

                const allBookings = await response.json();

                // PENGAMAN: Cek Array
                if (!Array.isArray(allBookings)) {
                    console.error("Respon Server bukan Array:", allBookings);
                    alert("Terjadi kesalahan data dari server. Cek Console.");
                    return;
                }

                const newStart = toMinutes(data.startTime);
                const newEnd = toMinutes(data.endTime);

                // Cari yang bentrok
                const conflictingBooking = allBookings.find(booking => {
                    if (booking.status === 'Rejected' || booking.status === 'Cancelled') return false;
                    if (booking.roomName === selectedRoomText && booking.bookingDate === data.date) {
                        const exStart = toMinutes(booking.startTime);
                        const exEnd = toMinutes(booking.endTime);
                        return (newStart < exEnd && newEnd > exStart);
                    }
                    return false;
                });

                // --- LOGIKA OVERRIDE ---
                if (conflictingBooking) {
                    const userRole = localStorage.getItem('userRole');
                    const isPriorityDept = ['TOP MANAGEMENT', 'C-Level', 'General Manager'].includes(data.sbu);

                    if (userRole === 'admin' && isPriorityDept) {
                        const confirmMsg = `⚠️ PRIORITY OVERRIDE!\n\nRuangan dipakai: ${conflictingBooking.borrowerName}\nTimpa jadwal mereka?`;
                        
                        if (confirm(confirmMsg)) {
                            // UPDATE STATUS BOOKING LAMA -> CANCELLED
                            await fetch(`${API_URL}/${encodeURIComponent(conflictingBooking.ticketNumber)}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ 
                                    status: 'Cancelled',
                                    notes: (conflictingBooking.notes || '') + " [Override by Admin]"
                                })
                            });
                        } else {
                            return; // Batal
                        }
                    } else {
                        showErrorModal("Jadwal Bentrok!", `Ruangan <b>${selectedRoomText}</b> sudah terisi.`);
                        return;
                    }
                }

                // --- PROSES SIMPAN DATA BARU ---
                const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
                const rand = Math.floor(1000 + Math.random() * 9000);
                const ticketID = `#BA-${dateStr}-${rand}`;

                let addonsData = [];
                const addonTypes = document.querySelectorAll('select[name="addonType[]"]');
                const addonDetails = document.querySelectorAll('input[name="addonDetail[]"]');
                if (addonTypes) {
                    addonTypes.forEach((sel, i) => {
                        const det = addonDetails[i].value;
                        if (det.trim() !== "") addonsData.push({ type: sel.value, detail: det });
                    });
                }

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

                // POST KE DATABASE
                const saveResponse = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newBooking)
                });

                if (saveResponse.ok) {
                    localStorage.setItem('lastBookingData', JSON.stringify(newBooking));
                    window.location.href = 'submit.html';
                } else {
                    const errData = await saveResponse.json();
                    alert(`Gagal menyimpan: ${errData.message || 'Server Error'}`);
                }

            } catch (error) {
                console.error("Error:", error);
                alert("Terjadi kesalahan koneksi ke server.");
            }
        });
    }
});