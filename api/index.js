// api/index.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const app = express();

// --- PENTING: Setting CORS agar bisa diakses Frontend Vercel ---
app.use(cors({
    origin: '*', // Izinkan semua domain (untuk development/testing)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// --- Cek Kunci Rahasia (Debugging) ---
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error("❌ ERROR: Supabase Key Belum Diset di Environment Variables Vercel!");
}

// Inisialisasi
const supabaseUrl = 'https://bvvnagfezgzrxfmkcuzz.supabase.co'; // URL Supabase Anda
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dm5hZ2Zlemd6cnhmbWtjdXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NzQ2NzQsImV4cCI6MjA4MDE1MDY3NH0.VhJeH1P2qsiH8mX_IQ7-Yg8kx76f-etiZ9cmusTqAaQ'; // Key Panjang Anon Supabase
const resendKey = 're_hSLnyXYk_3F79zUuofZkBTUsSsXQqv1fQ'; // Key Resend Anda

// Inisialisasi
const supabase = createClient(supabaseUrl, supabaseKey);
const resend = new Resend(resendKey);

const ADMIN_EMAIL = 'ict@hakaauto.co.id';
const FROM_EMAIL = 'Booking System <no-reply@ruang.bumiauto.works>';

// --- Helper Email ---
async function sendEmailNotification(type, data) {
    // (Isi fungsi email sama persis seperti sebelumnya...)
    // Biar kode tidak terlalu panjang di sini, silakan copy-paste 
    // logika sendEmailNotification dari server.js lama Anda ke sini.
}

// --- Routes ---
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

app.post('/api/bookings', async (req, res) => {
    // (Isi logic POST sama seperti server.js lama Anda)
    // Copy-Paste logic POST disini...
});

app.put('/api/bookings/:ticketNumber', async (req, res) => {
    // (Isi logic PUT sama seperti server.js lama Anda)
    // Copy-Paste logic PUT disini...
});

// --- PENTING UNTUK VERCEL: ---
// Jangan gunakan app.listen! Gunakan module.exports
module.exports = app;