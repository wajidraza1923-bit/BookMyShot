#!/usr/bin/env pwsh
<#
.SYNOPSIS
    BookMyShot App Release Script
    Builds a new APK, updates version info, and deploys everything.
    
.DESCRIPTION
    This script handles the complete release process:
    1. Increments version code
    2. Triggers EAS build
    3. Waits for build to complete
    4. Updates the server's appVersion route with new download URL
    5. Pushes changes to GitHub (auto-deploys to Northflank)
    
.PARAMETER Version
    New version string (e.g., "2.1.0"). Optional - increments patch if not specified.
    
.PARAMETER ForceUpdate
    If set, marks this as a force update (users MUST update)
    
.PARAMETER Notes
    Release notes for this version
#>

param(
    [string]$Version = "",
    [switch]$ForceUpdate,
    [string]$Notes = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$MobileDir = Join-Path $ProjectRoot "mobile"
$AppJsonPath = Join-Path $MobileDir "app.json"
$VersionRoutePath = Join-Path $ProjectRoot "server" "routes" "appVersion.js"

Write-Host "`n🚀 BookMyShot Release Process" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════`n"

# Step 1: Read current version
$appJson = Get-Content $AppJsonPath | ConvertFrom-Json
$currentVersion = $appJson.expo.version
$currentVersionCode = $appJson.expo.android.versionCode
Write-Host "📋 Current: v$currentVersion (code: $currentVersionCode)" -ForegroundColor Yellow

# Step 2: Calculate new version
if (-not $Version) {
    $parts = $currentVersion.Split('.')
    $parts[2] = [int]$parts[2] + 1
    $Version = $parts -join '.'
}
$newVersionCode = $currentVersionCode + 1
Write-Host "📋 New:     v$Version (code: $newVersionCode)" -ForegroundColor Green

# Step 3: Update app.json
$appJson.expo.version = $Version
$appJson.expo.android.versionCode = $newVersionCode
$appJson | ConvertTo-Json -Depth 10 | Set-Content $AppJsonPath
Write-Host "✓ Updated app.json" -ForegroundColor Green

# Step 4: Commit version bump
Set-Location $ProjectRoot
git add $AppJsonPath
git commit -m "release: v$Version (build $newVersionCode)" --allow-empty
Write-Host "✓ Committed version bump" -ForegroundColor Green

# Step 5: Trigger EAS build
Write-Host "`n⏳ Starting EAS build..." -ForegroundColor Cyan
Set-Location $MobileDir
$buildOutput = npx eas build --platform android --profile preview --no-wait --non-interactive 2>&1 | Out-String
$buildIdMatch = [regex]::Match($buildOutput, 'builds/([a-f0-9-]+)')
if (-not $buildIdMatch.Success) {
    Write-Host "❌ Failed to start build. Output:" -ForegroundColor Red
    Write-Host $buildOutput
    exit 1
}
$buildId = $buildIdMatch.Groups[1].Value
Write-Host "✓ Build started: $buildId" -ForegroundColor Green

# Step 6: Wait for build to complete
Write-Host "`n⏳ Waiting for build to complete (this takes ~15-20 minutes)..." -ForegroundColor Yellow
$maxWait = 40  # 40 * 30s = 20 minutes
$waited = 0
do {
    Start-Sleep -Seconds 30
    $waited++
    $statusJson = npx eas build:view $buildId --json 2>$null | Out-String
    $buildInfo = $statusJson | ConvertFrom-Json
    $status = $buildInfo.status
    Write-Host "   [$waited/40] Status: $status" -ForegroundColor Gray
} while ($status -eq "IN_QUEUE" -or $status -eq "IN_PROGRESS" -and $waited -lt $maxWait)

if ($status -ne "FINISHED") {
    Write-Host "❌ Build failed with status: $status" -ForegroundColor Red
    Write-Host "   Check: https://expo.dev/accounts/bookmyshot/projects/bookmyshot/builds/$buildId"
    exit 1
}

# Step 7: Get APK URL
$apkUrl = $buildInfo.artifacts.buildUrl
Write-Host "✓ Build complete! APK: $apkUrl" -ForegroundColor Green

# Step 8: Update appVersion.js with new version info
$releaseNotes = if ($Notes) { $Notes } else { "Version $Version - Performance improvements and bug fixes" }
$forceStr = if ($ForceUpdate) { "true" } else { "false" }

$versionContent = @"
/**
 * App Version & Download Management
 * - GET /api/app-version — returns current version info (mobile checks this on startup)
 * - PUT /api/app-version — admin updates version info
 * - GET /api/app-version/download — redirects to latest APK
 */
const express = require("express");
const router = express.Router();

// In-memory version state — auto-updated by release script
const CURRENT_VERSION = {
  version: "$Version",
  versionCode: $newVersionCode,
  minVersion: "$( if ($ForceUpdate) { $Version } else { "2.0.0" } )",
  minVersionCode: $( if ($ForceUpdate) { $newVersionCode } else { 1 } ),
  releaseNotes: "$releaseNotes",
  downloadUrl: "$apkUrl",
  playStoreUrl: "",
  forceUpdate: $forceStr,
  updateMessage: "A new version of BookMyShot is available with exciting new features!",
};

// GET /api/app-version — check for updates
router.get("/", (req, res) => {
  res.json({ success: true, ...CURRENT_VERSION });
});

// GET /api/app-version/download — direct download redirect
router.get("/download", (req, res) => {
  const url = CURRENT_VERSION.playStoreUrl || CURRENT_VERSION.downloadUrl;
  if (!url) return res.status(404).json({ success: false, message: "No download URL configured" });
  res.redirect(302, url);
});

// PUT /api/app-version — admin updates version info
router.put("/", (req, res) => {
  const { version, versionCode, minVersion, minVersionCode, releaseNotes, downloadUrl, playStoreUrl, forceUpdate, updateMessage } = req.body;
  if (version) CURRENT_VERSION.version = version;
  if (versionCode) CURRENT_VERSION.versionCode = versionCode;
  if (minVersion) CURRENT_VERSION.minVersion = minVersion;
  if (minVersionCode) CURRENT_VERSION.minVersionCode = minVersionCode;
  if (releaseNotes) CURRENT_VERSION.releaseNotes = releaseNotes;
  if (downloadUrl) CURRENT_VERSION.downloadUrl = downloadUrl;
  if (playStoreUrl) CURRENT_VERSION.playStoreUrl = playStoreUrl;
  if (forceUpdate !== undefined) CURRENT_VERSION.forceUpdate = forceUpdate;
  if (updateMessage) CURRENT_VERSION.updateMessage = updateMessage;
  res.json({ success: true, message: "Version updated", ...CURRENT_VERSION });
});

module.exports = router;
"@

Set-Content -Path $VersionRoutePath -Value $versionContent
Write-Host "✓ Updated appVersion.js" -ForegroundColor Green

# Step 9: Commit and push
Set-Location $ProjectRoot
git add $VersionRoutePath
git commit -m "deploy: v$Version APK URL updated (build $newVersionCode)"
git push origin main 2>&1 | Out-Null
Write-Host "✓ Pushed to GitHub (auto-deploys to Northflank)" -ForegroundColor Green

# Done!
Write-Host "`n═══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ RELEASE COMPLETE!" -ForegroundColor Green
Write-Host "   Version: v$Version (code: $newVersionCode)"
Write-Host "   APK URL: $apkUrl"
Write-Host "   Force Update: $ForceUpdate"
Write-Host ""
Write-Host "   📱 Existing users → 'Update Available' popup on app open"
Write-Host "   🌐 Website → Download button points to latest APK"
Write-Host "   🔗 Direct link: https://bookmyshot.in/api/app-version/download"
Write-Host "═══════════════════════════════════════════`n" -ForegroundColor Cyan
