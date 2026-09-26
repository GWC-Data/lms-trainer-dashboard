# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: network-audit.spec.ts >> Trainer Dashboard API & Network Architecture Audit >> Flow G: Navigation - Switching pages does NOT refetch Dashboard
- Location: tests\playwright\network-audit.spec.ts:200:3

# Error details

```
Error: Navigating from dashboard to trainees should NOT refetch dashboard

expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 1
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - region "Notifications alt+T"
  - generic [ref=f1e3]:
    - complementary [ref=f1e4]:
      - img "TeqCertify" [ref=f1e7]
      - navigation [ref=f1e8]:
        - list [ref=f1e10]:
          - listitem [ref=f1e11]:
            - link "Dashboard" [ref=f1e12] [cursor=pointer]:
              - /url: /
          - listitem [ref=f1e19]:
            - link "Courses" [ref=f1e20] [cursor=pointer]:
              - /url: /courses
        - generic [ref=f1e24]:
          - paragraph [ref=f1e25]: Content Management
          - list [ref=f1e26]:
            - listitem [ref=f1e27]:
              - link "Modules" [ref=f1e28] [cursor=pointer]:
                - /url: /content/modules
            - listitem [ref=f1e40]:
              - link "Materials" [ref=f1e41] [cursor=pointer]:
                - /url: /content/documents
        - generic [ref=f1e46]:
          - paragraph [ref=f1e47]: Assessment
          - list [ref=f1e48]:
            - listitem [ref=f1e49]:
              - link "Quizzes" [ref=f1e50] [cursor=pointer]:
                - /url: /quizzes
            - listitem [ref=f1e55]:
              - link "Assignments" [ref=f1e56] [cursor=pointer]:
                - /url: /assignments
        - generic [ref=f1e61]:
          - paragraph [ref=f1e62]: Operations
          - list [ref=f1e63]:
            - listitem [ref=f1e64]:
              - link "Batches" [ref=f1e65] [cursor=pointer]:
                - /url: /batches
            - listitem [ref=f1e71]:
              - link "Calendar" [ref=f1e72] [cursor=pointer]:
                - /url: /calendar
            - listitem [ref=f1e76]:
              - link "Attendance" [ref=f1e77] [cursor=pointer]:
                - /url: /attendance
            - listitem [ref=f1e83]:
              - link "Trainees" [ref=f1e84] [cursor=pointer]:
                - /url: /trainees
            - listitem [ref=f1e91]:
              - link "Reports" [ref=f1e92] [cursor=pointer]:
                - /url: /reports
        - generic [ref=f1e96]:
          - paragraph [ref=f1e97]: Account
          - list [ref=f1e98]:
            - listitem [ref=f1e99]:
              - link "Settings" [ref=f1e100] [cursor=pointer]:
                - /url: /settings
      - generic [ref=f1e106]:
        - img "KS" [ref=f1e108]
        - generic [ref=f1e110]:
          - paragraph [ref=f1e111]: kumar Santhosh
          - paragraph [ref=f1e112]: TRAINER
        - button "Log out" [ref=f1e113] [cursor=pointer]
    - generic [ref=f1e117]:
      - banner [ref=f1e118]:
        - generic [ref=f1e119]:
          - button "Toggle Navigation" [ref=f1e120] [cursor=pointer]
          - generic [ref=f1e122]:
            - link "Dashboard" [ref=f1e123] [cursor=pointer]:
              - /url: /
            - generic [ref=f1e127]: Trainees
        - button "Notifications" [ref=f1e132] [cursor=pointer]:
          - generic [ref=f1e136]: "1"
      - main [ref=f1e137]:
        - generic [ref=f1e139]:
          - generic [ref=f1e140]:
            - generic [ref=f1e141]:
              - heading "Trainees" [level=1] [ref=f1e142]
              - paragraph [ref=f1e143]: Module completion, quiz scores, and attendance at a glance — every batch tracked on its own, expand a trainee to see every module handled in their batch.
            - generic [ref=f1e144]: 16 total
          - generic [ref=f1e150]:
            - textbox "Search by name or email..." [ref=f1e152]
            - combobox [ref=f1e154] [cursor=pointer]:
              - generic: All Batches
            - combobox [ref=f1e158] [cursor=pointer]:
              - generic: All Courses
            - combobox [ref=f1e162] [cursor=pointer]:
              - generic: All modes
            - button "At-risk only" [ref=f1e165] [cursor=pointer]
          - table [ref=f1e170]:
            - rowgroup [ref=f1e171]:
              - row [ref=f1e172]:
                - columnheader "Trainee" [ref=f1e173]
                - columnheader "Batch / Course" [ref=f1e174]
                - columnheader "Module Completion" [ref=f1e175]
                - columnheader "Quiz Score" [ref=f1e176]
                - columnheader "Attendance" [ref=f1e177]
                - columnheader "Status" [ref=f1e178]
            - rowgroup [ref=f1e179]:
              - row [ref=f1e180] [cursor=pointer]:
                - cell "AB Ajay B ajay@gmail.com" [ref=f1e181]:
                  - generic [ref=f1e182]:
                    - generic [ref=f1e185]: AB
                    - generic [ref=f1e186]:
                      - paragraph [ref=f1e187]: Ajay B
                      - paragraph [ref=f1e188]: ajay@gmail.com
                - cell "Claude Certified Associate -Foundation Level · Sep end batch online" [ref=f1e189]:
                  - text: Claude Certified Associate -Foundation Level
                  - generic [ref=f1e190]:
                    - text: · Sep end batch
                    - generic [ref=f1e191]: online
                - cell "0% 0/7 modules completed" [ref=f1e192]:
                  - generic [ref=f1e193]:
                    - generic [ref=f1e194]: 0%
                    - generic [ref=f1e197]: 0/7 modules completed
                - cell "0%" [ref=f1e198]
                - cell "100%" [ref=f1e200]
                - cell "on track" [ref=f1e202]
              - row [ref=f1e204] [cursor=pointer]:
                - cell "AB Ajay B ajay@gmail.com" [ref=f1e205]:
                  - generic [ref=f1e206]:
                    - generic [ref=f1e209]: AB
                    - generic [ref=f1e210]:
                      - paragraph [ref=f1e211]: Ajay B
                      - paragraph [ref=f1e212]: ajay@gmail.com
                - cell "Claude Certified Developer-Foundation Level · Claude Foundation online" [ref=f1e213]:
                  - text: Claude Certified Developer-Foundation Level
                  - generic [ref=f1e214]:
                    - text: · Claude Foundation
                    - generic [ref=f1e215]: online
                - cell "0% 0/2 modules completed" [ref=f1e216]:
                  - generic [ref=f1e217]:
                    - generic [ref=f1e218]: 0%
                    - generic [ref=f1e221]: 0/2 modules completed
                - cell "0%" [ref=f1e222]
                - cell "100%" [ref=f1e224]
                - cell "on track" [ref=f1e226]
              - row [ref=f1e228] [cursor=pointer]:
                - cell "BK BALAJI Krishnan kbalajikbalaji870@gmail.com" [ref=f1e229]:
                  - generic [ref=f1e230]:
                    - generic [ref=f1e233]: BK
                    - generic [ref=f1e234]:
                      - paragraph [ref=f1e235]: BALAJI Krishnan
                      - paragraph [ref=f1e236]: kbalajikbalaji870@gmail.com
                - cell "Claude Certified Associate -Foundation Level · Sep end batch online" [ref=f1e237]:
                  - text: Claude Certified Associate -Foundation Level
                  - generic [ref=f1e238]:
                    - text: · Sep end batch
                    - generic [ref=f1e239]: online
                - cell "0% 0/7 modules completed" [ref=f1e240]:
                  - generic [ref=f1e241]:
                    - generic [ref=f1e242]: 0%
                    - generic [ref=f1e245]: 0/7 modules completed
                - cell "0%" [ref=f1e246]
                - cell "100%" [ref=f1e248]
                - cell "on track" [ref=f1e250]
              - row [ref=f1e252] [cursor=pointer]:
                - cell "KP Kaviyapriya Perumal kaviyapriyap08@gmail.com" [ref=f1e253]:
                  - generic [ref=f1e254]:
                    - generic [ref=f1e257]: KP
                    - generic [ref=f1e258]:
                      - paragraph [ref=f1e259]: Kaviyapriya Perumal
                      - paragraph [ref=f1e260]: kaviyapriyap08@gmail.com
                - cell "Claude Certified Developer-Foundation Level · Claude Foundation online" [ref=f1e261]:
                  - text: Claude Certified Developer-Foundation Level
                  - generic [ref=f1e262]:
                    - text: · Claude Foundation
                    - generic [ref=f1e263]: online
                - cell "0% 0/2 modules completed" [ref=f1e264]:
                  - generic [ref=f1e265]:
                    - generic [ref=f1e266]: 0%
                    - generic [ref=f1e269]: 0/2 modules completed
                - cell "0%" [ref=f1e270]
                - cell "100%" [ref=f1e272]
                - cell "on track" [ref=f1e274]
              - row [ref=f1e276] [cursor=pointer]:
                - cell "MK Minitha k minithasrik@gmail.com" [ref=f1e277]:
                  - generic [ref=f1e278]:
                    - generic [ref=f1e281]: MK
                    - generic [ref=f1e282]:
                      - paragraph [ref=f1e283]: Minitha k
                      - paragraph [ref=f1e284]: minithasrik@gmail.com
                - cell "Claude Certified Developer-Foundation Level · Sept Mid Batch online" [ref=f1e285]:
                  - text: Claude Certified Developer-Foundation Level
                  - generic [ref=f1e286]:
                    - text: · Sept Mid Batch
                    - generic [ref=f1e287]: online
                - cell "0% 0/2 modules completed" [ref=f1e288]:
                  - generic [ref=f1e289]:
                    - generic [ref=f1e290]: 0%
                    - generic [ref=f1e293]: 0/2 modules completed
                - cell "0%" [ref=f1e294]
                - cell "100%" [ref=f1e296]
                - cell "on track" [ref=f1e298]
              - row [ref=f1e300] [cursor=pointer]:
                - cell "MK Minithasri Krishnan minithasrik5622@gmail.com" [ref=f1e301]:
                  - generic [ref=f1e302]:
                    - generic [ref=f1e305]: MK
                    - generic [ref=f1e306]:
                      - paragraph [ref=f1e307]: Minithasri Krishnan
                      - paragraph [ref=f1e308]: minithasrik5622@gmail.com
                - cell "Claude Certified Developer-Foundation Level · Sept Mid Batch online" [ref=f1e309]:
                  - text: Claude Certified Developer-Foundation Level
                  - generic [ref=f1e310]:
                    - text: · Sept Mid Batch
                    - generic [ref=f1e311]: online
                - cell "0% 0/2 modules completed" [ref=f1e312]:
                  - generic [ref=f1e313]:
                    - generic [ref=f1e314]: 0%
                    - generic [ref=f1e317]: 0/2 modules completed
                - cell "0%" [ref=f1e318]
                - cell "100%" [ref=f1e320]
                - cell "on track" [ref=f1e322]
              - row [ref=f1e324] [cursor=pointer]:
                - cell "MK Minithasri Krishnan minithasrik5622@gmail.com" [ref=f1e325]:
                  - generic [ref=f1e326]:
                    - generic [ref=f1e329]: MK
                    - generic [ref=f1e330]:
                      - paragraph [ref=f1e331]: Minithasri Krishnan
                      - paragraph [ref=f1e332]: minithasrik5622@gmail.com
                - cell "Claude Certified Associate -Foundation Level · Sep end batch online" [ref=f1e333]:
                  - text: Claude Certified Associate -Foundation Level
                  - generic [ref=f1e334]:
                    - text: · Sep end batch
                    - generic [ref=f1e335]: online
                - cell "0% 0/7 modules completed" [ref=f1e336]:
                  - generic [ref=f1e337]:
                    - generic [ref=f1e338]: 0%
                    - generic [ref=f1e341]: 0/7 modules completed
                - cell "20%" [ref=f1e342]
                - cell "100%" [ref=f1e344]
                - cell "at risk" [ref=f1e346]
              - row [ref=f1e350] [cursor=pointer]:
                - cell "SR Shama ravi shama@gmail.com" [ref=f1e351]:
                  - generic [ref=f1e352]:
                    - generic [ref=f1e355]: SR
                    - generic [ref=f1e356]:
                      - paragraph [ref=f1e357]: Shama ravi
                      - paragraph [ref=f1e358]: shama@gmail.com
                - cell "Claude Certified Associate -Foundation Level · Sep First Batch online" [ref=f1e359]:
                  - text: Claude Certified Associate -Foundation Level
                  - generic [ref=f1e360]:
                    - text: · Sep First Batch
                    - generic [ref=f1e361]: online
                - cell "0% 0/7 modules completed" [ref=f1e362]:
                  - generic [ref=f1e363]:
                    - generic [ref=f1e364]: 0%
                    - generic [ref=f1e367]: 0/7 modules completed
                - cell "0%" [ref=f1e368]
                - cell "100%" [ref=f1e370]
                - cell "on track" [ref=f1e372]
              - row [ref=f1e374] [cursor=pointer]:
                - cell "TT Test Test test@yopmail.com" [ref=f1e375]:
                  - generic [ref=f1e376]:
                    - generic [ref=f1e379]: TT
                    - generic [ref=f1e380]:
                      - paragraph [ref=f1e381]: Test Test
                      - paragraph [ref=f1e382]: test@yopmail.com
                - cell "Claude Certified Developer-Foundation Level · Claude Foundation online" [ref=f1e383]:
                  - text: Claude Certified Developer-Foundation Level
                  - generic [ref=f1e384]:
                    - text: · Claude Foundation
                    - generic [ref=f1e385]: online
                - cell "0% 0/2 modules completed" [ref=f1e386]:
                  - generic [ref=f1e387]:
                    - generic [ref=f1e388]: 0%
                    - generic [ref=f1e391]: 0/2 modules completed
                - cell "0%" [ref=f1e392]
                - cell "100%" [ref=f1e394]
                - cell "on track" [ref=f1e396]
              - row [ref=f1e398] [cursor=pointer]:
                - cell "VA Viswanath Aruchunan vishwanathvishwabai@gmail.com" [ref=f1e399]:
                  - generic [ref=f1e400]:
                    - generic [ref=f1e403]: VA
                    - generic [ref=f1e404]:
                      - paragraph [ref=f1e405]: Viswanath Aruchunan
                      - paragraph [ref=f1e406]: vishwanathvishwabai@gmail.com
                - cell "Claude Certified Associate -Foundation Level · Sep First Batch online" [ref=f1e407]:
                  - text: Claude Certified Associate -Foundation Level
                  - generic [ref=f1e408]:
                    - text: · Sep First Batch
                    - generic [ref=f1e409]: online
                - cell "0% 0/7 modules completed" [ref=f1e410]:
                  - generic [ref=f1e411]:
                    - generic [ref=f1e412]: 0%
                    - generic [ref=f1e415]: 0/7 modules completed
                - cell "0%" [ref=f1e416]
                - cell "100%" [ref=f1e418]
                - cell "on track" [ref=f1e420]
              - row [ref=f1e422] [cursor=pointer]:
                - cell "BB balaji balaji sweetheart642006@gmail.com" [ref=f1e423]:
                  - generic [ref=f1e424]:
                    - generic [ref=f1e427]: BB
                    - generic [ref=f1e428]:
                      - paragraph [ref=f1e429]: balaji balaji
                      - paragraph [ref=f1e430]: sweetheart642006@gmail.com
                - cell "Claude Certified Associate -Foundation Level · Sep end batch online" [ref=f1e431]:
                  - text: Claude Certified Associate -Foundation Level
                  - generic [ref=f1e432]:
                    - text: · Sep end batch
                    - generic [ref=f1e433]: online
                - cell "0% 0/7 modules completed" [ref=f1e434]:
                  - generic [ref=f1e435]:
                    - generic [ref=f1e436]: 0%
                    - generic [ref=f1e439]: 0/7 modules completed
                - cell "0%" [ref=f1e440]
                - cell "100%" [ref=f1e442]
                - cell "on track" [ref=f1e444]
              - row [ref=f1e446] [cursor=pointer]:
                - cell "CN chandu naraginti naragintichandupriya@gmail.com" [ref=f1e447]:
                  - generic [ref=f1e448]:
                    - generic [ref=f1e451]: CN
                    - generic [ref=f1e452]:
                      - paragraph [ref=f1e453]: chandu naraginti
                      - paragraph [ref=f1e454]: naragintichandupriya@gmail.com
                - cell "Claude Certified Associate -Foundation Level · Sep First Batch online" [ref=f1e455]:
                  - text: Claude Certified Associate -Foundation Level
                  - generic [ref=f1e456]:
                    - text: · Sep First Batch
                    - generic [ref=f1e457]: online
                - cell "0% 0/7 modules completed" [ref=f1e458]:
                  - generic [ref=f1e459]:
                    - generic [ref=f1e460]: 0%
                    - generic [ref=f1e463]: 0/7 modules completed
                - cell "0%" [ref=f1e464]
                - cell "100%" [ref=f1e466]
                - cell "on track" [ref=f1e468]
              - row [ref=f1e470] [cursor=pointer]:
                - cell "CP chandu priya yaswanthnaraginti@gmail.com" [ref=f1e471]:
                  - generic [ref=f1e472]:
                    - generic [ref=f1e475]: CP
                    - generic [ref=f1e476]:
                      - paragraph [ref=f1e477]: chandu priya
                      - paragraph [ref=f1e478]: yaswanthnaraginti@gmail.com
                - cell "Claude Certified Associate -Foundation Level · Sep end batch online" [ref=f1e479]:
                  - text: Claude Certified Associate -Foundation Level
                  - generic [ref=f1e480]:
                    - text: · Sep end batch
                    - generic [ref=f1e481]: online
                - cell "0% 0/7 modules completed" [ref=f1e482]:
                  - generic [ref=f1e483]:
                    - generic [ref=f1e484]: 0%
                    - generic [ref=f1e487]: 0/7 modules completed
                - cell "0%" [ref=f1e488]
                - cell "100%" [ref=f1e490]
                - cell "on track" [ref=f1e492]
              - row [ref=f1e494] [cursor=pointer]:
                - cell "CN chikki N chandunaraginti@gmail.com" [ref=f1e495]:
                  - generic [ref=f1e496]:
                    - generic [ref=f1e499]: CN
                    - generic [ref=f1e500]:
                      - paragraph [ref=f1e501]: chikki N
                      - paragraph [ref=f1e502]: chandunaraginti@gmail.com
                - cell "Claude Certified Developer-Foundation Level · Claude Foundation online" [ref=f1e503]:
                  - text: Claude Certified Developer-Foundation Level
                  - generic [ref=f1e504]:
                    - text: · Claude Foundation
                    - generic [ref=f1e505]: online
                - cell "0% 0/2 modules completed" [ref=f1e506]:
                  - generic [ref=f1e507]:
                    - generic [ref=f1e508]: 0%
                    - generic [ref=f1e511]: 0/2 modules completed
                - cell "0%" [ref=f1e512]
                - cell "100%" [ref=f1e514]
                - cell "on track" [ref=f1e516]
              - row [ref=f1e518] [cursor=pointer]:
                - cell "CN chikki N chandunaraginti@gmail.com" [ref=f1e519]:
                  - generic [ref=f1e520]:
                    - generic [ref=f1e523]: CN
                    - generic [ref=f1e524]:
                      - paragraph [ref=f1e525]: chikki N
                      - paragraph [ref=f1e526]: chandunaraginti@gmail.com
                - cell "Claude Certified Developer-Foundation Level · Sept Mid Batch online" [ref=f1e527]:
                  - text: Claude Certified Developer-Foundation Level
                  - generic [ref=f1e528]:
                    - text: · Sept Mid Batch
                    - generic [ref=f1e529]: online
                - cell "0% 0/2 modules completed" [ref=f1e530]:
                  - generic [ref=f1e531]:
                    - generic [ref=f1e532]: 0%
                    - generic [ref=f1e535]: 0/2 modules completed
                - cell "0%" [ref=f1e536]
                - cell "100%" [ref=f1e538]
                - cell "on track" [ref=f1e540]
              - row [ref=f1e542] [cursor=pointer]:
                - cell "HP hariharan p hariharan@gmail.com" [ref=f1e543]:
                  - generic [ref=f1e544]:
                    - generic [ref=f1e547]: HP
                    - generic [ref=f1e548]:
                      - paragraph [ref=f1e549]: hariharan p
                      - paragraph [ref=f1e550]: hariharan@gmail.com
                - cell "Claude Certified Associate -Foundation Level · Sep First Batch online" [ref=f1e551]:
                  - text: Claude Certified Associate -Foundation Level
                  - generic [ref=f1e552]:
                    - text: · Sep First Batch
                    - generic [ref=f1e553]: online
                - cell "0% 0/7 modules completed" [ref=f1e554]:
                  - generic [ref=f1e555]:
                    - generic [ref=f1e556]: 0%
                    - generic [ref=f1e559]: 0/7 modules completed
                - cell "0%" [ref=f1e560]
                - cell "100%" [ref=f1e562]
                - cell "on track" [ref=f1e564]
```

# Test source

```ts
  115 | 
  116 |     // Type rapidly letter-by-letter
  117 |     await searchInput.type('Minithasri', { delay: 40 });
  118 |     // Wait for 350ms debounce + network response
  119 |     await page.waitForTimeout(1200);
  120 | 
  121 |     const requests = tracker.getRequests();
  122 |     const traineeSearchRequests = requests.filter(r => r.pathname === '/api/trainer/trainees' && r.search.includes('Minithasri'));
  123 | 
  124 |     console.log('Search requests:', requests.map(r => `${r.method} ${r.pathname}${r.search}`));
  125 |     expect(traineeSearchRequests.length, 'Search should debounce to exactly 1 request').toBe(1);
  126 |   });
  127 | 
  128 |   test('Flow C: Trainees Pagination - Page 2 requests only page=2', async ({ page }) => {
  129 |     await injectTrainerAuth(page);
  130 |     await page.goto('/trainees', { waitUntil: 'networkidle' });
  131 |     await page.waitForTimeout(1000);
  132 | 
  133 |     const tracker = setupNetworkTracker(page);
  134 | 
  135 |     // Look for Next button in pagination
  136 |     const nextBtn = page.locator('button:has-text("Next")');
  137 |     if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
  138 |       await nextBtn.click();
  139 |       await page.waitForTimeout(1000);
  140 | 
  141 |       const requests = tracker.getRequests();
  142 |       const page2Requests = requests.filter(r => r.pathname === '/api/trainer/trainees' && r.search.includes('page=2'));
  143 |       console.log('Pagination requests:', requests.map(r => `${r.method} ${r.pathname}${r.search}`));
  144 |       expect(page2Requests.length, 'Page 2 should be requested exactly once').toBe(1);
  145 |       // Ensure no courses/batches/dashboard refetch
  146 |       expect(requests.filter(r => r.pathname.includes('/filters/')).length, 'Filters should not refetch on pagination').toBe(0);
  147 |       expect(requests.filter(r => r.pathname.includes('/dashboard')).length, 'Dashboard should not refetch on pagination').toBe(0);
  148 |     } else {
  149 |       console.log('Next button not enabled (dataset fits in 1 page)');
  150 |     }
  151 |   });
  152 | 
  153 |   test('Flow D: Batches Page - Course Filter Dropdown and Batches list', async ({ page }) => {
  154 |     await injectTrainerAuth(page);
  155 |     const tracker = setupNetworkTracker(page);
  156 | 
  157 |     await page.goto('/batches', { waitUntil: 'networkidle' });
  158 |     await page.waitForTimeout(1000);
  159 | 
  160 |     const requests = tracker.getRequests();
  161 |     console.log('Batches page requests:', requests.map(r => `${r.method} ${r.pathname}${r.search}`));
  162 | 
  163 |     const courseFilterCalls = requests.filter(r => r.pathname === '/api/trainer/filters/courses');
  164 |     const batchesCalls = requests.filter(r => r.pathname === '/api/trainer/batches');
  165 | 
  166 |     expect(courseFilterCalls.length, 'Course filter dropdown should be fetched once').toBe(1);
  167 |     expect(batchesCalls.length, 'Batches list should be fetched once').toBe(1);
  168 |     expect(tracker.getDuplicates().length, 'Batches page must have 0 duplicate requests').toBe(0);
  169 |   });
  170 | 
  171 |   test('Flow E: Courses Page - Scoped course list request only', async ({ page }) => {
  172 |     await injectTrainerAuth(page);
  173 |     const tracker = setupNetworkTracker(page);
  174 | 
  175 |     await page.goto('/courses', { waitUntil: 'networkidle' });
  176 |     await page.waitForTimeout(1000);
  177 | 
  178 |     const requests = tracker.getRequests();
  179 |     console.log('Courses page requests:', requests.map(r => `${r.method} ${r.pathname}${r.search}`));
  180 | 
  181 |     const coursesCalls = requests.filter(r => r.pathname === '/api/trainer/courses');
  182 |     expect(coursesCalls.length, 'Courses endpoint should be requested').toBeGreaterThanOrEqual(1);
  183 |     expect(tracker.getDuplicates().length, 'No duplicate course requests').toBe(0);
  184 |     expect(requests.filter(r => r.pathname === '/api/trainer/trainees').length, 'Should NOT request trainees on courses page').toBe(0);
  185 |   });
  186 | 
  187 |   test('Flow F: Attendance Page - Batch selection loads targeted attendance records', async ({ page }) => {
  188 |     await injectTrainerAuth(page);
  189 |     const tracker = setupNetworkTracker(page);
  190 | 
  191 |     await page.goto('/attendance', { waitUntil: 'networkidle' });
  192 |     await page.waitForTimeout(1000);
  193 | 
  194 |     const requests = tracker.getRequests();
  195 |     console.log('Attendance page requests:', requests.map(r => `${r.method} ${r.pathname}${r.search}`));
  196 | 
  197 |     expect(tracker.getDuplicates().length, 'Attendance page initial load must have 0 duplicates').toBe(0);
  198 |   });
  199 | 
  200 |   test('Flow G: Navigation - Switching pages does NOT refetch Dashboard', async ({ page }) => {
  201 |     await injectTrainerAuth(page);
  202 |     await page.goto('/', { waitUntil: 'networkidle' });
  203 |     await page.waitForTimeout(1000);
  204 | 
  205 |     const tracker = setupNetworkTracker(page);
  206 | 
  207 |     // Navigate to /trainees
  208 |     await page.goto('/trainees', { waitUntil: 'networkidle' });
  209 |     await page.waitForTimeout(800);
  210 | 
  211 |     const navRequests = tracker.getRequests();
  212 |     const dashboardCalls = navRequests.filter(r => r.pathname === '/api/trainer/dashboard');
  213 | 
  214 |     console.log('Navigation to /trainees requests:', navRequests.map(r => `${r.method} ${r.pathname}${r.search}`));
> 215 |     expect(dashboardCalls.length, 'Navigating from dashboard to trainees should NOT refetch dashboard').toBe(0);
      |                                                                                                         ^ Error: Navigating from dashboard to trainees should NOT refetch dashboard
  216 |   });
  217 | 
  218 |   test('Flow H: Security Response Verification - Auth payloads contain no forbidden metadata', async ({ request }) => {
  219 |     // Verify login rejection or auth endpoint structure directly
  220 |     const res = await request.post('http://localhost:8080/auth/login', {
  221 |       data: {
  222 |         email: 'invalid-test-probe@teqcertify.com',
  223 |         password: 'WrongPassword123!',
  224 |         deviceId: 'device-test-audit-probe'
  225 |       }
  226 |     });
  227 | 
  228 |     const body = await res.json();
  229 |     console.log('Auth probe response:', body);
  230 | 
  231 |     // Forbidden fields check
  232 |     const forbiddenFields = [
  233 |       'role',
  234 |       'roleId',
  235 |       'permissions',
  236 |       'assignedBatchId',
  237 |       'batchName',
  238 |       'jobBoardAccess',
  239 |       'sessionId',
  240 |       'password',
  241 |       'otp',
  242 |       'otpSecret'
  243 |     ];
  244 | 
  245 |     for (const field of forbiddenFields) {
  246 |       expect(body[field], `Auth response must NOT expose ${field}`).toBeUndefined();
  247 |       if (body.user) {
  248 |         expect(body.user[field], `User object must NOT expose ${field}`).toBeUndefined();
  249 |       }
  250 |     }
  251 |   });
  252 | 
  253 |   test('Flow I: Dashboard -> Trainee Detail Flow (Isolation & Minimal Calls)', async ({ page }) => {
  254 |     await injectTrainerAuth(page);
  255 |     
  256 |     // First clear and set up tracker
  257 |     const tracker = setupNetworkTracker(page);
  258 | 
  259 |     // Navigate to a single trainee's detail directly as when clicked from Dashboard
  260 |     const traineeId = '503d70a0-8afe-46fd-a85e-cf281816250c';
  261 |     const batchId = 'BCH-1';
  262 |     await page.goto(`/trainees/${traineeId}?batchId=${batchId}`, { waitUntil: 'networkidle' });
  263 |     await page.waitForTimeout(1000);
  264 | 
  265 |     const requests = tracker.getRequests();
  266 |     const duplicates = tracker.getDuplicates();
  267 | 
  268 |     console.log('Trainee detail requests:', requests.map(r => `${r.method} ${r.pathname}${r.search} [${r.status}]`));
  269 |     console.log('Trainee detail duplicates:', duplicates);
  270 | 
  271 |     // Exactly 1 request for the single trainee detail
  272 |     const detailCalls = requests.filter(r => r.pathname === `/api/trainer/trainees/${traineeId}`);
  273 |     expect(detailCalls.length, 'Trainee detail endpoint must be requested exactly once').toBe(1);
  274 |     expect(detailCalls[0].status, 'Trainee detail endpoint must return HTTP 200').toBe(200);
  275 | 
  276 |     // Strictly 0 unexpected requests
  277 |     expect(requests.filter(r => r.pathname === '/api/trainer/dashboard').length, 'No dashboard requests').toBe(0);
  278 |     expect(requests.filter(r => r.pathname === '/api/trainer/courses').length, 'No courses requests').toBe(0);
  279 |     expect(requests.filter(r => r.pathname === '/api/trainer/batches').length, 'No batches requests').toBe(0);
  280 |     expect(requests.filter(r => r.pathname === '/api/trainer/filters/courses').length, 'No courses filter requests').toBe(0);
  281 |     expect(requests.filter(r => r.pathname === '/api/trainer/filters/batches').length, 'No batches filter requests').toBe(0);
  282 |     expect(requests.filter(r => r.pathname === '/api/trainer/trainees' && r.pathname !== `/api/trainer/trainees/${traineeId}`).length, 'No trainee list requests').toBe(0);
  283 | 
  284 |     // Verify UI shows the trainee's actual data
  285 |     await expect(page.locator('text=Minithasri Krishnan')).toBeVisible();
  286 |     await expect(page.locator('text=minithasrik5622@gmail.com')).toBeVisible();
  287 |     await expect(page.locator('text=Claude Certified Developer-Foundation Level')).toBeVisible();
  288 |     await expect(page.locator('text=Sept Mid Batch')).toBeVisible();
  289 |     await expect(page.locator('text=Module Completion')).toBeVisible();
  290 |   });
  291 | 
  292 | });
  293 | 
  294 | 
```