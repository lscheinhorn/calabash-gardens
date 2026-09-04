# Firebase Hosting Production

## Purpose

The production Firebase Hosting build moves the existing public React site to Firebase Hosting without switching the public catalog to Firestore or enabling unreleased server checkout work.

## Production Contract

`npm run build:firebase-hosting` sets every release-sensitive flag explicitly:

- browser routing is enabled for clean URLs;
- the temporary read-only preview mode is disabled;
- public products remain on the static catalog;
- Firebase emulators are disabled;
- server-owned PayPal checkout remains disabled;
- PayPal webhook review remains disabled.

With preview mode off, the existing client-side PayPal checkout, EmailJS contact form, waitlist behavior, password reset, and approved admin editing tools remain available. Events and site content retain their current public source behavior.

## Deployment Boundary

Run:

```bash
npm run deploy:firebase-hosting
```

The command builds the production artifact and deploys only Firebase Hosting to project/site `calabash-54fb5`. It does not deploy Functions, Firestore rules, Storage rules, or Firebase business data.

## Release Checks

Before deployment:

1. Run the regular React test suite and Hosting configuration tests.
2. Run the Functions syntax check because the client still imports guarded callable-function code.
3. Build both the Firebase production artifact and the retained GitHub Pages rollback artifact.
4. Confirm the protected business-content diff is empty.
5. Review the branch diff and production flags independently.

After deployment, verify Home, Shop, product detail, Events, Contact, Cart, Admin, direct clean-route refreshes, legacy hash-route conversion, security/cache headers, and the presence of normal production controls. Do not submit a real payment, contact message, waitlist entry, password reset, or admin write solely for deployment testing.

## Custom Domain And Rollback

The default Firebase URL can be verified before DNS changes. The custom domain moves only after Firebase reports the required domain records and those records are applied at the active DNS provider.

Keep the existing `gh-pages` branch and GitHub Pages deployment intact during the cutover. If Firebase verification fails after DNS changes, restore the prior DNS records to point the custom domain back to GitHub Pages.

The Content Security Policy remains report-only during the first production observation period. It must be reviewed against normal PayPal, EmailJS, Firebase, Storage, and YouTube traffic before enforcement.

## Current Release State

Production Hosting was deployed on 2026-09-04 from commit `f428b73`:

- Firebase URL: `https://calabash-54fb5.web.app`
- Firebase release: `2c8f64`
- JavaScript bundle: `main.70583ccb.js`
- Custom domain: `https://www.calabashgardens.com` is connected with trusted HTTPS

Namecheap now points the `www.calabashgardens.com` CNAME to `calabash-54fb5.web.app`, and Firebase reports the domain `Connected`. Home, Shop, Events, Contact, Cart, Admin, unknown clean routes, and fresh legacy hash-bookmark conversion were verified against the custom domain. The existing GitHub Pages deployment remains intact; restoring the prior `www -> lscheinhorn.github.io` CNAME is the rollback path.
