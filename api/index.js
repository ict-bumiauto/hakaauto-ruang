const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const app = express();

// ============================================================
// 1. CONFIG & KEYS (HARDCODE DI SINI AGAR AMAN)
// ============================================================

// GANTI DENGAN DATA ASLI ANDA!
const SUPABASE_URL = 'https://bvvnagfezgzrxfmkcuzz.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dm5hZ2Zlemd6cnhmbWtjdXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NzQ2NzQsImV4cCI6MjA4MDE1MDY3NH0.VhJeH1P2qsiH8mX_IQ7-Yg8kx76f-etiZ9cmusTqAaQ'; 
const RESEND_API_KEY = 're_hSLnyXYk_3F79zUuofZkBTUsSsXQqv1fQ'; 

// Email Settings
const ADMIN_EMAIL = 'ict@hakaauto.co.id'; 
const FROM_EMAIL = 'Booking System <no-reply@ruang.bumiauto.works>';

// Inisialisasi Library
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const resend = new Resend(RESEND_API_KEY);

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());

// ============================================================
// 2. ENDPOINT LOGIN (Database Check)
// ============================================================
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email dan Password wajib diisi!" });
    }

    try {
        // Cek Email & Password di Tabel Users
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password) 
            .single();

        if (error || !data) {
            return res.status(401).json({ message: "Login Gagal: Email atau Password salah!" });
        }

        // Sukses
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
        console.error("Login Error:", err);
        res.status(500).json({ message: "Terjadi kesalahan server saat login." });
    }
});

// ============================================================
// 3. ENDPOINT BOOKING (Get & Create)
// ============================================================

// Ambil Semua Data Booking
app.get('/api/bookings', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('bookings').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Buat Booking Baru
app.post('/api/bookings', async (req, res) => {
    const data = req.body;
    try {
        // Cek Bentrok
        const { data: conflicts } = await supabase
            .from('bookings').select('*')
            .eq('bookingDate', data.bookingDate)
            .eq('roomName', data.roomName)
            .neq('status', 'Rejected').neq('status', 'Cancelled');
        
        const toMin = (s) => { const [h,m]=s.split(':').map(Number); return h*60+m; };
        const newStart = toMin(data.startTime);
        const newEnd = toMin(data.endTime);

        const isBentrok = conflicts?.some(ex => {
            const exStart = toMin(ex.startTime);
            const exEnd = toMin(ex.endTime);
            return (newStart < exEnd && newEnd > exStart);
        });

        if (isBentrok && data.status !== 'Approved') {
            return res.status(400).json({ message: "Jadwal Bentrok! Ruangan sudah terisi." });
        }

        // Simpan ke Database
        const { data: saved, error } = await supabase.from('bookings').insert([data]).select();
        if (error) throw error;

        // Kirim Email Notifikasi (Opsional: Matikan jika error resend)
        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: [ADMIN_EMAIL], // Atau hardcode email pribadi untuk tes
                subject: `[New Request] ${data.roomName}`,
                html: `<p>New booking from <b>${data.borrowerName}</b>.</p>`
            });
        } catch (e) { console.log("Email error (ignored):", e.message); }

        res.status(201).json(saved[0]);

    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// Update Status Booking (Approve/Reject)
app.put('/api/bookings/:ticketNumber', async (req, res) => {
    const { ticketNumber } = req.params;
    const { status, notes } = req.body;
    try {
        const { data, error } = await supabase
            .from('bookings').update({ status, notes }).eq('ticketNumber', ticketNumber).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// WAJIB: Export App untuk Vercel
module.exports = app;