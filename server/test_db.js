const { createClient } = require('@supabase/supabase-js');

// MASUKKAN KUNCI ASLI ANDA DISINI
const url = 'https://bvvnagfezgzrxfmkcuzz.supabase.co'; 
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dm5hZ2Zlemd6cnhmbWtjdXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NzQ2NzQsImV4cCI6MjA4MDE1MDY3NH0.VhJeH1P2qsiH8mX_IQ7-Yg8kx76f-etiZ9cmusTqAaQ'; 

const supabase = createClient(url, key);

async function testConnection() {
    console.log("Mencoba koneksi ke tabel 'bookings'...");
    
    // Coba ambil 1 data
    const { data, error } = await supabase
        .from('bookings') // Pastikan nama tabel ini SAMA PERSIS dengan di dashboard
        .select('*')
        .limit(1);

    if (error) {
        console.error("❌ GAGAL:", error.message);
    } else {
        console.log("✅ BERHASIL! Data ditemukan:", data);
    }
}

testConnection();