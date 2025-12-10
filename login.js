document.addEventListener('DOMContentLoaded', function() {
    
    // ============================================================
    // 1. KONFIGURASI API
    // ============================================================
    const LOGIN_API_URL = '/api/login'; 

    // ============================================================
    // 2. AMBIL ELEMENT HTML (DENGAN PENGECEKAN)
    // ============================================================
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    
    // Kita cari element dengan id="password"
    // Jika di HTML masih id="whatsapp", ini akan bernilai null
    const passwordInput = document.getElementById('password'); 
    
    const submitBtn = document.querySelector('.submit-btn');

    // ============================================================
    // 3. LOGIKA UTAMA
    // ============================================================
    if (loginForm) {
        loginForm.addEventListener('submit', async function(event) {
            event.preventDefault(); // Cegah reload halaman

            // --- TAHAP CEK ERROR HTML (PENTING) ---
            // Ini untuk mencegah error "Cannot read properties of null"
            if (!emailInput || !passwordInput) {
                alert("SYSTEM ERROR: Element Input tidak ditemukan!\n\nPastikan di file HTML:\n1. Input Email punya id='email'\n2. Input Password punya id='password' (bukan 'whatsapp')");
                return; // Stop script biar gak crash
            }

            // --- AMBIL DATA INPUT ---
            const email = emailInput.value.trim().toLowerCase(); 
            const password = passwordInput.value.trim();

            // --- VALIDASI INPUT ---
            if (!email || !password) {
                alert("Mohon lengkapi Email dan Password.");
                return;
            }

            if (!email.endsWith('@hakaauto.co.id')) {
                alert("Akses Ditolak: Wajib menggunakan email kantor (@hakaauto.co.id)!");
                return;
            }

            // --- UI LOADING STATE ---
            const originalText = submitBtn.innerText;
            submitBtn.innerText = "⏳ Verifying...";
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";
            submitBtn.style.cursor = "not-allowed";

            try {
                // --- KIRIM KE BACKEND ---
                const response = await fetch(LOGIN_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        email: email, 
                        password: password 
                    }) 
                });

                const result = await response.json();

                if (response.ok) {
                    // === LOGIN SUKSES ===
                    console.log("Login Success:", result.user);

                    // Simpan data ke memori browser
                    localStorage.setItem('currentUser', result.user.name);
                    localStorage.setItem('userEmail', result.user.email);
                    localStorage.setItem('userRole', result.user.role);
                    
                    // Simpan Divisi (untuk auto-fill form nanti)
                    localStorage.setItem('userDivision', result.user.division || ''); 

                    // Redirect sesuai Jabatan
                    if (result.user.role === 'admin') {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '/dashboard';
                    }

                } else {
                    // === LOGIN GAGAL (Password Salah / User Tidak Ada) ===
                    alert("❌ Login Gagal: " + result.message);
                }

            } catch (error) {
                console.error("Network Error:", error);
                alert("⚠️ Terjadi kesalahan koneksi ke server.");
            } finally {
                // --- KEMBALIKAN TOMBOL ---
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                submitBtn.style.cursor = "pointer";
            }
        });
    }
});