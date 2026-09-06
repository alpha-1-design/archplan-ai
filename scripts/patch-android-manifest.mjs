/**
 * Patches the generated AndroidManifest.xml inside a Capacitor Android project
 * so mic-driven voice mode works over plain HTTP and file:// origins.
 *
 * Usage: node scripts/patch-android-manifest.mjs <path-to-AndroidManifest.xml>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node patch-android-manifest.mjs <AndroidManifest.xml>');
  process.exit(1);
}

let xml = readFileSync(file, 'utf8');
let changed = false;

// 1. usesCleartextTraffic on <application>
if (!xml.includes('android:usesCleartextTraffic')) {
  xml = xml.replace(/<application\b/, '<application\n        android:usesCleartextTraffic="true"');
  changed = true;
}

// 2. RECORD_AUDIO permission (mic for voice mode)
if (!xml.includes('android.permission.RECORD_AUDIO')) {
  xml = xml.replace(
    /(<\/application>)/,
    '    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n$1'
  );
  changed = true;
}

// 3. INTERNET permission
if (changed && !xml.includes('android.permission.INTERNET')) {
  xml = xml.replace(
    /(<\/application>)/,
    '    <uses-permission android:name="android.permission.INTERNET" />\n$1'
  );
  changed = true;
}

if (!changed && !xml.includes('android.permission.RECORD_AUDIO')) {
  // fallback: manifest already had cleartext but was missing permissions
  xml = xml.replace(
    /(<\/application>)/,
    '    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n    <uses-permission android:name="android.permission.INTERNET" />\n$1'
  );
  changed = true;
}

writeFileSync(file, xml);
console.log(`patched ${file}`);
