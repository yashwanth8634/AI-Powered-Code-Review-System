# Postman API Testing Guide — AI Code Review System

This document provides step-by-step instructions for testing all backend API endpoints using **Postman** (or cURL).

---

## 0. Quick Start: 1-Click Import

A complete Postman collection with automatic HMAC-SHA256 signing and `scanId` chaining is pre-built in this repo:

1. Open **Postman**.
2. Click **Import** (top left).
3. Select the file:
   ```text
   postman/AI_Code_Review.postman_collection.json
   ```
4. You will get a collection named **"AI Code Review System API"** with all 4 requests configured!

---

## 1. Prerequisites: Start the Backend

Before sending requests in Postman, open **two terminal windows**:

### Terminal 1 — Next.js Server
```bash
npm run dev
```
> Runs at `http://localhost:3000`.

### Terminal 2 — BullMQ Scan Worker
```bash
npx tsx lib/queue/scanWorker.ts
```
> Listens for scan jobs and executes git clone, Semgrep, and LLM analysis.

---

## 2. Testing the Endpoints (Step-by-Step)

### Endpoint 1: Trigger On-Demand Scan (`POST /api/analyze`)

Kicks off a review pipeline for any public GitHub repository.

- **Method:** `POST`
- **URL:** `http://localhost:3000/api/analyze`
- **Headers:**
  | Key | Value |
  |---|---|
  | `Content-Type` | `application/json` |

#### Request Body (JSON):
```json
{
  "gitUrl": "https://github.com/octocat/Hello-World",
  "settings": {
    "skipArchitecture": false,
    "skipSecurity": false,
    "minSeverity": "low"
  }
}
```

#### Expected Response (`202 Accepted`):
```json
{
  "scanId": "66e5a4f1092b3c4d5e6f7a8b",
  "message": "Scan queued successfully."
}
```

> **Note:** Copy the `scanId` from the response to use in Endpoint 2. (In the imported collection, this is saved automatically).

---

### Endpoint 2: Poll Scan Status & Findings (`GET /api/scans/:scanId`)

Poll this endpoint to monitor scan progress and view the full report when finished.

- **Method:** `GET`
- **URL:** `http://localhost:3000/api/scans/<your_scan_id_here>`
- **Example:** `http://localhost:3000/api/scans/66e5a4f1092b3c4d5e6f7a8b`

#### While Scan is in Progress:
```json
{
  "id": "66e5a4f1092b3c4d5e6f7a8b",
  "repoUrl": "https://github.com/octocat/Hello-World",
  "ownerAndRepo": "octocat/Hello-World",
  "triggeredBy": "on-demand",
  "status": "running",
  "architectureFindings": [],
  "securityFindings": [],
  "summary": {
    "architectureHigh": 0,
    "architectureMedium": 0,
    "architectureLow": 0,
    "securityCritical": 0,
    "securityHigh": 0,
    "securityMedium": 0,
    "securityLow": 0,
    "totalIssues": 0
  }
}
```

#### When Complete (`status: "complete"`):
```json
{
  "id": "66e5a4f1092b3c4d5e6f7a8b",
  "repoUrl": "https://github.com/octocat/Hello-World",
  "ownerAndRepo": "octocat/Hello-World",
  "triggeredBy": "on-demand",
  "startedAt": "2026-09-14T14:15:00.000Z",
  "completedAt": "2026-09-14T14:15:45.000Z",
  "status": "complete",
  "architectureFindings": [
    {
      "id": "7a8b9c0d-1234-5678-90ab-cdef12345678",
      "severity": "medium",
      "category": "pattern",
      "title": "Missing Error Boundaries",
      "explanation": "Entry points do not catch unhandled exceptions.",
      "affectedFiles": ["index.js"]
    }
  ],
  "securityFindings": [],
  "summary": {
    "architectureHigh": 0,
    "architectureMedium": 1,
    "architectureLow": 0,
    "securityCritical": 0,
    "securityHigh": 0,
    "securityMedium": 0,
    "securityLow": 0,
    "totalIssues": 1
  }
}
```

---

### Endpoint 3: List Scan History (`GET /api/scans`)

Fetches recent scans, sorted newest first.

- **Method:** `GET`
- **URL:** `http://localhost:3000/api/scans`
- **Optional Query Parameters:**
  - `?limit=10` — number of scans to return (default 20, max 100).
  - `?repo=octocat/Hello-World` — filter by repository.

#### Example URL:
```text
http://localhost:3000/api/scans?repo=octocat/Hello-World&limit=5
```

#### Expected Response (`200 OK`):
```json
[
  {
    "id": "66e5a4f1092b3c4d5e6f7a8b",
    "repoUrl": "https://github.com/octocat/Hello-World",
    "ownerAndRepo": "octocat/Hello-World",
    "triggeredBy": "on-demand",
    "startedAt": "2026-09-14T14:15:00.000Z",
    "completedAt": "2026-09-14T14:15:45.000Z",
    "status": "complete",
    "summary": {
      "totalIssues": 1
    }
  }
]
```

---

### Endpoint 4: GitHub Push Webhook (`POST /api/webhook`)

Simulates GitHub notifying the server about a code push.

- **Method:** `POST`
- **URL:** `http://localhost:3000/api/webhook`
- **Headers:**
  | Key | Value | Notes |
  |---|---|---|
  | `Content-Type` | `application/json` | |
  | `X-GitHub-Event` | `push` | Or `ping` |
  | `X-Hub-Signature-256` | `sha256=<computed_hmac>` | **Must match secret** |

#### Postman Pre-request Script (Automatic Signing):
If you are testing manually without importing the collection, paste this script into the **Pre-request Script** tab of Postman:

```javascript
const secret = "d44ed57fd16540ca0e37d4bd0ae892c9073080dcdefae631";
const payload = pm.request.body.raw;
const hash = CryptoJS.HmacSHA256(payload, secret).toString(CryptoJS.enc.Hex);

pm.request.headers.upsert({ key: "X-Hub-Signature-256", value: "sha256=" + hash });
pm.request.headers.upsert({ key: "X-GitHub-Event", value: "push" });
```

#### Request Body (JSON):
```json
{
  "ref": "refs/heads/main",
  "repository": {
    "full_name": "octocat/Hello-World",
    "clone_url": "https://github.com/octocat/Hello-World.git",
    "html_url": "https://github.com/octocat/Hello-World",
    "default_branch": "main"
  },
  "pusher": {
    "name": "octocat"
  }
}
```

#### Expected Response (`200 OK`):
```json
{
  "message": "Push webhook processed and scan queued.",
  "scanId": "66e5a550092b3c4d5e6f7a8c",
  "repo": "octocat/Hello-World"
}
```

---

## 3. Negative / Edge Case Testing

| Scenario | Request | Expected Status | Expected Response Detail |
|---|---|---|---|
| **Invalid GitHub URL** | `POST /api/analyze` with `gitUrl: "https://gitlab.com/foo/bar"` | `400 Bad Request` | `"Invalid GitHub URL..."` |
| **Missing Request Body** | `POST /api/analyze` with empty body | `400 Bad Request` | `"Validation failed"` |
| **Tampered Webhook Signature** | `POST /api/webhook` with altered `X-Hub-Signature-256` | `401 Unauthorized` | `"Invalid or missing signature"` |
| **Push to non-default branch** | `POST /api/webhook` with `ref: "refs/heads/feature-branch"` | `200 OK` | `"Ignored push to non-default branch..."` |
| **Non-existent Scan ID** | `GET /api/scans/66e5a4f1092b3c4d5e6f7999` | `404 Not Found` | `"Scan not found"` |
| **Invalid Scan ID Format** | `GET /api/scans/invalid-id-string` | `400 Bad Request` | `"Invalid scan ID format"` |

---

## 4. Equivalent cURL Commands (Terminal Alternative)

If you prefer testing directly in the terminal:

### 1. Trigger Scan:
```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"gitUrl":"https://github.com/octocat/Hello-World"}'
```

### 2. Poll Scan:
```bash
curl http://localhost:3000/api/scans/<scanId>
```

### 3. List Scans:
```bash
curl http://localhost:3000/api/scans?limit=5
```
