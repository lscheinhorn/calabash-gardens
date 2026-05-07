# Product Image Migration Manifest

Generated: 2026-05-07

Dry-run only. This file maps current static product image references to proposed Firebase Storage paths. It does not upload files, write Firestore data, or change protected static resources.

## Summary

- Static product photo references checked: 78
- Upload candidates: 16
- Default placeholder references skipped: 62
- Missing source files: 0
- Unreferenced files in product photo folder: 4

Product IDs and media asset IDs use stable slug rules. Proposed Storage paths are intentionally stable and do not include timestamps.

## Product Media Asset Candidates

| Media Asset ID | Title | Bin | Linked Type | Linked ID | Status | Alt | Tags | Source File | Proposed Storage Path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| product-calabash-gifts-set-01 | Calabash Gifts Set | products | product | calabash-gifts-set | active |  | product, gifts, calabash-gifts-set | src/resources/images/product_photos/calabash_gifts_set.jpeg | product-images/calabash-gifts-set-01-calabash-gifts-set.jpeg |
| product-calabash-gift-set-01 | Calabash Gift Set | products | product | calabash-gift-set | active |  | product, gifts, calabash-gift-set | src/resources/images/product_photos/calabash_gift_set.webp | product-images/calabash-gift-set-01-calabash-gift-set.webp |
| product-spa-day-gift-set-01 | Spa Day Gift Set | products | product | spa-day-gift-set | active |  | product, gifts, spa-day-gift-set | src/resources/images/product_photos/spa_day_gift_set.webp | product-images/spa-day-gift-set-01-spa-day-gift-set.webp |
| product-erotic-gift-set-01 | Erotic Gift Set | products | product | erotic-gift-set | active |  | product, gifts, erotic-gift-set | src/resources/images/product_photos/erotic_gift_set.webp | product-images/erotic-gift-set-01-erotic-gift-set.webp |
| product-saffron-maple-syrup-01 | Saffron Maple Syrup | products | product | saffron-maple-syrup | active |  | product, saffron, saffron-maple-syrup | src/resources/images/product_photos/saffron_maple_syrup.webp | product-images/saffron-maple-syrup-01-saffron-maple-syrup.webp |
| product-saffron-simple-syrup-01 | Saffron Simple Syrup | products | product | saffron-simple-syrup | active |  | product, saffron, saffron-simple-syrup | src/resources/images/product_photos/saffron_simple_syrup.jpg | product-images/saffron-simple-syrup-01-saffron-simple-syrup.jpg |
| product-vermont-grown-saffron-01 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | src/resources/images/product_photos/0.5g_vermont_grown_saffron_1.webp | product-images/vermont-grown-saffron-01-0.5g-vermont-grown-saffron-1.webp |
| product-vermont-grown-saffron-02 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | src/resources/images/product_photos/0.5g_vermont_grown_saffron_2.webp | product-images/vermont-grown-saffron-02-0.5g-vermont-grown-saffron-2.webp |
| product-vermont-grown-saffron-03 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | src/resources/images/product_photos/0.5g_vermont_grown_saffron_3.webp | product-images/vermont-grown-saffron-03-0.5g-vermont-grown-saffron-3.webp |
| product-vermont-grown-saffron-04 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | src/resources/images/product_photos/1g_vt_grown_saffron.webp | product-images/vermont-grown-saffron-04-1g-vt-grown-saffron.webp |
| product-vermont-grown-saffron-05 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | src/resources/images/product_photos/2g_vt_grown_saffron_1.webp | product-images/vermont-grown-saffron-05-2g-vt-grown-saffron-1.webp |
| product-vermont-grown-saffron-06 | Vermont Grown Saffron | products | product | vermont-grown-saffron | active |  | product, saffron, vermont-grown-saffron | src/resources/images/product_photos/2g_vt_grown_saffron_2.webp | product-images/vermont-grown-saffron-06-2g-vt-grown-saffron-2.webp |
| product-saffron-tincture-01 | Saffron Tincture | products | product | saffron-tincture | active |  | product, saffron, saffron-tincture | src/resources/images/product_photos/saffron_tincture.webp | product-images/saffron-tincture-01-saffron-tincture.webp |
| product-the-heart-and-head-1-2-oz-loose-leaf-tea-01 | The Heart and Head 1/2 oz Loose Leaf Tea | products | product | the-heart-and-head-1-2-oz-loose-leaf-tea | active |  | product, loose-leaf-tea, the-heart-and-head-1-2-oz-loose-leaf-tea | src/resources/images/product_photos/the_heart_and_the_head.jpg | product-images/the-heart-and-head-1-2-oz-loose-leaf-tea-01-the-heart-and-the-head.jpg |
| product-ageless-beauty-butter-01 | Ageless Beauty Butter | products | product | ageless-beauty-butter | active |  | product, body-care, ageless-beauty-butter | src/resources/images/product_photos/ageless_beauty_body_butter.jpg | product-images/ageless-beauty-butter-01-ageless-beauty-body-butter.jpg |
| product-cold-and-flu-01 | Cold and Flu | products | product | cold-and-flu | active |  | product, tinctures, cold-and-flu | src/resources/images/product_photos/cold_and_flu.jpg | product-images/cold-and-flu-01-cold-and-flu.jpg |

## Skipped Default Placeholders

These products currently point at the shared Calabash logo placeholder. They should not be uploaded as individual product images unless Luke approves that behavior.

| Product | Product ID | Category | Active | Seed Status | Placeholder |
| --- | --- | --- | --- | --- | --- |
| Test basket | test-basket | All | No | Excluded from seed | src/resources/images/large_logo_no_purple_square.png |
| Saffron Honey 4 oz | saffron-honey-4-oz | Saffron | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Saffron Salt 2 oz | saffron-salt-2-oz | Saffron | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Oregano 1/2 0z | oregano-1-2-0z | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Tarragon 1/2 0z | tarragon-1-2-0z | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Ramp Pesto Walnut | ramp-pesto-walnut | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Ramp Pesto Pecan | ramp-pesto-pecan | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Habanero Salt 2 oz | habanero-salt-2-oz | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Thai Chili Salt 2 oz | thai-chili-salt-2-oz | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Cilantro Salt 2 oz | cilantro-salt-2-oz | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Rose Sugar 2 oz | rose-sugar-2-oz | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Ginger Sugar 2 oz | ginger-sugar-2-oz | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Cranberry Honey | cranberry-honey | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Elderflower Saffron Elixir | elderflower-saffron-elixir | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Trinidad Saffron Trifecta 4 oz | trinidad-saffron-trifecta-4-oz | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Saffron Ghost in Trinidad 4 oz | saffron-ghost-in-trinidad-4-oz | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Ghost of Saffron Carolina 4 oz | ghost-of-saffron-carolina-4-oz | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Saffron Red Dragon 4 oz | saffron-red-dragon-4-oz | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Saffron Dreams in Peach 4 oz | saffron-dreams-in-peach-4-oz | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Jalapeno Popper 4 oz | jalapeno-popper-4-oz | Culinary | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Easy Does It 1/2 oz Loose Leaf Tea | easy-does-it-1-2-oz-loose-leaf-tea | Loose Leaf Tea | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Goddess Moon 1/2 oz Loose Leaf Tea | goddess-moon-1-2-oz-loose-leaf-tea | Loose Leaf Tea | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Brainiac 1/2 oz Loose Leaf Tea | brainiac-1-2-oz-loose-leaf-tea | Loose Leaf Tea | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Wild Fire Frenzy 1/2 oz Loose Leaf Tea | wild-fire-frenzy-1-2-oz-loose-leaf-tea | Loose Leaf Tea | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Cold & Flu 1/2 oz Loose Leaf Tea | cold-flu-1-2-oz-loose-leaf-tea | Loose Leaf Tea | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Milk Machine 1/2 oz Loose Leaf Tea | milk-machine-1-2-oz-loose-leaf-tea | Loose Leaf Tea | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Sweet Relief 1/2 oz Loose Leaf Tea | sweet-relief-1-2-oz-loose-leaf-tea | Loose Leaf Tea | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Saffron Macha 1/2 oz Loose Leaf Tea | saffron-macha-1-2-oz-loose-leaf-tea | Loose Leaf Tea | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Tea Ball | tea-ball | Loose Leaf Tea | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Sizzle | sizzle | Mambo Gede | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Slippery Daze 4 oz | slippery-daze-4-oz | Mambo Gede | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Rara Magic | rara-magic | Mambo Gede | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Honey Don't You Glow, Clay Mask 4 0z | honey-dont-you-glow-clay-mask-4-0z | Body Care | No | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Soaking Salts 5 0z | soaking-salts-5-0z | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Ageless Beauty Oil 4 0z | ageless-beauty-oil-4-0z | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Bath Bombs | bath-bombs | Body Care | No | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Great Green Heal | great-green-heal | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Heal All | heal-all | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Itch Don't Bug Me Now 10 ml | itch-dont-bug-me-now-10-ml | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Fungus Among Us 2 oz | fungus-among-us-2-oz | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Lip Balm 1/2 oz | lip-balm-1-2-oz | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Hydration Station | hydration-station | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Meadow Magic Gardener's Balm | meadow-magic-gardeners-balm | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Pain B Gone | pain-b-gone | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| SALE! 30% OFF Silky Smooth Flower Balm | sale-30-off-silky-smooth-flower-balm | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Sunny Days, Massage Oil 4 oz | sunny-days-massage-oil-4-oz | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| BO? Not Today, Deoderant Spray 4 oz | bo-not-today-deoderant-spray-4-oz | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Bug Spray 4 oz | bug-spray-4-oz | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Facial Toner | facial-toner | Body Care | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Headache and Fever | headache-and-fever | Tinctures | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Joint Health | joint-health | Tinctures | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Reishi Turkey Tail | reishi-turkey-tail | Tinctures | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Allergy Relief | allergy-relief | Tinctures | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Moon Beams and Day Dreams | moon-beams-and-day-dreams | Tinctures | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| A Touch of Sunshine | a-touch-of-sunshine | Tinctures | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Bitters | bitters | Tinctures | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| The Root Cause Bitters | the-root-cause-bitters | Tinctures | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Lions Share | lions-share | Tinctures | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Free the Pee | free-the-pee | Tinctures | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Goddess Moon | goddess-moon | Tinctures | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Dream Weaver 1/2 oz | dream-weaver-1-2-oz | Ritual Smoking Blends | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |
| Original Blend 1/2 oz | original-blend-1-2-oz | Ritual Smoking Blends | Yes | Included in seed | src/resources/images/large_logo_no_purple_square.png |

## Other Media Asset Candidates

These files exist under `src/resources/images/product_photos/` but are not referenced by `src/resources/products.js` product photos. They should migrate to the `other` bin as a holding area only after review.

| Media Asset ID | Title | Bin | Linked Type | Linked ID | Status | Alt | Tags | Source File | Proposed Storage Path |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| other-img-1785 | IMG 1785 | other | none |  | active |  | other, needs-review | src/resources/images/product_photos/IMG-1785.jpg | other-images/img-1785.jpg |
| other-img-2623 | IMG 2623 | other | none |  | active |  | other, needs-review | src/resources/images/product_photos/IMG-2623.JPG | other-images/img-2623.jpg |
| other-event-night | event night | other | none |  | active |  | other, needs-review | src/resources/images/product_photos/event_night.jpg | other-images/event-night.jpg |
| other-saffron-tin | saffron tin | other | none |  | active |  | other, needs-review | src/resources/images/product_photos/saffron_tin.jpg | other-images/saffron-tin.jpg |

## Next Approval Gate

Before any upload phase, review this manifest and approve:

- which candidate images should upload
- whether inactive products should receive migrated photos
- whether gift-set photos should remain preserved but inactive
- whether any default-placeholder products need real product photos first
- whether proposed Storage paths should be used exactly as listed
