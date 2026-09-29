# -*- coding: utf-8 -*-
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

doc = Document()

# Page Setup: Margins 1 inch
sections = doc.sections
for section in sections:
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.8)
    section.right_margin = Inches(0.8)

PRIMARY_COLOR = RGBColor(197, 22, 5)     # Lao Telecom Red #C51605
SECONDARY_COLOR = RGBColor(26, 54, 93)   # Navy Slate #1A365D
DARK_TEXT = RGBColor(30, 41, 59)         # Slate 800
LIGHT_BG = "F8FAFC"
BORDER_COLOR = "CBD5E1"

def set_font(run, font_name="Phetsarath OT", size_pt=11, bold=False, italic=False, color=DARK_TEXT):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color
    # Required for Word to properly render East Asian/Complex script font (Lao)
    rPr = run._r.get_or_add_rPr()
    rFonts = parse_xml(f'<w:rFonts {nsdecls("w")} w:ascii="{font_name}" w:hAnsi="{font_name}" w:cs="{font_name}" w:eastAsia="{font_name}"/>')
    rPr.append(rFonts)

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    set_font(run, size_pt=15, bold=True, color=PRIMARY_COLOR)
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    set_font(run, size_pt=12.5, bold=True, color=SECONDARY_COLOR)
    return p

def add_body_p(doc, bold_prefix, text):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r1 = p.add_run(bold_prefix + " ")
        set_font(r1, size_pt=10.5, bold=True, color=SECONDARY_COLOR)
    r2 = p.add_run(text)
    set_font(r2, size_pt=10.5, color=DARK_TEXT)
    return p

# Document Title
p_title = doc.add_paragraph()
p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_title.paragraph_format.space_after = Pt(2)
r_title = p_title.add_run("ຄູ່ມືແຜນທີ່ໄຟລ໌ໂຄງສ້າງໂປຣເຈັກ (Project Architecture Reference)")
set_font(r_title, size_pt=18, bold=True, color=PRIMARY_COLOR)

p_sub = doc.add_paragraph()
p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
p_sub.paragraph_format.space_after = Pt(14)
r_sub = p_sub.add_run("ລະບົບຮັບສະໝັກພະນັກງານ — ບໍລິສັດ ລາວ ໂທລະຄົມ ມະຫາຊົນ (LTC Recruitment Portal)")
set_font(r_sub, size_pt=12, italic=True, color=SECONDARY_COLOR)

# Divider line
p_div = doc.add_paragraph()
p_div.paragraph_format.space_after = Pt(10)
p_div_border = parse_xml(f'<w:pBdr {nsdecls("w")}><w:bottom w:val="single" w:sz="12" w:space="1" w:color="C51605"/></w:pBdr>')
p_div._p.get_or_add_pPr().append(p_div_border)

# SECTION 1: FRONTEND
add_heading_1(doc, "🎨 ໝວດທີ 1: ໜ້າບ້ານ (Frontend — client/)")

add_heading_2(doc, "1.1 ໄຟລ໌ໜ້າຕ່າງໆ ຂອງເວັບ (client/src/pages/)")
add_body_p(doc, "• LandingPage.tsx:", "ໜ້າທຳອິດ (Home/Hero) ທີ່ແນະນຳ LTC, ປ້າຍສະຫວັດດີການ, ແລະ ປຸ່ມກົດ 'ສະໝັກວຽກເລີຍ' / 'ກວດສອບສະຖານະ'.\n  👉 ແກ້ຫຍັງໄດ້: ປ່ຽນຂໍ້ຄວາມຕ້ອນຮັບ, ປ່ຽນຮູບ Banner ໃຫຍ່ດ້ານເທິງ, ປ່ຽນຄຳອະທິບາຍບໍລິສັດ.")
add_body_p(doc, "• SelectionPage.tsx:", "ໜ້າເລືອກຕຳແໜ່ງງານ (ທີ່ແບ່ງເປັນ ສຳນັກງານໃຫຍ່ ແລະ ສາຂາແຂວງ).\n  👉 ແກ້ຫຍັງໄດ້: ປ່ຽນຮູບແບບກ່ອງ Card ຕຳແໜ່ງ, ປ່ຽນລາຍການສະຫວັດດີການ 17 ຢ່າງ, ປັບປຸ່ມຄົ້ນຫາຕຳແໜ່ງ.")
add_body_p(doc, "• JobDetailsPage.tsx:", "ໜ້າສະແດງລາຍລະອຽດເງື່ອນໄຂ, ເງິນເດືອນ, ໜ້າທີ່ຮັບຜິດຊອບ ຂອງຕຳແໜ່ງທີ່ເລືອກ.\n  👉 ແກ້ຫຍັງໄດ້: ປັບແຕ່ງການສະແດງຜົນລາຍການເອກະສານທີ່ຕ້ອງປະກອບ.")
add_body_p(doc, "• ApplicationFormPage.tsx (ສຳຄັນຫຼາຍ):", "ໜ້າຟອມສະໝັກວຽກຫຼາຍຂັ້ນຕອນ (Multi-Step Form).\n  👉 ແກ້ຫຍັງໄດ້: ເພີ່ມ/ລຶບ ຊ່ອງປ້ອນຂໍ້ມູນ (Input Text, Dropdown), ປັບຂັ້ນຕອນການສະໝັກ (Step 1-5), ປັບແຕ່ງການກວດສອບວັນເດືອນປີເກີດ.")
add_body_p(doc, "• AdminDashboard.tsx:", "ໜ້າຄຸ້ມຄອງຂອງ HR (ຕາຕະລາງລາຍຊື່ຜູ້ສະໝັກ, ປຸ່ມດາວໂຫຼດ PDF, ປຸ່ມປ່ຽນສະຖານະ ຮັບ/ປະຕິເສດ, ສົ່ງອີເມວ).\n  👉 ແກ້ຫຍັງໄດ້: ປັບແຕ່ງຖັນຕາຕະລາງ, ເພີ່ມປຸ່ມ Export Excel, ປັບລະບົບກັ່ນຕອງຄົ້ນຫາ.")

add_heading_2(doc, "1.2 ໄຟລ໌ຕົວຊ່ວຍ ແລະ ການຕັ້ງຄ່າ (client/src/lib/ & components/)")
add_body_p(doc, "• applicationFormSchema.ts:", "ກຳນົດໂຄງສ້າງ Type ແລະ ພິກັດຕຳແໜ່ງຟອມຂອງ Frontend.\n  👉 ແກ້ຫຍັງໄດ້: ປັບລາຍຊື່ຊ່ອງຂໍ້ມູນທີ່ບັງຄັບປ້ອນ (required: true/false).")
add_body_p(doc, "• SignaturePadModal.tsx:", "ກ່ອງປ໊ອບອັບ (Popup Modal) ສຳລັບໃຫ້ຜູ້ສະໝັກໃຊ້ນິ້ວມື/ເມົ້າສ໌ ແຕ້ມລາຍເຊັນ.\n  👉 ແກ້ຫຍັງໄດ້: ປັບຂະໜາດຫົວສໍລາຍເຊັນ, ປັບປຸ່ມ 'ລຶບແຕ້ມໃໝ່' (Clear) ແລະ 'ຢືນຢັນ' (Save).")
add_body_p(doc, "• fetchJobConfig.ts:", "ດຶງຂໍ້ມູນຕຳແໜ່ງງານຈາກ Server ມາສະແດງຜົນ ແລະ ເກັບ Cache ໄວ້ໃນ Browser.\n  👉 ແກ້ຫຍັງໄດ້: ປັບຕຳແໜ່ງເລີ່ມຕົ້ນ (Default Positions) ຖ້າ Server ບໍ່ຕອບສະໜອງ.")
add_body_p(doc, "• index.css:", "ໄຟລ໌ຕົກແຕ່ງ CSS ຫຼັກ, Font ພາສາລາວ (Noto Sans Lao, Phetsarath), ສີຫຼັກຂອງ LTC (ສີແດງ-ຂາວ).\n  👉 ແກ້ຫຍັງໄດ້: ປ່ຽນ Font ທັງເວັບ, ປ່ຽນໂທນສີ, ປັບພາບ Animation.")

# SECTION 2: BACKEND
add_heading_1(doc, "⚙️ ໝວດທີ 2: ຫຼັງບ້ານ (Backend — server/)")

add_heading_2(doc, "2.1 ໄຟລ໌ຫຼັກ ແລະ API")
add_body_p(doc, "• index.js (ຫົວໃຈຫຼັກຂອງ Backend):", "ເປີດ Port 5000, ສ້າງ API ທັງໝົດ, ລະບົບ Login Admin, ລະບົບອັບໂຫຼດໄຟລ໌, ແລະ ລະບົບສ້າງ PDF ອັດຕະໂນມັດ (ແຕ້ມຂໍ້ຄວາມ + ຮູບ + ລາຍເຊັນລົງ PDF).\n  👉 ແກ້ຫຍັງໄດ້: ເພີ່ມ API ໃໝ່, ປັບແຕ່ງການແຕ້ມຟອນລາວລົງ PDF, ປັບແຕ່ງອີເມວແຈ້ງເຕືອນ Nodemailer.")
add_body_p(doc, "• applicationFormSchema.js:", "ແຜນທີ່ພິກັດ PDF ກຳນົດວ່າ ຊື່, ນາມສະກຸນ, ວັນເກີດ, ຮູບຖ່າຍ 3x4, ແລະ ລາຍເຊັນ ຈະຕ້ອງຖືກແຕ້ມລົງ ໜ້າໃດ, ພິກັດ X ເທົ່າໃດ, Y ເທົ່າໃດ ໃນເຈ້ຍ PDF.\n  👉 ແກ້ຫຍັງໄດ້: ຍ້າຍຕຳແໜ່ງຕົວໜັງສື ຫຼື ຍ້າຍບ່ອນແປະລາຍເຊັນໃນ PDF ໃຫ້ຕົງກັບຊ່ອງ.")
add_body_p(doc, "• db.js:", "ຈັດການເຊື່ອມຕໍ່ຖານຂໍ້ມູນ MongoDB Atlas (Cloud Database).\n  👉 ແກ້ຫຍັງໄດ້: ປັບແຕ່ງການເຊື່ອມຕໍ່ Database, ປັບລະບົບກວດສອບສະຖານະ Network.")

add_heading_2(doc, "2.2 ໄຟລ໌ຖານຂໍ້ມູນ ແລະ ການຕັ້ງຄ່າ")
add_body_p(doc, "• .env:", "ເກັບລະຫັດຄວາມລັບ ເຊັ່ນ: MONGODB_URI, ADMIN_PASSWORD (ລະຫັດຜ່ານ Admin), ADMIN_TOKEN.\n  👉 ແກ້ຫຍັງໄດ້: ປ່ຽນລະຫັດເຂົ້າ Admin Dashboard, ປ່ຽນ Link Database.")
add_body_p(doc, "• job_config_fallback.json:", "ເກັບຂໍ້ມູນຕຳແໜ່ງງານສຳຮອງໃນເຄື່ອງ (ຖ້າບໍ່ມີ MongoDB).\n  👉 ແກ້ຫຍັງໄດ້: ເພີ່ມ/ລຶບ/ແກ້ໄຂ ຕຳແໜ່ງງານທີ່ເປີດຮັບສະໝັກ.")
add_body_p(doc, "• submissions.json:", "ບ່ອນບັນທຶກໃບສະໝັກທັງໝົດຂອງຜູ້ສະໝັກ (ເກັບຊື່, ເບີໂທ, ປະຫວັດ, ລາຍເຊັນ).\n  👉 ແກ້ຫຍັງໄດ້: ເບິ່ງຂໍ້ມູນດິບຂອງຜູ້ສະໝັກທຸກຄົນ ຫຼື ລຶບຂໍ້ມູນທົດສອບ (Test data) ອອກ.")

# SECTION 3: ROOT & SCRIPTS
add_heading_1(doc, "🚀 ໝວດທີ 3: ໄຟລ໌ຄວບຄຸມການ Deploy & Startup (Root Directory)")
add_body_p(doc, "• start.bat:", "ຄລິກເພື່ອເປີດລະບົບທັງໝົດພ້ອມກັນ (Frontend + Backend + Browser ອັດຕະໂນມັດ).")
add_body_p(doc, "• run-backend.bat:", "ຄລິກເພື່ອເປີດສະເພາະ Server (Backend Port 5000).")
add_body_p(doc, "• run-frontend.bat:", "ຄລິກເພື່ອເປີດສະເພາະ Frontend (Port 5173).")
add_body_p(doc, "• vercel.json:", "ໄຟລ໌ຕັ້ງຄ່າ Route ເວລາ Deploy ຂຶ້ນ Cloud Vercel.")

# SECTION 4: TECH SUMMARY TABLE
add_heading_1(doc, "📊 ສະຫຼຸບເທັກໂນໂລຢີ (Tech Stack Summary)")

table = doc.add_table(rows=1, cols=3)
table.alignment = WD_TABLE_ALIGNMENT.CENTER
hdr_cells = table.rows[0].cells
hdr_cells[0].text = "ພາກສ່ວນ (Layer)"
hdr_cells[1].text = "ເທັກໂນໂລຢີທີ່ໃຊ້"
hdr_cells[2].text = "ໜ້າທີ່ຫຼັກ"

for cell in hdr_cells:
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="C51605"/>')
    cell._tc.get_or_add_tcPr().append(shading)
    for p in cell.paragraphs:
        for r in p.runs:
            set_font(r, size_pt=10.5, bold=True, color=RGBColor(255, 255, 255))

data = [
    ("Frontend", "React 19 + TypeScript + Vite + Tailwind CSS", "ສ່ວນສະແດງຜົນໜ້າເວັບ, ຟອມສະໝັກ, ກ່ອງແຕ້ມລາຍເຊັນ"),
    ("Backend", "Node.js + Express.js", "ສູນກາງ REST API, ລະບົບ Login, ຈັດການອັບໂຫຼດໄຟລ໌"),
    ("Database", "MongoDB Atlas + JSON Fallback", "ເກັບຂໍ້ມູນຜູ້ສະໝັກ ແລະ ຕຳແໜ່ງງານ ພ້ອມລະບົບສຳຮອງບໍ່ໃຫ້ຫຼຸດ"),
    ("PDF Engine", "pdf-lib + @pdf-lib/fontkit + sharp", "ແຕ້ມຟອນ Phetsarath OT ແລະ ຕັດພື້ນຫຼັງລາຍເຊັນລົງ PDF"),
    ("Deployment", "Vercel / PM2 (VPS)", "Deploy ຂຶ້ນ Cloud Serverless ຫຼື Server VPS")
]

for layer, tech, purpose in data:
    row_cells = table.add_row().cells
    row_cells[0].text = layer
    row_cells[1].text = tech
    row_cells[2].text = purpose
    for i, cell in enumerate(row_cells):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="F8FAFC"/>')
        cell._tc.get_or_add_tcPr().append(shading)
        for p in cell.paragraphs:
            for r in p.runs:
                set_font(r, size_pt=9.5, bold=(i==0), color=DARK_TEXT)

output_path = "c:\\Users\\Administrator\\Desktop\\sa_muk_vk_LTC\\LTC_Project_Architecture_Guide.docx"
doc.save(output_path)
print("Successfully generated Word document at:", output_path)
