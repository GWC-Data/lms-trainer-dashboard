# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: network-audit.spec.ts >> Trainer Dashboard API & Network Architecture Audit >> Flow E: Courses Page - Scoped course list request only
- Location: tests\playwright\network-audit.spec.ts:171:3

# Error details

```
Error: No duplicate course requests

expect(received).toBe(expected) // Object.is equality

Expected: 0
Received: 1
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - img "TeqCertify" [ref=e7]
      - navigation [ref=e8]:
        - list [ref=e10]:
          - listitem [ref=e11]:
            - link "Dashboard" [ref=e12] [cursor=pointer]:
              - /url: /
          - listitem [ref=e19]:
            - link "Courses" [ref=e20] [cursor=pointer]:
              - /url: /courses
        - generic [ref=e24]:
          - paragraph [ref=e25]: Content Management
          - list [ref=e26]:
            - listitem [ref=e27]:
              - link "Modules" [ref=e28] [cursor=pointer]:
                - /url: /content/modules
            - listitem [ref=e40]:
              - link "Materials" [ref=e41] [cursor=pointer]:
                - /url: /content/documents
        - generic [ref=e46]:
          - paragraph [ref=e47]: Assessment
          - list [ref=e48]:
            - listitem [ref=e49]:
              - link "Quizzes" [ref=e50] [cursor=pointer]:
                - /url: /quizzes
            - listitem [ref=e55]:
              - link "Assignments" [ref=e56] [cursor=pointer]:
                - /url: /assignments
        - generic [ref=e61]:
          - paragraph [ref=e62]: Operations
          - list [ref=e63]:
            - listitem [ref=e64]:
              - link "Batches" [ref=e65] [cursor=pointer]:
                - /url: /batches
            - listitem [ref=e71]:
              - link "Calendar" [ref=e72] [cursor=pointer]:
                - /url: /calendar
            - listitem [ref=e76]:
              - link "Attendance" [ref=e77] [cursor=pointer]:
                - /url: /attendance
            - listitem [ref=e83]:
              - link "Trainees" [ref=e84] [cursor=pointer]:
                - /url: /trainees
            - listitem [ref=e91]:
              - link "Reports" [ref=e92] [cursor=pointer]:
                - /url: /reports
        - generic [ref=e96]:
          - paragraph [ref=e97]: Account
          - list [ref=e98]:
            - listitem [ref=e99]:
              - link "Settings" [ref=e100] [cursor=pointer]:
                - /url: /settings
      - generic [ref=e106]:
        - img "KS" [ref=e108]
        - generic [ref=e110]:
          - paragraph [ref=e111]: kumar Santhosh
          - paragraph [ref=e112]: TRAINER
        - button "Log out" [ref=e113] [cursor=pointer]
    - generic [ref=e117]:
      - banner [ref=e118]:
        - generic [ref=e119]:
          - button "Toggle Navigation" [ref=e120] [cursor=pointer]
          - generic [ref=e122]:
            - link "Dashboard" [ref=e123] [cursor=pointer]:
              - /url: /
            - generic [ref=e127]: Courses
        - button "Notifications" [ref=e132] [cursor=pointer]
      - main [ref=e136]:
        - generic [ref=e138]:
          - generic [ref=e139]:
            - textbox "Search courses or batches..." [ref=e144]
            - generic [ref=e145]:
              - combobox [ref=e147] [cursor=pointer]:
                - generic: All Courses (3)
              - combobox [ref=e151] [cursor=pointer]:
                - generic: All Batches (4)
          - generic [ref=e154]:
            - generic [ref=e155]:
              - generic [ref=e156]:
                - generic [ref=e157]:
                  - generic [ref=e158]: Scheduled
                  - generic [ref=e159]: CCAP
                - img "Claude Certified Architect-Professional Level" [ref=e161]
                - paragraph [ref=e162]: CCAP · CLAUDE CERTIFIED ARCHITECT-PROFESSIONAL LEVEL
                - heading "Claude Certified Architect-Professional Level" [level=3] [ref=e163]
                - paragraph [ref=e164]: Focuses on developing applications using Claude. Covers API usage, prompting, and basic AI application development.
                - generic [ref=e165]:
                  - generic [ref=e166]: 7 modules
                  - generic [ref=e171]: 120 hrs
                  - generic [ref=e175]: 0 batches
                - generic [ref=e179]:
                  - generic [ref=e180]: Progress
                  - generic [ref=e181]: 0%
              - link [ref=e184] [cursor=pointer]:
                - /url: /content/modules?courseId=df6a0bcf-64f5-4b83-999f-6d07e4dafbfa
                - button "Manage Content" [ref=e185]
            - generic [ref=e188]:
              - generic [ref=e189]:
                - generic [ref=e190]:
                  - generic [ref=e191]: In Progress
                  - generic [ref=e192]: CCAF01
                - img "Claude Certified Associate -Foundation Level" [ref=e194]
                - paragraph [ref=e195]: CCAF01 · CLAUDE CERTIFIED ASSOCIATE -FOUNDATION LEVEL
                - heading "Claude Certified Associate -Foundation Level" [level=3] [ref=e196]
                - paragraph [ref=e197]: Covers the fundamentals of Claude and generative AI. Best for beginners learning how to use Claude effectively.
                - generic [ref=e198]:
                  - generic [ref=e199]: 7 modules
                  - generic [ref=e204]: 60 hrs
                  - generic [ref=e208]: 2 batches
                - generic [ref=e212]:
                  - generic [ref=e213]: Progress
                  - generic [ref=e214]: 0%
              - link [ref=e217] [cursor=pointer]:
                - /url: /content/modules?courseId=5d9fb2b2-9468-432c-8846-080abf1adae9
                - button "Manage Content" [ref=e218]
            - generic [ref=e221]:
              - generic [ref=e222]:
                - generic [ref=e223]:
                  - generic [ref=e224]: In Progress
                  - generic [ref=e225]: CCDF
                - img "Claude Certified Developer-Foundation Level" [ref=e227]
                - paragraph [ref=e228]: CCDF · CLAUDE CERTIFIED DEVELOPER-FOUNDATION LEVEL
                - heading "Claude Certified Developer-Foundation Level" [level=3] [ref=e229]
                - paragraph [ref=e230]: claude advanced types and patterns.
                - generic [ref=e231]:
                  - generic [ref=e232]: 2 modules
                  - generic [ref=e237]: 80 hrs
                  - generic [ref=e241]: 2 batches
                - generic [ref=e245]:
                  - generic [ref=e246]: Progress
                  - generic [ref=e247]: 0%
              - link [ref=e250] [cursor=pointer]:
                - /url: /content/modules?courseId=9ef0c1b4-b166-49f4-bfc5-001c1e3e612b
                - button "Manage Content" [ref=e251]
```

# Test source

```ts
  83  |     const tracker = setupNetworkTracker(page);
  84  | 
  85  |     await page.goto('/trainees', { waitUntil: 'networkidle' });
  86  |     await page.waitForTimeout(1000);
  87  | 
  88  |     const requests = tracker.getRequests();
  89  |     const duplicates = tracker.getDuplicates();
  90  | 
  91  |     console.log('Trainees initial requests:', requests.map(r => `${r.method} ${r.pathname}${r.search} [${r.status}]`));
  92  |     console.log('Trainees duplicates found:', duplicates);
  93  | 
  94  |     // Filter API calls
  95  |     const coursesFilterCalls = requests.filter(r => r.pathname === '/api/trainer/filters/courses');
  96  |     const batchesFilterCalls = requests.filter(r => r.pathname === '/api/trainer/filters/batches');
  97  |     const traineesCalls = requests.filter(r => r.pathname === '/api/trainer/trainees');
  98  | 
  99  |     // Assert exactly 1 request each
  100 |     expect(coursesFilterCalls.length, 'Courses filter should be requested exactly once').toBe(1);
  101 |     expect(batchesFilterCalls.length, 'Batches filter should be requested exactly once').toBe(1);
  102 |     expect(traineesCalls.length, 'Trainees list should be requested exactly once').toBe(1);
  103 |     expect(duplicates.length, 'There must be ZERO duplicate requests').toBe(0);
  104 |   });
  105 | 
  106 |   test('Flow B: Trainee Search Debounce - Rapid Typing generates 1 Request', async ({ page }) => {
  107 |     await injectTrainerAuth(page);
  108 |     await page.goto('/trainees', { waitUntil: 'networkidle' });
  109 |     await page.waitForTimeout(500);
  110 | 
  111 |     const tracker = setupNetworkTracker(page);
  112 | 
  113 |     const searchInput = page.locator('input[placeholder*="Search by name or email"]');
  114 |     await expect(searchInput).toBeVisible();
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
> 183 |     expect(tracker.getDuplicates().length, 'No duplicate course requests').toBe(0);
      |                                                                            ^ Error: No duplicate course requests
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
  215 |     expect(dashboardCalls.length, 'Navigating from dashboard to trainees should NOT refetch dashboard').toBe(0);
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
```