document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================================
    // KONFIGURASI API
    // ============================================================
    // URL Backend untuk cek login ke Database Supabase
    const LOGIN_API_URL = '/api/login'; 

    // ============================================================
    // SELECTOR ELEMENT HTML
    // ============================================================
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const waInput = document.getElementById('whatsapp'); 
    const submitBtn = document.querySelector('.submit-btn');

    // Pastikan form ada sebelum menjalankan script
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Mencegah reload halaman standar

            // 1. AMBIL & BERSIHKAN INPUT
            // .trim() membuang spasi di depan/belakang
            // .toLowerCase() mengubah jadi huruf kecil semua agar cocok dengan database
            const email = emailInput.value.trim().toLowerCase(); 
            const wa = waInput.value.trim();

            // 2. VALIDASI FRONTEND SEDERHANA
            if (!email || !wa) {
                alert("Mohon lengkapi Email dan No. WhatsApp.");
                return;
            }

            if (!email.endsWith('@hakaauto.co.id')) {
                alert("Akses Ditolak: Wajib menggunakan email kantor (@hakaauto.co.id)!");
                return;
            }

            // 3. UBAH TAMPILAN TOMBOL (LOADING STATE)
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "⏳ Checking Access...";
            submitBtn.disabled = true;       // Matikan tombol biar gak diklik 2x
            submitBtn.style.opacity = "0.7"; // Bikin agak transparan
            submitBtn.style.cursor = "not-allowed";

            try {
                // 4. KIRIM DATA KE BACKEND
                const response = await fetch(LOGIN_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email }) // Kirim email untuk dicek di SQL
                });

                const result = await response.json();

                if (response.ok) {
                    // ============================================
                    // JIKA LOGIN SUKSES (200 OK)
                    // ============================================
                    console.log("✅ Login Berhasil:", result.user);

                    // Simpan data penting ke memori browser (LocalStorage)
                    localStorage.setItem('currentUser', result.user.name);
                    localStorage.setItem('userEmail', result.user.email);
                    localStorage.setItem('userRole', result.user.role);
                    
                    // PENTING: Simpan Divisi untuk Auto-fill Form Booking nanti
                    // Jika null, simpan string kosong ''
                    localStorage.setItem('userDivision', result.user.division || ''); 

                    // Redirect halaman sesuai jabatan (Role)
                    if (result.user.role === 'admin') {
                        window.location.href = '/admin'; // Halaman Admin
                    } else {
                        window.location.href = '/dashboard'; // Halaman User (Form)
                    }

                } else {
                    // ============================================
                    // JIKA LOGIN GAGAL (400/401/500)
                    // ============================================
                    // Tampilkan pesan error dari backend (misal: "Email belum terdaftar")
                    alert("❌ Gagal Login: " + result.message);
                }

            } catch (error) {
                // Error Jaringan / Server Mati
                console.error("Network Error:", error);
                alert("⚠️ Terjadi kesalahan koneksi. Pastikan internet lancar.");
            } finally {
                // 5. KEMBALIKAN TOMBOL SEPERTI SEMULA (Apapun yang terjadi)
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                submitBtn.style.cursor = "pointer";
            }
        });
    }
});