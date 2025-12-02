// admin_calendar.js
const API_URL = 'http://localhost:5000/api/bookings';

document.addEventListener('DOMContentLoaded', function() {
    
    const role = localStorage.getItem('userRole');
    if (role !== 'admin') { window.location.href = 'Test Slicing Pinjam Ruang.html'; return; }

    const daysTag = document.querySelector(".calendar-days");
    const currentDateDisplay = document.querySelector("#currentMonthYear");
    let date = new Date();
    let currYear = date.getFullYear();
    let currMonth = date.getMonth();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // --- 1. RENDER KALENDER ---
    const renderCalendar = async () => {
        let firstDayofMonth = new Date(currYear, currMonth, 1).getDay(); 
        let lastDateofMonth = new Date(currYear, currMonth + 1, 0).getDate(); 
        let lastDateofLastMonth = new Date(currYear, currMonth, 0).getDate(); 
        let lastDayofMonth = new Date(currYear, currMonth, lastDateofMonth).getDay();

        // FETCH DATA
        let allBookings = [];
        try {
            const res = await fetch(API_URL);
            allBookings = await res.json();
        } catch(e) { console.error("Error fetching calendar data"); }

        let liTag = "";
        for (let i = firstDayofMonth; i > 0; i--) liTag += `<li class="inactive">${lastDateofLastMonth - i + 1}</li>`;

        for (let i = 1; i <= lastDateofMonth; i++) { 
            let isToday = i === new Date().getDate() && currMonth === new Date().getMonth() && currYear === new Date().getFullYear();
            let activeClass = isToday ? "active" : ""; 
            
            let currentFullDate = `${currYear}-${String(currMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            let events = allBookings.filter(b => b.bookingDate === currentFullDate && b.status === 'Approved');

            let eventHTML = '';
            events.forEach(evt => {
                let shortName = evt.borrowerName.split(' ')[0];
                eventHTML += `<div class="calendar-event" title="${evt.roomName}">• ${shortName} <br> <span style="font-size:9px">${evt.startTime}</span></div>`;
            });

            liTag += `<li class="${activeClass}" onclick="showDayDetails('${currentFullDate}')" style="cursor: pointer;">
                        <span class="date-num">${i}</span>${eventHTML}</li>`;
        }
        for (let i = lastDayofMonth; i < 6; i++) liTag += `<li class="inactive">${i - lastDayofMonth + 1}</li>`;

        currentDateDisplay.innerText = `${months[currMonth]} ${currYear}`;
        daysTag.innerHTML = liTag;
        
        // Panggil update status hari ini juga
        updateRoomStatus(allBookings);
    };

    renderCalendar();

    // --- 2. UPDATE ROOM STATUS (MERAH/HITAM) ---
    function updateRoomStatus(allBookings) {
        const now = new Date();
        const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        const bookedRooms = allBookings
            .filter(b => b.bookingDate === todayStr && b.status === 'Approved')
            .map(b => b.roomName.trim());

        document.querySelectorAll('.room-card-item').forEach(card => {
            const title = card.querySelector('h4').innerText.trim();
            const badge = card.querySelector('span.badge');
            const desc = card.querySelector('p');
            if (bookedRooms.includes(title)) {
                badge.innerText = 'Booked'; badge.className = 'badge badge-red';
                if(desc) { desc.innerText = 'Not Available'; desc.style.color = '#EF4444'; }
            } else {
                badge.innerText = 'Available'; badge.className = 'badge badge-black';
                if(desc) { desc.innerText = 'Ready'; desc.style.color = ''; }
            }
        });
    }

    document.querySelectorAll(".nav-btn").forEach(icon => { 
        icon.addEventListener("click", () => { 
            currMonth = icon.id === "prevMonth" ? currMonth - 1 : currMonth + 1;
            if(currMonth < 0 || currMonth > 11) { 
                date = new Date(currYear, currMonth, new Date().getDate());
                currYear = date.getFullYear(); currMonth = date.getMonth(); 
            } else { date = new Date(); }
            renderCalendar(); 
        });
    });

    // --- 3. MODAL DETAIL (DENGAN FIX PURPOSE) ---
    window.showDayDetails = async (dateStr) => {
        const res = await fetch(API_URL);
        const allBookings = await res.json();
        
        let events = allBookings.filter(b => b.bookingDate === dateStr && b.status === 'Approved');

        const dateObj = new Date(dateStr);
        document.getElementById('modalTitle').innerText = `Schedule: ${dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
        
        const modalContent = document.getElementById('modalContent');
        const modalFooter = document.getElementById('modalFooter');
        const modalOverlay = document.getElementById('eventModal');

        let htmlList = '';
        if (events.length === 0) {
            htmlList = '<p style="text-align:center; color:gray; padding:20px;">No bookings for this date.</p>';
        } else {
            events.forEach(e => {
                // Cek Addons
                let addonsHTML = (e.addOns && e.addOns.length > 0) ? 
                    `<div style="margin-top:5px; padding-top:5px; border-top:1px dashed #eee;">
                        <small>➕ Add-ons: ${e.addOns.map(i=> `${i.type}: ${i.detail}`).join(', ')}</small>
                    </div>` : '';

                // Cek Notes
                let notesHTML = e.notes ? `<div style="margin-top:3px;"><small>📝 Note: ${e.notes}</small></div>` : '';

                // Pastikan Purpose Ada (Fallback ke '-')
                const purposeText = e.purpose ? e.purpose : '-';

                htmlList += `
                    <div class="modal-event-item" style="border:1px solid var(--border-color); padding:10px; margin-bottom:10px; border-radius:6px; background:var(--bg-body);">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <strong style="color:var(--primary-blue)">⏰ ${e.startTime} - ${e.endTime}</strong>
                            <button class="btn-cancel-small" onclick="cancelApprovedBooking('${e.ticketNumber}')" style="background:#fee2e2; color:#dc2626; border:none; padding:3px 8px; border-radius:4px; cursor:pointer; font-weight:bold;">🗑 Cancel</button>
                        </div>
                        
                        <p style="margin:5px 0 2px 0;">📍 <b>${e.roomName}</b></p>
                        <p style="font-size:13px; margin:0;">👤 ${e.borrowerName} (${e.department})</p>
                        
                        <p style="font-size:13px; margin:2px 0; font-weight:500; color:var(--text-main);">
                            🎯 ${purposeText}
                        </p>

                        ${addonsHTML}
                        ${notesHTML}
                    </div>`;
            });
        }
        modalContent.innerHTML = htmlList;

        modalFooter.innerHTML = `
            <button class="btn-secondary" onclick="closeModal()">Close</button>
            <button class="btn-new-booking" onclick="openOverrideModal('${dateStr}')" style="margin-left:10px; padding: 6px 12px; font-size:12px;">
                ➕ Create Priority Booking
            </button>
        `;

        modalOverlay.style.display = 'flex';
    };

    window.closeModal = () => document.getElementById('eventModal').style.display = 'none';

    window.cancelApprovedBooking = async (ticketID) => {
        if (!confirm('Are you sure you want to CANCEL this booking?')) return;
        try {
            // --- PERBAIKAN DISINI JUGA ---
            await fetch(`${API_URL}/${encodeURIComponent(ticketID)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Cancelled', notes: 'Cancelled by Admin' })
            });
            window.closeModal();
            renderCalendar();
        } catch(e) { alert("Error cancelling"); }
    };

    // --- 4. OVERRIDE & PRIORITY FORM ---
    window.openOverrideModal = (dateStr) => {
        document.getElementById('eventModal').style.display = 'none'; 
        document.getElementById('overrideDate').value = dateStr;
        document.getElementById('overrideFormModal').style.display = 'flex';
        // (Isi dropdown jam disederhanakan, logic sama kayak sebelumnya)
        let opts = '<option value="">Select</option>';
        for(let h=8;h<=18;h++) opts += `<option value="${String(h).padStart(2,'0')}:00">${String(h).padStart(2,'0')}:00</option>`;
        document.getElementById('ovStart').innerHTML = opts;
        document.getElementById('ovEnd').innerHTML = opts;
    };

    window.closeOverrideModal = () => document.getElementById('overrideFormModal').style.display = 'none';

    // LOGIC SUBMIT PRIORITY
    window.submitPriorityBooking = async () => {
        const dateStr = document.getElementById('overrideDate').value;
        const roomSel = document.getElementById('ovRoom');
        const roomName = roomSel.options[roomSel.selectedIndex].text;
        const startTime = document.getElementById('ovStart').value;
        const endTime = document.getElementById('ovEnd').value;
        const dept = document.getElementById('ovDept').value;
        const purpose = document.getElementById('ovPurpose').value;

        if(!startTime || !endTime || !purpose) {
            alert("Please fill all fields!");
            return;
        }

        try {
            // 1. Get All Data untuk Cek Bentrok
            const res = await fetch(API_URL);
            const allBookings = await res.json();

            const toMin = (s) => { const [h,m]=s.split(':').map(Number); return h*60+m; };
            const newStart = toMin(startTime);
            const newEnd = toMin(endTime);

            // Cek Konflik
            const conflicts = allBookings.filter(b => {
                if(b.status !== 'Approved') return false; 
                if(b.bookingDate === dateStr && b.roomName === roomName) {
                    const exStart = toMin(b.startTime); const exEnd = toMin(b.endTime);
                    return (newStart < exEnd && newEnd > exStart);
                }
                return false;
            });

            // Logic Override
            if(conflicts.length > 0) {
                const conflictNames = conflicts.map(c => `${c.borrowerName} (${c.department})`).join(', ');
                
                if(confirm(`⚠️ CONFLICT DETECTED with: ${conflictNames}\n\nDo you want to CANCEL their booking and OVERRIDE?`)) {
                    // Batalkan semua yang bentrok
                    for (const conflict of conflicts) {
                        // --- PERBAIKAN UTAMA DISINI: encodeURIComponent ---
                        await fetch(`${API_URL}/${encodeURIComponent(conflict.ticketNumber)}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'Cancelled', notes: 'Override by Admin' })
                        });
                    }
                } else { 
                    return; // Batal simpan
                }
            }

            // Simpan Baru
            const dateStrCode = new Date().toISOString().slice(0,10).replace(/-/g,"");
            const ticketID = `#BA-${dateStrCode}-${Math.floor(Math.random()*9000)}`;
            
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticketNumber: ticketID,
                    borrowerName: 'Administrator',
                    department: dept,
                    purpose: purpose,
                    roomName: roomName,
                    bookingDate: dateStr,
                    startTime: startTime,
                    endTime: endTime,
                    status: 'Approved',
                    addOns: [],
                    notes: 'Priority Booking'
                })
            });

            alert("Priority Booking Saved Successfully!");
            closeOverrideModal();
            
            // Refresh halaman & data
            renderCalendar(); 
            showDayDetails(dateStr); // Buka lagi list untuk memastikan tampilan terupdate

        } catch(e) { 
            console.error(e); 
            alert("Error saving data (Check console)"); 
        }
    };
});