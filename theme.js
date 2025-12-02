document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('themeToggle');
    const body = document.body;

    // 1. Cek LocalStorage saat halaman dimuat
    // Apakah user sebelumnya memilih dark mode?
    const currentTheme = localStorage.getItem('theme');
    
    if (currentTheme === 'dark') {
        body.classList.add('dark-mode');
        if(toggleBtn) toggleBtn.innerText = '☀️'; // Ubah ikon jadi matahari
    }

    // 2. Event Listener saat tombol diklik
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            body.classList.toggle('dark-mode');

            // Cek apakah sekarang class dark-mode aktif?
            if (body.classList.contains('dark-mode')) {
                localStorage.setItem('theme', 'dark'); // Simpan preferensi
                toggleBtn.innerText = '☀️';
            } else {
                localStorage.setItem('theme', 'light'); // Simpan preferensi
                toggleBtn.innerText = '🌙';
            }
        });
    }
});