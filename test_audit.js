const fs = require('fs');
const code = fs.readFileSync('public/creator/creator.js', 'utf8');

const lines = code.split('\n');
console.log('Total lines:', lines.length);

// Check for unbalanced braces
let depth = 0;
let maxDepth = 0;
let minDepth = 0;
for (let i = 0; i < code.length; i++) {
  if (code[i] === '{') depth++;
  if (code[i] === '}') depth--;
  maxDepth = Math.max(maxDepth, depth);
  minDepth = Math.min(minDepth, depth);
}
console.log('Brace balance:', depth === 0 ? 'OK' : 'UNBALANCED (' + depth + ')');
console.log('Max brace depth:', maxDepth);

// Check for async functions
const asyncMatches = code.match(/async\s+function/g) || [];
console.log('Async functions:', asyncMatches.length);

// Check for try/catch
const tryMatches = code.match(/try\s*\{/g) || [];
console.log('Try/catch blocks:', tryMatches.length);

// Check for key features
const features = [
  'FullCalendar.Calendar',
  'openEventModal',
  'loadPrivateCalendar',
  'loadPublicCalendar',
  'loadProfile',
  'loadPackages',
  'loadBookingRequests',
  'loadPortfolio',
  'loadDashboard',
  'loadBookings',
  'loadPlanning',
  'loadMessages',
  'loadEarnings',
  'loadSettings',
  'loadNotifications',
  'deleteCalendarEvent',
  'handleBookingRequest',
  'deletePackage',
  'addPackageBtn',
  'avatarUpload',
  'portfolioUpload',
  'videoUpload',
  'profileForm',
  'eventForm',
  'eventModalClose',
  'eventDeleteBtn',
  'sendMsg',
  'logoutBtn',
  'menuDash',
  'notifBtn',
];
features.forEach(f => {
  const found = code.includes(f);
  if (!found) console.log('MISSING:', f);
});
console.log('All features checked:', features.every(f => code.includes(f)));

// Check for potential issues with DOM elements
const eventListeners = [
  'addEventListener("click"',
  'addEventListener("submit"',
  'addEventListener("change"',
  'addEventListener("input"',
  '.onclick =',
  '.onchange =',
];
eventListeners.forEach(el => {
  const count = (code.match(new RegExp(el.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (count > 0) console.log(el + ': ' + count);
});

console.log('\n=== AUDIT COMPLETE ===');