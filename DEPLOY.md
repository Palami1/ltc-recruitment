# ຄູ່ມື Deploy ເວັບ LTC (ອອນລາຍ + ເຮັດວຽກຕະຫຼອດ)

ໂປຣເຈັກນີ້ແຍກ 2 ສ່ວນ:

| ສ່ວນ | ເທັກ | ຕິດຕັ້ງທີ່ແນະນຳ |
|------|------|----------------|
| **Frontend** (React) | ຟາຍສະແຕຕິກ | [Render Static Site](https://render.com) ຫຼື Netlify — **ບໍ່ໂດນບລັອກໃນລາວ** |
| **Backend** (Express) | API + PDF + ອັບໂຫຼດ | [Render Web Service](https://render.com) (ໃຊ້ຄູ່ກັບ cron-job.org) |
| **ຖານຂໍ້ມູນ** | MongoDB | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) — **ຟຣີ** |

> **ສຳຄັນ:** ແຜນ **ຟຣີ** ຂອງ Render ປົກກະຕິຈະ **ຫຼັບ** (Sleep) ຖ້າບໍ່ມີຄົນເຂົ້າໃຊ້ງານ. ແຕ່ເຮົາສາມາດໃຊ້ເຕັກນິກ cron-job.org ເພື່ອປຸກໃຫ້ມັນເປີດຕະຫຼອດ 24 ຊົ່ວໂມງໄດ້ແບບຟຣີໆ! ເບິ່ງວິທີຕັ້ງຄ່າຢູ່ດ້ານລຸ່ມ.

---

## ຂັ້ນຕອນ 1 — MongoDB Atlas (ຖານຂໍ້ມູນ)

1. ສ້າງບັນຊີ → **Create** cluster ແບບ **M0 Free**
2. **Database Access** → ສ້າງ user + password (ຈື່ໄວ້)
3. **Network Access** → **Allow access from anywhere** (`0.0.0.0/0`) ສຳລັບ cloud
4. **Connect** → **Drivers** → copy connection string  
   ຕົວຢ່າງ: `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/ltc_recruitment`

---

## ຂັ້ນຕອນ 2 — Backend (Render)

1. ເຂົ້າ [render.com](https://render.com) → **New +** → **Web Service**
2. Connect GitHub repo `Palami1/ltc-recruitment`
3. ຕັ້ງຄ່າ:

   | ຊ່ອງ | ຄ່າ |
   |------|-----|
   | Root Directory | `server` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance type | ຟຣີ = ຫຼັບເມື່ອບໍ່ໃຊ້ · **Starter** = ເປີດຕະຫຼອດ |

4. **Environment Variables** (ສຳຄັນ):

   ```
   MONGODB_URI=mongodb+srv://... (ຈາກ Atlas)
   ADMIN_TOKEN=ລະຫັດລັບທີ່ແຂງແຮງ (ຢ່າໃຊ້ secret-admin-key)
   FRONTEND_URL=https://ltc-recruitment.vercel.app
   ```

   (ໝາຍເຫດ: ຫ້າມກຳນົດຕົວປ່ຽນ PORT ເອງໃນ Render ເດັດຂາດ ເພາະລະບົບຈະ Random ໃຫ້ເອງ, ໂຄ້ດຮອງຮັບ `process.env.PORT` ຢູ່ແລ້ວ)

5. Deploy → copy URL ເຊັ່ນ `https://ltc-api-xxxx.onrender.com`

**⚠️ ຄຳເຕືອນເລື່ອງໄຟລ໌ຫາຍ (ສຳຄັນທີ່ສຸດ):**
ທຸກໆຄັ້ງທີ່ທ່ານ `git push` ອັບເດດໂຄ້ດໃໝ່ ໄຟລ໌ PDF ແລະ ຮູບພາບໃນ `server/uploads/` ທີ່ຜູ້ສະໝັກເຄີຍສົ່ງມາຈະ **ຫາຍໄປທັນທີ**! ເພາະ Render ໃຊ້ລະບົບ Ephemeral File System ທີ່ຈະລຶບ Disk ເກົ່າແລ້ວສ້າງ Container ໃໝ່ທັບທຸກຄັ້ງທີ່ Deploy.
**ວິທີແກ້ສະເພາະໜ້າ:** ກ່ອນຈະ `git push` ໂຄ້ດໃໝ່ ໃຫ້ກວດເບິ່ງ ແລະ **ດາວໂຫຼດຟາຍ PDF** ຂອງຜູ້ສະໝັກເກັບໄວ້ກ່ອນ! (ຖ້າຢາກໃຫ້ແຂງແກ່ນຖາວອນ ຕ້ອງໃຊ້ Cloud Storage ເຊັ່ນ S3 ພາຍຫຼັງ).

---

## ຂັ້ນຕອນ 3 — Frontend (Render Static Site — ແນະນຳເພື່ອບໍ່ໃຫ້ຕິດບລັອກ)

ເນື່ອງຈາກ Vercel ອາດຈະຖືກບລັອກໃນບາງເຄືອຂ່າຍອິນເຕີເນັດໃນລາວ, ດັ່ງນັ້ນແນະນຳໃຫ້ຍ້າຍມາ Deploy ຢູ່ Render ເຊັ່ນກັນ.

1. ເຂົ້າ [render.com](https://render.com) → **New +** → **Static Site**
2. Connect GitHub repo `ltc-recruitment` 
3. ຕັ້ງຄ່າ:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `client/dist` (ສຳລັບ Vite)
   - **Root Directory:** `client`
4. **Environment Variable** (ກ່ອນ Build):

   ```
   VITE_API_URL=https://ltc-api-xxxx.onrender.com
   ```

   (ໃສ່ URL backend ຈິງ ບໍ່ມີ `/` ທ້າຍ)

5. Deploy → ໄດ້ URL ເຊັ່ນ `https://ltc-recruitment.onrender.com` 

ທຸກຄັ້ງປ່ຽນ backend URL ຕ້ອງ **Redeploy** frontend ໃໝ່ສະເໝີ.

---

## ຂັ້ນຕອນ 4 — ທົດສອບ

- ເປີດ URL Vercel → ກົດ «ຟອມສະໝັກວຽກ»
- Admin → `https://your-site.vercel.app/admin` + ລະຫັດ `ADMIN_TOKEN`
- ຖ້າ API ຊ້າຄັ້ງທຳອິດ (Render ຟຣີກຳລັງຕື່ນ) — ລໍຖ້າ ~30 ວິນາທີ

---

## ເຄັດລັບ: ເຮັດໃຫ້ Render ຟຣີເປີດຕະຫຼອດ 24 ຊມ. (ແກ້ບັນຫາ Cold Start)

ເນື່ອງຈາກ Render ແຜນຟຣີຈະຫຼັບ (Sleep) ທຸກໆ 15 ນາທີເມື່ອປ່ອຍຖິ້ມໄວ້. ເຮົາສາມາດໃຊ້ບໍລິການ Cron Job ໃຫ້ມັນຍິງ Ping ໄປຫາ URL ຂອງເຮົາທຸກໆ 14 ນາທີ ເພື່ອຫຼອກລະບົບວ່າມີຄົນເຂົ້າໃຊ້ງານຕະຫຼອດເວລາ ເຊິ່ງຈະຊ່ວຍໃຫ້ເວັບບໍ່ຫຼັບ.

**ຂັ້ນຕອນການຕັ້ງຄ່າ:**
1. ເຂົ້າເວັບ [cron-job.org](https://cron-job.org) ແລ້ວສະໝັກບັນຊີ (ຟຣີ).
2. ກົດປຸ່ມ **Create Cron Job** ແລ້ວຕັ້ງຄ່າດັ່ງນີ້:
   - **URL:** ໃສ່ URL ຂອງ Backend ຈາກ Render (ຕົວຢ່າງ: `https://ltc-api-xxxx.onrender.com/`)
   - **Execution Schedule:** ຕັ້ງເປັນ **14 minutes** (ໃຫ້ເວັບນີ້ຍິງຫາເຊີບເວີເຮົາທຸກໆ 14 ນາທີ)
3. ບັນທຶກ ເປັນອັນສຳເລັດ.

💡 ພຽງເທົ່ານີ້ Backend ຂອງທ່ານກໍຈະໂດນສະກິດໃຫ້ຕື່ນຢູ່ຕະຫຼອດ 24 ຊົ່ວໂມງ ແບບບໍ່ມີໂອກາດໄດ້ຫຼັບ (Cold Start ຫາຍວັບທັນທີ!)

---

## ອັບເດດໂຄ້ດຫຼັງ deploy

```powershell
cd "c:\Users\Administrator\Desktop\sa_muk_vk_LTC"
git add .
git commit -m "ອັບເດດ"
git push
```

Vercel ແລະ Render ຈະ build ໃໝ່ອັດຕະໂນມັດຈາກ GitHub.

---

## Checklist ຄວາມປອດໄພ

- [ ] GitHub repo = **Private**
- [ ] `ADMIN_TOKEN` ຍາວ ແລະ ສຸ່ມ
- [ ] ບໍ່ commit `.env`
- [ ] MongoDB Atlas user ມີສິດພຽງພໍ
- [ ] `cors` ໃນ Backend ອະນຸຍາດສະເພາະ URL ຂອງ Frontend ແລ້ວ (ບໍ່ໃຊ້ `origin: '*'`)
- [ ] ໂຄ້ດ Node.js ໃຊ້ `process.env.PORT` ແລ້ວ (ບໍ່ໄດ້ Fix ຕົວເລກ Port ຕາຍໂຕ)
- [ ] ໄດ້ Backup ໄຟລ໌ໃນໂຟນເດີ `uploads/` ກ່ອນການ Push ໂຄ້ດໃໝ່ທຸກຄັ້ງ
- [ ] ຕິດຕັ້ງແລະເປີດໃຊ້ງານ `express-rate-limit` ແລ້ວເພື່ອປ້ອງກັນ Bot ຍິງຟອມ
