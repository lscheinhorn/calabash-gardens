# Product Image Migration Manifest

Generated: 2026-05-07

Dry-run only. This file maps current static product image references to proposed Firebase Storage paths. It does not upload files, write Firestore data, or change protected static resources.

## Summary

- Static product photo references checked: 78
- Upload candidates: 16
- Default placeholder references skipped: 62
- Missing source files: 0
- Unreferenced files in product photo folder: 4

Product IDs use the same slug rule as the admin seed tool. Proposed Storage paths are intentionally stable and do not include timestamps.

## Upload Candidates

| Product | Product ID | Category | Active | Seed Status | Source File | Proposed Storage Path |
| --- | --- | --- | --- | --- | --- | --- |
| Calabash Gifts Set | calabash-gifts-set | Gifts | No | Included in seed | src/resources/images/product_photos/calabash_gifts_set.jpeg | product-images/calabash-gifts-set-01-calabash-gifts-set.jpeg |
| Calabash Gift Set | calabash-gift-set | Gifts | No | Included in seed | src/resources/images/product_photos/calabash_gift_set.webp | product-images/calabash-gift-set-01-calabash-gift-set.webp |
| Spa Day Gift Set | spa-day-gift-set | Gifts | No | Included in seed | src/resources/images/product_photos/spa_day_gift_set.webp | product-images/spa-day-gift-set-01-spa-day-gift-set.webp |
| Erotic Gift Set | erotic-gift-set | Gifts | No | Included in seed | src/resources/images/product_photos/erotic_gift_set.webp | product-images/erotic-gift-set-01-erotic-gift-set.webp |
| Saffron Maple Syrup | saffron-maple-syrup | Saffron | Yes | Included in seed | src/resources/images/product_photos/saffron_maple_syrup.webp | product-images/saffron-maple-syrup-01-saffron-maple-syrup.webp |
| Saffron Simple Syrup | saffron-simple-syrup | Saffron | No | Included in seed | src/resources/images/product_photos/saffron_simple_syrup.jpg | product-images/saffron-simple-syrup-01-saffron-simple-syrup.jpg |
| Vermont Grown Saffron | vermont-grown-saffron | Saffron | Yes | Included in seed | src/resources/images/product_photos/0.5g_vermont_grown_saffron_1.webp | product-images/vermont-grown-saffron-01-0.5g-vermont-grown-saffron-1.webp |
| Vermont Grown Saffron | vermont-grown-saffron | Saffron | Yes | Included in seed | src/resources/images/product_photos/0.5g_vermont_grown_saffron_2.webp | product-images/vermont-grown-saffron-02-0.5g-vermont-grown-saffron-2.webp |
| Vermont Grown Saffron | vermont-grown-saffron | Saffron | Yes | Included in seed | src/resources/images/product_photos/0.5g_vermont_grown_saffron_3.webp | product-images/vermont-grown-saffron-03-0.5g-vermont-grown-saffron-3.webp |
| Vermont Grown Saffron | vermont-grown-saffron | Saffron | Yes | Included in seed | src/resources/images/product_photos/1g_vt_grown_saffron.webp | product-images/vermont-grown-saffron-04-1g-vt-grown-saffron.webp |
| Vermont Grown Saffron | vermont-grown-saffron | Saffron | Yes | Included in seed | src/resources/images/product_photos/2g_vt_grown_saffron_1.webp | product-images/vermont-grown-saffron-05-2g-vt-grown-saffron-1.webp |
| Vermont Grown Saffron | vermont-grown-saffron | Saffron | Yes | Included in seed | src/resources/images/product_photos/2g_vt_grown_saffron_2.webp | product-images/vermont-grown-saffron-06-2g-vt-grown-saffron-2.webp |
| Saffron Tincture | saffron-tincture | Saffron | Yes | Included in seed | src/resources/images/product_photos/saffron_tincture.webp | product-images/saffron-tincture-01-saffron-tincture.webp |
| The Heart and Head 1/2 oz Loose Leaf Tea | the-heart-and-head-1-2-oz-loose-leaf-tea | Loose Leaf Tea | Yes | Included in seed | src/resources/images/product_photos/the_heart_and_the_head.jpg | product-images/the-heart-and-head-1-2-oz-loose-leaf-tea-01-the-heart-and-the-head.jpg |
| Ageless Beauty Butter | ageless-beauty-butter | Body Care | Yes | Included in seed | src/resources/images/product_photos/ageless_beauty_body_butter.jpg | product-images/ageless-beauty-butter-01-ageless-beauty-body-butter.jpg |
| Cold and Flu | cold-and-flu | Tinctures | Yes | Included in seed | src/resources/images/product_photos/cold_and_flu.jpg | product-images/cold-and-flu-01-cold-and-flu.jpg |

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

## Unreferenced Product Photo Files

These files exist under `src/resources/images/product_photos/` but are not referenced by `src/resources/products.js` product photos. Do not delete or migrate them without separate review.

- src/resources/images/product_photos/IMG-1785.jpg
- src/resources/images/product_photos/IMG-2623.JPG
- src/resources/images/product_photos/event_night.jpg
- src/resources/images/product_photos/saffron_tin.jpg

## Next Approval Gate

Before any upload phase, review this manifest and approve:

- which candidate images should upload
- whether inactive products should receive migrated photos
- whether gift-set photos should remain preserved but inactive
- whether any default-placeholder products need real product photos first
- whether proposed Storage paths should be used exactly as listed
