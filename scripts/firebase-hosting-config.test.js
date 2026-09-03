const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(projectRoot, "firebase.json"), "utf8"));
const firebaseRc = JSON.parse(fs.readFileSync(path.join(projectRoot, ".firebaserc"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));

const headersForSource = (source) => firebaseConfig.hosting.headers
  .find((entry) => entry.source === source)?.headers || [];
const headerValue = (headers, key) => headers.find((header) => header.key === key)?.value || "";

test("Firebase Hosting serves the production build through a clean SPA rewrite", () => {
  assert.equal(firebaseConfig.hosting.public, "build");
  assert.equal(firebaseConfig.hosting.site, "calabash-54fb5");
  assert.equal(firebaseConfig.hosting.trailingSlash, false);
  assert.deepEqual(firebaseConfig.hosting.rewrites, [{
    destination: "/index.html",
    source: "**",
  }]);
});

test("security headers keep CSP report-only during preview validation", () => {
  const securityHeaders = headersForSource("**");
  const csp = headerValue(securityHeaders, "Content-Security-Policy-Report-Only");

  assert.equal(headerValue(securityHeaders, "Content-Security-Policy"), "");
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /https:\/\/identitytoolkit\.googleapis\.com/);
  assert.match(csp, /https:\/\/securetoken\.googleapis\.com/);
  assert.match(csp, /https:\/\/firestore\.googleapis\.com/);
  assert.match(csp, /https:\/\/us-central1-calabash-54fb5\.cloudfunctions\.net/);
  assert.match(csp, /https:\/\/www\.paypal\.com/);
  assert.match(csp, /https:\/\/api\.emailjs\.com/);
  assert.match(csp, /https:\/\/www\.youtube\.com/);
  assert.doesNotMatch(csp, /https:\/\/\*\.googleapis\.com/);
  assert.doesNotMatch(csp, /https:\/\/\*\.cloudfunctions\.net/);
  assert.doesNotMatch(csp, /firebaseio\.com/);
  assert.equal(headerValue(securityHeaders, "Cross-Origin-Opener-Policy"), "same-origin-allow-popups");
  assert.equal(headerValue(securityHeaders, "X-Content-Type-Options"), "nosniff");
  assert.equal(headerValue(securityHeaders, "X-Frame-Options"), "SAMEORIGIN");
  assert.equal(headerValue(securityHeaders, "Cache-Control"), "no-cache");
});

test("HTML revalidates while hashed static assets remain immutable", () => {
  assert.equal(headerValue(headersForSource("/index.html"), "Cache-Control"), "no-cache");
  assert.equal(
    headerValue(headersForSource("/static/**"), "Cache-Control"),
    "public,max-age=31536000,immutable",
  );
});

test("preview builds explicitly retain the current production safety switches", () => {
  const buildScript = packageJson.scripts["build:firebase-preview"];
  const previewScript = packageJson.scripts["deploy:firebase-preview"];

  assert.match(buildScript, /REACT_APP_PUBLIC_PRODUCTS_SOURCE=static/);
  assert.match(buildScript, /REACT_APP_DEPLOYMENT_PREVIEW=true/);
  assert.match(buildScript, /REACT_APP_ROUTER_MODE=browser/);
  assert.match(buildScript, /REACT_APP_FIREBASE_USE_EMULATORS=false/);
  assert.match(buildScript, /REACT_APP_PAYPAL_SERVER_CHECKOUT=disabled/);
  assert.match(buildScript, /REACT_APP_PAYPAL_WEBHOOK_REVIEW=disabled/);
  assert.match(previewScript, /hosting:channel:deploy phase45-preview/);
  assert.match(previewScript, /--project calabash-54fb5/);
  assert.doesNotMatch(previewScript, /firebase-tools deploy --only hosting/);
});

test("the existing GitHub Pages deploy remains pinned to hash routing", () => {
  assert.equal(packageJson.scripts.predeploy, "npm run build:github-pages");
  assert.match(packageJson.scripts["build:github-pages"], /REACT_APP_ROUTER_MODE=hash/);
});

test("Firebase commands cannot inherit an unreviewed default project", () => {
  assert.equal(firebaseRc.projects?.default, undefined);
});
