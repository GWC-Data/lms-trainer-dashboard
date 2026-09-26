import { test, expect } from '@playwright/test';

// Real trainer authentication credentials and tokens
const TEST_TRAINER = {
  id: '1061b436-e980-47a7-a200-db86d97b6035',
  email: 'kumarsanthosh26007@gmail.com',
  firstName: 'kumar',
  lastName: 'Santhosh',
  role: 'TRAINER',
  roleName: 'TRAINER'
};

const TEST_TOKEN = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFoUkV3a0xyckNNV0hwc0hfVlRsaGxLbDQwREROOWxXb0huYW5vS0RDTEkifQ.eyJ1c2VyIjp7ImlkIjoiMTA2MWI0MzYtZTk4MC00N2E3LWEyMDAtZGI4NmQ5N2I2MDM1IiwiZW1haWwiOiJrdW1hcnNhbnRob3NoMjYwMDdAZ21haWwuY29tIiwiZmlyc3ROYW1lIjoia3VtYXIiLCJsYXN0TmFtZSI6IlNhbnRob3NoIiwicm9sZSI6IlRSQUlORVIiLCJyb2xlTmFtZSI6IlRSQUlORVIifSwiaWF0IjoxNzkwMjY2OTUwLCJleHAiOjE3OTAzNTMzNTAsImF1ZCI6ImRvbW8iLCJpc3MiOiJnd2MifQ.cxMFGn97J3MIWc5643NjVI77Gml8r4R_Selc7YaGVC6zYQUJ5BISbb1FUva7iuhQ8dNxz-qz22edCgq6-fOTLw';

interface TrackedRequest {
  method: string;
  url: string;
  pathname: string;
  search: string;
  status?: number;
}

function setupNetworkTracker(page: any) {
  const requests: TrackedRequest[] = [];

  page.on('request', (req: any) => {
    const urlStr = req.url();
    // Only track backend API endpoints, ignore static assets/Vite scripts
    if (urlStr.includes(':8080') || urlStr.includes('/api/') || urlStr.includes('/auth/')) {
      try {
        const parsed = new URL(urlStr);
        requests.push({
          method: req.method(),
          url: urlStr,
          pathname: parsed.pathname,
          search: parsed.search
        });
      } catch {
        requests.push({
          method: req.method(),
          url: urlStr,
          pathname: urlStr,
          search: ''
        });
      }
    }
  });

  page.on('response', (res: any) => {
    const urlStr = res.url();
    const req = requests.find((r) => r.url === urlStr && !r.status);
    if (req) {
      req.status = res.status();
    }
  });

  return {
    getRequests: () => [...requests],
    clear: () => { requests.length = 0; },
    getDuplicates: () => {
      const counts: Record<string, number> = {};
      for (const r of requests) {
        const key = `${r.method} ${r.pathname}${r.search}`;
        counts[key] = (counts[key] || 0) + 1;
      }
      return Object.entries(counts).filter(([_, count]) => count > 1);
    }
  };
}

async function injectTrainerAuth(page: any) {
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('teqcertify_token', token);
    localStorage.setItem('teqcertify_refresh_token', 'refresh-token-mock-audit');
    localStorage.setItem('teqcertify_user', JSON.stringify(user));
  }, { token: TEST_TOKEN, user: TEST_TRAINER });
}

test.describe('Trainer Dashboard API & Network Architecture Audit', () => {

  test('Flow A: Trainees Page Initial Load - Zero Duplicate Requests', async ({ page }) => {
    await injectTrainerAuth(page);
    const tracker = setupNetworkTracker(page);

    await page.goto('/trainees', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const requests = tracker.getRequests();
    const duplicates = tracker.getDuplicates();

    console.log('Trainees initial requests:', requests.map(r => `${r.method} ${r.pathname}${r.search} [${r.status}]`));
    console.log('Trainees duplicates found:', duplicates);

    // Combined Filter API call: GET /api/trainer/filters
    const combinedFilterCalls = requests.filter(r => r.pathname === '/api/trainer/filters');
    const traineesCalls = requests.filter(r => r.pathname === '/api/trainer/trainees');

    // Assert exactly 1 combined filter request (instead of 2 separate course/batch filter calls)
    expect(combinedFilterCalls.length, 'Combined filters should be requested exactly once').toBe(1);
    expect(traineesCalls.length, 'Trainees list should be requested exactly once').toBe(1);
    expect(duplicates.length, 'There must be ZERO duplicate requests').toBe(0);
  });

  test('Flow B: Trainee Search Debounce - Rapid Typing generates 1 Request', async ({ page }) => {
    await injectTrainerAuth(page);
    await page.goto('/trainees', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const tracker = setupNetworkTracker(page);

    const searchInput = page.locator('input[placeholder*="Search by name or email"]');
    await expect(searchInput).toBeVisible();

    // Type rapidly letter-by-letter
    await searchInput.type('Minithasri', { delay: 40 });
    // Wait for 350ms debounce + network response
    await page.waitForTimeout(1200);

    const requests = tracker.getRequests();
    const traineeSearchRequests = requests.filter(r => r.pathname === '/api/trainer/trainees' && r.search.includes('Minithasri'));

    console.log('Search requests:', requests.map(r => `${r.method} ${r.pathname}${r.search}`));
    expect(traineeSearchRequests.length, 'Search should debounce to exactly 1 request').toBe(1);
  });

  test('Flow C: Trainees Pagination - Page 2 requests only page=2', async ({ page }) => {
    await injectTrainerAuth(page);
    await page.goto('/trainees', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const tracker = setupNetworkTracker(page);

    // Look for Next button in pagination
    const nextBtn = page.locator('button:has-text("Next")');
    if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(1000);

      const requests = tracker.getRequests();
      const page2Requests = requests.filter(r => r.pathname === '/api/trainer/trainees' && r.search.includes('page=2'));
      console.log('Pagination requests:', requests.map(r => `${r.method} ${r.pathname}${r.search}`));
      expect(page2Requests.length, 'Page 2 should be requested exactly once').toBe(1);
      // Ensure no courses/batches/dashboard refetch
      expect(requests.filter(r => r.pathname.includes('/filters/')).length, 'Filters should not refetch on pagination').toBe(0);
      expect(requests.filter(r => r.pathname.includes('/dashboard')).length, 'Dashboard should not refetch on pagination').toBe(0);
    } else {
      console.log('Next button not enabled (dataset fits in 1 page)');
    }
  });

  test('Flow D: Batches Page - Course Filter Dropdown and Batches list', async ({ page }) => {
    await injectTrainerAuth(page);
    const tracker = setupNetworkTracker(page);

    await page.goto('/batches', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const requests = tracker.getRequests();
    console.log('Batches page requests:', requests.map(r => `${r.method} ${r.pathname}${r.search}`));

    const courseFilterCalls = requests.filter(r => r.pathname === '/api/trainer/filters' || r.pathname === '/api/trainer/filters/courses');
    const batchesCalls = requests.filter(r => r.pathname === '/api/trainer/batches');

    expect(courseFilterCalls.length, 'Course filter dropdown should be fetched once').toBe(1);
    expect(batchesCalls.length, 'Batches list should be fetched once').toBe(1);
    expect(tracker.getDuplicates().length, 'Batches page must have 0 duplicate requests').toBe(0);
  });

  test('Flow E: Courses Page - Scoped course list request only', async ({ page }) => {
    await injectTrainerAuth(page);
    const tracker = setupNetworkTracker(page);

    await page.goto('/courses', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const requests = tracker.getRequests();
    console.log('Courses page requests:', requests.map(r => `${r.method} ${r.pathname}${r.search}`));

    const coursesCalls = requests.filter(r => r.pathname === '/api/trainer/courses');
    expect(coursesCalls.length, 'Courses endpoint should be requested').toBeGreaterThanOrEqual(1);
    expect(tracker.getDuplicates().length, 'No duplicate course requests').toBe(0);
    expect(requests.filter(r => r.pathname === '/api/trainer/trainees').length, 'Should NOT request trainees on courses page').toBe(0);
  });

  test('Flow F: Attendance Page - Batch selection loads targeted attendance records', async ({ page }) => {
    await injectTrainerAuth(page);
    const tracker = setupNetworkTracker(page);

    await page.goto('/attendance', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const requests = tracker.getRequests();
    console.log('Attendance page requests:', requests.map(r => `${r.method} ${r.pathname}${r.search}`));

    expect(tracker.getDuplicates().length, 'Attendance page initial load must have 0 duplicates').toBe(0);
  });

  test('Flow G: Navigation - Switching pages does NOT refetch Dashboard', async ({ page }) => {
    await injectTrainerAuth(page);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const tracker = setupNetworkTracker(page);

    // Navigate to /trainees
    await page.goto('/trainees', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    const navRequests = tracker.getRequests();
    const dashboardCalls = navRequests.filter(r => r.pathname === '/api/trainer/dashboard');

    console.log('Navigation to /trainees requests:', navRequests.map(r => `${r.method} ${r.pathname}${r.search}`));
    expect(dashboardCalls.length, 'Navigating from dashboard to trainees should NOT refetch dashboard').toBe(0);
  });

  test('Flow H: Security Response Verification - Auth payloads contain no forbidden metadata', async ({ request }) => {
    // Verify login rejection or auth endpoint structure directly
    const res = await request.post('http://localhost:8080/auth/login', {
      data: {
        email: 'invalid-test-probe@teqcertify.com',
        password: 'WrongPassword123!',
        deviceId: 'device-test-audit-probe'
      }
    });

    const body = await res.json();
    console.log('Auth probe response:', body);

    // Forbidden fields check
    const forbiddenFields = [
      'role',
      'roleId',
      'permissions',
      'assignedBatchId',
      'batchName',
      'jobBoardAccess',
      'sessionId',
      'password',
      'otp',
      'otpSecret'
    ];

    for (const field of forbiddenFields) {
      expect(body[field], `Auth response must NOT expose ${field}`).toBeUndefined();
      if (body.user) {
        expect(body.user[field], `User object must NOT expose ${field}`).toBeUndefined();
      }
    }
  });

  test('Flow I: Dashboard -> Trainee Detail Flow (Isolation & Minimal Calls)', async ({ page }) => {
    await injectTrainerAuth(page);
    
    // First clear and set up tracker
    const tracker = setupNetworkTracker(page);

    // Navigate to a single trainee's detail directly as when clicked from Dashboard
    const traineeId = '503d70a0-8afe-46fd-a85e-cf281816250c';
    const batchId = 'BCH-1';
    await page.goto(`/trainees/${traineeId}?batchId=${batchId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const requests = tracker.getRequests();
    const duplicates = tracker.getDuplicates();

    console.log('Trainee detail requests:', requests.map(r => `${r.method} ${r.pathname}${r.search} [${r.status}]`));
    console.log('Trainee detail duplicates:', duplicates);

    // Exactly 1 request for the single trainee detail
    const detailCalls = requests.filter(r => r.pathname === `/api/trainer/trainees/${traineeId}`);
    expect(detailCalls.length, 'Trainee detail endpoint must be requested exactly once').toBe(1);
    expect(detailCalls[0].status, 'Trainee detail endpoint must return HTTP 200').toBe(200);

    

    // Strictly 0 unexpected requests
    expect(requests.filter(r => r.pathname === '/api/trainer/dashboard').length, 'No dashboard requests').toBe(0);
    expect(requests.filter(r => r.pathname === '/api/trainer/courses').length, 'No courses requests').toBe(0);
    expect(requests.filter(r => r.pathname === '/api/trainer/batches').length, 'No batches requests').toBe(0);
    expect(requests.filter(r => r.pathname === '/api/trainer/filters/courses').length, 'No courses filter requests').toBe(0);
    expect(requests.filter(r => r.pathname === '/api/trainer/filters/batches').length, 'No batches filter requests').toBe(0);
    expect(requests.filter(r => r.pathname === '/api/trainer/trainees' && r.pathname !== `/api/trainer/trainees/${traineeId}`).length, 'No trainee list requests').toBe(0);

    // Verify UI shows the trainee's actual data
    await expect(page.locator('text=Minithasri Krishnan')).toBeVisible();
    await expect(page.locator('text=minithasrik5622@gmail.com')).toBeVisible();
    await expect(page.locator('text=Claude Certified Developer-Foundation Level')).toBeVisible();
    await expect(page.locator('text=Sept Mid Batch')).toBeVisible();
    await expect(page.locator('text=Module Completion')).toBeVisible();
  });

});

