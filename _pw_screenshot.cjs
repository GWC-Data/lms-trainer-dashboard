const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push('pageerror: ' + err.message));

  await page.goto('http://localhost:5173/assessment', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Trainer Details', { timeout: 15000 });
  await page.screenshot({ path: 'C:/Users/Mini/AppData/Local/Temp/claude/pw_shots/1_trainer_form.png', fullPage: true });

  // Fill and submit form 
  await page.fill('#fullName', 'Jane Doe');
  await page.fill('#email', 'jane.doe@example.com');
  await page.fill('#phone', '9876543210');
  await page.selectOption('#role', 'Full-Time Trainer');
  await page.selectOption('#experience', '3-5 years');
  await page.fill('#domain', 'MERN Stack Development');
  await page.click('button:has-text("Continue to Instructions")');

  await page.waitForSelector('text=Start Assessment Now', { timeout: 15000 });
  await page.screenshot({ path: 'C:/Users/Mini/AppData/Local/Temp/claude/pw_shots/2_instructions.png', fullPage: true });

  await page.click('button:has-text("Start Assessment Now")');
  await page.waitForSelector('text=Question Palette', { timeout: 15000 });
  await page.screenshot({ path: 'C:/Users/Mini/AppData/Local/Temp/claude/pw_shots/3_question.png', fullPage: true });

  console.log('CONSOLE_ERRORS:', JSON.stringify(consoleErrors));
  await browser.close();
})();
