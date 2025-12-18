// GANTI DENGAN LINK API VERCEL ANDA
const API_URL = '/api/bookings';

document.addEventListener('DOMContentLoaded', function () {

    // ============================================================
    // 1. CEK STATUS USER (GUEST vs MEMBER)
    // ============================================================
    const savedName = localStorage.getItem('currentUser');
    const headerName = document.getElementById('headerUserName');
    const signOutBtn = document.querySelector('.sign-out-btn');
    const newBookingBtn = document.querySelector('.btn-primary'); // Tombol New Booking

    // LOGIKA TOMBOL
    if (newBookingBtn) {
        newBookingBtn.addEventListener('click', function (e) {
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
        if (headerName) headerName.innerText = savedName;

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
        if (headerName) {
            headerName.innerText = "Guest (View Only)";
            headerName.style.color = "#aaa"; // Warna abu biar beda
        }

        // Tombol Sign Out berubah jadi "Sign In"
        if (signOutBtn) {
            signOutBtn.innerText = "Sign In";
            signOutBtn.style.backgroundColor = "#2563EB";
            signOutBtn.style.color = "white";
            signOutBtn.onclick = (e) => {
                // UPDATE BARIS INI: Arahkan ke /login
                e.preventDefault(); window.location.href = '/login';
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

        // ---------------------------------------------
        // HAPUS (HIDE) QUICK STATS & RECENT UTK GUEST
        // ---------------------------------------------
        const statsSection = document.querySelector('.quick-stats');
        const recentSection = document.querySelector('.recent-bookings');
        if (statsSection) statsSection.style.display = 'none';
        if (recentSection) recentSection.style.display = 'none';
    }

    // ============================================================
    // 2. LOGIKA CAROUSEL (Tetap Sama)
    // ============================================================
    const roomContainer = document.querySelector('.room-list');
    const btnLeft = document.getElementById('scrollLeft');
    const btnRight = document.getElementById('scrollRight');

    if (roomContainer && btnLeft && btnRight) {
        btnRight.onclick = () => { roomContainer.scrollBy({ left: 335, behavior: 'smooth' }); };
        btnLeft.onclick = () => { roomContainer.scrollBy({ left: -335, behavior: 'smooth' }); };
    }

    // ============================================================
    // 3. FETCH DATA & RENDER (Tetap Sama)
    // ============================================================
    const renderPage = async () => {
        let allBookings = [];
        try {
            const res = await fetch(API_URL);
            if (res.ok) allBookings = await res.json();
            window.currentBookings = allBookings; // Simpan ke global agar bisa dibaca fungsi klik
        } catch (e) { console.error("Gagal load data"); }

        // Data untuk Kalender (Tetap Semua agar tahu ketersediaan)
        renderCalendar(allBookings);

        // Data untuk Sidebar (User Only)
        // Jika User Login, filter khusus dia. Jika Guest, kosongkan/hide.
        const myBookings = savedName ? allBookings.filter(b => b.borrowerName === savedName) : [];

        updateDashboardStats(myBookings);
        updateRoomStatus(allBookings); // Room status tetap global
    };

    // --- Render Kalender ---
    const daysTag = document.querySelector(".calendar-days");
    const currentDateDisplay = document.querySelector("#currentMonthYear");
    let date = new Date();
    let currYear = date.getFullYear();
    let currMonth = date.getMonth();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // List Hari Libur Nasional 2025 (Official)
    const holidays2025 = [
        "2025-01-01", "2025-01-27", "2025-01-28", "2025-01-29",
        "2025-03-28", "2025-03-29", "2025-03-31", "2025-04-01",
        "2025-04-02", "2025-04-03", "2025-04-04", "2025-04-07",
        "2025-04-18", "2025-04-20", "2025-05-01", "2025-05-12",
        "2025-05-13", "2025-05-29", "2025-05-30", "2025-06-01",
        "2025-06-06", "2025-06-09", "2025-06-27", "2025-08-17",
        "2025-09-05", "2025-12-25", "2025-12-26"
    ];

    function renderCalendar(allBookings) {
        let firstDayofMonth = new Date(currYear, currMonth, 1).getDay();
        let lastDateofMonth = new Date(currYear, currMonth + 1, 0).getDate();
        let lastDateofLastMonth = new Date(currYear, currMonth, 0).getDate();
        let lastDayofMonth = new Date(currYear, currMonth, lastDateofMonth).getDay();
        let liTag = "";

        for (let i = firstDayofMonth; i > 0; i--) liTag += `<li class="inactive">${lastDateofLastMonth - i + 1}</li>`;

        // Define Today for Comparison
        let todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        for (let i = 1; i <= lastDateofMonth; i++) {
            let isToday = i === new Date().getDate() && currMonth === new Date().getMonth() && currYear === new Date().getFullYear();

            // 1. Check if Past Date
            let checkDate = new Date(currYear, currMonth, i);
            let isPast = checkDate < todayDate;

            // 2. Check if Holiday or Weekend
            // Weekend: Sunday (0) or Saturday (6)
            let dayOfWeek = checkDate.getDay();
            let isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

            // Retrieve Current Date String safely
            let currentFullDate = `${currYear}-${String(currMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

            let isNationalHoliday = holidays2025.includes(currentFullDate);
            let isRedDate = isWeekend || isNationalHoliday;

            let activeClass = isToday ? "active" : "";
            // Append 'holiday' class if it is a red date
            if (isRedDate) activeClass += " holiday";

            let events = allBookings.filter(b => b.bookingDate === currentFullDate && b.status === 'Approved');

            let eventHTML = '';
            events.forEach(evt => {
                let shortPurpose = evt.purpose.split(' ').slice(0, 3).join(' ');
                eventHTML += `<div class="calendar-event">• ${shortPurpose} <br> <span style="font-size:9px">${evt.startTime}</span></div>`;
            });

            if (isPast) {
                // TANGGAL LEWAT -> DISABLE (Class inactive, Hapus OnClick)
                // Tetap tambahkan class holiday agar tahu itu hari libur meski disable
                liTag += `<li class="inactive ${isRedDate ? 'holiday' : ''}"><span class="date-num">${i}</span>${eventHTML}</li>`;
            } else {
                // HARI INI & MASA DEPAN -> BISA DIKLIK (MERAH JIKA HOLIDAY)
                liTag += `<li class="${activeClass}" onclick="selectDate(${currYear}, ${currMonth}, ${i})">
                        <span class="date-num">${i}</span>${eventHTML}</li>`;
            }
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

        // Cek apakah ada booking di tanggal ini?
        const fullDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        // Cari event APPROVED di tanggal ini
        // Kita butuh akses ke 'allBookings' yang di-fetch di awal. 
        // Masalah: scope 'allBookings' ada di renderPage. Kita perlu menyimpannya di variabel global atau parsing ulang.
        // Solusi Aman: Ambil dari elemen HTML yang sudah dirender (jika ada) atau fetch ulang (lambat).
        // Solusi Terbaik: Simpan data global.

        const events = window.currentBookings ? window.currentBookings.filter(b => b.bookingDate === fullDate && b.status === 'Approved') : [];

        if (events.length > 0) {
            // TAMPILKAN MODAL
            const modal = document.getElementById('eventModal');
            const body = document.getElementById('eventDetailsBody');

            let html = '';
            events.forEach(evt => {
                html += `
                <div class="modal-event-item">
                     <strong>${evt.borrowerName} • ${evt.department}</strong>
                     <p>Booking Purpose: ${evt.purpose}</p>
                     <p>Time: ${evt.startTime} - ${evt.endTime}</p>
                     <small>Room: ${evt.roomName}</small>
                </div>
                `;
            });

            body.innerHTML = html;
            modal.style.display = 'flex';
        } else {
            // TIDAK ADA EVENT -> LANGSUNG REDIRECT
            window.location.href = `/dashboard?date=${fullDate}`;
        }
    };

    window.closeEventModal = () => {
        document.getElementById('eventModal').style.display = 'none';
    };

    // Navigasi Bulan
    document.querySelectorAll(".nav-btn").forEach(icon => {
        icon.addEventListener("click", () => {
            currMonth = icon.id === "prevMonth" ? currMonth - 1 : currMonth + 1;
            if (currMonth < 0 || currMonth > 11) {
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