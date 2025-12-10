const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const app = express();

// ============================================================
// 1. SETTING KUNCI RAHASIA (HARDCODE AGAR PASTI TERBACA)
// ============================================================

// Ganti dengan URL Supabase Anda (dari dashboard Supabase)
const SUPABASE_URL = 'https://bvvnagfezgzrxfmkcuzz.supabase.co'; 

// Ganti dengan Key Panjang Anon Public (dari dashboard Supabase -> API Keys)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dm5hZ2Zlemd6cnhmbWtjdXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NzQ2NzQsImV4cCI6MjA4MDE1MDY3NH0.VhJeH1P2qsiH8mX_IQ7-Yg8kx76f-etiZ9cmusTqAaQ'; 

// Ganti dengan API Key Resend (dari dashboard Resend)
const RESEND_API_KEY = 're_hSLnyXYk_3F79zUuofZkBTUsSsXQqv1fQ'; 

// Email Admin Kantor
const ADMIN_EMAIL = 'ict@hakaauto.co.id'; 

// Email Pengirim (Pakai domain verified Anda)
const FROM_EMAIL = 'Booking System <no-reply@ruang.bumiauto.works>';


// ============================================================
// 2. INISIALISASI SERVER
// ============================================================

app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Inisialisasi Client dengan Kunci Hardcode
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const resend = new Resend(RESEND_API_KEY);

// --- Helper Kirim Email ---
async function sendEmailNotification(type, data) {
    let subject = '';
    let htmlContent = '';
    
    // GANTI DENGAN EMAIL ANDA SENDIRI UNTUK TESTING
    // (Karena Resend kadang memblokir email kantor jika reputasi domain baru)
    let recipient = 'ict@hakaauto.co.id'; 

    const dateStr = new Date(data.bookingDate).toLocaleDateString('id-ID', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    if (type === 'NEW_BOOKING') {
        subject = `[New Request] ${data.roomName} - ${data.borrowerName}`;
        htmlContent = `
            <h3>📅 Permintaan Booking Baru</h3>
            <ul>
                <li><strong>No. Tiket:</strong> ${data.ticketNumber}</li>
                <li><strong>Peminjam:</strong> ${data.borrowerName} (${data.department})</li>
                <li><strong>Ruangan:</strong> ${data.roomName}</li>
                <li><strong>Tanggal:</strong> ${dateStr}</li>
                <li><strong>Jam:</strong> ${data.startTime} - ${data.endTime}</li>
            </ul>
        `;
    } else if (type === 'STATUS_UPDATE') {
        subject = `[Status Update] Booking ${data.status}: ${data.roomName}`;
        htmlContent = `
            <h3>Status Booking: ${data.status}</h3>
            <p>Halo ${data.borrowerName}, status booking ruangan Anda telah diperbarui.</p>
            <p><strong>Catatan:</strong> ${data.notes || '-'}</p>
        `;
    }

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: [recipient],
            subject: subject,
            html: htmlContent,
        });
        console.log("✅ Email terkirim ke:", recipient);
    } catch (err) {
        console.error("❌ Gagal kirim email:", err.message);
    }
}

// ============================================================
// 3. API ROUTES
// ============================================================

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
    const data = req.body;
    try {
        // Cek Bentrok
        const { data: conflicts, error: fetchError } = await supabase
            .from('bookings').select('*')
            .eq('bookingDate', data.bookingDate)
            .eq('roomName', data.roomName)
            .neq('status', 'Rejected').neq('status', 'Cancelled');
        
        if (fetchError) throw fetchError;

        const toMinutes = (s) => { const [h,m]=s.split(':').map(Number); return h*60+m; };
        const newStart = toMinutes(data.startTime);
        const newEnd = toMinutes(data.endTime);

        const isBentrok = conflicts.some(existing => {
            const exStart = toMinutes(existing.startTime);
            const exEnd = toMinutes(existing.endTime);
            return (newStart < exEnd && newEnd > exStart);
        });

        if (isBentrok && data.status !== 'Approved') {
            return res.status(400).json({ message: "Jadwal Bentrok! Ruangan sudah terisi." });
        }

        // Simpan
        const { data: savedData, error: insertError } = await supabase
            .from('bookings').insert([ data ]).select();

        if (insertError) throw insertError;

        // Kirim Email (Fire & Forget)
        sendEmailNotification('NEW_BOOKING', savedData[0]);

        res.status(201).json(savedData[0]);

    } catch (err) {
        console.error("Server Error:", err);
        res.status(500).json({ message: err.message });
    }
});

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

        if (data && data.length > 0) {
            sendEmailNotification('STATUS_UPDATE', data[0]);
        }
        
        res.json(data[0]);

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// === ENDPOINT LOGIN (UPDATE: DENGAN DIVISI) ===
app.post('/api/login', async (req, res) => {
    const { email } = req.body;

    if (!email || !email.endsWith('@hakaauto.co.id')) {
        return res.status(400).json({ message: "Gunakan email kantor (@hakaauto.co.id)" });
    }

    try {
        // Ambil data user LENGKAP (termasuk division)
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) {
            return res.status(401).json({ message: "Akses Ditolak: Email Anda belum terdaftar di database." });
        }

        // Kirim data ke frontend
        res.status(200).json({
            message: "Login Berhasil",
            user: {
                name: data.name,
                email: data.email,
                role: data.role,
                division: data.division // <--- INI PENTING!
            }
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Terjadi kesalahan server." });
    }
});

// WAJIB UNTUK VERCEL
module.exports = app;