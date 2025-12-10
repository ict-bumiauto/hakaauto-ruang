document.addEventListener('DOMContentLoaded', function() {
    
    // URL Backend
    const LOGIN_API_URL = '/api/login'; 

    // Ambil Elemen
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password'); 
    const submitBtn = document.querySelector('.submit-btn');

    // --- CEK APAKAH HTML SUDAH BENAR? ---
    if (!loginForm) {
        console.error("CRITICAL ERROR: <form id='loginForm'> tidak ditemukan di HTML!");
        return;
    }

    loginForm.addEventListener('submit', async function(event) {
        // 1. CEGAH FORM RELOAD HALAMAN (Wajib di baris pertama)
        event.preventDefault(); 

        // 2. CEK INPUT
        if (!emailInput || !passwordInput) {
            alert("ERROR KODE: Input Email atau Password tidak ditemukan!\nPastikan id='email' dan id='password' ada di HTML.");
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // 3. UI LOADING
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "⏳ Checking...";
        submitBtn.disabled = true;

        try {
            // 4. KIRIM DATA (POST)
            const response = await fetch(LOGIN_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            // Cek jika error 404/405/500
            if (response.status === 404 || response.status === 405) {
                throw new Error("Jalur API tidak ditemukan (Cek vercel.json)");
            }

            const result = await response.json();

            if (response.ok) {
                // === SUKSES ===
                localStorage.setItem('currentUser', result.user.name);
                localStorage.setItem('userEmail', result.user.email);
                localStorage.setItem('userRole', result.user.role);
                localStorage.setItem('userDivision', result.user.division || ''); 

                // Redirect
                window.location.href = (result.user.role === 'admin') ? '/admin' : '/dashboard';
            } else {
                // === GAGAL (Password Salah) ===
                alert("Login Gagal: " + result.message);
            }

        } catch (error) {
            console.error("Login Error:", error);
            alert("Terjadi kesalahan sistem: " + error.message);
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });
});