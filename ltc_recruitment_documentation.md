# ເອກະສານເຕັກນິກ (Technical Documentation) - ລະບົບສະໝັກວຽກອອນລາຍ LTC

ເອກະສານສະບັບນີ້ອະທິບາຍກ່ຽວກັບໂຄງສ້າງ, ເທັກໂນໂລຢີ ແລະ ອົງປະກອບຕ່າງໆ ຂອງໂຄງການລະບົບສະໝັກວຽກອອນລາຍ (LTC Recruitment System).

## 1. ພາບລວມຂອງໂຄງການ (Project Overview)
ລະບົບນີ້ຖືກອອກແບບມາເພື່ອອຳນວຍຄວາມສະດວກໃນການຮັບສະໝັກພະນັກງານໃໝ່ຂອງບໍລິສັດ ໂດຍມີທັງພາກສ່ວນຂອງຜູ້ສະໝັກທີ່ສາມາດເຂົ້າເບິ່ງລາຍລະອຽດຕຳແໜ່ງງານ, ປ້ອນຂໍ້ມູນຜ່ານແບບຟອມ (Form 20) ແລະ ພາກສ່ວນຂອງຜູ້ບໍລິຫານ (Admin/HR) ເພື່ອຄຸ້ມຄອງລາຍຊື່ ແລະ ເອກະສານຜູ້ສະໝັກ.

## 2. ເທັກໂນໂລຢີທີ່ນຳໃຊ້ (Technology Stack)

### Frontend (Client-side)
- **Framework:** React 19 + Vite (ຮອງຮັບການປະມວນຜົນທີ່ໄວ ແລະ ໃຊ້ງານໄດ້ລ່ຽນໄຫຼ)
- **Language:** TypeScript (ເພື່ອຫຼຸດຜ່ອນຂໍ້ຜິດພາດໃນການຂຽນໂຄດ)
- **Styling:** Tailwind CSS (ສຳລັບການອອກແບບ Responsive Design)
- **Routing:** React Router DOM
- **HTTP Client:** Axios (ສຳລັບການຮຽກ API ໄປຫາ Backend)
- **Icons:** Lucide React

### Backend (Server-side)
- **Environment:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB ໂດຍໃຊ້ Mongoose ເປັນ ORM
- **File Upload:** Multer (ຮັບຮອງການອັບໂຫຼດເອກະສານ ແລະ ຮູບພາບ)
- **PDF Generation:** PDF-Lib ແລະ Fontkit (ສຳລັບການສ້າງໄຟລ໌ PDF ຈາກຟອມທີ່ຜູ້ສະໝັກປ້ອນເຂົ້າມາ)
- **Image Processing:** Sharp (ສຳລັບຈັດການຮູບພາບກ່ອນບັນທຶກ)
- **Security:** CORS ແລະ Express Rate Limit ເພື່ອປ້ອງກັນການໂຈມຕີ

---

## 3. ໂຄງສ້າງໄດເຣັກທໍຣີ (Directory Structure)

ໂຄງການຖືກແບ່ງອອກເປັນ 2 ສ່ວນຫຼັກຄື `client` ສຳລັບ Frontend ແລະ `server` ສຳລັບ Backend.

```text
sa_muk_vk_LTC/
├── client/                     # ໂຟນເດີສຳລັບ Frontend (React)
│   ├── public/                 # ຮູບພາບ ແລະ ແຫຼ່ງຂໍ້ມູນສາທາລະນະ
│   ├── src/                    # ໂຄດຫຼັກຂອງ Frontend
│   │   ├── components/         # ອົງປະກອບ UI ທີ່ໃຊ້ຮ່ວມກັນ (Reusable Components)
│   │   ├── pages/              # ໜ້າເວັບຕ່າງໆ (Pages) ເຊັ່ນ LandingPage, AdminDashboard
│   │   ├── index.css           # ໄຟລ໌ CSS ຫຼັກ (Tailwind)
│   │   └── main.tsx            # ຈຸດເລີ່ມຕົ້ນຂອງ React App
│   ├── package.json            # ຂໍ້ມູນລາຍການ Dependencies ຂອງ Frontend
│   └── tailwind.config.js      # ຕັ້ງຄ່າ Tailwind CSS
├── server/                     # ໂຟນເດີສຳລັບ Backend (Node.js)
│   ├── models/                 # Database Schema (ເຊັ່ນ form20Schema)
│   ├── uploads/                # ໂຟນເດີສຳລັບເກັບໄຟລ໌ທີ່ອັບໂຫຼດ
│   ├── index.js                # ໄຟລ໌ຫຼັກຂອງ Server (API Routes & Logic)
│   ├── .env                    # ໄຟລ໌ເກັບຕົວແປລະບົບ (Environment Variables)
│   └── package.json            # ຂໍ້ມູນລາຍການ Dependencies ຂອງ Backend
├── run-backend.bat             # Script ສຳລັບລັນ Backend
├── run-frontend.bat            # Script ສຳລັບລັນ Frontend
└── start.bat                   # Script ສຳລັບລັນທັງສອງພ້ອມກັນ
```

---

## 4. ອົງປະກອບຫຼັກຂອງລະບົບ (Core Components)

### 4.1 Frontend Pages
- **LandingPage (`client/src/pages/LandingPage.tsx`):** ໜ້າທຳອິດສຳລັບສະແດງຂໍ້ມູນ ແລະ ດຶງດູດຄວາມສົນໃຈ.
- **SelectionPage (`client/src/pages/SelectionPage.tsx`):** ໜ້າສຳລັບເລືອກຕຳແໜ່ງທີ່ຕ້ອງການສະໝັກ.
- **JobDetailsPage (`client/src/pages/JobDetailsPage.tsx`):** ໜ້າສະແດງລາຍລະອຽດ, ຄຸນສົມບັດ ແລະ ໜ້າທີ່ຮັບຜິດຊອບຂອງຕຳແໜ່ງນັ້ນໆ.
- **ApplicationFormPage (`client/src/pages/ApplicationFormPage.tsx`):** ໜ້າຟອມສະໝັກງານ (Form 20) ທີ່ໃຫ້ຜູ້ໃຊ້ປ້ອນຂໍ້ມູນສ່ວນຕົວ, ປະຫວັດການສຶກສາ ແລະ ອັບໂຫຼດເອກະສານ.
- **AdminDashboard (`client/src/pages/AdminDashboard.tsx`):** ໜ້າສຳລັບ HR ເພື່ອເຂົ້າເບິ່ງລາຍຊື່, ຄົ້ນຫາຜູ້ສະໝັກ ແລະ ດາວໂຫຼດເອກະສານ PDF.

### 4.2 Backend API & Logic
- **`POST /api/submit-form`:** API ຮັບຂໍ້ມູນຈາກການສະໝັກ. ຈະມີການບັນທຶກຂໍ້ມູນລົງ MongoDB ແລະ ບັນທຶກໄຟລ໌ລົງໃນ `uploads/`.
- **`GET /api/applications`:** API ສຳລັບດຶງລາຍຊື່ຜູ້ສະໝັກທັງໝົດໄປສະແດງໃນ Admin Dashboard.
- **PDF Generator:** ໂມດູນທີ່ໃຊ້ `pdf-lib` ເພື່ອດຶງຂໍ້ມູນຜູ້ສະໝັກແຕ່ລະຄົນມາຈັດລຽງລົງໃນແບບຟອມ PDF ອັດຕະໂນມັດ ເຊິ່ງສະດວກຕໍ່ການພິມ (Print).

---

## 5. ການຕິດຕັ້ງ ແລະ ການລັນລະບົບ (Setup & Running)

1. **ການຕັ້ງຄ່າ Database:** ຕ້ອງມີ MongoDB ຕິດຕັ້ງໄວ້ໃນເຄື່ອງ ຫຼື ໃຊ້ MongoDB Atlas ແລະ ກຳນົດຄ່າ `MONGODB_URI` ໃນໄຟລ໌ `.env` ຂອງໂຟນເດີ `server`.
2. **ການຕິດຕັ້ງ Dependencies:** 
   - ເຂົ້າໄປໂຟນເດີ `client` ແລ້ວລັນ `npm install`
   - ເຂົ້າໄປໂຟນເດີ `server` ແລ້ວລັນ `npm install`
3. **ການເລີ່ມຕົ້ນລະບົບ:**
   - ລັນ `start.bat` ເພື່ອເປີດທັງ Frontend ແລະ Backend ພ້ອມກັນໃນລະບົບ Windows.

> [!TIP]
> ລະບົບມີການຈັດການ Error ແລະ Validation ຢູ່ທັງຝັ່ງ Frontend ແລະ Backend ເພື່ອຮັບປະກັນວ່າຂໍ້ມູນທີ່ຖືກສົ່ງເຂົ້າມາມີຄວາມຖືກຕ້ອງຄົບຖ້ວນ.
