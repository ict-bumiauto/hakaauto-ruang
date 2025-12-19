// admin_calendar.js
const API_URL = '/api/bookings';
document.addEventListener('DOMContentLoaded', function () {

    const role = localStorage.getItem('userRole');
    if (role !== 'admin') { window.location.href = '/admin'; return; }

    const daysTag = document.querySelector(".calendar-days");
    const currentDateDisplay = document.querySelector("#currentMonthYear");
    let date = new Date();
    let currYear = date.getFullYear();
    let currMonth = date.getMonth();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // List Hari Libur Nasional 2025 (Official)
    const holidays2025 = {
        "2025-01-01": "Tahun Baru 2025",
        "2025-01-27": "Isra Mikraj",
        "2025-01-28": "Tahun Baru Imlek",
        "2025-01-29": "Tahun Baru Imlek",
        "2025-03-28": "Cuti Bersama",
        "2025-03-29": "Hari Suci Nyepi",
        "2025-03-31": "Idul Fitri 1446 H",
        "2025-04-01": "Idul Fitri 1446 H",
        "2025-04-02": "Cuti Bersama",
        "2025-04-03": "Cuti Bersama",
        "2025-04-04": "Cuti Bersama",
        "2025-04-07": "Cuti Bersama",
        "2025-04-18": "Wafat Yesus Kristus",
        "2025-04-20": "Kebangkitan Yesus Kristus",
        "2025-05-01": "Hari Buruh",
        "2025-05-12": "Hari Raya Waisak",
        "2025-05-13": "Cuti Bersama",
        "2025-05-29": "Kenaikan Yesus Kristus",
        "2025-05-30": "Cuti Bersama",
        "2025-06-01": "Hari Lahir Pancasila",
        "2025-06-06": "Idul Adha 1446 H",
        "2025-06-09": "Cuti Bersama",
        "2025-06-27": "Tahun Baru Islam",
        "2025-08-17": "Kemerdekaan RI",
        "2025-09-05": "Maulid Nabi Muhammad",
        "2025-12-25": "Hari Raya Natal",
        "2025-12-26": "Cuti Bersama"
    };

    // List Hari Libur Nasional 2026 (Official SKB 3 Menteri)
    const holidays2026 = {
        "2026-01-01": "Tahun Baru 2026",
        "2026-01-16": "Isra Mikraj",
        "2026-02-16": "Cuti Imlek",
        "2026-02-17": "Tahun Baru Imlek",
        "2026-03-18": "Cuti Nyepi",
        "2026-03-19": "Hari Suci Nyepi",
        "2026-03-20": "Cuti Idul Fitri",
        "2026-03-21": "Idul Fitri 1447 H",
        "2026-03-22": "Idul Fitri 1447 H",
        "2026-03-23": "Cuti Idul Fitri",
        "2026-03-24": "Cuti Idul Fitri",
        "2026-04-03": "Wafat Yesus Kristus",
        "2026-04-05": "Paskah",
        "2026-05-01": "Hari Buruh",
        "2026-05-14": "Kenaikan Yesus Kristus",
        "2026-05-15": "Cuti Kenaikan Yesus",
        "2026-05-27": "Idul Adha 1447 H",
        "2026-05-28": "Cuti Idul Adha",
        "2026-05-31": "Hari Raya Waisak",
        "2026-06-01": "Lahir Pancasila",
        "2026-06-16": "Tahun Baru Islam",
        "2026-08-17": "Kemerdekaan RI",
        "2026-08-25": "Maulid Nabi Muhammad",
        "2026-12-24": "Cuti Natal",
        "2026-12-25": "Hari Raya Natal"
    };

    const allHolidays = { ...holidays2025, ...holidays2026 };

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
        } catch (e) { console.error("Error fetching calendar data"); }

        let liTag = "";
        for (let i = firstDayofMonth; i > 0; i--) liTag += `<li class="inactive">${lastDateofLastMonth - i + 1}</li>`;

        for (let i = 1; i <= lastDateofMonth; i++) {
            let isToday = i === new Date().getDate() && currMonth === new Date().getMonth() && currYear === new Date().getFullYear();
            let activeClass = isToday ? "active" : "";

            let currentFullDate = `${currYear}-${String(currMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

            // Check Red Date Logic (Weekend & Holiday)
            let checkDate = new Date(currYear, currMonth, i);
            let dayOfWeek = checkDate.getDay();
            let isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
            let holidayName = allHolidays[currentFullDate];
            let isNationalHoliday = !!holidayName;

            let isRedDate = isWeekend || isNationalHoliday;

            if (isRedDate) activeClass += " holiday";
            let events = allBookings.filter(b => b.bookingDate === currentFullDate && b.status === 'Approved');

            let eventHTML = '';
            events.forEach(evt => {
                let shortName = evt.borrowerName.split(' ')[0];
                eventHTML += `<div class="calendar-event" title="${evt.roomName}">• ${shortName} <br> <span style="font-size:9px">${evt.startTime}</span></div>`;
            });

            liTag += `<li class="${activeClass}" onclick="showDayDetails('${currentFullDate}')" style="cursor: pointer;">
                        <span class="date-num">${i}</span>${holidayName ? `<div class="holiday-name">${holidayName}</div>` : ''}${eventHTML}</li>`;
        }
        for (let i = lastDayofMonth; i < 6; i++) liTag += `<li class="inactive">${i - lastDayofMonth + 1}</li>`;

        currentDateDisplay.innerText = `${months[currMonth]} ${currYear}`;
        daysTag.innerHTML = liTag;

        // Panggil update status hari ini juga
        updateRoomStatus(allBookings);
    };

    renderCalendar();

    // Navigasi Bulan
    document.querySelectorAll(".nav-btn").forEach(icon => {
        icon.addEventListener("click", () => {
            currMonth = icon.id === "prevMonth" ? currMonth - 1 : currMonth + 1;
            if (currMonth < 0 || currMonth > 11) {
                date = new Date(currYear, currMonth, new Date().getDate());
                currYear = date.getFullYear();
                currMonth = date.getMonth();
            } else {
                date = new Date();
            }
            renderCalendar();
        });
    });

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
                        <small>➕ Add-ons: ${e.addOns.map(i => `${i.type}: ${i.detail}`).join(', ')}</small>
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
        } catch (e) { alert("Error cancelling"); }
    };

    // --- 4. OVERRIDE & PRIORITY FORM ---
    window.openOverrideModal = (dateStr) => {
        document.getElementById('eventModal').style.display = 'none';
        document.getElementById('overrideDate').value = dateStr;
        document.getElementById('overrideFormModal').style.display = 'flex';
        // (Isi dropdown jam disederhanakan, logic sama kayak sebelumnya)
        let opts = '<option value="">Select</option>';
        for (let h = 8; h <= 18; h++) opts += `<option value="${String(h).padStart(2, '0')}:00">${String(h).padStart(2, '0')}:00</option>`;
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

        if (!startTime || !endTime || !purpose) {
            alert("Please fill all fields!");
            return;
        }

        try {
            // 1. Get All Data untuk Cek Bentrok
            const res = await fetch(API_URL);
            const allBookings = await res.json();

            const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
            const newStart = toMin(startTime);
            const newEnd = toMin(endTime);

            // Cek Konflik
            const conflicts = allBookings.filter(b => {
                if (b.status !== 'Approved') return false;
                if (b.bookingDate === dateStr && b.roomName === roomName) {
                    const exStart = toMin(b.startTime); const exEnd = toMin(b.endTime);
                    return (newStart < exEnd && newEnd > exStart);
                }
                return false;
            });

            // Logic Override
            if (conflicts.length > 0) {
                const conflictNames = conflicts.map(c => `${c.borrowerName} (${c.department})`).join(', ');

                if (confirm(`⚠️ CONFLICT DETECTED with: ${conflictNames}\n\nDo you want to CANCEL their booking and OVERRIDE?`)) {
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
            const dateStrCode = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const ticketID = `#BA-${dateStrCode}-${Math.floor(Math.random() * 9000)}`;

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

        } catch (e) {
            console.error(e);
            alert("Error saving data (Check console)");
        }
    };
});