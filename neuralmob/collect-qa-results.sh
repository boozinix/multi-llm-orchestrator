#!/bin/bash
# Collects QA test results and generates a summary report

set -e

PROJECT_ROOT="/Users/zubairnizami/Projects/Multi LLM talk/neuralmob"
cd "$PROJECT_ROOT"

echo "=== QA Test Results Summary ==="
echo ""
echo "Collecting results from test-results/ directory..."
echo ""

# Count results
TOTAL=$(find test-results -name "*.json" -type f | wc -l)
PASSED=0
FAILED=0
SKIPPED=0

if [ -f test-results/results.json ]; then
  echo "📋 Test Results JSON:"
  cat test-results/results.json | jq '.stats // {tests: 0, passed: 0, failed: 0, skipped: 0}' 2>/dev/null || echo "No JSON stats found"
  echo ""
fi

# HTML Report
if [ -f test-results/index.html ]; then
  echo "✅ HTML Report generated: test-results/index.html"
  echo ""
fi

# List all test directories
echo "📊 Test Execution Details:"
echo ""
find test-results -maxdepth 1 -type d -name "qa.tests.ts*" | sort | while read dir; do
  testname=$(basename "$dir" | sed 's/qa.tests.ts-//')
  if [ -f "$dir/video.webm" ]; then
    echo "  ✓ $testname (with video)"
  elif [ -f "$dir/trace.zip" ]; then
    echo "  ✓ $testname (with trace)"
  else
    echo "  ✓ $testname"
  fi
done

echo ""
echo "📁 Artifacts:"
ls -lh test-results/.playwright-artifacts-* 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No additional artifacts"

echo ""
echo "🔗 To view full HTML report:"
echo "   open test-results/index.html"
echo ""
echo "Done!"
