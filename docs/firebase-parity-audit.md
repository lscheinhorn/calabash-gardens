# Firebase Parity Audit

Generated: 2026-08-28T03:22:56.775Z

Project: `calabash-54fb5`

Firestore snapshot fingerprint: `5d8a3cff21e579a019b2c7b0053a2ec6fcc60c5b93932829cb0d00f2fd29db18`

Status: **NOT READY**

This command is read-only with respect to Firebase. It reads Firestore and Storage metadata, then writes this local report. It does not save drafts, publish records, upload files, change rules, regenerate the public fallback, or deploy.

## Acceptance Boundary

- Public content fields, visibility, ordering, prices, dates, photos, event menus, and site content must match the static source of truth.
- Product stock quantities/thresholds, event capacity, tickets sold, manual holds, and waitlist state are Firestore-owned operational facts and are intentionally excluded from static content comparison. Variant IDs, SKUs, price-option mapping, and value validity are still required structural checks.
- Every expected Storage object must match the reviewed upload source's exact size and MD5 checksum, and public cache photos must resolve to ordered paths in the audited bucket without retaining URL query tokens.
- Public query readiness is exercised anonymously using the exact product, category, event, and site-content read shapes. Unimplemented fallback/runtime contracts fail closed.
- Safe unpublished drafts are reported separately and do not alter live parity. Legacy drafts that cannot publish transactionally are blockers.
- The public site remains on static reads until this report is ready and Luke separately approves the switch.

## Summary

| Area | Expected | Firestore |
| --- | ---: | ---: |
| Products | 72 | 74 |
| Product categories | 8 | 9 |
| Events | 10 | 10 |
| Site content | 6 | 6 |
| Media records / Storage candidates | 57 | 20 |

- Blockers: 174
- Blocker types: 16
- Warnings: 5 across 3 types
- Generated fallback products: 74
- Active drafts: 1 (1 legacy/unsafe)

### Anonymous Public Read Probes

| Query shape | Result | Code |
| --- | --- | --- |
| products-order-by-title | denied | permission-denied |
| product-categories | denied | permission-denied |
| events-order-by-date | denied | permission-denied |
| site-content | denied | permission-denied |

## Blockers

| Area | Target | Finding |
| --- | --- | --- |
| Products | `calabash-gifts-set` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `calabash-gift-set` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `spa-day-gift-set` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `erotic-gift-set` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `saffron-maple-syrup` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `saffron-honey-4-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `saffron-simple-syrup` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `saffron-salt-2-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `vermont-grown-saffron` | expected 3 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants; price option 3 maps to 0 variants |
| Products | `saffron-tincture` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `oregano-1-2-0z` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `tarragon-1-2-0z` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `ramp-pesto-walnut` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `ramp-pesto-pecan` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `habanero-salt-2-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `thai-chili-salt-2-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `cilantro-salt-2-oz` | variant 1 needs a SKU |
| Products | `rose-sugar-2-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `ginger-sugar-2-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `cranberry-honey` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `elderflower-saffron-elixir` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `trinidad-saffron-trifecta-4-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `saffron-ghost-in-trinidad-4-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `ghost-of-saffron-carolina-4-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `saffron-red-dragon-4-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `saffron-dreams-in-peach-4-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `jalapeno-popper-4-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `the-heart-and-head-1-2-oz-loose-leaf-tea` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `easy-does-it-1-2-oz-loose-leaf-tea` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `goddess-moon-1-2-oz-loose-leaf-tea` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `brainiac-1-2-oz-loose-leaf-tea` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `wild-fire-frenzy-1-2-oz-loose-leaf-tea` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `cold-flu-1-2-oz-loose-leaf-tea` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `milk-machine-1-2-oz-loose-leaf-tea` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `sweet-relief-1-2-oz-loose-leaf-tea` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `saffron-macha-1-2-oz-loose-leaf-tea` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `tea-ball` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `sizzle` | expected 3 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants; price option 3 maps to 0 variants |
| Products | `slippery-daze-4-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `rara-magic` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `honey-dont-you-glow-clay-mask-4-0z` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `soaking-salts-5-0z` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `ageless-beauty-butter` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `ageless-beauty-oil-4-0z` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `bath-bombs` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `great-green-heal` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `heal-all` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `itch-dont-bug-me-now-10-ml` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `fungus-among-us-2-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `lip-balm-1-2-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `hydration-station` | expected 3 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants; price option 3 maps to 0 variants |
| Products | `meadow-magic-gardeners-balm` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `pain-b-gone` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `sale-30-off-silky-smooth-flower-balm` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `sunny-days-massage-oil-4-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `bo-not-today-deoderant-spray-4-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `bug-spray-4-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `facial-toner` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `headache-and-fever` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `joint-health` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `reishi-turkey-tail` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `allergy-relief` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `moon-beams-and-day-dreams` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `a-touch-of-sunshine` | price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `bitters` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `the-root-cause-bitters` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `cold-and-flu` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `lions-share` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `free-the-pee` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `goddess-moon` | expected 2 variants, found 0; price option 1 maps to 0 variants; price option 2 maps to 0 variants |
| Products | `dream-weaver-1-2-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Products | `original-blend-1-2-oz` | expected 1 variants, found 0; price option 1 maps to 0 variants |
| Product categories | `gifts` | Product categories fields differ: active. |
| Product categories | `all` | Unexpected product categories record exists. |
| Events | `calabash-experience-chef-mike-clancy` | Ordered event photo attachments differ from the static event. |
| Events | `calabash-experience-chef-mike-clancy` | Event menu/link attachment differs from the static event. |
| Events | `ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet` | Ordered event photo attachments differ from the static event. |
| Events | `ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet` | Event menu/link attachment differs from the static event. |
| Events | `fleur-de-mar-by-chef-cole-conrad-cohen` | Ordered event photo attachments differ from the static event. |
| Events | `fleur-de-mar-by-chef-cole-conrad-cohen` | Event menu/link attachment differs from the static event. |
| Events | `chuseok-by-mountain-song-kitchen` | Ordered event photo attachments differ from the static event. |
| Events | `chuseok-by-mountain-song-kitchen` | Event menu/link attachment differs from the static event. |
| Events | `a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs` | Ordered event photo attachments differ from the static event. |
| Events | `a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs` | Event menu/link attachment differs from the static event. |
| Events | `calabash-experience-solstice-dance-party-saffron-bites` | Ordered event photo attachments differ from the static event. |
| Events | `calabash-experience-solstice-dance-party-saffron-bites` | Event menu/link attachment differs from the static event. |
| Events | `deep-summer-dance-party-saffron-bites` | Ordered event photo attachments differ from the static event. |
| Events | `deep-summer-dance-party-saffron-bites` | Event menu/link attachment differs from the static event. |
| Events | `calabash-experience-chad-lumbra` | Ordered event photo attachments differ from the static event. |
| Events | `calabash-experience-chad-lumbra` | Event menu/link attachment differs from the static event. |
| Events | `we-are-more-alike-than-different-a-juneteenth-calabash-solstice-bash` | Event menu/link attachment differs from the static event. |
| Events | `calabash-experience-home-grown` | Event menu/link attachment differs from the static event. |
| Events | `publicEventAdapter` | Event menu Storage paths are not resolved to customer-usable URLs. |
| Media | `event-calabash-experience-chef-mike-clancy-menu` | mediaAssets document is missing for event-documents/calabash-experience-chef-mike-clancy-menu-menu.docx.pdf. |
| Media | `event-calabash-experience-chef-mike-clancy-photo-01` | mediaAssets document is missing for event-images/calabash-experience-chef-mike-clancy-01-event-night.jpg. |
| Media | `event-ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-menu` | mediaAssets document is missing for event-documents/ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-menu-ma-der-ma-der-menu.pdf. |
| Media | `event-ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-photo-01` | mediaAssets document is missing for event-images/ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-01-moo-and-mom-fall-joy-.jpg. |
| Media | `event-ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-photo-02` | mediaAssets document is missing for event-images/ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-02-mary-and-boys.jpg. |
| Media | `event-fleur-de-mar-by-chef-cole-conrad-cohen-menu` | mediaAssets document is missing for event-documents/fleur-de-mar-by-chef-cole-conrad-cohen-menu-fluer-de-mar.pdf. |
| Media | `event-fleur-de-mar-by-chef-cole-conrad-cohen-photo-01` | mediaAssets document is missing for event-images/fleur-de-mar-by-chef-cole-conrad-cohen-01-cole-photo.jpg. |
| Media | `event-chuseok-by-mountain-song-kitchen-menu` | mediaAssets document is missing for event-images/chuseok-by-mountain-song-kitchen-menu-mountain-song-menu.png. |
| Media | `event-chuseok-by-mountain-song-kitchen-photo-01` | mediaAssets document is missing for event-images/chuseok-by-mountain-song-kitchen-01-driscoll-and-jesa.jpg. |
| Media | `event-a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-menu` | mediaAssets document is missing for event-images/a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-menu-mountain-song-menu.png. |
| Media | `event-a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-photo-01` | mediaAssets document is missing for event-images/a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-01-driscoll-and-jesa.jpg. |
| Media | `event-calabash-experience-solstice-dance-party-saffron-bites-menu` | mediaAssets document is missing for event-documents/calabash-experience-solstice-dance-party-saffron-bites-menu-young-brothers-band-bio.pdf. |
| Media | `event-calabash-experience-solstice-dance-party-saffron-bites-photo-01` | mediaAssets document is missing for event-images/calabash-experience-solstice-dance-party-saffron-bites-01-young-brothers-band-photo.jpeg. |
| Media | `event-deep-summer-dance-party-saffron-bites-menu` | mediaAssets document is missing for event-documents/deep-summer-dance-party-saffron-bites-menu-august-23rd-buffet-menu-.pdf. |
| Media | `event-deep-summer-dance-party-saffron-bites-photo-01` | mediaAssets document is missing for event-images/deep-summer-dance-party-saffron-bites-01-flail.jpg. |
| Media | `event-deep-summer-dance-party-saffron-bites-photo-02` | mediaAssets document is missing for event-images/deep-summer-dance-party-saffron-bites-02-faux-in-love-poster-.png. |
| Media | `event-calabash-experience-chad-lumbra-menu` | mediaAssets document is missing for event-documents/calabash-experience-chad-lumbra-menu-chad-lumbra-menu-.pdf. |
| Media | `event-calabash-experience-chad-lumbra-photo-01` | mediaAssets document is missing for event-images/calabash-experience-chad-lumbra-01-chad-photo.jpg. |
| Media | `event-we-are-more-alike-than-different-a-juneteenth-calabash-solstice-bash-menu` | mediaAssets document is missing for event-documents/we-are-more-alike-than-different-a-juneteenth-calabash-solstice-bash-menu-menu.docx.pdf. |
| Media | `event-calabash-experience-home-grown-menu` | mediaAssets document is missing for event-documents/calabash-experience-home-grown-menu-menu.docx.pdf. |
| Media | `site-background-farm` | mediaAssets document is missing for site-content-images/background-farm.webp. |
| Media | `site-calabash-gardens-farm-mobile` | mediaAssets document is missing for site-content-images/calabash-gardens-farm-mobile.png. |
| Media | `site-large-logo-no-purple-square` | mediaAssets document is missing for site-content-images/large-logo-no-purple-square.png. |
| Media | `site-parallax` | mediaAssets document is missing for site-content-images/parallax.webp. |
| Media | `site-parchment-background` | mediaAssets document is missing for site-content-images/parchment-background.jpeg. |
| Media | `site-president` | mediaAssets document is missing for site-content-images/president.webp. |
| Media | `site-the-calabash-experience` | mediaAssets document is missing for site-content-images/the-calabash-experience.jpg. |
| Media | `site-vice-president` | mediaAssets document is missing for site-content-images/vice-president.webp. |
| Media | `other-calabash-gardens-farm-mobile-2` | mediaAssets document is missing for other-images/calabash-gardens-farm-mobile-2.png. |
| Media | `other-cat-sample` | mediaAssets document is missing for other-images/cat-sample.jpeg. |
| Media | `other-hands-1` | mediaAssets document is missing for other-images/hands-1.jpg. |
| Media | `other-hands-2` | mediaAssets document is missing for other-images/hands-2.jpg. |
| Media | `other-large-logo-no-purple` | mediaAssets document is missing for other-images/large-logo-no-purple.png. |
| Media | `other-large-logo-no-purple-wide` | mediaAssets document is missing for other-images/large-logo-no-purple-wide.png. |
| Media | `other-products` | mediaAssets document is missing for other-images/products.jpg. |
| Media | `other-purple-logo` | mediaAssets document is missing for other-images/purple-logo-.webp. |
| Media | `other-samantha-and-jeannie` | mediaAssets document is missing for other-images/samantha-and-jeannie.jpg. |
| Media | `event-calabash-experience-chef-mike-clancy-menu` | Storage object could not be verified (storage/unauthorized): event-documents/calabash-experience-chef-mike-clancy-menu-menu.docx.pdf. |
| Media | `event-calabash-experience-chef-mike-clancy-photo-01` | Storage object is missing: event-images/calabash-experience-chef-mike-clancy-01-event-night.jpg. |
| Media | `event-ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-menu` | Storage object could not be verified (storage/unauthorized): event-documents/ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-menu-ma-der-ma-der-menu.pdf. |
| Media | `event-ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-photo-01` | Storage object is missing: event-images/ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-01-moo-and-mom-fall-joy-.jpg. |
| Media | `event-ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-photo-02` | Storage object is missing: event-images/ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-02-mary-and-boys.jpg. |
| Media | `event-fleur-de-mar-by-chef-cole-conrad-cohen-menu` | Storage object could not be verified (storage/unauthorized): event-documents/fleur-de-mar-by-chef-cole-conrad-cohen-menu-fluer-de-mar.pdf. |
| Media | `event-fleur-de-mar-by-chef-cole-conrad-cohen-photo-01` | Storage object is missing: event-images/fleur-de-mar-by-chef-cole-conrad-cohen-01-cole-photo.jpg. |
| Media | `event-chuseok-by-mountain-song-kitchen-menu` | Storage object is missing: event-images/chuseok-by-mountain-song-kitchen-menu-mountain-song-menu.png. |
| Media | `event-chuseok-by-mountain-song-kitchen-photo-01` | Storage object is missing: event-images/chuseok-by-mountain-song-kitchen-01-driscoll-and-jesa.jpg. |
| Media | `event-a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-menu` | Storage object is missing: event-images/a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-menu-mountain-song-menu.png. |
| Media | `event-a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-photo-01` | Storage object is missing: event-images/a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-01-driscoll-and-jesa.jpg. |
| Media | `event-calabash-experience-solstice-dance-party-saffron-bites-menu` | Storage object could not be verified (storage/unauthorized): event-documents/calabash-experience-solstice-dance-party-saffron-bites-menu-young-brothers-band-bio.pdf. |
| Media | `event-calabash-experience-solstice-dance-party-saffron-bites-photo-01` | Storage object is missing: event-images/calabash-experience-solstice-dance-party-saffron-bites-01-young-brothers-band-photo.jpeg. |
| Media | `event-deep-summer-dance-party-saffron-bites-menu` | Storage object could not be verified (storage/unauthorized): event-documents/deep-summer-dance-party-saffron-bites-menu-august-23rd-buffet-menu-.pdf. |
| Media | `event-deep-summer-dance-party-saffron-bites-photo-01` | Storage object is missing: event-images/deep-summer-dance-party-saffron-bites-01-flail.jpg. |
| Media | `event-deep-summer-dance-party-saffron-bites-photo-02` | Storage object is missing: event-images/deep-summer-dance-party-saffron-bites-02-faux-in-love-poster-.png. |
| Media | `event-calabash-experience-chad-lumbra-menu` | Storage object could not be verified (storage/unauthorized): event-documents/calabash-experience-chad-lumbra-menu-chad-lumbra-menu-.pdf. |
| Media | `event-calabash-experience-chad-lumbra-photo-01` | Storage object is missing: event-images/calabash-experience-chad-lumbra-01-chad-photo.jpg. |
| Media | `event-we-are-more-alike-than-different-a-juneteenth-calabash-solstice-bash-menu` | Storage object could not be verified (storage/unauthorized): event-documents/we-are-more-alike-than-different-a-juneteenth-calabash-solstice-bash-menu-menu.docx.pdf. |
| Media | `event-calabash-experience-home-grown-menu` | Storage object could not be verified (storage/unauthorized): event-documents/calabash-experience-home-grown-menu-menu.docx.pdf. |
| Media | `site-background-farm` | Storage object is missing: site-content-images/background-farm.webp. |
| Media | `site-calabash-gardens-farm-mobile` | Storage object is missing: site-content-images/calabash-gardens-farm-mobile.png. |
| Media | `site-large-logo-no-purple-square` | Storage object is missing: site-content-images/large-logo-no-purple-square.png. |
| Media | `site-parallax` | Storage object is missing: site-content-images/parallax.webp. |
| Media | `site-parchment-background` | Storage object is missing: site-content-images/parchment-background.jpeg. |
| Media | `site-president` | Storage object is missing: site-content-images/president.webp. |
| Media | `site-the-calabash-experience` | Storage object is missing: site-content-images/the-calabash-experience.jpg. |
| Media | `site-vice-president` | Storage object is missing: site-content-images/vice-president.webp. |
| Media | `other-calabash-gardens-farm-mobile-2` | Storage object is missing: other-images/calabash-gardens-farm-mobile-2.png. |
| Media | `other-cat-sample` | Storage object is missing: other-images/cat-sample.jpeg. |
| Media | `other-hands-1` | Storage object is missing: other-images/hands-1.jpg. |
| Media | `other-hands-2` | Storage object is missing: other-images/hands-2.jpg. |
| Media | `other-large-logo-no-purple` | Storage object is missing: other-images/large-logo-no-purple.png. |
| Media | `other-large-logo-no-purple-wide` | Storage object is missing: other-images/large-logo-no-purple-wide.png. |
| Media | `other-products` | Storage object is missing: other-images/products.jpg. |
| Media | `other-purple-logo` | Storage object is missing: other-images/purple-logo-.webp. |
| Media | `other-samantha-and-jeannie` | Storage object is missing: other-images/samantha-and-jeannie.jpg. |
| Drafts | `products/saffron-maple-syrup` | Active draft predates transactional publishing and must be discarded and saved again before it can publish safely. |
| Generated fallback | `public-products-cache` | Generated fallback differs from Firestore (0 missing, 0 extra, 1 changed). |
| Generated fallback | `predeploy` | The deploy workflow does not regenerate the Firestore product fallback before building. |
| Generated fallback | `events` | Events do not have a generated Firestore fallback artifact for an outage or failed read. |
| Generated fallback | `siteContent` | Site content does not have a generated Firestore fallback artifact for an outage or failed read. |
| Public read readiness | `firestore.rules` | The anonymous product, category, event, and site-content query shapes did not all succeed; inspect the recorded probe codes before changing rules. |
| Media | `public-site-media` | Site/default media still render from bundled files instead of a Firebase Storage adapter. |

## Warnings

| Area | Target | Finding |
| --- | --- | --- |
| Products | `Title` | Extra products record is hidden from the public site. |
| Products | `test-basket` | Extra products record is hidden from the public site. |
| Events | `we-are-more-alike-than-different-a-juneteenth-calabash-solstice-bash` | Legacy published/isActive fields differ, although effective public visibility is unchanged. |
| Events | `calabash-experience-home-grown` | Legacy published/isActive fields differ, although effective public visibility is unchanged. |
| Generated fallback | `public-products-cache` | Generated fallback predates the latest Firestore product update. |

## Record Detail

### Products

- Missing: 0
- Changed: 0
- Photo attachment differences: 0
- Variant/SKU issues: 72
- Relative order matches: yes
- Visibility differences: 0
- Unexpected public: 0
- Extra but hidden: 2

Changed targets:

None.

Hidden extras:

- Title
- test-basket

### Product Categories

- Missing: 0
- Changed: 1
- Unexpected: 1

Unexpected categories:

- all

### Events

- Missing: 0
- Changed: 0
- Unexpected: 0
- Missing/different photo or menu attachments: 18
- Visibility differences: 0

Changed targets:

None.

### Site Content

- Missing: 0
- Changed: 0
- Unexpected: 0
- Relative order matches: yes

Changed targets:

None.

### Media And Storage

- Missing mediaAssets documents: 37
- Changed mediaAssets documents: 0
- Extra mediaAssets documents: 0
- Missing Storage objects: 29
- Storage objects not verifiable under current rules: 8
- Storage metadata/download differences: 0
- Product/event references that are not approved Storage paths: 0
- Product/event Storage paths without mediaAssets metadata: 0

### Generated Fallback

- Source: `firestore:calabash-54fb5`
- Missing products: 0
- Extra products: 0
- Changed products: 1
- Product order matches: yes
- Deploy refresh configured: no
- Event fallback configured: no
- Site-content fallback configured: no

## Next Gate

Resolve every blocker through separately reviewed migration or code phases, rerun `npm run audit:firebase-parity`, and review the resulting diff. A ready report is evidence for the later public-read decision; it does not itself authorize a merge, Firebase write, rules deployment, public-source switch, or site deployment.
