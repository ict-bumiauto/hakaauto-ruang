// calendar.js
const API_URL = '/api/bookings';
document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. USER AUTH ---
    const savedName = localStorage.getItem('currentUser');
    if (!savedName) { window.location.href = '/login'; return; }
    document.getElementById('headerUserName').innerText = savedName;

    // --- 2. UPDATE ROOM STATUS (MERAH/HITAM) ---
    async function updateRoomStatus() {
        const now = new Date();
        const todayStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        try {
            const res = await fetch(API_URL);
            const allBookings = await res.json();

            const bookedRooms = allBookings
                .filter(b => b.bookingDate === todayStr && b.status === 'Approved')
                .map(b => b.roomName.trim());

            document.querySelectorAll('.room-card-item').forEach(card => {
                const title = card.querySelector('h4').innerText.trim();
                const badge = card.querySelector('span.badge');
                const desc = card.querySelector('p');

                if (bookedRooms.includes(title)) {
                    badge.innerText = 'Not Available'; badge.className = 'badge badge-red';
                    desc.innerText = 'Booked'; desc.style.color = '#EF4444';
                } else {
                    badge.innerText = 'Available'; badge.className = 'badge badge-black';
                    desc.innerText = 'Ready'; desc.style.color = '';
                }
            });
        } catch(e) { console.error(e); }
    }
    updateRoomStatus();

    // --- 3. RENDER KALENDER ---
    const daysTag = document.querySelector(".calendar-days");
    const currentDateDisplay = document.querySelector("#currentMonthYear");
    let date = new Date();
    let currYear = date.getFullYear();
    let currMonth = date.getMonth();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Fungsi Render Async
    const renderCalendar = async () => {
        let firstDayofMonth = new Date(currYear, currMonth, 1).getDay(); 
        let lastDateofMonth = new Date(currYear, currMonth + 1, 0).getDate(); 
        let lastDateofLastMonth = new Date(currYear, currMonth, 0).getDate(); 
        let lastDayofMonth = new Date(currYear, currMonth, lastDateofMonth).getDay();

        let liTag = "";

        // FETCH DATA DULU
        let allBookings = [];
        try {
            const res = await fetch(API_URL);
            allBookings = await res.json();
        } catch(e) { console.error("Gagal load kalender"); }

        for (let i = firstDayofMonth; i > 0; i--) { 
            liTag += `<li class="inactive">${lastDateofLastMonth - i + 1}</li>`;
        }

        for (let i = 1; i <= lastDateofMonth; i++) { 
            let isToday = i === new Date().getDate() && currMonth === new Date().getMonth() && currYear === new Date().getFullYear();
            let activeClass = isToday ? "active" : ""; 
            
            // Format YYYY-MM-DD (Manual string manipulation biar aman timezone)
            let currentMonthStr = String(currMonth + 1).padStart(2, '0');
            let currentDayStr = String(i).padStart(2, '0');
            let currentFullDate = `${currYear}-${currentMonthStr}-${currentDayStr}`;

            // Cek Event Approved
            let events = allBookings.filter(b => b.bookingDate === currentFullDate && b.status === 'Approved');
            
            let eventHTML = '';
            events.forEach(evt => {
                let shortName = evt.borrowerName.split(' ')[0];
                eventHTML += `<div class="calendar-event">• ${shortName} <br> <span style="font-size:9px">${evt.startTime}</span></div>`;
            });

            liTag += `<li class="${activeClass}" onclick="selectDate(${currYear}, ${currMonth}, ${i})" style="cursor: pointer;">
                        <span class="date-num">${i}</span>
                        ${eventHTML}
                      </li>`;
        }

        for (let i = lastDayofMonth; i < 6; i++) { 
            liTag += `<li class="inactive">${i - lastDayofMonth + 1}</li>`;
        }

        currentDateDisplay.innerText = `${months[currMonth]} ${currYear}`;
        daysTag.innerHTML = liTag;
    };

    renderCalendar();

    // Navigasi Bulan
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

    // Pindah ke Form Booking
    window.selectDate = (y, m, d) => {
        const fullDate = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        window.location.href = `/?date=${fullDate}`;
    };
    
    // Logout
    document.querySelector('.sign-out-btn').addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/login';
    });
});