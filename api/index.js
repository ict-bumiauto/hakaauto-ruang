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
const FROM_EMAIL = 'Haka Auto Booking <booking@ruang.bumiauto.works>'; // Pakai default resend dulu biar aman

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
        message: "Backend Haka Auto berjalan normal!",
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
                division: data.division,
                phone: data.phone
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
        const { name } = req.query; // Ambil parameter ?name=...

        let query = supabase
            .from('bookings')
            .select('*')
            .order('created_at', { ascending: false }); // Urutkan dari yang terbaru

        // Jika ada parameter nama, filter berdasarkan borrowerName
        if (name) {
            query = query.eq('borrowerName', name);
        }

        const { data, error } = await query;

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
        const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };

        const newStart = toMin(data.startTime);
        const newEnd = toMin(data.endTime);

        // Cek irisan waktu
        // Cek irisan waktu
        const isBentrok = conflicts?.some(ex => {
            // FIX: Hanya anggap bentrok jika booking eksisting sudah APPROVED. 
            // Kalau masih Pending, boleh ditumpuk.
            if (ex.status !== 'Approved') return false;

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
        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: [ADMIN_EMAIL],
                subject: `New Booking: ${data.roomName}`,
                // Ganti HTML jadi TEXT biasa agar tidak dianggap Spam
                // Dan pastikan tidak ada http/https link di dalamnya
                text: `
                    Name: ${data.borrowerName}
                    Division: ${data.department}
                    Room: ${data.roomName}
                    Date: ${data.bookingDate}
                    Time: ${data.startTime} - ${data.endTime}
                    Purpose: ${data.purpose}

                    (Login ke Dashboard Admin untuk Approve)
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


// --- E. UPDATE STATUS (Approve/Reject oleh Admin) + KIRIM EMAIL KE STAFF ---
app.put('/api/bookings/:ticketNumber', async (req, res) => {
    const { ticketNumber } = req.params;
    const { status, notes } = req.body; // status: 'Approved' / 'Rejected'

    try {
        // 1. Update Status di Database
        const { data, error } = await supabase
            .from('bookings')
            .update({ status: status, notes: notes })
            .eq('ticketNumber', ticketNumber)
            .select(); // Penting: .select() mengembalikan data terbaru (termasuk email user)

        if (error) throw error;

        const updatedBooking = data[0]; // Data booking yang baru diupdate
        console.log(`Booking ${ticketNumber} updated to ${status}`);

        // 2. KIRIM EMAIL NOTIFIKASI KE STAFF (USER)
        // Cek apakah ada email peminjamnya?
        if (updatedBooking.borrowerEmail) {

            // Tentukan Warna & Pesan berdasarkan Status
            let subjectStatus = status === 'Approved' ? '✅ Approved' : '❌ Rejected';
            let color = status === 'Approved' ? '#10B981' : '#EF4444';
            let message = status === 'Approved'
                ? 'Permintaan peminjaman ruang Anda telah <b>DISETUJUI</b>.'
                : 'Mohon maaf, permintaan Anda <b>DITOLAK</b>.';

            try {
                await resend.emails.send({
                    // PENTING: Gunakan domain verified Anda
                    from: 'Haka Auto Booking <booking@ruang.bumiauto.works>',
                    to: [updatedBooking.borrowerEmail], // Kirim ke email Staff
                    subject: `[${status}] Ruang Meeting: ${updatedBooking.roomName}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2 style="color: ${color};">${subjectStatus}</h2>
                            <p>Halo <b>${updatedBooking.borrowerName}</b>,</p>
                            <p>${message}</p>
                            
                            <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                <p><b>Ruangan:</b> ${updatedBooking.roomName}</p>
                                <p><b>Tanggal:</b> ${updatedBooking.bookingDate}</p>
                                <p><b>Jam:</b> ${updatedBooking.startTime} - ${updatedBooking.endTime}</p>
                                <p><b>Catatan Admin:</b> ${notes || '-'}</p>
                            </div>

                            <p style="font-size: 12px; color: #888;">
                                Email ini dikirim otomatis oleh Sistem Booking Haka Auto.
                            </p>
                        </div>
                    `
                });
                console.log(`Email notifikasi dikirim ke ${updatedBooking.borrowerEmail}`);
            } catch (emailErr) {
                console.error("Gagal kirim email ke user:", emailErr.message);
            }
        } else {
            console.log("Tidak ada email peminjam, skip kirim notifikasi.");
        }

        res.json(updatedBooking);

    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// --- F. USER MANAGEMENT ROUTES ---

// 1. GET ALL USERS
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. ADD USER
app.post('/api/users', async (req, res) => {
    const { name, email, phone, division, role } = req.body;
    const defaultPassword = 'kerjaibadah'; // Default password

    try {
        const { data, error } = await supabase
            .from('users')
            .insert([{
                name,
                email,
                phone,
                division,
                role,
                password: defaultPassword
            }])
            .select();

        if (error) throw error;
        res.status(201).json(data[0]);
    } catch (err) {
        res.status(500).json({ message: "Failed to add user: " + err.message });
    }
});

// 3. DELETE USER
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    console.log("Deleting user ID:", id);

    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 4. RESET PASSWORD
app.put('/api/users/:id/reset-password', async (req, res) => {
    const { id } = req.params;
    const defaultPass = 'kerjaibadah';
    try {
        const { data, error } = await supabase
            .from('users')
            .update({ password: defaultPass })
            .eq('id', id)
            .select();

        if (error) throw error;
        res.json({ message: "Password reset to 'kerjaibadah'" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ============================================================
// 4. EXPORT APP (WAJIB UNTUK VERCEL)
// ============================================================
module.exports = app;