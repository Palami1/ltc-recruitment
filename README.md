# LTC Recruitment Portal
**ລະບົບຮັບສະໝັກພະນັກງານ — ບໍລິສັດ ລາວ ໂທລະຄົມ ມະຫາຊົນ**

A full-stack, production-grade recruitment portal built for **Lao Telecommunications Company (LTC)**, featuring automated PDF generation, Lao language support, applicant tracking, and a secure Admin Dashboard.

---

## Features

- **Online Application Form** — Multi-step form with real-time validation, file uploads (photo 3×4, documents), and signature capture.
- **Automated PDF Generation** — Fills and stamps official recruitment forms with applicant data, embedded Lao fonts (Phetsarath OT), and processed signature images via `pdf-lib` + `sharp`.
- **Admin Dashboard** — Secure JWT-protected dashboard for HR administrators to review, approve, and reject applications with status lifecycle management.
- **Status Tracking** — Applicants can check their application status in real time using a phone number or tracking ID.
- **MongoDB Atlas + Fallback** — Central cloud database with automatic local JSON fallback to guarantee zero data loss during transient connectivity issues.
- **Lao Language Support** — Full Lao UI with correct tone mark rendering, diacritic normalization, and phonetic search functionality.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS |
| **Routing** | React Router DOM v7 |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **PDF Generation** | pdf-lib, @pdf-lib/fontkit |
| **Image Processing** | sharp (signature cleanup & transparency) |
| **Email** | Nodemailer (Brevo SMTP / Gmail) |
| **Deployment** | Vercel (serverless) / PM2 (VPS) |

---

## Local Development Setup

### Prerequisites
- Node.js >= 18
- npm >= 9
- MongoDB Atlas URI (or local MongoDB)

### 1. Install Dependencies
```bash
# Root-level install
npm install

# Client install
cd client && npm install

# Server install
cd ../server && npm install
```

### 2. Configure Environment Variables
```bash
# Copy the server environment template
copy server\.env.example server\.env

# Fill in your actual values:
#   MONGODB_URI=mongodb+srv://...
#   ADMIN_PASSWORD=your_secure_password
#   ADMIN_TOKEN=64-character-secret
#   SMTP_USER=your_smtp_email
#   SMTP_PASS=your_smtp_password
```

### 3. Start Development Servers

Open **two terminals** and run:

**Terminal 1 — Frontend (Vite)**
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 — Backend (Express)**
```bash
cd server
node index.js
# Runs on http://localhost:5000
```

---

## Environment Variables Reference

### `server/.env`
| Variable | Required | Description |
| :--- | :---: | :--- |
| `PORT` | No | Express server port (default: `5000`) |
| `MONGODB_URI` | **Yes** | MongoDB Atlas connection string |
| `ADMIN_PASSWORD` | **Yes** | Admin dashboard login password |
| `ADMIN_TOKEN` | **Yes** | 64-character HMAC secret for session signing |
| `SMTP_USER` | No | Email address for Nodemailer dispatch |
| `SMTP_PASS` | No | SMTP App Password or Brevo API key |

### `client/.env`
| Variable | Required | Description |
| :--- | :---: | :--- |
| `VITE_API_URL` | No | Leave empty for Vercel single-domain deployment |

---

## Production Deployment (Vercel)

The project includes a pre-configured `vercel.json` at the root for one-click deployment.

### Steps:

1. **Push to GitHub** using the included deploy script:
   ```bat
   deploy.bat
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Vercel auto-detects the `vercel.json` configuration

3. **Set Environment Variables** in Vercel Dashboard:
   - `MONGODB_URI`
   - `ADMIN_PASSWORD`
   - `ADMIN_TOKEN`
   - `SMTP_USER` / `SMTP_PASS`

4. **Deploy** — Vercel triggers an automatic build and deployment.

### Vercel Configuration Summary (`vercel.json`)
```json
{
  "buildCommand": "npm install && cd client && npm install && npm run build",
  "outputDirectory": "client/dist",
  "functions": { "api/index.js": { "memory": 1024, "maxDuration": 30 } },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.js" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## VPS / PM2 Deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd server
pm2 start index.js --name "ltc-backend"
pm2 save
pm2 startup

# Build frontend
cd ../client
npm run build
# Serve client/dist via Nginx
```

**Nginx config snippet:**
```nginx
client_max_body_size 50M;

location /api/ {
    proxy_pass http://localhost:5000;
    proxy_set_header Host $host;
}

location / {
    root /path/to/client/dist;
    try_files $uri /index.html;
}
```

---

## Project Structure

```
ltc-recruitment/
├── api/               # Vercel serverless entry point
│   └── index.js       # Proxies to server/index.js
├── client/            # React + Vite frontend
│   ├── src/
│   │   ├── pages/     # LandingPage, SelectionPage, AdminDashboard, etc.
│   │   ├── components/# Reusable UI components
│   │   └── lib/       # API client, job position helpers, hiring config
│   └── public/        # Static assets, fonts, PDF template
├── server/            # Express backend
│   ├── index.js       # Main Express app & all API routes
│   ├── db.js          # MongoDB Atlas connection handler
│   ├── models/        # Mongoose data models
│   ├── submissions.json  # Local JSON fallback store
│   └── .env           # ⚠️ Not committed — secrets only
├── vercel.json        # Vercel deployment configuration
├── deploy.bat         # Automated git push & deploy script
└── README.md          # This file
```

---

## Security Notes

> ⚠️ **Never commit** `server/.env` to version control. All `.env` files are excluded by `.gitignore`.

> 🔐 **Rotate** `ADMIN_TOKEN` and `ADMIN_PASSWORD` immediately before going live.

---

## License

Internal use only — **ບໍລິສັດ ລາວ ໂທລະຄົມ ມະຫາຊົນ (LTC)**. All rights reserved.
