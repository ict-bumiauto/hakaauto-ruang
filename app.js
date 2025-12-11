document.addEventListener('DOMContentLoaded', function() {
    console.log("🚀 App.js Loaded...");

    // ============================================================
    // 1. AUTH & SECURITY (SATPAM)
    // ============================================================
    const savedName = localStorage.getItem('currentUser');
    const bookingForm = document.getElementById('bookingForm');

    // Jika ada form (berarti di Dashboard), tapi gak ada user login -> USIR!
    if (bookingForm && !savedName) {
        alert("Akses Ditolak: Anda harus login dulu!");
        window.location.href = '/login';
        return;
    }

    // ============================================================
    // 2. AUTO-FILL FORM (Nama, Divisi, WA, Email)
    // ============================================================
    if (savedName && bookingForm) {
        // 1. Isi Nama
        const formName = document.getElementById('formBorrowerName');
        if (formName) formName.value = savedName;

        // 2. Isi Divisi
        const savedDivision = localStorage.getItem('userDivision');
        const sbuSelect = document.querySelector('select[name="sbu"]');
        if (sbuSelect && savedDivision) sbuSelect.value = savedDivision;

        // 3. Isi WhatsApp
        const savedPhone = localStorage.getItem('userPhone');
        const waInput = document.querySelector('input[name="whatsappNumber"]') || document.getElementById('whatsapp');
        if (waInput && savedPhone) waInput.value = savedPhone;
        
        // (Email diambil diam-diam saat submit nanti)
    }

    // ============================================================
    // 3. HANDLE SUBMIT FORM (INI BAGIAN PENTING!)
    // ============================================================
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(event) {
            // [WAJIB] Mencegah refresh halaman
            event.preventDefault(); 
            
            console.log("📨 Tombol Submit Ditekan...");

            const submitBtn = document.querySelector('.submit-btn');
            const originalText = submitBtn.innerText;
            
            // Ubah tombol jadi Loading
            submitBtn.innerText = "⏳ Sending...";
            submitBtn.disabled = true;

            try {
                // Kumpulkan Data Form
                const bookingData = {
                    ticketNumber: 'T-' + Date.now(),
                    
                    // Data User
                    borrowerName: document.getElementById('formBorrowerName').value,
                    borrowerEmail: localStorage.getItem('userEmail'), // <--- EMAIL STAFF (PENTING!)
                    department: document.querySelector('select[name="sbu"]').value,
                    whatsapp: document.querySelector('input[name="whatsappNumber"]').value,
                    
                    // Data Booking
                    purpose: document.getElementById('purpose').value,
                    bookingDate: document.getElementById('bookingDate').value,
                    startTime: document.querySelector('select[name="startTime"]').value,
                    endTime: document.querySelector('select[name="endTime"]').value,
                    roomName: document.querySelector('select[name="roomName"]').value,
                    participants: document.getElementById('participants').value,
                    
                    // Tambahan
                    addOns: document.getElementById('addOnsCheck')?.checked ? "Yes" : "No",
                    notes: document.getElementById('notes')?.value || "",
                    status: 'Pending' // Default status
                };

                console.log("📦 Data Siap Kirim:", bookingData);

                // Kirim ke Backend
                const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });

                const result = await response.json();

                if (response.ok) {
                    // SUKSES
                    alert("✅ Booking Berhasil Terkirim!\nSilakan tunggu persetujuan Admin.");
                    window.location.href = '/calendar'; // Pindah ke kalender
                } else {
                    // GAGAL (Misal bentrok)
                    alert("❌ Gagal: " + result.message);
                }

            } catch (error) {
                console.error("Error:", error);
                alert("⚠️ Terjadi kesalahan sistem: " + error.message);
            } finally {
                // Balikin tombol (jika gagal)
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});