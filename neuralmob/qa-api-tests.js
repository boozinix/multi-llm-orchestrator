#!/usr/bin/env node
/**
 * Direct API QA Test Harness
 * Tests /api/chat endpoint with various configurations
 * No browser UI interaction — pure API testing
 */

const http = require("http");
const BASE_URL = "http://localhost:3040";

// Test fixtures
const SHORT_PROMPT = "What is 17 × 23?";
const LONG_PROMPT =
  "You are advising a 10-person startup that has just closed a $2M seed round. Describe a complete go-to-market strategy for a B2B SaaS product targeting mid-market companies in the logistics sector. Cover: positioning, ICP definition, outbound vs inbound, pricing strategy, first 90 days of sales motion, and one key metric to track each month.";

const TEST_CONFIGS = [
  {
    name: "QK-01: Quick Mode — GPT-5.4 — Short Prompt",
    mode: "quick",
    primarySlot: "bot1",
    bot1: "openai/gpt-5.4",
    outputMode: "simple",
    prompt: SHORT_PROMPT,
  },
  {
    name: "QK-02: Quick Mode — Sonnet 4.6 — Long Prompt",
    mode: "quick",
    primarySlot: "bot1",
    bot1: "anthropic/claude-sonnet-4.6",
    outputMode: "simple",
    prompt: LONG_PROMPT,
  },
  {
    name: "SM-01: Super Mode — 3-bot full merge — Short Prompt",
    mode: "super",
    bot1Enabled: true,
    bot2Enabled: true,
    bot3Enabled: true,
    merge12Enabled: true,
    merge123Enabled: true,
    bot1: "openai/gpt-5.4",
    bot2: "anthropic/claude-sonnet-4.6",
    bot3: "google/gemini-3.1-pro-preview",
    outputMode: "simple",
    prompt: SHORT_PROMPT,
  },
  {
    name: "SM-02: Super Mode — 3-bot merge — Long Prompt",
    mode: "super",
    bot1Enabled: true,
    bot2Enabled: true,
    bot3Enabled: true,
    merge12Enabled: true,
    merge123Enabled: true,
    outputMode: "simple",
    prompt: LONG_PROMPT,
  },
  {
    name: "CM-01: Chain Mode — 3-step sequential — Short Prompt",
    mode: "chain",
    bot1Enabled: true,
    bot2Enabled: true,
    bot3Enabled: true,
    bot1: "openai/gpt-5.4",
    bot2: "anthropic/claude-sonnet-4.6",
    bot3: "google/gemini-3.1-pro-preview",
    outputMode: "simple",
    prompt: SHORT_PROMPT,
  },
  {
    name: "CM-02: Chain Mode — 3-step — Long Prompt",
    mode: "chain",
    bot1Enabled: true,
    bot2Enabled: true,
    bot3Enabled: true,
    outputMode: "simple",
    prompt: LONG_PROMPT,
  },
  {
    name: "OUT-01: Output Mode — Simple cap",
    mode: "quick",
    primarySlot: "bot1",
    outputMode: "simple",
    prompt: LONG_PROMPT,
  },
  {
    name: "OUT-02: Output Mode — Advanced cap",
    mode: "quick",
    primarySlot: "bot1",
    outputMode: "advanced",
    prompt: LONG_PROMPT,
  },
];

// ── Helper: Make POST request to /api/chat ──
function makeRequest(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: "localhost",
      port: 3040,
      path: "/api/chat",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
      timeout: 300000, // 5 minutes
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          body: data,
          headers: res.headers,
        });
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    req.write(body);
    req.end();
  });
}

// ── Test runner ──
async function runTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║            NeuralMob QA — Direct API Test Suite             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");

  for (const config of TEST_CONFIGS) {
    const testName = config.name;
    const startTime = Date.now();

    process.stdout.write(`  ${testName}... `);

    try {
      const response = await makeRequest(config);
      const duration = Date.now() - startTime;

      if (response.status === 200) {
        // Verify response body has expected fields
        try {
          const body = JSON.parse(response.body);
          if (body.finalAnswer && body.botOutputs && Array.isArray(body.usageLines)) {
            console.log(`✓ ${duration}ms`);
            results.push({ test: testName, status: "PASS", duration, response });
            passed++;
          } else {
            console.log(`✗ Missing fields in response`);
            results.push({
              test: testName,
              status: "FAIL",
              duration,
              error: "Missing required response fields",
            });
            failed++;
          }
        } catch (e) {
          console.log(`✗ Invalid JSON response`);
          results.push({
            test: testName,
            status: "FAIL",
            duration,
            error: `Invalid JSON: ${e.message}`,
          });
          failed++;
        }
      } else {
        console.log(`✗ Status ${response.status}`);
        results.push({
          test: testName,
          status: "FAIL",
          duration,
          error: `HTTP ${response.status}`,
        });
        failed++;
      }
    } catch (err) {
      const duration = Date.now() - startTime;
      console.log(`✗ ${err.message}`);
      results.push({
        test: testName,
        status: "FAIL",
        duration,
        error: err.message,
      });
      failed++;
    }
  }

  // ── Summary ──
  console.log("");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log(`║  Results: ${passed} PASSED, ${failed} FAILED (${passed + failed} total)     ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");

  if (failed > 0) {
    console.log("❌ FAILURES:");
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        console.log(`  • ${r.test}`);
        console.log(`    → ${r.error}`);
      });
    console.log("");
  }

  console.log("📊 TEST BREAKDOWN:");
  console.log("");
  console.log("Quick Mode Tests:");
  results
    .filter((r) => r.test.includes("QK"))
    .forEach((r) => {
      const icon = r.status === "PASS" ? "✓" : "✗";
      console.log(`  ${icon} ${r.test} (${r.duration}ms)`);
    });

  console.log("");
  console.log("Super Mode Tests:");
  results
    .filter((r) => r.test.includes("SM"))
    .forEach((r) => {
      const icon = r.status === "PASS" ? "✓" : "✗";
      console.log(`  ${icon} ${r.test} (${r.duration}ms)`);
    });

  console.log("");
  console.log("Chain Mode Tests:");
  results
    .filter((r) => r.test.includes("CM"))
    .forEach((r) => {
      const icon = r.status === "PASS" ? "✓" : "✗";
      console.log(`  ${icon} ${r.test} (${r.duration}ms)`);
    });

  console.log("");
  console.log("Output Mode Tests:");
  results
    .filter((r) => r.test.includes("OUT"))
    .forEach((r) => {
      const icon = r.status === "PASS" ? "✓" : "✗";
      console.log(`  ${icon} ${r.test} (${r.duration}ms)`);
    });

  console.log("");
  process.exit(failed > 0 ? 1 : 0);
}

// ── Run ──
runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
