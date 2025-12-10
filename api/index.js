const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const app = express();

// ============================================================
// 1. CONFIG & KEYS (WAJIB DIISI DENGAN DATA ASLI!)
// ============================================================

// Masukkan Key Supabase Anda di sini
const SUPABASE_URL = 'https://bvvnagfezgzrxfmkcuzz.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dm5hZ2Zlemd6cnhmbWtjdXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NzQ2NzQsImV4cCI6MjA4MDE1MDY3NH0.VhJeH1P2qsiH8mX_IQ7-Yg8kx76f-etiZ9cmusTqAaQ'; 

// Masukkan API Key Resend Anda di sini
const RESEND_API_KEY = 're_hSLnyXYk_3F79zUuofZkBTUsSsXQqv1fQ'; 

// Pengaturan Email
const ADMIN_EMAIL = 'ict@hakaauto.co.id'; 
const FROM_EMAIL = 'Bumi Auto Booking <onboarding@resend.dev>'; // Pakai default resend dulu biar aman

// Inisialisasi Library
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const resend = new Resend(RESEND_API_KEY);

// ============================================================
// 2. MIDDLEWARE (PENTING: JANGAN DIHAPUS/DIPINDAH)
// ============================================================

// Mengizinkan akses dari semua domain (CORS)
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));

// PENTING: Mengubah data JSON yang dikirim Frontend agar bisa dibaca Backend
// Tanpa ini, error "Cannot destructure property of undefined" akan muncul.
app.use(express.json()); 

// ============================================================
// 3. ENDPOINTS / ROUTES
// ============================================================

// --- A. TEST ROUTE (Cek Server Hidup/Mati) ---
app.get('/api/test', (req, res) => {
    res.json({ 
        status: "Online", 
        message: "Backend Bumi Auto berjalan normal!",
        timestamp: new Date().toISOString()
    });
});

// --- B. LOGIN ROUTE (Cek Database Users) ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    console.log("Login Request:", email); // Log ke Vercel

    if (!email || !password) {
        return res.status(400).json({ message: "Email dan Password wajib diisi!" });
    }

    try {
        // Cek tabel 'users' di Supabase
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password) // Cek kecocokan password
            .single();

        if (error || !data) {
            console.error("Login Gagal:", error);
            return res.status(401).json({ message: "Login Gagal: Email atau Password salah." });
        }

        // Login Sukses
        res.status(200).json({
            message: "Login Berhasil",
            user: {
                name: data.name,
                email: data.email,
                role: data.role,
                division: data.division 
            }
        });

    } catch (err) {
        console.error("Server Error:", err);
        res.status(500).json({ message: "Terjadi kesalahan server saat login." });
    }
});

// Handler Error untuk GET /api/login (Biar user gak bingung)
app.get('/api/login', (req, res) => {
    res.status(405).json({ message: "Error: Gunakan metode POST untuk login." });
});


// --- C. GET ALL BOOKINGS (Untuk Dashboard & Calendar) ---
app.get('/api/bookings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false }); // Urutkan dari yang terbaru
        
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// --- D. CREATE BOOKING (Submit Form) ---
app.post('/api/bookings', async (req, res) => {
    const data = req.body;
    console.log("New Booking Request:", data.borrowerName);

    try {
        // 1. Logika Cek Bentrok (Conflict Detection)
        // Ambil booking lain di tanggal & ruangan yang sama (kecuali yang ditolak/batal)
        const { data: conflicts } = await supabase
            .from('bookings')
            .select('*')
            .eq('bookingDate', data.bookingDate)
            .eq('roomName', data.roomName)
            .neq('status', 'Rejected')
            .neq('status', 'Cancelled');
        
        // Helper konversi jam "08:30" ke menit integer
        const toMin = (s) => { const [h,m]=s.split(':').map(Number); return h*60+m; };
        
        const newStart = toMin(data.startTime);
        const newEnd = toMin(data.endTime);

        // Cek irisan waktu
        const isBentrok = conflicts?.some(ex => {
            const exStart = toMin(ex.startTime);
            const exEnd = toMin(ex.endTime);
            // Rumus tabrakan jadwal
            return (newStart < exEnd && newEnd > exStart);
        });

        // Jika bentrok dan bukan 'Approved' (kasus override admin), tolak.
        if (isBentrok && data.status !== 'Approved') {
            return res.status(400).json({ message: "Jadwal Bentrok! Ruangan sudah terisi di jam tersebut." });
        }

        // 2. Simpan ke Supabase
        const { data: saved, error } = await supabase
            .from('bookings')
            .insert([data])
            .select();

        if (error) throw error;

        // 3. Kirim Email Notifikasi (Resend)
        // Kita pakai try-catch terpisah agar kalau email gagal, booking TETAP BERHASIL
        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: [ADMIN_EMAIL], 
                subject: `[New Request] ${data.roomName} - ${data.bookingDate}`,
                html: `
                    <h3>New Room Booking Request</h3>
                    <p><b>Name:</b> ${data.borrowerName}</p>
                    <p><b>Division:</b> ${data.department}</p>
                    <p><b>Room:</b> ${data.roomName}</p>
                    <p><b>Time:</b> ${data.startTime} - ${data.endTime}</p>
                    <p><b>Purpose:</b> ${data.purpose}</p>
                    <br>
                    <p>Please check Admin Dashboard to Approve/Reject.</p>
                `
            });
            console.log("Email sent successfully");
        } catch (emailErr) {
            console.error("Email failed (Ignored):", emailErr.message);
        }

        // Kirim respon sukses ke Frontend
        res.status(201).json(saved[0]);

    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ message: "Gagal menyimpan booking: " + err.message });
    }
});


// --- E. UPDATE STATUS (Approve/Reject oleh Admin) ---
app.put('/api/bookings/:ticketNumber', async (req, res) => {
    const { ticketNumber } = req.params;
    const { status, notes } = req.body;

    try {
        const { data, error } = await supabase
            .from('bookings')
            .update({ status: status, notes: notes })
            .eq('ticketNumber', ticketNumber)
            .select();

        if (error) throw error;
        
        console.log(`Booking ${ticketNumber} updated to ${status}`);
        res.json(data[0]);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ============================================================
// 4. EXPORT APP (WAJIB UNTUK VERCEL)
// ============================================================
module.exports = app;