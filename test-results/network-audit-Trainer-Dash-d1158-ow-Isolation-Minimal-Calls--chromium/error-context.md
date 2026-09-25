# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: network-audit.spec.ts >> Trainer Dashboard API & Network Architecture Audit >> Flow I: Dashboard -> Trainee Detail Flow (Isolation & Minimal Calls)
- Location: tests\playwright\network-audit.spec.ts:253:3

# Error details

```
Error: No dashboard requests

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
            - generic [ref=e127]: Trainees
            - generic [ref=e131]: 503d70a0-8afe-46fd-a85e-cf281816250c
        - button "Notifications" [ref=e136] [cursor=pointer]:
          - generic [ref=e140]: "1"
      - main [ref=e141]:
        - generic [ref=e143]:
          - generic [ref=e144]:
            - generic [ref=e145]:
              - button "Back" [ref=e146] [cursor=pointer]
              - generic [ref=e149]:
                - heading "Trainee Details" [level=1] [ref=e150]
                - paragraph [ref=e151]: Comprehensive performance and curriculum tracking
            - button "View All Trainees" [ref=e153] [cursor=pointer]
          - generic [ref=e159]:
            - generic [ref=e161]:
              - generic [ref=e162]: MK
              - generic [ref=e163]:
                - generic [ref=e164]:
                  - heading "Minithasri Krishnan" [level=2] [ref=e165]
                  - generic [ref=e166]: active
                - generic [ref=e167]:
                  - generic [ref=e168]: minithasrik5622@gmail.com
                  - generic [ref=e172]: ·
                  - generic [ref=e173]:
                    - text: "ID:"
                    - code [ref=e174]: 503d70a0-8afe-46fd-a85e-cf281816250c
            - generic [ref=e175]:
              - generic [ref=e180]:
                - paragraph [ref=e181]: Course
                - paragraph [ref=e182]: Claude Certified Developer-Foundation Level
                - paragraph [ref=e183]: "Course ID: 9ef0c1b4-b166-49f4-bfc5-001c1e3e612b"
              - generic [ref=e190]:
                - paragraph [ref=e191]: Batch
                - paragraph [ref=e192]: Sept Mid Batch
                - paragraph [ref=e193]: "Batch ID: BCH-1"
          - generic [ref=e194]:
            - generic [ref=e195]:
              - generic [ref=e196]:
                - paragraph [ref=e197]: Module Completion
                - generic [ref=e198]:
                  - generic [ref=e199]: 0%
                  - generic [ref=e200]: (0/2 modules)
              - paragraph [ref=e203]: Curriculum progress
            - generic [ref=e204]:
              - generic [ref=e205]:
                - paragraph [ref=e206]: Average Quiz Score
                - generic [ref=e207]:
                  - generic [ref=e208]: 0%
                  - generic [ref=e209]: Below 60%
              - generic [ref=e210]:
                - generic [ref=e211]: Assessment benchmark
                - generic [ref=e212]: Needs Review
            - generic [ref=e213]:
              - generic [ref=e214]:
                - paragraph [ref=e215]: Attendance Rate
                - generic [ref=e216]: 100%
              - generic [ref=e218]:
                - generic [ref=e219]: Session participation
                - generic [ref=e220]: Regular
```

# Test source

```ts
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
> 277 |     expect(requests.filter(r => r.pathname === '/api/trainer/dashboard').length, 'No dashboard requests').toBe(0);
      |                                                                                                           ^ Error: No dashboard requests
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