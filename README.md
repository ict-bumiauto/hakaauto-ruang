# Overview Project Peminjaman Ruang (Ruang Bumi Auto)

Sistem Informasi Manajemen Peminjaman Ruang Meeting untuk **Bumi Hijau Motor / Haka Auto**.
Aplikasi ini memudahkan karyawan untuk melihat ketersediaan ruangan, melakukan booking, dan memudahkan Admin GA/ICT untuk mengelola persetujuan peminjaman.

## 🚀 Fitur Utama

### 1. User (Karyawan)
*   **Calendar View**: Melihat jadwal ketersediaan ruangan secara real-time.
*   **Booking Form**: Mengajukan peminjaman ruangan dengan validasi otomatis (mencegah bentrok jadwal).
*   **Email Notifications**: Menerima notifikasi email saat booking disetujui atau ditolak.

### 2. Admin
*   **Dashboard**: Memantau semua permintaan booking (Pending, Approved, Rejected).
*   **Approval System**: Menyetujui atau menolak permintaan booking dengan catatan.
*   **User Management**: Mengelola data user (Tambah, Hapus, Reset Password).
*   **Automation**: Email notifikasi otomatis terkirim ke peminjam saat status booking berubah.

## 🛠 Tech Stack

*   **Frontend**: HTML, CSS, Vanilla JavaScript.
*   **Backend**: Node.js (Express.js) - Deployed on Vercel.
*   **Database**: Supabase (PostgreSQL).
*   **Email Service**: Resend API.
*   **Authentication**: Custom Login (via Supabase Users table).

## 📂 Struktur Project

*   `/api` - Backend logic (Express routes) untuk Vercel Serverless Functions.
*   `/server` - Logic tambahan (jika ada).
*   `*.html` - Halaman antarmuka (Frontend).
*   `*.js` - Logika frontend (DOM manipulation, API calls).
*   `style.css` - Styling aplikasi.

## ⚙️ Setup & Installation

### Prerequisite
*   Node.js terinstall.
*   Akun Supabase & Resend.

### Local Development (via Vercel CLI)
Karena project ini didesain untuk Vercel Serverless, disarankan menggunakan `vercel dev` untuk menjalankannya di lokal.

1.  **Clone Repository**
    ```bash
    git clone https://github.com/ict-bumiauto/bumiauto-ruang.git
    cd bumiauto-ruang
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run Locally**
    Pastikan Vercel CLI sudah terinstall (`npm i -g vercel`).
    ```bash
    vercel dev
    ```

## 🔐 Environment Variables
Konfigurasi API Key terdapat di dalam file `api/index.js` (Perhatian: Sebaiknya dipindahkan ke Environment Variables Vercel saat production agar aman).
*   `SUPABASE_URL`
*   `SUPABASE_KEY`
*   `RESEND_API_KEY`
