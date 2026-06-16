# Firebase Ownership Audit

Generated: 2026-06-16

Read-only local audit. This report does not upload files, query Firebase, create Firestore documents, edit protected static resources, or deploy rules.

## Summary

- Product media candidates already covered by product migration: 16
- Product photo placeholders intentionally skipped: 62
- Product-folder photos currently heading to Other bin: 4
- Event media references found: 20 (10 photos, 10 menu/link files)
- Site media assets referenced by components/CSS: 8
- Additional unowned local image candidates for Other bin: 9
- Expected editable siteContent documents: 6
- Code-owned UI/content surfaces still needing an owner decision: 7
- External media links needing editable ownership: 2
- Missing source files: 0
- Image files over 10 MB needing optimization review: 3
- Event document/menu files needing new Storage rules: 8
- Shared source files needing reuse/linking decisions: 4

## Scope Guardrails

- Protected files were treated as read-only inputs for this audit.
- Public product/event/content reads are not switched to Firestore by this audit.
- Event photos and menu links remain intentionally absent from the current event seed until a reviewed upload/import phase is approved.
- Inventory remains static and should get a separate backend plan before checkout behavior changes.

## Site Content Documents

| Firestore Doc | Title | Static Source |
| --- | --- | --- |
| siteContent/home | Home Header | src/resources/content.js: content.home.header |
| siteContent/banner | Home Banner | src/resources/content.js: content.home.banner |
| siteContent/offerings | Offerings | src/resources/content.js: content.home.offerings |
| siteContent/about | About | src/resources/content.js: content.home.about |
| siteContent/team | Team | src/resources/content.js: content.home.team |
| siteContent/experienceBlurb | Experience Blurb | src/resources/events.js: experienceBlurb |

## Product Media Ownership

Product media candidates are the same reviewed product-photo migration set. Shared default placeholders stay skipped unless Luke approves real replacement photos.

| Media Asset ID | Product | Source File | Proposed Storage Path | Size Bytes | Status |
| --- | --- | --- | --- | --- | --- |
| product-calabash-gifts-set-01 | Calabash Gifts Set | src/resources/images/product_photos/calabash_gifts_set.jpeg | product-images/calabash-gifts-set-01-calabash-gifts-set.jpeg | 1279850 | supported by current image Storage rules |
| product-calabash-gift-set-01 | Calabash Gift Set | src/resources/images/product_photos/calabash_gift_set.webp | product-images/calabash-gift-set-01-calabash-gift-set.webp | 107208 | supported by current image Storage rules |
| product-spa-day-gift-set-01 | Spa Day Gift Set | src/resources/images/product_photos/spa_day_gift_set.webp | product-images/spa-day-gift-set-01-spa-day-gift-set.webp | 83706 | supported by current image Storage rules |
| product-erotic-gift-set-01 | Erotic Gift Set | src/resources/images/product_photos/erotic_gift_set.webp | product-images/erotic-gift-set-01-erotic-gift-set.webp | 97064 | supported by current image Storage rules |
| product-saffron-maple-syrup-01 | Saffron Maple Syrup | src/resources/images/product_photos/saffron_maple_syrup.webp | product-images/saffron-maple-syrup-01-saffron-maple-syrup.webp | 130194 | supported by current image Storage rules |
| product-saffron-simple-syrup-01 | Saffron Simple Syrup | src/resources/images/product_photos/saffron_simple_syrup.jpg | product-images/saffron-simple-syrup-01-saffron-simple-syrup.jpg | 18087346 | supported image path; optimization review recommended over 10 MB |
| product-vermont-grown-saffron-01 | Vermont Grown Saffron | src/resources/images/product_photos/0.5g_vermont_grown_saffron_1.webp | product-images/vermont-grown-saffron-01-0.5g-vermont-grown-saffron-1.webp | 104694 | supported by current image Storage rules |
| product-vermont-grown-saffron-02 | Vermont Grown Saffron | src/resources/images/product_photos/0.5g_vermont_grown_saffron_2.webp | product-images/vermont-grown-saffron-02-0.5g-vermont-grown-saffron-2.webp | 106068 | supported by current image Storage rules |
| product-vermont-grown-saffron-03 | Vermont Grown Saffron | src/resources/images/product_photos/0.5g_vermont_grown_saffron_3.webp | product-images/vermont-grown-saffron-03-0.5g-vermont-grown-saffron-3.webp | 191330 | supported by current image Storage rules |
| product-vermont-grown-saffron-04 | Vermont Grown Saffron | src/resources/images/product_photos/1g_vt_grown_saffron.webp | product-images/vermont-grown-saffron-04-1g-vt-grown-saffron.webp | 44172 | supported by current image Storage rules |
| product-vermont-grown-saffron-05 | Vermont Grown Saffron | src/resources/images/product_photos/2g_vt_grown_saffron_1.webp | product-images/vermont-grown-saffron-05-2g-vt-grown-saffron-1.webp | 148114 | supported by current image Storage rules |
| product-vermont-grown-saffron-06 | Vermont Grown Saffron | src/resources/images/product_photos/2g_vt_grown_saffron_2.webp | product-images/vermont-grown-saffron-06-2g-vt-grown-saffron-2.webp | 106068 | supported by current image Storage rules |
| product-saffron-tincture-01 | Saffron Tincture | src/resources/images/product_photos/saffron_tincture.webp | product-images/saffron-tincture-01-saffron-tincture.webp | 91400 | supported by current image Storage rules |
| product-the-heart-and-head-1-2-oz-loose-leaf-tea-01 | The Heart and Head 1/2 oz Loose Leaf Tea | src/resources/images/product_photos/the_heart_and_the_head.jpg | product-images/the-heart-and-head-1-2-oz-loose-leaf-tea-01-the-heart-and-the-head.jpg | 10269768 | supported by current image Storage rules |
| product-ageless-beauty-butter-01 | Ageless Beauty Butter | src/resources/images/product_photos/ageless_beauty_body_butter.jpg | product-images/ageless-beauty-butter-01-ageless-beauty-body-butter.jpg | 8521883 | supported by current image Storage rules |
| product-cold-and-flu-01 | Cold and Flu | src/resources/images/product_photos/cold_and_flu.jpg | product-images/cold-and-flu-01-cold-and-flu.jpg | 8136386 | supported by current image Storage rules |

## Product-Folder Other Bin Candidates

These files are under `src/resources/images/product_photos/` but are not currently linked to a static product photo field. Some may be claimed by event media in the full-site audit and should be linked or moved in metadata instead of duplicated.

| Media Asset ID | Source File | Proposed Storage Path | Size Bytes | Status |
| --- | --- | --- | --- | --- |
| other-img-1785 | src/resources/images/product_photos/IMG-1785.jpg | other-images/img-1785.jpg | 1026892 | supported by current image Storage rules |
| other-img-2623 | src/resources/images/product_photos/IMG-2623.JPG | other-images/img-2623.jpg | 1929965 | supported by current image Storage rules |
| other-event-night | src/resources/images/product_photos/event_night.jpg | other-images/event-night.jpg | 2242101 | supported by current image Storage rules |
| other-saffron-tin | src/resources/images/product_photos/saffron_tin.jpg | other-images/saffron-tin.jpg | 15689035 | supported image path; optimization review recommended over 10 MB |

## Event Media Ownership

Event text is already mirrored through the guarded event seed/editor path. These bundled media refs still need upload/import planning before event preview/public reads can be complete.

| Event | Field | Source File | Proposed Storage Path | Size Bytes | Status |
| --- | --- | --- | --- | --- | --- |
| Calabash Experience, Chef Mike Clancy | link | src/resources/Menu.docx.pdf | event-documents/calabash-experience-chef-mike-clancy-menu-menu.docx.pdf | 21756 | needs new Storage rule for event documents |
| Calabash Experience, Chef Mike Clancy | photo | src/resources/images/product_photos/event_night.jpg | event-images/calabash-experience-chef-mike-clancy-01-event-night.jpg | 2242101 | supported by current image Storage rules |
| Ma-Der! Ma-Der! <br>Lao Cuisine By Chef Mary and Phet | link | src/resources/images/Ma-Der_Ma-Der_Menu.pdf | event-documents/ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-menu-ma-der-ma-der-menu.pdf | 52513 | needs new Storage rule for event documents |
| Ma-Der! Ma-Der! <br>Lao Cuisine By Chef Mary and Phet | photo | src/resources/images/Moo_and_Mom_Fall_Joy_.jpg | event-images/ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-01-moo-and-mom-fall-joy-.jpg | 1667388 | supported by current image Storage rules |
| Ma-Der! Ma-Der! <br>Lao Cuisine By Chef Mary and Phet | photo | src/resources/images/Mary_and_boys.jpg | event-images/ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-02-mary-and-boys.jpg | 603171 | supported by current image Storage rules |
| Fleur De Mar <br>by Chef Cole Conrad Cohen | link | src/resources/images/Fluer_De_Mar.pdf | event-documents/fleur-de-mar-by-chef-cole-conrad-cohen-menu-fluer-de-mar.pdf | 28989 | needs new Storage rule for event documents |
| Fleur De Mar <br>by Chef Cole Conrad Cohen | photo | src/resources/images/cole_photo.jpg | event-images/fleur-de-mar-by-chef-cole-conrad-cohen-01-cole-photo.jpg | 373583 | supported by current image Storage rules |
| Chuseok <br>by Mountain Song Kitchen | link | src/resources/images/Mountain_Song_Menu.png | event-images/chuseok-by-mountain-song-kitchen-menu-mountain-song-menu.png | 600264 | supported by current image Storage rules |
| Chuseok <br>by Mountain Song Kitchen | photo | src/resources/images/Driscoll_and_Jesa.jpg | event-images/chuseok-by-mountain-song-kitchen-01-driscoll-and-jesa.jpg | 576935 | supported by current image Storage rules |
| A Taste of Season in Vermont <br>by Chefs Samantha Langevin and Jeannie Kovacs | link | src/resources/images/Mountain_Song_Menu.png | event-images/a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-menu-mountain-song-menu.png | 600264 | supported by current image Storage rules |
| A Taste of Season in Vermont <br>by Chefs Samantha Langevin and Jeannie Kovacs | photo | src/resources/images/Driscoll_and_Jesa.jpg | event-images/a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-01-driscoll-and-jesa.jpg | 576935 | supported by current image Storage rules |
| Calabash Experience, Solstice Dance Party, Saffron Bites | link | src/resources/young_brothers_band_bio.pdf | event-documents/calabash-experience-solstice-dance-party-saffron-bites-menu-young-brothers-band-bio.pdf | 55388 | needs new Storage rule for event documents |
| Calabash Experience, Solstice Dance Party, Saffron Bites | photo | src/resources/images/young_brothers_band_photo.jpeg | event-images/calabash-experience-solstice-dance-party-saffron-bites-01-young-brothers-band-photo.jpeg | 55695 | supported by current image Storage rules |
| Deep Summer Dance Party, Saffron Bites | link | src/resources/images/August 23rd Buffet Menu_.pdf | event-documents/deep-summer-dance-party-saffron-bites-menu-august-23rd-buffet-menu-.pdf | 27707 | needs new Storage rule for event documents |
| Deep Summer Dance Party, Saffron Bites | photo | src/resources/images/FLAIL.JPG | event-images/deep-summer-dance-party-saffron-bites-01-flail.jpg | 6821101 | supported by current image Storage rules |
| Deep Summer Dance Party, Saffron Bites | photo | src/resources/images/Faux in Love Poster .png | event-images/deep-summer-dance-party-saffron-bites-02-faux-in-love-poster-.png | 1440685 | supported by current image Storage rules |
| Calabash Experience, Chad Lumbra | link | src/resources/images/Chad Lumbra menu .pdf | event-documents/calabash-experience-chad-lumbra-menu-chad-lumbra-menu-.pdf | 33689 | needs new Storage rule for event documents |
| Calabash Experience, Chad Lumbra | photo | src/resources/images/chad_photo.jpg | event-images/calabash-experience-chad-lumbra-01-chad-photo.jpg | 1760380 | supported by current image Storage rules |
| We Are More Alike Than Different, A Juneteenth Calabash Solstice Bash | link | src/resources/Menu.docx.pdf | event-documents/we-are-more-alike-than-different-a-juneteenth-calabash-solstice-bash-menu-menu.docx.pdf | 21756 | needs new Storage rule for event documents |
| Calabash Experience, Home Grown | link | src/resources/Menu.docx.pdf | event-documents/calabash-experience-home-grown-menu-menu.docx.pdf | 21756 | needs new Storage rule for event documents |

## Site Media Ownership

| Media Asset ID | Source File | Proposed Storage Path | Referenced By | Status |
| --- | --- | --- | --- | --- |
| site-background-farm | src/resources/images/background_farm.webp | site-content-images/background-farm.webp | src/Components/Banner/Banner.css | supported by current image Storage rules |
| site-calabash-gardens-farm-mobile | src/resources/images/calabash-gardens-farm-mobile.png | site-content-images/calabash-gardens-farm-mobile.png | src/Components/Banner/Banner.css | supported by current image Storage rules |
| site-large-logo-no-purple-square | src/resources/images/large_logo_no_purple_square.png | site-content-images/large-logo-no-purple-square.png | src/Components/Footer/Footer.js<br>src/Components/Header/Header.js | supported by current image Storage rules |
| site-parallax | src/resources/images/parallax.webp | site-content-images/parallax.webp | src/Components/Parallax/Parallax.css | supported by current image Storage rules |
| site-parchment-background | src/resources/images/parchment_background.jpeg | site-content-images/parchment-background.jpeg | src/Components/Events/Events.css | supported by current image Storage rules |
| site-president | src/resources/images/president.webp | site-content-images/president.webp | src/Components/Team/Team.js | supported by current image Storage rules |
| site-the-calabash-experience | src/resources/images/The_Calabash_Experience.jpg | site-content-images/the-calabash-experience.jpg | src/Components/Experience/Experience.js | supported by current image Storage rules |
| site-vice-president | src/resources/images/vice_president.webp | site-content-images/vice-president.webp | src/Components/Team/Team.js | supported by current image Storage rules |

## Other Image Candidates

These images are present under `src/resources/images/` but were not claimed by product, event, or site component references. They are safest as reviewed `other` bin assets first.

| Media Asset ID | Source File | Proposed Storage Path | Size Bytes | Status |
| --- | --- | --- | --- | --- |
| other-calabash-gardens-farm-mobile-2 | src/resources/images/calabash-gardens-farm-mobile-2.png | other-images/calabash-gardens-farm-mobile-2.png | 441970 | supported by current image Storage rules |
| other-cat-sample | src/resources/images/cat-sample.jpeg | other-images/cat-sample.jpeg | 6107 | supported by current image Storage rules |
| other-hands-1 | src/resources/images/hands_1.jpg | other-images/hands-1.jpg | 8260831 | supported by current image Storage rules |
| other-hands-2 | src/resources/images/hands_2.jpg | other-images/hands-2.jpg | 11872650 | supported image path; optimization review recommended over 10 MB |
| other-large-logo-no-purple | src/resources/images/large_logo_no_purple.png | other-images/large-logo-no-purple.png | 116285 | supported by current image Storage rules |
| other-large-logo-no-purple-wide | src/resources/images/large_logo_no_purple_wide.png | other-images/large-logo-no-purple-wide.png | 104818 | supported by current image Storage rules |
| other-products | src/resources/images/products.jpg | other-images/products.jpg | 58693 | supported by current image Storage rules |
| other-purple-logo | src/resources/images/purple_logo .webp | other-images/purple-logo-.webp | 14586 | supported by current image Storage rules |
| other-samantha-and-jeannie | src/resources/images/samantha_and_jeannie.jpg | other-images/samantha-and-jeannie.jpg | 1302799 | supported by current image Storage rules |

## Code-Owned Copy Surfaces

These are not product/event/content records yet. To make the whole site a true CRUD editor, each surface needs a reviewed Firestore owner before public behavior changes.

| Area | Files | Examples | Recommended Owner |
| --- | --- | --- | --- |
| Navigation | src/Components/Navbar/Navbar.js | Home, Shop, The Calabash Experience, Contact Us | siteContent/navigation or siteSettings/navigation |
| Shop chrome | src/Components/Shop/Shop.js<br>src/Components/Product/Product.js | Shop by category, Add To Cart, Out of Stock | siteContent/shopUi |
| Product detail chrome | src/Components/ProductPage/ProductPage.js | Continue Shopping, Check out our tasting menu here, Read more | siteContent/productUi |
| Cart and checkout chrome | src/Components/Cart/Cart.js<br>src/Components/Cart/Checkout/Paypal.js | Your cart is empty, Shipping, Thank you for your purchase | siteContent/cartUi |
| Contact form chrome | src/Components/Contact/Contact.js | Send, Message sent, Message failed | siteContent/contactUi |
| Event purchase chrome | src/Components/Events/Events.js<br>src/Components/Event/Event.js | Previous Experience, Next Experience, Adults, Children 12 & under, Go to Cart | siteContent/eventUi |
| Embedded media copy and URLs | src/Components/Media/Media.js | YouTube embed URL, YouTube outbound link | siteContent/media or siteSettings/externalLinks |

## External Media Links

| Type | Source File | URL | Suggested Owner |
| --- | --- | --- | --- |
| youtube | src/Components/Media/Media.js | https://www.youtube.com/embed/6kM92Zkr2lk?si=TsQip8wOTTx7JA_s&amp;start=323&end=532&rel=0 | siteSettings/externalLinks or siteContent/media |
| youtube | src/Components/Media/Media.js | https://youtu.be/6kM92Zkr2lk?si=gARkuIvKEGVfIXJr | siteSettings/externalLinks or siteContent/media |

## Blockers And Review Items

### Event Documents Needing Rules

| Source File | Proposed Storage Path | Status |
| --- | --- | --- |
| src/resources/Menu.docx.pdf | event-documents/calabash-experience-chef-mike-clancy-menu-menu.docx.pdf | needs new Storage rule for event documents |
| src/resources/images/Ma-Der_Ma-Der_Menu.pdf | event-documents/ma-der-ma-der-lao-cuisine-by-chef-mary-and-phet-menu-ma-der-ma-der-menu.pdf | needs new Storage rule for event documents |
| src/resources/images/Fluer_De_Mar.pdf | event-documents/fleur-de-mar-by-chef-cole-conrad-cohen-menu-fluer-de-mar.pdf | needs new Storage rule for event documents |
| src/resources/young_brothers_band_bio.pdf | event-documents/calabash-experience-solstice-dance-party-saffron-bites-menu-young-brothers-band-bio.pdf | needs new Storage rule for event documents |
| src/resources/images/August 23rd Buffet Menu_.pdf | event-documents/deep-summer-dance-party-saffron-bites-menu-august-23rd-buffet-menu-.pdf | needs new Storage rule for event documents |
| src/resources/images/Chad Lumbra menu .pdf | event-documents/calabash-experience-chad-lumbra-menu-chad-lumbra-menu-.pdf | needs new Storage rule for event documents |
| src/resources/Menu.docx.pdf | event-documents/we-are-more-alike-than-different-a-juneteenth-calabash-solstice-bash-menu-menu.docx.pdf | needs new Storage rule for event documents |
| src/resources/Menu.docx.pdf | event-documents/calabash-experience-home-grown-menu-menu.docx.pdf | needs new Storage rule for event documents |

### Large Image Review

| Source File | Size Bytes | Proposed Storage Path |
| --- | --- | --- |
| src/resources/images/product_photos/saffron_simple_syrup.jpg | 18087346 | product-images/saffron-simple-syrup-01-saffron-simple-syrup.jpg |
| src/resources/images/product_photos/saffron_tin.jpg | 15689035 | other-images/saffron-tin.jpg |
| src/resources/images/hands_2.jpg | 11872650 | other-images/hands-2.jpg |

### Missing Sources

| Source File | Proposed Storage Path |
| --- | --- |
| None |  |

### Shared Source Review

These source files appear in more than one ownership candidate. Before upload/import, decide whether to reuse one Storage object, create event-specific copies, or relink existing Other-bin metadata.

| Source File | Candidate Storage Paths |
| --- | --- |
| src/resources/images/Driscoll_and_Jesa.jpg | event-chuseok-by-mountain-song-kitchen-photo-01: event-images/chuseok-by-mountain-song-kitchen-01-driscoll-and-jesa.jpg<br>event-a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-photo-01: event-images/a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-01-driscoll-and-jesa.jpg |
| src/resources/images/Mountain_Song_Menu.png | event-chuseok-by-mountain-song-kitchen-menu: event-images/chuseok-by-mountain-song-kitchen-menu-mountain-song-menu.png<br>event-a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-menu: event-images/a-taste-of-season-in-vermont-by-chefs-samantha-langevin-and-jeannie-kovacs-menu-mountain-song-menu.png |
| src/resources/images/product_photos/event_night.jpg | other-event-night: other-images/event-night.jpg<br>event-calabash-experience-chef-mike-clancy-photo-01: event-images/calabash-experience-chef-mike-clancy-01-event-night.jpg |
| src/resources/Menu.docx.pdf | event-calabash-experience-chef-mike-clancy-menu: event-documents/calabash-experience-chef-mike-clancy-menu-menu.docx.pdf<br>event-we-are-more-alike-than-different-a-juneteenth-calabash-solstice-bash-menu: event-documents/we-are-more-alike-than-different-a-juneteenth-calabash-solstice-bash-menu-menu.docx.pdf<br>event-calabash-experience-home-grown-menu: event-documents/calabash-experience-home-grown-menu-menu.docx.pdf |

## Next Approval Gate

Before any write phase, approve:

- the event image and event document Storage paths
- whether to add document upload rules for event menus and bios
- which Other-bin images should be uploaded
- the Firestore owner for navigation, cart, contact, product UI, event UI, and external-media settings
- whether inventory moves next or remains static until checkout requirements are clarified
