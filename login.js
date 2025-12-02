document.addEventListener('DOMContentLoaded', function() {

    // --- FITUR SHOW/HIDE PASSWORD ---
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            // 1. Cek tipe saat ini (password atau text?)
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            
            // 2. Ubah tipe inputnya
            passwordInput.setAttribute('type', type);

            // 3. Ubah Ikon (Opsional: Mata Terbuka vs Tertutup/Monyet)
            // Kalau type == 'password' -> Mata (👁️)
            // Kalau type == 'text' -> Mata dicoret/Monyet tutup mata (🙈)
            this.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // ... (Sisa kode login form submit yang lama ada di bawah sini) ...
    const loginForm = document.getElementById('loginForm');
    // dst...
});

    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Mencegah reload

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const requiredDomain = '@hakaauto.co.id';

        // 1. VALIDASI: Cek apakah kolom kosong
        if (!email || !password) {
            alert('Harap isi Email dan Password.');
            return;
        }

        // 2. VALIDASI: Cek Domain Email
        if (!email.endsWith(requiredDomain)) {
            alert(`Akses Ditolak!\nEmail harus menggunakan domain: ${requiredDomain}`);
            emailInput.style.borderColor = 'red';
            emailInput.focus();
            return;
        }

        // --- 3. LOGIKA PEMISAH USER VS ADMIN ---
        
        // SKENARIO ADMIN
        // Kita hardcode kredensial admin untuk simulasi
        if (email === 'ict@hakaauto.co.id' && password === 'admin123') {
            
            // Simpan identitas Admin
            localStorage.setItem('currentUser', 'Administrator');
            localStorage.setItem('userRole', 'admin'); // Penanda role

            // Animasi Loading
            showLoading('Masuk ke Admin Dashboard...');

            setTimeout(() => {
                window.location.href = 'admin.html'; // Pindah ke Admin
            }, 1000);
            
            return; // Berhenti di sini, jangan lanjut ke logic user
        }

        // SKENARIO USER BIASA
        // Password bebas (simulasi), asal domain benar
        if (password) {
            
            // Ambil nama dari email (vico.pratama -> Vico Pratama)
            let rawName = email.split('@')[0];
            let formattedName = rawName
                .split('.')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            // Simpan identitas User
            localStorage.setItem('currentUser', formattedName);
            localStorage.setItem('userRole', 'user');

            // Animasi Loading
            showLoading('Verifying User...');

            setTimeout(() => {
                window.location.href = 'index.html'; // Pindah ke User Dashboard
            }, 1000);
        }
    });

    // Helper: Reset border merah saat mengetik
    document.getElementById('email').addEventListener('input', function() {
        this.style.borderColor = '#E2E8F0';
    });

    // Helper: Fungsi Loading Button
    function showLoading(text) {
        const btn = document.querySelector('.login-btn');
        btn.innerText = text;
        btn.style.opacity = '0.7';
        btn.disabled = true;
    }