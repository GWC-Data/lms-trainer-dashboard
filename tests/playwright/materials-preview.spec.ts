import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const TEST_TRAINER = {
  id: '1061b436-e980-47a7-a200-db86d97b6035',
  email: 'kumarsanthosh26007@gmail.com',
  firstName: 'kumar',
  lastName: 'Santhosh',
  role: 'TRAINER',
  roleName: 'TRAINER',
};

const TEST_TOKEN =
  'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImFoUkV3a0xyckNNV0hwc0hfVlRsaGxLbDQwREROOWxXb0huYW5vS0RDTEkifQ.eyJ1c2VyIjp7ImlkIjoiMTA2MWI0MzYtZTk4MC00N2E3LWEyMDAtZGI4NmQ5N2I2MDM1IiwiZW1haWwiOiJrdW1hcnNhbnRob3NoMjYwMDdAZ21haWwuY29tIiwiZmlyc3ROYW1lIjoia3VtYXIiLCJsYXN0TmFtZSI6IlNhbnRob3NoIiwicm9sZSI6IlRSQUlORVIiLCJyb2xlTmFtZSI6IlRSQUlORVIifSwiaWF0IjoxNzkwMjY2OTUwLCJleHAiOjE3OTAzNTMzNTAsImF1ZCI6ImRvbW8iLCJpc3MiOiJnd2MifQ.cxMFGn97J3MIWc5643NjVI77Gml8r4R_Selc7YaGVC6zYQUJ5BISbb1FUva7iuhQ8dNxz-qz22edCgq6-fOTLw';

async function setupTrainerSession(page: any) {
  // 1. Set local storage
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('teqcertify_token', token);
      localStorage.setItem('teqcertify_refresh_token', 'mock-refresh-token');
      localStorage.setItem('teqcertify_user', JSON.stringify(user));
    },
    { token: TEST_TOKEN, user: TEST_TRAINER }
  );

  // 2. Intercept session restore endpoint
  await page.route('**/auth/refresh-token', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        accessToken: TEST_TOKEN,
        user: TEST_TRAINER,
      }),
    });
  });

  // 3. Intercept trainer filters endpoint
  await page.route('**/api/trainer/filters*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        batches: [{ id: 'batch-1', name: 'Batch Alpha 2026', courseId: 'course-1' }],
        courses: [{ id: 'course-1', name: 'Full Stack Development' }],
      }),
    });
  });
}

test.describe('Trainer Materials Preview & Download In-App Verification', () => {
  // Generate multi-sheet XLSX buffer
  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([
    ['Student ID', 'Student Name', 'Score', 'Status'],
    ['STU-001', 'Alice Johnson', 92, 'Passed'],
    ['STU-002', 'Bob Smith', 85, 'Passed'],
    ['STU-003', 'Charlie Brown', 78, 'Passed'],
  ]);
  const ws2 = XLSX.utils.aoa_to_sheet([
    ['Quarter', 'Revenue', 'Target'],
    ['Q1', 45000, 40000],
    ['Q2', 52000, 50000],
  ]);
  XLSX.utils.book_append_sheet(wb, ws1, 'Grades');
  XLSX.utils.book_append_sheet(wb, ws2, 'Quarterly Summary');
  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // Locate real sample docx and pdf files
  const docxPath = path.resolve(
    process.cwd(),
    'node_modules/mammoth/test/test-data/tables.docx'
  );
  const docxBuffer = fs.existsSync(docxPath)
    ? fs.readFileSync(docxPath)
    : Buffer.from('mock-docx');

  const pdfPath = path.resolve(
    process.cwd(),
    '../backend_lms/node_modules/pdf-parse/test/data/01-valid.pdf'
  );
  const pdfBuffer = fs.existsSync(pdfPath)
    ? fs.readFileSync(pdfPath)
    : Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 300 144]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n162\n%%EOF');

  test('Flow 1: PDF Document Previews in-app inside modal with zero "Preview Not Available"', async ({ page }) => {
    await setupTrainerSession(page);

    // Mock API responses for materials list
    await page.route('**/api/documents?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          documents: [
            {
              id: 'doc-pdf-1',
              title: 'Master Syllabus Architecture',
              fileUrl: 'https://storage.googleapis.com/test-bucket/master-syllabus.pdf',
              fileType: 'application/pdf',
              fileSize: pdfBuffer.length,
              courseName: 'Full Stack Development',
              batchName: 'Batch Alpha 2026',
              moduleName: 'Module 1 - Architecture',
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      });
    });

    // Mock authenticated file stream endpoint
    await page.route('**/api/documents/doc-pdf-1/download*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: {
          'Content-Disposition': 'inline; filename="master-syllabus.pdf"',
          'Access-Control-Expose-Headers': 'Content-Disposition',
        },
        body: pdfBuffer,
      });
    });

    await page.goto('/content/documents', { waitUntil: 'networkidle' });

    // Verify document row is present
    await expect(page.getByText('Master Syllabus Architecture')).toBeVisible({ timeout: 15000 });

    // Click "View" button
    const viewBtn = page.getByRole('button', { name: 'View', exact: true }).first();
    await viewBtn.click();

    // Verify modal is open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Document Preview', { exact: true })).toBeVisible();
    await expect(modal.getByText('PDF', { exact: true }).first()).toBeVisible();

    // Verify that "Preview Not Available" does NOT exist
    await expect(modal.getByText('Preview Not Available')).not.toBeVisible();

    // Verify iframe or PDF element is rendered
    const iframe = modal.locator('iframe[title="Master Syllabus Architecture"]');
    await expect(iframe).toBeVisible();

    // Verify header metadata contains course and module name
    await expect(modal.getByText('Full Stack Development')).toBeVisible();
    await expect(modal.getByText('Module 1 - Architecture')).toBeVisible();

    // Close modal
    await modal.getByRole('button', { name: 'Close' }).first().click();
    await expect(modal).not.toBeVisible();
  });

  test('Flow 2: DOCX Document Previews actual document content inside modal', async ({ page }) => {
    await setupTrainerSession(page);

    await page.route('**/api/documents?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          documents: [
            {
              id: 'doc-docx-1',
              title: 'Comprehensive Course Curriculum',
              fileUrl: 'https://storage.googleapis.com/test-bucket/curriculum.docx',
              fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              fileSize: docxBuffer.length,
              courseName: 'Cloud Computing Pro',
              batchName: 'Batch Beta 2026',
              moduleName: 'Module 2 - Foundations',
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      });
    });

    await page.route('**/api/documents/doc-docx-1/download*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        headers: {
          'Content-Disposition': 'inline; filename="curriculum.docx"',
          'Access-Control-Expose-Headers': 'Content-Disposition',
        },
        body: docxBuffer,
      });
    });

    await page.goto('/content/documents', { waitUntil: 'networkidle' });

    await expect(page.getByText('Comprehensive Course Curriculum')).toBeVisible({ timeout: 15000 });

    const viewBtn = page.getByRole('button', { name: 'View', exact: true }).first();
    await viewBtn.click();

    // Modal open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Document Preview', { exact: true })).toBeVisible();
    await expect(modal.getByText('DOCX', { exact: true }).first()).toBeVisible();

    // Critical requirement: MUST NOT show "Preview Not Available"
    await expect(modal.getByText('Preview Not Available')).not.toBeVisible();

    // Verify document content rendered (either docx-viewer-host or mammoth-content)
    const docContainer = modal.locator('.docx-viewer-host, .mammoth-content');
    await expect(docContainer).toBeVisible({ timeout: 15000 });

    // Verify zoom toolbar is present
    await expect(modal.getByTitle('Zoom in')).toBeVisible();
    await expect(modal.getByTitle('Zoom out')).toBeVisible();

    // Close modal
    await modal.getByRole('button', { name: 'Close' }).first().click();
    await expect(modal).not.toBeVisible();
  });

  test('Flow 3: XLSX Spreadsheet Previews rows, columns, and sheet switching', async ({ page }) => {
    await setupTrainerSession(page);

    await page.route('**/api/documents?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          documents: [
            {
              id: 'doc-xlsx-1',
              title: 'Student Performance Metrics',
              fileUrl: 'https://storage.googleapis.com/test-bucket/metrics.xlsx',
              fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              fileSize: xlsxBuffer.length,
              courseName: 'Data Analytics Mastery',
              batchName: 'Batch Gamma 2026',
              moduleName: 'Module 3 - Statistics',
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      });
    });

    await page.route('**/api/documents/doc-xlsx-1/download*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers: {
          'Content-Disposition': 'inline; filename="metrics.xlsx"',
          'Access-Control-Expose-Headers': 'Content-Disposition',
        },
        body: xlsxBuffer,
      });
    });

    await page.goto('/content/documents', { waitUntil: 'networkidle' });

    await expect(page.getByText('Student Performance Metrics')).toBeVisible({ timeout: 15000 });

    const viewBtn = page.getByRole('button', { name: 'View', exact: true }).first();
    await viewBtn.click();

    // Modal open
    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Document Preview', { exact: true })).toBeVisible();
    await expect(modal.getByText('XLSX', { exact: true }).first()).toBeVisible();

    // Critical requirement: MUST NOT show "Preview Not Available"
    await expect(modal.getByText('Preview Not Available')).not.toBeVisible();

    // Verify spreadsheet contents from Sheet 1 ("Grades")
    await expect(modal.getByRole('button', { name: 'Grades' })).toBeVisible();
    await expect(modal.getByText('Alice Johnson')).toBeVisible();
    await expect(modal.getByText('Bob Smith')).toBeVisible();

    // Verify sheet switching: click Sheet 2 ("Quarterly Summary")
    const sheet2Tab = modal.getByRole('button', { name: 'Quarterly Summary' });
    await expect(sheet2Tab).toBeVisible();
    await sheet2Tab.click();

    // Verify Sheet 2 data appears
    await expect(modal.getByText('Revenue')).toBeVisible();
    await expect(modal.getByText('45000')).toBeVisible();

    // Verify Search inside sheet
    const searchInput = modal.getByPlaceholder('Search sheet...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Q1');
    await expect(modal.getByText('Q1')).toBeVisible();

    // Close modal
    await modal.getByRole('button', { name: 'Close' }).first().click();
    await expect(modal).not.toBeVisible();
  });

  test('Flow 4: Download action works independently and downloads original file', async ({ page }) => {
    await setupTrainerSession(page);

    await page.route('**/api/documents?*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          documents: [
            {
              id: 'doc-pdf-download-test',
              title: 'Master Syllabus Architecture',
              fileUrl: 'https://storage.googleapis.com/test-bucket/master-syllabus.pdf',
              fileType: 'application/pdf',
              fileSize: pdfBuffer.length,
              courseName: 'Full Stack Development',
              batchName: 'Batch Alpha 2026',
              moduleName: 'Module 1 - Architecture',
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        }),
      });
    });

    await page.route('**/api/documents/doc-pdf-download-test/download*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: {
          'Content-Disposition': 'attachment; filename="master-syllabus.pdf"',
          'Access-Control-Expose-Headers': 'Content-Disposition',
        },
        body: pdfBuffer,
      });
    });

    await page.goto('/content/documents', { waitUntil: 'networkidle' });

    // Open View modal first to test download from modal as well
    const viewBtn = page.getByRole('button', { name: 'View', exact: true }).first();
    await viewBtn.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Trigger download from modal
    const downloadPromise = page.waitForEvent('download');
    await modal.getByRole('button', { name: 'Download' }).first().click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('Master Syllabus Architecture.pdf');
  });
});

