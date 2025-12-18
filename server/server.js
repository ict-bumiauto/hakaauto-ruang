const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const app = express();
const PORT = 5000;

// ============================================================
// 1. KONFIGURASI (JANGAN LUPA ISI KEY ASLI ANDA)
// ============================================================

app.use(cors());
app.use(express.json());

// --- A. SUPABASE ---
// Masukkan URL & Anon Key Supabase Anda
const supabaseUrl = 'https://bvvnagfezgzrxfmkcuzz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dm5hZ2Zlemd6cnhmbWtjdXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1NzQ2NzQsImV4cCI6MjA4MDE1MDY3NH0.VhJeH1P2qsiH8mX_IQ7-Yg8kx76f-etiZ9cmusTqAaQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- B. RESEND (EMAIL) ---
// Masukkan API Key Resend Anda
const resend = new Resend('re_hSLnyXYk_3F79zUuofZkBTUsSsXQqv1fQ');

// --- C. PENGATURAN EMAIL (BAGIAN INI YANG DIUPDATE) ---

// 1. Pengirim Resmi (Domain Anda Sendiri)
const FROM_EMAIL = 'Booking System <no-reply@ruang.bumiauto.works>';

// 2. Email Admin (Penerima notifikasi jika ada request baru)
// Sekarang Anda bisa masukkan email kantor asli!
const ADMIN_EMAIL = 'ict@hakaauto.co.id';

// ============================================================
// 2. HELPER FUNCTION: KIRIM EMAIL
// ============================================================
async function sendEmailNotification(type, data) {
    let subject = '';
    let htmlContent = '';
    let recipient = '';

    // Format Tanggal Cantik (Senin, 1 Desember 2025)
    const dateStr = new Date(data.bookingDate).toLocaleDateString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    if (type === 'NEW_BOOKING') {
        // --- KASUS 1: ADA BOOKING BARU -> KIRIM KE ADMIN ---
        recipient = ADMIN_EMAIL;

        subject = `[New Request] ${data.roomName} - ${data.borrowerName}`;
        htmlContent = `
            <h3>📅 Permintaan Booking Baru</h3>
            <p>Halo Admin, ada permintaan peminjaman ruangan baru:</p>
            <ul>
                <li><strong>No. Tiket:</strong> ${data.ticketNumber}</li>
                <li><strong>Peminjam:</strong> ${data.borrowerName} (${data.department})</li>
                <li><strong>Ruangan:</strong> ${data.roomName}</li>
                <li><strong>Tanggal:</strong> ${dateStr}</li>
                <li><strong>Jam:</strong> ${data.startTime} - ${data.endTime}</li>
                <li><strong>Tujuan:</strong> ${data.purpose}</li>
            </ul>
            <p><em>Add-ons:</em> ${JSON.stringify(data.addOns)}</p>
            <p>Silakan buka Dashboard Admin untuk Approve/Reject.</p>
        `;
    }
    else if (type === 'STATUS_UPDATE') {
        // --- KASUS 2: STATUS BERUBAH -> KIRIM KE USER ---

        // CATAAN: Karena kita belum punya database user email, 
        // sementara ini kita kirim notifikasi balik ke Admin (sebagai tembusan)
        // atau Anda bisa hardcode email user tertentu untuk tes.
        recipient = ADMIN_EMAIL; // Bisa diganti email user jika nanti sudah ada fitur login email

        const color = data.status === 'Approved' ? 'green' : 'red';
        subject = `[Status Update] Booking ${data.status}: ${data.roomName}`;
        htmlContent = `
            <h3>Status Booking: <span style="color:${color}">${data.status}</span></h3>
            <p>Halo ${data.borrowerName},</p>
            <p>Permintaan booking ruangan Anda telah diperbarui:</p>
            <ul>
                <li><strong>No. Tiket:</strong> ${data.ticketNumber}</li>
                <li><strong>Ruangan:</strong> ${data.roomName}</li>
                <li><strong>Tanggal:</strong> ${dateStr}</li>
                <li><strong>Jam:</strong> ${data.startTime} - ${data.endTime}</li>
            </ul>
            <p><strong>Catatan Admin:</strong> ${data.notes || '-'}</p>
            <br>
            <p>Terima kasih,<br>GA Dept HAKA AUTO</p>
        `;
    }

    try {
        const { data: emailData, error } = await resend.emails.send({
            from: FROM_EMAIL, // Pakai domain resmi
            to: [recipient],  // Bisa kirim ke email kantor sekarang!
            subject: subject,
            html: htmlContent,
        });

        if (error) console.error("❌ Gagal Kirim Email:", error);
        else console.log("✅ Email Terkirim ID:", emailData.id);

    } catch (err) {
        console.error("❌ Error Resend:", err);
    }
}

// ============================================================
// 3. API ROUTES
// ============================================================

app.get('/', (req, res) => res.send('Backend Ready & Email Verified!'));

app.get('/api/bookings', async (req, res) => {
    const { data, error } = await supabase
        .from('bookings').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ message: error.message });
    res.json(data);
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

        const toMinutes = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
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
            .from('bookings').insert([data]).select();

        if (insertError) throw insertError;

        // Kirim Email
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
        console.error("Server Error:", err);
        res.status(500).json({ message: err.message });
    }
});

// START SERVER
/*
app.listen(PORT, () => {
    console.log(`------------------------------------------------`);
    console.log(`🚀 Server berjalan di: http://localhost:${PORT}`);
    console.log(`------------------------------------------------`);
});
*/
module.exports = app;