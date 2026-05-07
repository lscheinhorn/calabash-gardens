# Media Migration Dry Run

Generated: 2026-05-07

Dry-run only. This report does not upload files, create Firestore documents, update products, edit static resources, or deploy rules.

## Summary

- Storage uploads planned: 20
- Product image uploads planned: 16
- Other image uploads planned: 4
- mediaAssets documents planned: 20
- Product documents that would receive photo references: 11
- Product photo references planned: 16
- Default placeholder references skipped: 62
- Upload blockers over 10 MB: 2

## Upload Blockers

These files exceed the current 10 MB Storage rule limit and need resizing/compression or an approved rules change before a real upload.

| Media Asset ID | Source File | Size Bytes | Storage Path |
| --- | --- | --- | --- |
| product-saffron-simple-syrup-01 | src/resources/images/product_photos/saffron_simple_syrup.jpg | 18087346 | product-images/saffron-simple-syrup-01-saffron-simple-syrup.jpg |
| other-saffron-tin | src/resources/images/product_photos/saffron_tin.jpg | 15689035 | other-images/saffron-tin.jpg |

## Planned Storage Uploads

| Media Asset ID | Bin | Source File | Storage Path | Content Type | Size Bytes |
| --- | --- | --- | --- | --- | --- |
| product-calabash-gifts-set-01 | products | src/resources/images/product_photos/calabash_gifts_set.jpeg | product-images/calabash-gifts-set-01-calabash-gifts-set.jpeg | image/jpeg | 1279850 |
| product-calabash-gift-set-01 | products | src/resources/images/product_photos/calabash_gift_set.webp | product-images/calabash-gift-set-01-calabash-gift-set.webp | image/webp | 107208 |
| product-spa-day-gift-set-01 | products | src/resources/images/product_photos/spa_day_gift_set.webp | product-images/spa-day-gift-set-01-spa-day-gift-set.webp | image/webp | 83706 |
| product-erotic-gift-set-01 | products | src/resources/images/product_photos/erotic_gift_set.webp | product-images/erotic-gift-set-01-erotic-gift-set.webp | image/webp | 97064 |
| product-saffron-maple-syrup-01 | products | src/resources/images/product_photos/saffron_maple_syrup.webp | product-images/saffron-maple-syrup-01-saffron-maple-syrup.webp | image/webp | 130194 |
| product-saffron-simple-syrup-01 | products | src/resources/images/product_photos/saffron_simple_syrup.jpg | product-images/saffron-simple-syrup-01-saffron-simple-syrup.jpg | image/jpeg | 18087346 |
| product-vermont-grown-saffron-01 | products | src/resources/images/product_photos/0.5g_vermont_grown_saffron_1.webp | product-images/vermont-grown-saffron-01-0.5g-vermont-grown-saffron-1.webp | image/webp | 104694 |
| product-vermont-grown-saffron-02 | products | src/resources/images/product_photos/0.5g_vermont_grown_saffron_2.webp | product-images/vermont-grown-saffron-02-0.5g-vermont-grown-saffron-2.webp | image/webp | 106068 |
| product-vermont-grown-saffron-03 | products | src/resources/images/product_photos/0.5g_vermont_grown_saffron_3.webp | product-images/vermont-grown-saffron-03-0.5g-vermont-grown-saffron-3.webp | image/webp | 191330 |
| product-vermont-grown-saffron-04 | products | src/resources/images/product_photos/1g_vt_grown_saffron.webp | product-images/vermont-grown-saffron-04-1g-vt-grown-saffron.webp | image/webp | 44172 |
| product-vermont-grown-saffron-05 | products | src/resources/images/product_photos/2g_vt_grown_saffron_1.webp | product-images/vermont-grown-saffron-05-2g-vt-grown-saffron-1.webp | image/webp | 148114 |
| product-vermont-grown-saffron-06 | products | src/resources/images/product_photos/2g_vt_grown_saffron_2.webp | product-images/vermont-grown-saffron-06-2g-vt-grown-saffron-2.webp | image/webp | 106068 |
| product-saffron-tincture-01 | products | src/resources/images/product_photos/saffron_tincture.webp | product-images/saffron-tincture-01-saffron-tincture.webp | image/webp | 91400 |
| product-the-heart-and-head-1-2-oz-loose-leaf-tea-01 | products | src/resources/images/product_photos/the_heart_and_the_head.jpg | product-images/the-heart-and-head-1-2-oz-loose-leaf-tea-01-the-heart-and-the-head.jpg | image/jpeg | 10269768 |
| product-ageless-beauty-butter-01 | products | src/resources/images/product_photos/ageless_beauty_body_butter.jpg | product-images/ageless-beauty-butter-01-ageless-beauty-body-butter.jpg | image/jpeg | 8521883 |
| product-cold-and-flu-01 | products | src/resources/images/product_photos/cold_and_flu.jpg | product-images/cold-and-flu-01-cold-and-flu.jpg | image/jpeg | 8136386 |
| other-img-1785 | other | src/resources/images/product_photos/IMG-1785.jpg | other-images/img-1785.jpg | image/jpeg | 1026892 |
| other-img-2623 | other | src/resources/images/product_photos/IMG-2623.JPG | other-images/img-2623.jpg | image/jpeg | 1929965 |
| other-event-night | other | src/resources/images/product_photos/event_night.jpg | other-images/event-night.jpg | image/jpeg | 2242101 |
| other-saffron-tin | other | src/resources/images/product_photos/saffron_tin.jpg | other-images/saffron-tin.jpg | image/jpeg | 15689035 |

## Planned mediaAssets Documents

| Document ID | Title | Bin | Linked Type | Linked ID | Status | Alt | Tags | Content Type | Size Bytes | Source | Source Path | Storage Path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| product-calabash-gifts-set-01 | Calabash Gifts Set | products | product | calabash-gifts-set | active |  | product, gifts, calabash-gifts-set | image/jpeg | 1279850 | static-product-photo-migration | src/resources/images/product_photos/calabash_gifts_set.jpeg | product-images/calabash-gifts-set-01-calabash-gifts-set.jpeg |
| product-calabash-gift-set-01 | Calabash Gift Set | products | product | calabash-gift-set | active |  | product, gifts, calabash-gift-set | image/webp | 107208 | static-product-photo-migration | src/resources/images/product_photos/calabash_gift_set.webp | product-images/calabash-gift-set-01-calabash-gift-set.webp |
| product-spa-day-gift-set-01 | Spa Day Gift Set | products | product | spa-day-gift-set | active |  | product, gifts, spa-day-gift-set | image/webp | 83706 | static-product-photo-migration | src/resources/images/product_photos/spa_day_gift_set.webp | product-images/spa-day-gift-set-01-spa-day-gift-set.webp |
| product-erotic-gift-set-01 | Erotic Gift Set | products | product | erotic-gift-set | active |  | product, gifts, erotic-gift-set | image/webp | 97064 | static-product-photo-migration | src/resources/images/product_photos/erotic_gift_set.webp | product-images/erotic-gift-set-01-erotic-gift-set.webp |
| product-saffron-maple-syrup-01 | Saffron Maple Syrup | products | product | saffron-maple-syrup | active |  | product, saffron, saffron-maple-syrup | image/webp | 130194 | static-product-photo-migration | src/resources/images/product_photos/saffron_maple_syrup.webp | product-images/saffron-maple-syrup-01-saffron-maple-syrup.webp |
| product-saffron-simple-syrup-01 | Saffron Simple Syrup | products | product | saffron-simple-syrup | active |  | product, saffron, saffron-simple-syrup | image/jpeg | 18087346 | static-product-photo-migration | src/resources/images/product_photos/saffron_simple_syrup.jpg | product-images/saffron-simple-syrup-01-saffron-simple-syrup.jpg |
| product-vermont-grown-saffron-01 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | image/webp | 104694 | static-product-photo-migration | src/resources/images/product_photos/0.5g_vermont_grown_saffron_1.webp | product-images/vermont-grown-saffron-01-0.5g-vermont-grown-saffron-1.webp |
| product-vermont-grown-saffron-02 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | image/webp | 106068 | static-product-photo-migration | src/resources/images/product_photos/0.5g_vermont_grown_saffron_2.webp | product-images/vermont-grown-saffron-02-0.5g-vermont-grown-saffron-2.webp |
| product-vermont-grown-saffron-03 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | image/webp | 191330 | static-product-photo-migration | src/resources/images/product_photos/0.5g_vermont_grown_saffron_3.webp | product-images/vermont-grown-saffron-03-0.5g-vermont-grown-saffron-3.webp |
| product-vermont-grown-saffron-04 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | image/webp | 44172 | static-product-photo-migration | src/resources/images/product_photos/1g_vt_grown_saffron.webp | product-images/vermont-grown-saffron-04-1g-vt-grown-saffron.webp |
| product-vermont-grown-saffron-05 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | image/webp | 148114 | static-product-photo-migration | src/resources/images/product_photos/2g_vt_grown_saffron_1.webp | product-images/vermont-grown-saffron-05-2g-vt-grown-saffron-1.webp |
| product-vermont-grown-saffron-06 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | image/webp | 106068 | static-product-photo-migration | src/resources/images/product_photos/2g_vt_grown_saffron_2.webp | product-images/vermont-grown-saffron-06-2g-vt-grown-saffron-2.webp |
| product-saffron-tincture-01 | Saffron Tincture | products | product | saffron-tincture | active |  | product, saffron, saffron-tincture | image/webp | 91400 | static-product-photo-migration | src/resources/images/product_photos/saffron_tincture.webp | product-images/saffron-tincture-01-saffron-tincture.webp |
| product-the-heart-and-head-1-2-oz-loose-leaf-tea-01 | The Heart and Head 1/2 oz Loose Leaf Tea | products | product | the-heart-and-head-1-2-oz-loose-leaf-tea | active |  | product, loose-leaf-tea, the-heart-and-head-1-2-oz-loose-leaf-tea | image/jpeg | 10269768 | static-product-photo-migration | src/resources/images/product_photos/the_heart_and_the_head.jpg | product-images/the-heart-and-head-1-2-oz-loose-leaf-tea-01-the-heart-and-the-head.jpg |
| product-ageless-beauty-butter-01 | Ageless Beauty Butter | products | product | ageless-beauty-butter | active |  | product, body-care, ageless-beauty-butter | image/jpeg | 8521883 | static-product-photo-migration | src/resources/images/product_photos/ageless_beauty_body_butter.jpg | product-images/ageless-beauty-butter-01-ageless-beauty-body-butter.jpg |
| product-cold-and-flu-01 | Cold and Flu | products | product | cold-and-flu | active |  | product, tinctures, cold-and-flu | image/jpeg | 8136386 | static-product-photo-migration | src/resources/images/product_photos/cold_and_flu.jpg | product-images/cold-and-flu-01-cold-and-flu.jpg |
| other-img-1785 | IMG 1785 | other | none |  | active |  | other, needs-review | image/jpeg | 1026892 | static-product-photo-migration | src/resources/images/product_photos/IMG-1785.jpg | other-images/img-1785.jpg |
| other-img-2623 | IMG 2623 | other | none |  | active |  | other, needs-review | image/jpeg | 1929965 | static-product-photo-migration | src/resources/images/product_photos/IMG-2623.JPG | other-images/img-2623.jpg |
| other-event-night | event night | other | none |  | active |  | other, needs-review | image/jpeg | 2242101 | static-product-photo-migration | src/resources/images/product_photos/event_night.jpg | other-images/event-night.jpg |
| other-saffron-tin | saffron tin | other | none |  | active |  | other, needs-review | image/jpeg | 15689035 | static-product-photo-migration | src/resources/images/product_photos/saffron_tin.jpg | other-images/saffron-tin.jpg |

## Planned Product Photo Updates

These updates would merge new `photos` references into existing Firestore product drafts after upload. Static product files remain unchanged.

| Product ID | Product | Exact Photo Objects |
| --- | --- | --- |
| calabash-gifts-set | Calabash Gifts Set | path: product-images/calabash-gifts-set-01-calabash-gifts-set.jpeg; alt: ""; mediaAssetId: product-calabash-gifts-set-01; sortOrder: 0 |
| calabash-gift-set | Calabash Gift Set | path: product-images/calabash-gift-set-01-calabash-gift-set.webp; alt: ""; mediaAssetId: product-calabash-gift-set-01; sortOrder: 0 |
| spa-day-gift-set | Spa Day Gift Set | path: product-images/spa-day-gift-set-01-spa-day-gift-set.webp; alt: ""; mediaAssetId: product-spa-day-gift-set-01; sortOrder: 0 |
| erotic-gift-set | Erotic Gift Set | path: product-images/erotic-gift-set-01-erotic-gift-set.webp; alt: ""; mediaAssetId: product-erotic-gift-set-01; sortOrder: 0 |
| saffron-maple-syrup | Saffron Maple Syrup | path: product-images/saffron-maple-syrup-01-saffron-maple-syrup.webp; alt: ""; mediaAssetId: product-saffron-maple-syrup-01; sortOrder: 0 |
| saffron-simple-syrup | Saffron Simple Syrup | path: product-images/saffron-simple-syrup-01-saffron-simple-syrup.jpg; alt: ""; mediaAssetId: product-saffron-simple-syrup-01; sortOrder: 0 |
| vermont-grown-saffron | Vermont Grown Saffron | path: product-images/vermont-grown-saffron-01-0.5g-vermont-grown-saffron-1.webp; alt: ""; mediaAssetId: product-vermont-grown-saffron-01; sortOrder: 0<br>path: product-images/vermont-grown-saffron-02-0.5g-vermont-grown-saffron-2.webp; alt: ""; mediaAssetId: product-vermont-grown-saffron-02; sortOrder: 1<br>path: product-images/vermont-grown-saffron-03-0.5g-vermont-grown-saffron-3.webp; alt: ""; mediaAssetId: product-vermont-grown-saffron-03; sortOrder: 2<br>path: product-images/vermont-grown-saffron-04-1g-vt-grown-saffron.webp; alt: ""; mediaAssetId: product-vermont-grown-saffron-04; sortOrder: 3<br>path: product-images/vermont-grown-saffron-05-2g-vt-grown-saffron-1.webp; alt: ""; mediaAssetId: product-vermont-grown-saffron-05; sortOrder: 4<br>path: product-images/vermont-grown-saffron-06-2g-vt-grown-saffron-2.webp; alt: ""; mediaAssetId: product-vermont-grown-saffron-06; sortOrder: 5 |
| saffron-tincture | Saffron Tincture | path: product-images/saffron-tincture-01-saffron-tincture.webp; alt: ""; mediaAssetId: product-saffron-tincture-01; sortOrder: 0 |
| the-heart-and-head-1-2-oz-loose-leaf-tea | The Heart and Head 1/2 oz Loose Leaf Tea | path: product-images/the-heart-and-head-1-2-oz-loose-leaf-tea-01-the-heart-and-the-head.jpg; alt: ""; mediaAssetId: product-the-heart-and-head-1-2-oz-loose-leaf-tea-01; sortOrder: 0 |
| ageless-beauty-butter | Ageless Beauty Butter | path: product-images/ageless-beauty-butter-01-ageless-beauty-body-butter.jpg; alt: ""; mediaAssetId: product-ageless-beauty-butter-01; sortOrder: 0 |
| cold-and-flu | Cold and Flu | path: product-images/cold-and-flu-01-cold-and-flu.jpg; alt: ""; mediaAssetId: product-cold-and-flu-01; sortOrder: 0 |

Exact write payloads are also available in `docs/media-migration-dry-run.json`.

## Next Approval Gate

Before a real upload/import run, approve:

- deploying reviewed Firestore and Storage rules for `mediaAssets` and `other-images`
- uploading the listed files to the listed Storage paths
- creating the listed `mediaAssets` documents
- attaching the listed product photo references to Firestore products
- keeping default placeholder products skipped
