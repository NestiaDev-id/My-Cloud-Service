# Implementation Plan: Backend Hono & Google Drive Integration

Fase ini berfokus pada pembangunan lapisan API (Backend) menggunakan framework **Hono (Node.js)** yang akan bertindak sebagai jembatan antara Frontend yang sudah kita bangun dan penyimpanan sebenarnya (Google Drive).

## 🎯 Goal Description
Membangun backend *serverless-ready* (kompatibel dengan Vercel) yang mampu:
1. Menyimpan dan mengelola sekuritas kredensial (OAuth2 Tokens) untuk beberapa akun Google Drive (Akun A, B, C) menggunakan **MongoDB**.
2. Menyediakan API terpadu (*Unified API*) sehingga Frontend dapat melihat dan mengelola file dari semua akun tersebut seolah-olah berada dalam satu "Drive" besar.
3. Menangani proses Multi-Part Upload dari Frontend dan mendistribusikannya ke akun Google Drive yang memiliki kapasitas memadai atau sesuai logika distribusi.

---

## 🛑 User Review Required
Terdapat beberapa keputusan desain yang memerlukan persetujuan Anda:
> [!IMPORTANT]
> **Autentikasi Google (OAuth2):** Sistem ini memerlukan pembuatan aplikasi di **Google Cloud Console** untuk mendapatkan `client_id` dan `client_secret`. Akun Google yang akan digunakan sebagai "Storage" harus diotorisasi untuk memberikan *Refresh Token* permanen ke backend kita. Apakah Anda sudah memiliki akun Google Cloud Platform yang siap digunakan?

> [!CAUTION]
> **Upload File Besar:** Karena Hono akan dijalankan di Vercel (Serverless), ada limitasi memori dan durasi eksekusi (biasanya maksimal 4.5MB payload dan 10 detik eksekusi untuk *Hobby tier*). Untuk file besar, kita mungkin perlu merancang **Resumable Uploads** atau mengarahkan upload langsung dari Frontend ke Google Drive (Signed URLs). Saya merekomendasikan opsi kedua (Direct Upload via Signed URL) untuk skalabilitas jangka panjang.

---

## 🏗️ Proposed Architecture

### 1. Struktur Proyek
Kita akan memisahkan frontend dan backend dalam struktur *monorepo* sederhana.
```text
My-Cloud-Service/
├── frontend/     (Sudah selesai)
└── backend/      [NEW] Folder untuk Hono API
    ├── src/
    │   ├── index.ts           # Entry point Hono & Routing utama
    │   ├── api/
    │   │   ├── drive.ts       # Endpoint proxy ke Google Drive
    │   │   ├── accounts.ts    # Endpoint manajemen akun (CRUD MongoDB)
    │   │   └── upload.ts      # Endpoint khusus handling upload
    │   ├── lib/
    │   │   ├── google.ts      # Konektor Google API (google-api-nodejs-client)
    │   │   └── db.ts          # Konektor MongoDB (Mongoose)
    │   └── models/
    │       └── Account.ts     # Skema MongoDB untuk data akun target
    ├── package.json
    └── tsconfig.json
```

### 2. Skema Database (MongoDB)
Kita memerlukan database sederhana untuk menyimpan informasi akun penyimpan.
#### [NEW] `backend/src/models/Account.ts`
Menyimpan *Refresh Token* sangat krusial agar backend bisa terus mengakses Drive A/B/C tanpa pengguna login ulang.
```typescript
interface StorageAccount {
  id: string;          // ID unik akun
  email: string;       // Email Google
  name: string;        // Nama display
  refreshToken: string;// Kredensial rahasia dari Google OAuth
  totalStorage: number;
  usedStorage: number;
  isActive: boolean;
}
```

### 3. Logika Unified API (Penggabungan Data)
Saat Frontend memanggil endpoint `/api/files`, backend akan:
1. Mengambil daftar akun aktif dari MongoDB.
2. Melakukan panggilan API secara paralel (`Promise.all`) ke Google Drive masing-masing akun.
3. Menggabungkan hasilnya ke dalam satu *array JSON* besar.
4. Menambahkan meta-data pada tiap file (misal: `storageAccountId: 'akun-A'`) agar saat Frontend meminta untuk menghapus file tersebut, Backend tahu Drive mana yang harus dihubungi.

---

## 📝 Langkah Eksekusi (Roadmap)

### Fase 1: Setup Lingkungan Hono
- Inisialisasi `hono` dengan template Node.js/Cloudflare/Vercel (sesuai target deployment).
- Setup environment variables (`.env`) untuk MongoDB URI dan Google OAuth Credentials.
- Membuat endpoint `/health` sederhana untuk memastikan backend bisa dihubungi oleh Frontend.

### Fase 2: Integrasi MongoDB & Skema Akun
- Instalasi `mongoose`.
- Pembuatan fungsi untuk Add/Edit/Delete konfigurasi Storage Akun di database.

### Fase 3: Integrasi Google Drive
- Instalasi `googleapis`.
- Pembuatan *helper function* untuk merefresh Access Token menggunakan Refresh Token.
- Pembuatan endpoint `GET /api/files` yang mem-proxy ke `drive.files.list`.

### Fase 4: Mekanisme Upload & Download
- Mendesain alur *Upload*: Frontend meminta izin upload -> Backend mereturn tujuan (Akun mana yang punya ruang kosong) -> Frontend melakukan transfer.

---

## 🧪 Verification Plan

### Manual Verification
1. **API Testing**: Saya akan menggunakan script sederhana untuk melakukan request `GET` dan `POST` ke backend Hono.
2. **Koneksi Database**: Memastikan data token dapat disimpan dan diambil secara konsisten melalui log konsol.
3. **Panggilan Google API**: Melakukan request `drive.about.get` dari backend untuk memastikan koneksi OAuth2 berjalan valid.

### Integration Verification
1. Menghubungkan Frontend yang sudah kita bangun agar mengarah ke `http://localhost:3000` (Backend Hono) alih-alih menggunakan data buatan (mock data).
2. Memastikan navigasi, *views*, dan interaksi di UI tetap berfungsi sempurna dengan data asli dari Google.
