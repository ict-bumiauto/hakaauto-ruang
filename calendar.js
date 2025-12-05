// GANTI DENGAN LINK API VERCEL ANDA (Relative Path)
const API_URL = '/api/bookings'; 

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================================
    // 1. USER AUTH
    // ============================================================
    const savedName = localStorage.getItem('currentUser');
    if (!savedName) { window.location.href = '/'; return; } // Balik ke Login
    
    const headerName = document.getElementById('headerUserName');
    if(headerName) headerName.innerText = savedName;

    // Logout
    document.querySelector('.sign-out-btn')?.addEventListener('click', (e) => {
        e.preventDefault(); localStorage.clear(); window.location.href = '/login';
    });

    // ============================================================
    // 2. DASHBOARD STATS & RECENT BOOKINGS (INI YANG TADI KURANG)
    // ============================================================
    function updateDashboardStats(allBookings) {
        // --- A. UPDATE QUICK STATS ---
        const statsList = document.querySelector('.quick-stats .stats-list');
        if (statsList) {
            const total = allBookings.length;
            const approved = allBookings.filter(b => b.status === 'Approved').length;
            const pending = allBookings.filter(b => b.status === 'Pending').length;
            
            // Update angka di HTML
            statsList.children[0].querySelector('.stat-value').innerText = total;
            statsList.children[1].querySelector('.stat-value').innerText = approved;
            statsList.children[2].querySelector('.stat-value').innerText = pending;
        }

        // --- B. UPDATE RECENT BOOKINGS ---
        const recentContainer = document.querySelector('.recent-bookings');
        if (recentContainer) {
            const recentData = allBookings.slice(0, 5); // Ambil 5 terbaru
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
    // 3. FETCH DATA & RENDER (GABUNGAN)
    // ============================================================
    const daysTag = document.querySelector(".calendar-days");
    const currentDateDisplay = document.querySelector("#currentMonthYear");
    let date = new Date();
    let currYear = date.getFullYear();
    let currMonth = date.getMonth();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const renderPage = async () => {
        let allBookings = [];
        try {
            const res = await fetch(API_URL);
            if(res.ok) allBookings = await res.json();
        } catch(e) { console.error("Gagal load data"); }

        // --- PANGGIL FUNGSI STATS DI SINI ---
        updateDashboardStats(allBookings);
        
        // Update Room Availability Widget
        updateRoomStatus(allBookings);

        // --- RENDER KALENDER ---
        let firstDayofMonth = new Date(currYear, currMonth, 1).getDay(); 
        let lastDateofMonth = new Date(currYear, currMonth + 1, 0).getDate(); 
        let lastDateofLastMonth = new Date(currYear, currMonth, 0).getDate(); 
        let lastDayofMonth = new Date(currYear, currMonth, lastDateofMonth).getDay();
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
                eventHTML += `<div class="calendar-event">• ${shortName} <br> <span style="font-size:9px">${evt.startTime}</span></div>`;
            });

            liTag += `<li class="${activeClass}" onclick="selectDate(${currYear}, ${currMonth}, ${i})" style="cursor: pointer;">
                        <span class="date-num">${i}</span>${eventHTML}</li>`;
        }

        for (let i = lastDayofMonth; i < 6; i++) liTag += `<li class="inactive">${i - lastDayofMonth + 1}</li>`;

        currentDateDisplay.innerText = `${months[currMonth]} ${currYear}`;
        daysTag.innerHTML = liTag;
    };

    // Jalankan Render
    renderPage();

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

    // Navigasi Bulan
    document.querySelectorAll(".nav-btn").forEach(icon => {
        icon.addEventListener("click", () => {
            currMonth = icon.id === "prevMonth" ? currMonth - 1 : currMonth + 1;
            if(currMonth < 0 || currMonth > 11) {
                date = new Date(currYear, currMonth, new Date().getDate());
                currYear = date.getFullYear(); currMonth = date.getMonth();
            } else { date = new Date(); }
            renderPage(); 
        });
    });

    // Pindah ke Form
    window.selectDate = (y, m, d) => {
        const fullDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        window.location.href = `/dashboard?date=${fullDate}`;
    };
});