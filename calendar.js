// GANTI DENGAN LINK API VERCEL ANDA
const API_URL = '/api/bookings'; 

document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================================
    // 1. CEK STATUS USER (GUEST vs MEMBER)
    // ============================================================
    const savedName = localStorage.getItem('currentUser');
    const headerName = document.getElementById('headerUserName');
    const signOutBtn = document.querySelector('.sign-out-btn');
    const newBookingBtn = document.querySelector('.btn-primary'); // Tombol New Booking

    // LOGIKA TOMBOL
    if (newBookingBtn) {
        newBookingBtn.addEventListener('click', function(e) {
            e.preventDefault(); // Matikan link bawaan

            if (!savedName) {
                // JIKA GUEST (Belum Login)
                alert("⛔ Akses Ditolak!\n\nAnda harus Login terlebih dahulu untuk melakukan booking.");
                window.location.href = '/'; // Lempar ke Login
            } else {
                // JIKA USER (Sudah Login)
                window.location.href = '/dashboard'; // Lanjut ke Form
            }
        });
    }

    if (savedName) {
        // --- JIKA SUDAH LOGIN ---
        if(headerName) headerName.innerText = savedName;
        
        // Tombol Sign Out berfungsi normal
        if (signOutBtn) {
            signOutBtn.innerText = "Sign Out";
            signOutBtn.onclick = (e) => {
                e.preventDefault(); localStorage.clear(); window.location.href = '/';
            };
        }

        // Tombol New Booking -> Ke Dashboard Form
        if (newBookingBtn) {
            newBookingBtn.onclick = (e) => {
                e.preventDefault(); window.location.href = '/dashboard';
            };
        }

    } else {
        // --- JIKA TAMU (GUEST) ---
        // Jangan di-kick, biarkan lihat kalender
        if(headerName) {
            headerName.innerText = "Guest (View Only)";
            headerName.style.color = "#aaa"; // Warna abu biar beda
        }

        // Tombol Sign Out berubah jadi "Sign In"
        if (signOutBtn) {
            signOutBtn.innerText = "Sign In";
            signOutBtn.style.backgroundColor = "#2563EB"; // Jadi biru
            signOutBtn.style.color = "white";
            signOutBtn.onclick = (e) => {
                e.preventDefault(); window.location.href = '/'; // Ke Login
            };
        }

        // Tombol New Booking -> Ke Login (Dilarang Booking)
        if (newBookingBtn) {
            newBookingBtn.onclick = (e) => {
                e.preventDefault();
                alert("Anda harus Login terlebih dahulu untuk melakukan booking.");
                window.location.href = '/';
            };
        }
    }

    // ============================================================
    // 2. LOGIKA CAROUSEL (Tetap Sama)
    // ============================================================
    const roomContainer = document.querySelector('.room-list');
    const btnLeft = document.getElementById('scrollLeft');
    const btnRight = document.getElementById('scrollRight');

    if (roomContainer && btnLeft && btnRight) {
        btnRight.onclick = () => { roomContainer.scrollBy({ left: 320, behavior: 'smooth' }); };
        btnLeft.onclick = () => { roomContainer.scrollBy({ left: -320, behavior: 'smooth' }); };
    }

    // ============================================================
    // 3. FETCH DATA & RENDER (Tetap Sama)
    // ============================================================
    const renderPage = async () => {
        let allBookings = [];
        try {
            const res = await fetch(API_URL);
            if(res.ok) allBookings = await res.json();
        } catch(e) { console.error("Gagal load data"); }

        updateDashboardStats(allBookings);
        updateRoomStatus(allBookings);
        renderCalendar(allBookings);
    };

    // --- Render Kalender ---
    const daysTag = document.querySelector(".calendar-days");
    const currentDateDisplay = document.querySelector("#currentMonthYear");
    let date = new Date();
    let currYear = date.getFullYear();
    let currMonth = date.getMonth();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    function renderCalendar(allBookings) {
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

            // Klik Tanggal: Jika User -> Dashboard, Jika Guest -> Login
            liTag += `<li class="${activeClass}" onclick="selectDate(${currYear}, ${currMonth}, ${i})">
                        <span class="date-num">${i}</span>${eventHTML}</li>`;
        }
        for (let i = lastDayofMonth; i < 6; i++) liTag += `<li class="inactive">${i - lastDayofMonth + 1}</li>`;

        currentDateDisplay.innerText = `${months[currMonth]} ${currYear}`;
        daysTag.innerHTML = liTag;
    }

    // Fungsi Klik Tanggal (Updated)
    window.selectDate = (y, m, d) => {
        if (!savedName) {
            alert("Silakan Login untuk melakukan booking pada tanggal ini.");
            window.location.href = '/'; // Guest dilempar ke Login
            return;
        }
        const fullDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        window.location.href = `/dashboard?date=${fullDate}`;
    };

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

    // --- Update Stats ---
    function updateDashboardStats(allBookings) {
        const statsList = document.querySelector('.quick-stats .stats-list');
        if (statsList) {
            statsList.children[0].querySelector('.stat-value').innerText = allBookings.length;
            statsList.children[1].querySelector('.stat-value').innerText = allBookings.filter(b => b.status === 'Approved').length;
            statsList.children[2].querySelector('.stat-value').innerText = allBookings.filter(b => b.status === 'Pending').length;
        }
        const recentContainer = document.querySelector('.recent-bookings');
        if (recentContainer) {
            const recentData = allBookings.slice(0, 5);
            let htmlContent = '<h3>Recent Bookings</h3>';
            if (recentData.length === 0) htmlContent += '<p style="color:#999; font-size:13px;">No bookings yet.</p>';
            else {
                htmlContent += '<ul style="list-style:none; padding:0; margin-top:10px;">';
                recentData.forEach(b => {
                    let color = b.status === 'Approved' ? '#10B981' : (b.status === 'Pending' ? '#F59E0B' : '#EF4444');
                    htmlContent += `<li style="margin-bottom:12px; border-bottom:1px solid #eee; padding-bottom:8px;">
                        <div style="display:flex; justify-content:space-between;"><span style="font-weight:bold; font-size:13px;">${b.borrowerName}</span><span style="font-size:10px; font-weight:bold; color:${color}; border:1px solid ${color}; padding:1px 4px; border-radius:4px;">${b.status}</span></div>
                        <div style="font-size:11px; color:#64748B;">${b.roomName}</div><div style="font-size:11px; color:#64748B;">📅 ${b.bookingDate} (${b.startTime}-${b.endTime})</div></li>`;
                });
                htmlContent += '</ul>';
            }
            recentContainer.innerHTML = htmlContent;
        }
    }

    // --- Room Status ---
    function updateRoomStatus(allBookings) {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const bookedRooms = allBookings.filter(b => b.bookingDate === todayStr && b.status === 'Approved').map(b => b.roomName.trim());
        
        document.querySelectorAll('.room-card-item').forEach(card => {
            const titleEl = card.querySelector('h4');
            const badgeEl = card.querySelector('span.badge');
            if (titleEl && badgeEl) {
                if (bookedRooms.includes(titleEl.innerText.trim())) {
                    badgeEl.innerText = 'Booked'; badgeEl.className = 'badge badge-red';
                } else {
                    badgeEl.innerText = 'Available'; badgeEl.className = 'badge badge-black';
                }
            }
        });
    }

    renderPage();
});