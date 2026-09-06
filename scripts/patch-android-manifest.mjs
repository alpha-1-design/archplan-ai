/**
 * Patches the generated AndroidManifest.xml inside a Capacitor Android project
 * so mic-driven voice mode works over plain HTTP and file:// origins.
 *
 * IMPORTANT: <uses-permission> elements MUST be children of <manifest>,
 * NOT of <application> — putting them inside <application> produces an
 * invalid manifest and fails the gradle build during manifest merging.
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
const before = xml;

// 1. usesCleartextTraffic on <application> (valid as an application attribute)
if (!xml.includes('android:usesCleartextTraffic')) {
  xml = xml.replace(/<application\b/, '<application\n        android:usesCleartextTraffic="true"');
}

// 2. RECORD_AUDIO permission at MANIFEST level (insert just before <application>)
if (!xml.includes('android.permission.RECORD_AUDIO')) {
  xml = xml.replace(
    /(\s*<application\b)/,
    '\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />$1'
  );
}

// 3. INTERNET permission at MANIFEST level, if not already present
if (!xml.includes('android.permission.INTERNET')) {
  xml = xml.replace(
    /(\s*<application\b)/,
    '\n    <uses-permission android:name="android.permission.INTERNET" />$1'
  );
}

if (xml !== before) {
  writeFileSync(file, xml);
  console.log(`patched ${file}`);
} else {
  console.log(`no changes needed for ${file}`);
}
