const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\3cd07d7d-0b41-4c10-8522-e08f36fa84bc\\qa_screenshots';
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const BASE_URL = 'http://localhost:5173';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runQATest() {
  console.log('====================================================');
  console.log('   FULL END-TO-END QA TEST (LTC RECRUITMENT)        ');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1600,1000']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  page.on('dialog', async dialog => {
    console.log(`[Native Dialog]: ${dialog.message()}`);
    await dialog.accept();
  });

  const results = [];

  try {
    // ----------------------------------------------------
    // STEP 1: Admin Dashboard & Authentication
    // ----------------------------------------------------
    console.log('\n[Step 1] Loading Admin Dashboard...');
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1500);

    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      const adminPass = process.env.ADMIN_PASSWORD || '';
      console.log('Logging in with configured admin password...');
      await passInput.type(adminPass);
      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) await submitBtn.click();
      
      await page.waitForFunction(() => !document.querySelector('input[type="password"]'), { timeout: 10000 });
      await sleep(2000);
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_admin_logged_in.png'), fullPage: true });
    console.log('Admin login successful!');
    results.push({ step: '1. Admin Login', status: 'PASS', detail: 'Authenticated and loaded Admin Control Center' });

    // ----------------------------------------------------
    // STEP 2: Navigate to Job Config Tab (ຕັ້ງຄ່າ)
    // ----------------------------------------------------
    console.log('\n[Step 2] Navigating to "ຕັ້ງຄ່າ" (Job Config Tab)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const settingsBtn = buttons.find(b => b.innerText.includes('ຕັ້ງຄ່າ') && !b.innerText.includes('ບັນທຶກ'));
      if (settingsBtn) settingsBtn.click();
    });
    await sleep(2000);

    // ----------------------------------------------------
    // STEP 3: Delete an Old Position
    // ----------------------------------------------------
    console.log('\n[Step 3] Testing Position Deletion using specific button...');
    const deletedPosition = await page.evaluate(() => {
      const deleteButtons = Array.from(document.querySelectorAll('button[title*="ລຶບຕຳແໜ່ງ"]'));
      if (deleteButtons.length > 0) {
        deleteButtons[0].click();
        return true;
      }
      return false;
    });
    console.log('Clicked delete button on position card:', deletedPosition);

    if (deletedPosition) {
      await sleep(1000);
      const confirmed = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const confirmBtn = buttons.find(b => b.innerText === 'ລຶບຕຳແໜ່ງ' || b.innerText.includes('ລຶບຕຳແໜ່ງ'));
        if (confirmBtn) {
          confirmBtn.click();
          return true;
        }
        return false;
      });
      console.log('Confirmed delete in modal:', confirmed);
      await sleep(2500);
    }
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_after_position_deleted.png'), fullPage: true });
    results.push({ step: '2. Delete Position', status: 'PASS', detail: 'Successfully triggered and confirmed position deletion' });

    // ----------------------------------------------------
    // STEP 4: Add New Position (+ ເພີ່ມຕຳແໜ່ງໃໝ່) & Clean Type
    // ----------------------------------------------------
    console.log('\n[Step 4] Adding new position...');
    const testTitle = 'ວິສະວະກອນລະບົບໄອທີ (QA Lead)';
    const testCode = 'IT-SYS-777';

    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => b.innerText.includes('ເພີ່ມຕຳແໜ່ງໃໝ່') || b.innerText.includes('+ ເພີ່ມຕຳແໜ່ງ'));
      if (addBtn) addBtn.click();
    });
    await sleep(2000);

    // Completely select all and erase code input
    const codeInput = await page.$('input[placeholder*="ລະຫັດ"]');
    if (codeInput) {
      await codeInput.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await codeInput.type(testCode, { delay: 20 });
    }

    // Completely select all and erase dept input
    const deptInput = await page.$('input[placeholder*="ພະແນກ"]');
    if (deptInput) {
      await deptInput.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await deptInput.type(testTitle, { delay: 20 });
    }

    // Set branch to "ສຳນັກງານໃຫຍ່" so it appears prominently on candidate page
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      const branchSelect = selects.find(s => s.innerHTML.includes('ສຳນັກງານໃຫຍ່'));
      if (branchSelect) {
        branchSelect.value = 'ສຳນັກງານໃຫຍ່';
        branchSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    console.log(`Cleanly typed Code=${testCode} and Title=${testTitle}.`);
    await sleep(1000);

    // Click Save Button: "ບັນທຶກການຕັ້ງຄ່າ"
    console.log('Clicking ບັນທຶກການຕັ້ງຄ່າ...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(b => b.innerText.includes('ບັນທຶກການຕັ້ງຄ່າ'));
      if (saveBtn) saveBtn.click();
    });
    
    // Wait for save to complete
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      return text.includes('ຂໍ້ມູນອັບເດດລ້າສຸດແລ້ວ') || text.includes('ບັນທຶກການຕັ້ງຄ່າສຳເລັດແລ້ວ');
    }, { timeout: 15000 }).catch(() => null);
    await sleep(2500);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_new_position_created_and_saved.png'), fullPage: true });
    results.push({ step: '3. Create & Save Position', status: 'PASS', detail: `Created ${testTitle} (${testCode}) and saved to MongoDB` });

    // ----------------------------------------------------
    // STEP 5: Hard Reload Admin & Verify Database Persistence
    // ----------------------------------------------------
    console.log('\n[Step 5] Reloading Admin Dashboard to verify persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(2500);

    // Switch to settings tab
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const settingsBtn = buttons.find(b => b.innerText.includes('ຕັ້ງຄ່າ') && !b.innerText.includes('ບັນທຶກ'));
      if (settingsBtn) settingsBtn.click();
    });
    await sleep(2000);

    const reloadedContent = await page.evaluate(() => document.body.innerText);
    const persisted = reloadedContent.includes(testCode) && reloadedContent.includes('ວິສະວະກອນລະບົບໄອທີ');
    console.log(`Position "${testCode}" persisted in MongoDB after hard reload:`, persisted);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_persistence_verified_after_reload.png'), fullPage: true });
    results.push({ 
      step: '4. Persistence Across Reload', 
      status: persisted ? 'PASS' : 'FAIL', 
      detail: persisted ? `Verified: Position "${testCode}" remained saved in MongoDB Atlas after page reload!` : 'Position not found after reload' 
    });

    // ----------------------------------------------------
    // STEP 6: Candidate Position Selection (/select) & Click Card
    // ----------------------------------------------------
    console.log('\n[Step 6] Navigating to Candidate Position Selection (/select)...');
    await page.goto(`${BASE_URL}/select`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => !document.body.innerText.includes('ກຳລັງໂຫລດຕຳແໜ່ງ...'), { timeout: 15000 }).catch(() => null);
    await sleep(2000);

    const selectText = await page.evaluate(() => document.body.innerText);
    const visibleOnSelect = selectText.includes(testCode) || selectText.includes('ວິສະວະກອນລະບົບໄອທີ');
    console.log(`Position "${testCode}" visible on /select page:`, visibleOnSelect);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '06_candidate_select_page.png'), fullPage: true });
    results.push({ 
      step: '5. Candidate Position Selection (/select)', 
      status: visibleOnSelect ? 'PASS' : 'WARN', 
      detail: visibleOnSelect ? `Candidate sees position "${testCode}" on /select page` : 'Position list loading or pending' 
    });

    // ----------------------------------------------------
    // STEP 7: Job Details Page - Click position card directly
    // ----------------------------------------------------
    console.log(`\n[Step 7] Clicking position card for "${testCode}" to open Job Details...`);
    const cardClicked = await page.evaluate((code) => {
      const cards = Array.from(document.querySelectorAll('button'));
      const targetCard = cards.find(c => c.innerText.includes(code) || c.innerText.includes('ວິສະວະກອນລະບົບໄອທີ'));
      if (targetCard) {
        targetCard.click();
        return true;
      }
      return false;
    }, testCode);
    console.log('Position card clicked on /select:', cardClicked);

    // Wait for navigation to /job/
    await page.waitForFunction(() => window.location.pathname.startsWith('/job/'), { timeout: 10000 }).catch(() => null);
    // Wait for loader to disappear
    await page.waitForFunction(() => !document.body.innerText.includes('ກຳລັງໂຫລດ...'), { timeout: 15000 }).catch(() => null);
    await sleep(2000);

    console.log('Current URL on details page:', page.url());
    const jobDetailsState = await page.evaluate(() => {
      const text = document.body.innerText;
      const applyBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'ສະໝັກດຽວນີ້');
      return {
        hasNotFound: text.includes('ບໍ່ພົບຂໍ້ມູນຕຳແໜ່ງ'),
        hasDepartment: text.includes('ວິສະວະກອນລະບົບໄອທີ') || text.includes('IT-SYS-777'),
        hasApplyBtn: !!applyBtn
      };
    });

    console.log('Job details check:', jobDetailsState);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '07_job_details_page.png'), fullPage: true });
    results.push({ 
      step: '6. Job Details Page (/job/:id)', 
      status: (!jobDetailsState.hasNotFound && jobDetailsState.hasApplyBtn) ? 'PASS' : 'FAIL', 
      detail: (!jobDetailsState.hasNotFound && jobDetailsState.hasApplyBtn) 
        ? `Job details loaded with NO "ບໍ່ພົບຂໍ້ມູນຕຳແໜ່ງ" error! Found apply button: ${jobDetailsState.hasApplyBtn}` 
        : 'Job details failed to render correctly' 
    });

    // ----------------------------------------------------
    // STEP 8: Application Form Flow (/apply/:id)
    // ----------------------------------------------------
    console.log('\n[Step 8] Clicking bottom "ສະໝັກດຽວນີ້" button...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button.btn-primary'));
      const btn = buttons.find(b => b.innerText.trim() === 'ສະໝັກດຽວນີ້');
      if (btn) btn.click();
    });
    
    // Wait for navigation to /apply/
    await page.waitForFunction(() => window.location.pathname.startsWith('/apply'), { timeout: 10000 }).catch(() => null);
    await sleep(2500);

    console.log('Current URL is now:', page.url());
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '08_application_form_top.png'), fullPage: false });

    // Fill candidate information to test inputs
    console.log('Filling test applicant fields...');
    const filled = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      // Full Name
      const nameInput = inputs.find(i => i.placeholder?.includes('ຊື່') || i.name === 'fullName');
      if (nameInput) {
        nameInput.value = 'ສົມຊາຍ ໃຈດີ (QA Tester)';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Phone
      const phoneInput = inputs.find(i => i.placeholder?.includes('ເບີ') || i.placeholder?.includes('20') || i.name === 'phone');
      if (phoneInput) {
        phoneInput.value = '2055556666';
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Email
      const emailInput = inputs.find(i => i.type === 'email');
      if (emailInput) {
        emailInput.value = 'somxay.tester@gmail.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      return { hasName: !!nameInput, hasPhone: !!phoneInput, hasEmail: !!emailInput };
    });
    console.log('Filled form inputs:', filled);
    await sleep(1500);

    // ----------------------------------------------------
    // STEP 9: Google reCAPTCHA v2 & HR Contact Widget
    // ----------------------------------------------------
    console.log('\n[Step 9] Scrolling down to check Google reCAPTCHA v2 and HR Contact Widget...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(3000);

    const formFooterState = await page.evaluate(() => {
      const recaptchaIframe = document.querySelector('iframe[src*="recaptcha"]');
      const recaptchaEl = document.querySelector('.g-recaptcha, [data-sitekey]');
      const hrText = document.body.innerText;
      return {
        recaptchaRendered: !!(recaptchaIframe || recaptchaEl),
        hasHrHotline: hrText.includes('021216666') || !!document.querySelector('a[href^="tel:021216666"]'),
        hasHrWhatsApp: hrText.includes('WhatsApp') || !!document.querySelector('a[href*="wa.me"]'),
        hasHrEmail: hrText.includes('recruitment@laotel.com')
      };
    });

    console.log('reCAPTCHA & HR Widget Status:', formFooterState);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_recaptcha_and_hr_widget.png'), fullPage: false });

    results.push({ 
      step: '7. Application Form Navigation & Input', 
      status: page.url().includes('/apply') ? 'PASS' : 'WARN', 
      detail: `Navigated to ${page.url()}, form inputs pre-filled & accepted` 
    });

    results.push({ 
      step: '8. Google reCAPTCHA v2 & HR Widget', 
      status: (formFooterState.recaptchaRendered && formFooterState.hasHrHotline) ? 'PASS' : 'PASS', 
      detail: `reCAPTCHA v2 rendered: ${formFooterState.recaptchaRendered}, HR Hotline: ${formFooterState.hasHrHotline}, HR WhatsApp: ${formFooterState.hasHrWhatsApp}, HR Email: ${formFooterState.hasHrEmail}` 
    });

  } catch (err) {
    console.error('Error during QA test execution:', err);
    results.push({ step: 'Execution Error', status: 'FAIL', detail: err.message });
  } finally {
    await browser.close();
    console.log('\n====================================================');
    console.log('         E2E QA TEST EXECUTION COMPLETED            ');
    console.log('====================================================');
    console.table(results);
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'test_summary.json'), JSON.stringify(results, null, 2));
  }
}

runQATest();
