$ErrorActionPreference = "Stop"

Write-Host "=== STAGE 1: 1,000 requests ==="
docker run --network host --rm -v ${PWD}:/app -w /app grafana/k6 run load-tests/stages/stage-1k.js
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: Stage 1k FAILED thresholds. Stopping here."; exit 1 }
Write-Host "PASS: Stage 1k PASSED"

Write-Host "=== STAGE 2: 2,000 requests ==="
docker run --network host --rm -v ${PWD}:/app -w /app grafana/k6 run load-tests/stages/stage-2k.js
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: Stage 2k FAILED thresholds. Stopping here."; exit 1 }
Write-Host "PASS: Stage 2k PASSED"

Write-Host "=== STAGE 3: 5,000 requests ==="
docker run --network host --rm -v ${PWD}:/app -w /app grafana/k6 run load-tests/stages/stage-5k.js
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: Stage 5k FAILED thresholds. Stopping here."; exit 1 }
Write-Host "PASS: Stage 5k PASSED"

Write-Host "=== STAGE 4: 10,000 requests ==="
docker run --network host --rm -v ${PWD}:/app -w /app grafana/k6 run load-tests/stages/stage-10k.js
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: Stage 10k FAILED thresholds."; exit 1 }
Write-Host "PASS: Stage 10k PASSED - backend is production-load-ready."
