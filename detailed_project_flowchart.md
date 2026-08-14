# ຜັງງານລະບົບ ແລະ ການໄຫຼຂອງຂໍ້ມູນລະອຽດ (High-Resolution System & Data Flowchart)
## ໂຄງການ: ລະບົບສະໝັກວຽກອອນລາຍ LTC (LTC Online Recruitment System)

---

## 1. ພາບລວມຂອງເທັກໂນໂລຢີ ແລະ ການເກັບຂໍ້ມູນ (Technology & Storage Architecture)

| ສ່ວນປະກອບ (Component) | ເທັກໂນໂລຢີ / ພາສາທີ່ໃຊ້ (Technology & Language) | ໜ້າທີ່ ແລະ ລາຍລະອຽດ (Role & Details) |
| :--- | :--- | :--- |
| **Frontend (Client)** | React 19 + TypeScript + Vite | ພັດທະນາ UI ທີ່ໄວ, ມີ Type Safety, ຈັດການ Form ແລະ UI Components |
| **UI & Styling** | Tailwind CSS + Lucide React | ອອກແບບ Responsive Design, ອိုင်ຄອນ modern ງາມຕາ |
| **HTTP Client** | Axios | ສົ່ງຂໍ້ມູນ Form (Multipart Data) ແລະ ຮຽກໃຊ້ REST APIs |
| **Backend (Server)** | Node.js + Express.js | ຈັດການ Routing, API Endpoint, Upload Middleware, ປະມວນຜົນ PDF |
| **Database Storage** | MongoDB + Mongoose ORM | ເກັບຂໍ້ມູນໂຄງສ້າງໃບສະໝັກ (Form 20 Data, ປະຫວັດການສຶກສາ, ປະຫວັດການເຮັດວຽກ) |
| **File System Storage** | Local Disk Storage (`server/uploads/`) | ເກັບໄຟລ໌ຮູບ 3x4, ບັດປະຈຳຕົວ, ສຳເນົາສຳມະໂນຄົວ, ໃບປະກາດ, ໃບກວດສຸຂະພາບ, ໃບແຈ້ງໂທດ |
| **Image Processing** | Sharp | ປັບຂະໜາດ ແລະ Optimize ຮູບ 3x4 ຂອງຜູ້ສະໝັກ |
| **PDF Generation Engine** | PDF-Lib + Fontkit | ສ້າງໄຟລ໌ PDF ແບບຟອມ 20 ອັດຕະໂນມັດ ໂດຍຝັງຟອນ Lao (Phetsarath/Noto Sans Lao) |

---

## 2. ຜັງງານການໄຫຼຂອງລະບົບທັງໝົດ (End-to-End System Flowchart)

```mermaid
flowchart TD
    subgraph FRONTEND [" 🌐 ຝັ່ງຜູ້ໃຊ້ (Frontend Layer - React + TypeScript) "]
        node_start([1. ຜູ້ສະໝັກເຂົ້າສູ່ລະບົບ]) --> node_landing["LandingPage.tsx\n(ເບິ່ງຂໍ້ມູນ ແລະ ມາດຕະຖານການຮັບສະໝັກ)"]
        node_landing --> node_selection["SelectionPage.tsx\n(ເລືອກຕຳແໜ່ງງານທີ່ເປີດຮັບສະໝັກ)"]
        node_selection --> node_jobdetail["JobDetailsPage.tsx\n(ກວດເບິ່ງເງື່ອນໄຂ, ວຸດທິການສຶກສາ & ໜ້າທີ່)"]
        node_jobdetail --> node_form["ApplicationFormPage.tsx\n(ປະກອບຟອມ Form 20 + ອັບໂຫຼດເອກະສານ)"]
        
        node_form --> node_submit{"ກວດສອບຄວາມຖືກຕ້ອງ\n(Form Validation)"}
        node_submit -- "ບໍ່ຖືກຕ້ອງ" --> node_form
        node_submit -- "ຖືກຕ້ອງຄົບຖ້ວນ" --> node_axios["Axios HTTP Multipart POST Request\n/api/submit-form"]
    end

    subgraph BACKEND [" ⚙️ ຝັ່ງເຊີເວີ (Backend Layer - Node.js + Express.js) "]
        node_axios --> node_express["Express API Route Receiver"]
        node_express --> node_multer["Multer File Upload Middleware\n(ກວດສອບ ແລະ ແຍກໄຟລ໌ອັບໂຫຼດ)"]
        node_multer --> node_sharp["Sharp Image Processor\n(Crop & Resize ຮູບ 3x4)"]
        node_sharp --> node_mongo_save["Mongoose Save Model\n(ບັນທຶກຂໍ້ມູນ Form 20 ລົງ MongoDB)"]
        node_sharp --> node_disk_save["Save Files to Disk\n(ບັນທຶກໄຟລ໌ລົງ server/uploads/)"]
        
        node_mongo_save --> node_pdf_engine["PDF Generator Module\n(PDF-Lib + Fontkit + Lao Font Mapping)"]
        node_pdf_engine --> node_pdf_gen["ສ້າງໄຟລ໌ PDF ແບບຟອມ 20\n(ຝັງຂໍ້ມູນ + ຮູບພາບ 3x4)"]
    end

    subgraph STORAGE [" 💾 ຝັ່ງການເກັບຂໍ້ມູນ (Storage Layer) "]
        node_mongo_save ==> DB[("MongoDB Database\nCollection: Applications")]
        node_disk_save ==> UPLOADS[("File System Storage\nDirectory: server/uploads/")]
        node_pdf_gen ==> UPLOADS
    end

    node_pdf_gen --> node_response["Response 200 OK -> ແຈ້ງເຕືອນຜູ້ສະໝັກ 'ສະໝັກສຳເລັດ'"]

    subgraph HR_ADMIN [" 👨‍💼 ຝັ່ງຜູ້ບໍລິຫານ (HR Admin Layer) "]
        admin_start([2. HR ເຂົ້າສູ່ລະບົບ Admin]) --> admin_login["Admin Login Form\n/api/admin/login"]
        admin_login --> admin_dash["AdminDashboard.tsx\n(ໜ້າຄຸ້ມຄອງຂໍ້ມູນຜູ້ສະໝັກ)"]
        
        DB -. "GET /api/applications" .-> admin_dash
        UPLOADS -. "ດາວໂຫຼດ/ເບິ່ງໄຟລ໌ PDF" .-> admin_dash
        
        admin_dash --> admin_review["HR ກວດສອບເອກະສານ & ຄຸນສົມບັດ"]
        admin_review --> admin_status{"ອັບເດດສະຖານະ\n(Update Status)"}
        
        admin_status -- "ຜ່ານການຄັດເລືອກ" --> status_pass["ນັດໝາຍສຳພາດ\n(Approved / Interview)"]
        admin_status -- "ບໍ່ຜ່ານ" --> status_reject["ເກັບປະຫວັດ\n(Rejected)"]
    end

    %% Styling
    classDef frontendStyle fill:#0284c7,color:#fff,stroke:#0369a1,stroke-width:2px;
    classDef backendStyle fill:#d97706,color:#fff,stroke:#b45309,stroke-width:2px;
    classDef storageStyle fill:#7c3aed,color:#fff,stroke:#5b21b6,stroke-width:2px;
    classDef adminStyle fill:#059669,color:#fff,stroke:#047857,stroke-width:2px;

    class node_landing,node_selection,node_jobdetail,node_form,node_submit,node_axios frontendStyle;
    class node_express,node_multer,node_sharp,node_mongo_save,node_disk_save,node_pdf_engine,node_pdf_gen,node_response backendStyle;
    class DB,UPLOADS storageStyle;
    class admin_login,admin_dash,admin_review,admin_status,status_pass,status_reject adminStyle;
```

---

## 3. ການໄຫຼຂອງຂໍ້ມູນ ແລະ API Dynamic Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as 👤 ຜູ້ສະໝັກ (Candidate)
    participant Client as 🌐 React App (Vite+TS)
    participant Server as ⚙️ Express Backend
    participant Storage as 📁 Disk Uploads
    participant DB as 🍃 MongoDB (Mongoose)
    actor HR as 👨‍💼 HR Administrator

    Candidate->>Client: 1. ເລືອກຕຳແໜ່ງ & ປະກອບຟອມ (Form 20) + ອັບໂຫຼດໄຟລ໌
    Client->>Server: 2. POST /api/submit-form (Multipart Form-Data)
    Server->>Storage: 3. Process & Save Uploaded Files (Multer & Sharp)
    Storage-->>Server: 4. Return File Paths & Metadata
    Server->>DB: 5. Application.create(formData + filePaths)
    DB-->>Server: 6. Application Document Saved (_id generated)
    Server->>Server: 7. pdf-lib map & generate Form 20 PDF
    Server-->>Client: 8. HTTP 200 OK (Submission Successful)
    Client-->>Candidate: 9. ສະແດງຂໍ້ຄວາມ "ສະໝັກສຳເລັດ"

    HR->>Client: 10. ເຂົ້າໜ້າ /admin (Login)
    Client->>Server: 11. GET /api/applications
    Server->>DB: 12. Application.find().sort({createdAt: -1})
    DB-->>Server: 13. Return Applicant List JSON
    Server-->>Client: 14. Display Data in Admin Data Table
    HR->>Client: 15. ກົດດາວໂຫຼດໃບສະໝັກ (PDF)
    Client->>Server: 16. GET /api/applications/:id/pdf
    Server->>Storage: 17. Read PDF Stream from disk
    Storage-->>Server: 18. File Buffer Stream
    Server-->>Client: 19. Send PDF File Stream
    Client-->>HR: 20. ດາວໂຫຼດ/ສະແດງ PDF ໃບສະໝັກ Form 20
```

---

## 4. ໂຄງສ້າງການເກັບຂໍ້ມູນ (Database Schema & File Structure)

### 4.1 Data Schema (`Application` Model)
```json
{
  "_id": "ObjectId",
  "positionApplied": "String (ຕຳແໜ່ງທີ່ສະໝັກ)",
  "fullName": "String (ຊື່ ແລະ ນາມສະກຸນ)",
  "gender": "String (ເພດ)",
  "dob": "Date (ວັນເດືອນປີເກີດ)",
  "phone": "String (ເບີໂທລະສັບ)",
  "email": "String (ອີເມວ)",
  "address": "Object (ທີ່ຢູ່ປະຈຸບັນ)",
  "education": "Array of Objects (ປະຫວັດການສຶກສາ)",
  "workExperience": "Array of Objects (ປະຫວັດການເຮັດວຽກ)",
  "familyMembers": "Array of Objects (ຂໍ້ມູນຄອບຄົວ)",
  "languages": "Object (ຄວາມສາມາດດ້ານພາສາ)",
  "status": "String ('Pending' | 'Approved' | 'Rejected')",
  "files": {
    "photo": "String (ເສັ້ນທາງຮູບ 3x4)",
    "idCard": "String (ເສັ້ນທາງບັດປະຈຳຕົວ)",
    "censusBook": "String (ເສັ້ນທາງສຳມະໂນຄົວ)",
    "resume": "String (ເສັ້ນທາງ CV/Resume)",
    "diploma": "String (ເສັ້ນທາງໃບປະກາດ)",
    "generatedPdf": "String (ເສັ້ນທາງ PDF Form 20 ທີ່ລະບົບສ້າງ)"
  },
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

---

## 5. ສະຫຼຸບຈຸດເດັ່ນຂອງໂຄງສ້າງລະບົບ (System Architecture Highlights)

1. **Modular Architecture:** ແຍກສ່ວນ Client (React) ແລະ Server (Express) ຢ່າງຈະແຈ້ງ ເຮັດໃຫ້ງ່າຍຕໍ່ການບຳລຸງຮັກສາ.
2. **Dynamic PDF Rendering Engine:** ໃຊ້ `pdf-lib` + `fontkit` ເພື່ອດຶງຂໍ້ມູນຈາກ MongoDB ແລ້ວມາ Mapping ໃສ່ Coordinates ໃນ PDF Form 20 ອັດຕະໂນມັດ ໂດຍຮອງຮັບ ພາສາລາວ 100%.
3. **Optimized Media Pipeline:** ໃຊ້ `Sharp` ໃນການປະມວນຜົນ ແລະ ບີບອັດຮູບ 3x4 ເພື່ອໃຫ້ PDF ມີຂະໜາດນ້ອຍ ແລະ ຄົມຊັດ.
4. **Secure File Storage:** ຈັດເກັບໄຟລ໌ເອກະສານຢ່າງເປັນລະບົບໃນ `server/uploads/` ພ້ອມ linkage ອ້າງອີງໃນ Database.
