# Product Variant Migration Preview

Status: **BLOCKED**

This is a read-only identity plan. It does not update Firestore. Starting quantities remain Jetta-required and are written only when she saves reviewed counts in Inventory.

## Summary

- Reviewed static products: 72
- Firestore products read: 74
- Products requiring identity initialization on first inventory save: 72
- Proposed variants/SKUs: 101
- Generated variant IDs: 98
- Preserved variant IDs: 3
- Generated SKUs: 101
- Preserved SKUs: 0
- Missing SKU registry claims to create transactionally: 0
- Existing correct SKU registry claims: 0
- Conflicting SKU registry claims: 0
- Orphaned SKU registry claims needing review: 0
- Unverified SKU registry claims: 101
- Quantities Jetta must confirm: 101
- Blockers: 1
- Warnings: 2

## Proposed Identities

| Product | Option | Variant ID | SKU | Identity | Registry | Quantity |
|---|---|---|---|---|---|---|
| Calabash Gifts Set | Default | `default` | `CG-CALABASH-GIFTS-SET-DEFAULT` | generated/generated | unverified | Jetta required |
| Calabash Gift Set | Default | `default` | `CG-CALABASH-GIFT-SET-DEFAULT` | generated/generated | unverified | Jetta required |
| Spa Day Gift Set | Default | `default` | `CG-SPA-DAY-GIFT-SET-DEFAULT` | generated/generated | unverified | Jetta required |
| Erotic Gift Set | Default | `default` | `CG-EROTIC-GIFT-SET-DEFAULT` | generated/generated | unverified | Jetta required |
| Saffron Maple Syrup | 4 oz | `4-oz` | `CG-SAFFRON-MAPLE-SYRUP-4-OZ` | generated/generated | unverified | Jetta required |
| Saffron Maple Syrup | 8 oz | `8-oz` | `CG-SAFFRON-MAPLE-SYRUP-8-OZ` | generated/generated | unverified | Jetta required |
| Saffron Honey 4 oz | 4 oz | `4-oz` | `CG-SAFFRON-HONEY-4-OZ-4-OZ` | generated/generated | unverified | Jetta required |
| Saffron Simple Syrup | 4 oz | `4-oz` | `CG-SAFFRON-SIMPLE-SYRUP-4-OZ` | generated/generated | unverified | Jetta required |
| Saffron Simple Syrup | 8 oz | `8-oz` | `CG-SAFFRON-SIMPLE-SYRUP-8-OZ` | generated/generated | unverified | Jetta required |
| Saffron Salt 2 oz | 2 oz | `2-oz` | `CG-SAFFRON-SALT-2-OZ-2-OZ` | generated/generated | unverified | Jetta required |
| Vermont Grown Saffron | 1/2 Gram | `1-2-gram` | `CG-VERMONT-GROWN-SAFFRON-1-2-GRAM` | generated/generated | unverified | Jetta required |
| Vermont Grown Saffron | 1 Gram | `1-gram` | `CG-VERMONT-GROWN-SAFFRON-1-GRAM` | generated/generated | unverified | Jetta required |
| Vermont Grown Saffron | 2 Grams | `2-grams` | `CG-VERMONT-GROWN-SAFFRON-2-GRAMS` | generated/generated | unverified | Jetta required |
| Saffron Tincture | 1 oz | `1-oz` | `CG-SAFFRON-TINCTURE-1-OZ` | generated/generated | unverified | Jetta required |
| Saffron Tincture | 4 oz | `4-oz` | `CG-SAFFRON-TINCTURE-4-OZ` | generated/generated | unverified | Jetta required |
| Oregano 1/2 0z | 1/2 oz | `1-2-oz` | `CG-OREGANO-1-2-0Z-1-2-OZ` | generated/generated | unverified | Jetta required |
| Tarragon 1/2 0z | 1/2 oz | `1-2-oz` | `CG-TARRAGON-1-2-0Z-1-2-OZ` | generated/generated | unverified | Jetta required |
| Ramp Pesto Walnut | 4 oz | `4-oz` | `CG-RAMP-PESTO-WALNUT-4-OZ` | generated/generated | unverified | Jetta required |
| Ramp Pesto Walnut | 8 oz | `8-oz` | `CG-RAMP-PESTO-WALNUT-8-OZ` | generated/generated | unverified | Jetta required |
| Ramp Pesto Pecan | 4 oz | `4-oz` | `CG-RAMP-PESTO-PECAN-4-OZ` | generated/generated | unverified | Jetta required |
| Ramp Pesto Pecan | 8 oz | `8-oz` | `CG-RAMP-PESTO-PECAN-8-OZ` | generated/generated | unverified | Jetta required |
| Habanero Salt 2 oz | 2 oz | `2-oz` | `CG-HABANERO-SALT-2-OZ-2-OZ` | generated/generated | unverified | Jetta required |
| Thai Chili Salt 2 oz | 2 oz | `2-oz` | `CG-THAI-CHILI-SALT-2-OZ-2-OZ` | generated/generated | unverified | Jetta required |
| Cilantro Salt 2 oz | 2 oz | `2 oz` | `CG-CILANTRO-SALT-2-OZ-2-OZ` | existing/generated | unverified | Jetta required |
| Rose Sugar 2 oz | 2 oz | `2-oz` | `CG-ROSE-SUGAR-2-OZ-2-OZ` | generated/generated | unverified | Jetta required |
| Ginger Sugar 2 oz | 2 oz | `2-oz` | `CG-GINGER-SUGAR-2-OZ-2-OZ` | generated/generated | unverified | Jetta required |
| Cranberry Honey | 4 oz | `4-oz` | `CG-CRANBERRY-HONEY-4-OZ` | generated/generated | unverified | Jetta required |
| Cranberry Honey | 8 oz | `8-oz` | `CG-CRANBERRY-HONEY-8-OZ` | generated/generated | unverified | Jetta required |
| Elderflower Saffron Elixir | 4 oz | `4-oz` | `CG-ELDERFLOWER-SAFFRON-ELIXIR-4-OZ` | generated/generated | unverified | Jetta required |
| Elderflower Saffron Elixir | 8 oz | `8-oz` | `CG-ELDERFLOWER-SAFFRON-ELIXIR-8-OZ` | generated/generated | unverified | Jetta required |
| Trinidad Saffron Trifecta 4 oz | 4 oz | `4-oz` | `CG-TRINIDAD-SAFFRON-TRIFECTA-4-OZ-4-OZ` | generated/generated | unverified | Jetta required |
| Saffron Ghost in Trinidad 4 oz | 4 oz | `4-oz` | `CG-SAFFRON-GHOST-IN-TRINIDAD-4-OZ-4-OZ` | generated/generated | unverified | Jetta required |
| Ghost of Saffron Carolina 4 oz | 4 oz | `4-oz` | `CG-GHOST-OF-SAFFRON-CAROLINA-4-OZ-4-OZ` | generated/generated | unverified | Jetta required |
| Saffron Red Dragon 4 oz | 4 oz | `4-oz` | `CG-SAFFRON-RED-DRAGON-4-OZ-4-OZ` | generated/generated | unverified | Jetta required |
| Saffron Dreams in Peach 4 oz | 4 oz | `4-oz` | `CG-SAFFRON-DREAMS-IN-PEACH-4-OZ-4-OZ` | generated/generated | unverified | Jetta required |
| Jalapeno Popper 4 oz | 4 oz | `4-oz` | `CG-JALAPENO-POPPER-4-OZ-4-OZ` | generated/generated | unverified | Jetta required |
| The Heart and Head 1/2 oz Loose Leaf Tea | 1/2 oz | `1-2-oz` | `CG-THE-HEART-AND-HEAD-1-2-OZ-LOOSE-LEAF-TEA-1-2-OZ` | generated/generated | unverified | Jetta required |
| Easy Does It 1/2 oz Loose Leaf Tea | 1/2 oz | `1-2-oz` | `CG-EASY-DOES-IT-1-2-OZ-LOOSE-LEAF-TEA-1-2-OZ` | generated/generated | unverified | Jetta required |
| Goddess Moon 1/2 oz Loose Leaf Tea | 1/2 oz | `1-2-oz` | `CG-GODDESS-MOON-1-2-OZ-LOOSE-LEAF-TEA-1-2-OZ` | generated/generated | unverified | Jetta required |
| Brainiac 1/2 oz Loose Leaf Tea | 1/2 oz | `1-2-oz` | `CG-BRAINIAC-1-2-OZ-LOOSE-LEAF-TEA-1-2-OZ` | generated/generated | unverified | Jetta required |
| Wild Fire Frenzy 1/2 oz Loose Leaf Tea | 1/2 oz | `1-2-oz` | `CG-WILD-FIRE-FRENZY-1-2-OZ-LOOSE-LEAF-TEA-1-2-OZ` | generated/generated | unverified | Jetta required |
| Cold & Flu 1/2 oz Loose Leaf Tea | 1/2 oz | `1-2-oz` | `CG-COLD-FLU-1-2-OZ-LOOSE-LEAF-TEA-1-2-OZ` | generated/generated | unverified | Jetta required |
| Milk Machine 1/2 oz Loose Leaf Tea | 1/2 oz | `1-2-oz` | `CG-MILK-MACHINE-1-2-OZ-LOOSE-LEAF-TEA-1-2-OZ` | generated/generated | unverified | Jetta required |
| Sweet Relief 1/2 oz Loose Leaf Tea | 1/2 oz | `1-2-oz` | `CG-SWEET-RELIEF-1-2-OZ-LOOSE-LEAF-TEA-1-2-OZ` | generated/generated | unverified | Jetta required |
| Saffron Macha 1/2 oz Loose Leaf Tea | 1/2 oz | `1-2-oz` | `CG-SAFFRON-MACHA-1-2-OZ-LOOSE-LEAF-TEA-1-2-OZ` | generated/generated | unverified | Jetta required |
| Tea Ball | Default | `default` | `CG-TEA-BALL-DEFAULT` | generated/generated | unverified | Jetta required |
| Sizzle | 3/8 dram | `3-8-dram` | `CG-SIZZLE-3-8-DRAM` | generated/generated | unverified | Jetta required |
| Sizzle | 5 ml | `5-ml` | `CG-SIZZLE-5-ML` | generated/generated | unverified | Jetta required |
| Sizzle | 10 ml | `10-ml` | `CG-SIZZLE-10-ML` | generated/generated | unverified | Jetta required |
| Slippery Daze 4 oz | 4 0z | `4-0z` | `CG-SLIPPERY-DAZE-4-OZ-4-0Z` | generated/generated | unverified | Jetta required |
| Rara Magic | 1 0z | `1-0z` | `CG-RARA-MAGIC-1-0Z` | generated/generated | unverified | Jetta required |
| Rara Magic | 4 0z | `4-0z` | `CG-RARA-MAGIC-4-0Z` | generated/generated | unverified | Jetta required |
| Honey Don't You Glow, Clay Mask 4 0z | 4 0z | `4-0z` | `CG-HONEY-DONT-YOU-GLOW-CLAY-MASK-4-0Z-4-0Z` | generated/generated | unverified | Jetta required |
| Soaking Salts 5 0z | 5 0z | `5-0z` | `CG-SOAKING-SALTS-5-0Z-5-0Z` | generated/generated | unverified | Jetta required |
| Ageless Beauty Butter | 2 0z | `2-0z` | `CG-AGELESS-BEAUTY-BUTTER-2-0Z` | generated/generated | unverified | Jetta required |
| Ageless Beauty Oil 4 0z | 4 0z | `4-0z` | `CG-AGELESS-BEAUTY-OIL-4-0Z-4-0Z` | generated/generated | unverified | Jetta required |
| Bath Bombs | Default | `default` | `CG-BATH-BOMBS-DEFAULT` | generated/generated | unverified | Jetta required |
| Great Green Heal | 2 oz | `2-oz` | `CG-GREAT-GREEN-HEAL-2-OZ` | generated/generated | unverified | Jetta required |
| Great Green Heal | 4 oz | `4-oz` | `CG-GREAT-GREEN-HEAL-4-OZ` | generated/generated | unverified | Jetta required |
| Heal All | 2 oz | `2-oz` | `CG-HEAL-ALL-2-OZ` | generated/generated | unverified | Jetta required |
| Itch Don't Bug Me Now 10 ml | 10 ml | `10-ml` | `CG-ITCH-DONT-BUG-ME-NOW-10-ML-10-ML` | generated/generated | unverified | Jetta required |
| Fungus Among Us 2 oz | 2 oz | `2-oz` | `CG-FUNGUS-AMONG-US-2-OZ-2-OZ` | generated/generated | unverified | Jetta required |
| Lip Balm 1/2 oz | 1/2 oz | `1-2-oz` | `CG-LIP-BALM-1-2-OZ-1-2-OZ` | generated/generated | unverified | Jetta required |
| Hydration Station | 2 oz tin | `2-oz-tin` | `CG-HYDRATION-STATION-2-OZ-TIN` | generated/generated | unverified | Jetta required |
| Hydration Station | 2 oz stick | `2-oz-stick` | `CG-HYDRATION-STATION-2-OZ-STICK` | generated/generated | unverified | Jetta required |
| Hydration Station | 4 oz | `4-oz` | `CG-HYDRATION-STATION-4-OZ` | generated/generated | unverified | Jetta required |
| Meadow Magic Gardener's Balm | 2 oz | `2-oz` | `CG-MEADOW-MAGIC-GARDENERS-BALM-2-OZ` | generated/generated | unverified | Jetta required |
| Meadow Magic Gardener's Balm | 4 oz | `4-oz` | `CG-MEADOW-MAGIC-GARDENERS-BALM-4-OZ` | generated/generated | unverified | Jetta required |
| Pain B Gone | 2 oz | `2-oz` | `CG-PAIN-B-GONE-2-OZ` | generated/generated | unverified | Jetta required |
| SALE! 30% OFF Silky Smooth Flower Balm | 4 oz | `4-oz` | `CG-SALE-30-OFF-SILKY-SMOOTH-FLOWER-BALM-4-OZ` | generated/generated | unverified | Jetta required |
| Sunny Days, Massage Oil 4 oz | 4 oz | `4-oz` | `CG-SUNNY-DAYS-MASSAGE-OIL-4-OZ-4-OZ` | generated/generated | unverified | Jetta required |
| BO? Not Today, Deoderant Spray 4 oz | 4 oz | `4-oz` | `CG-BO-NOT-TODAY-DEODERANT-SPRAY-4-OZ-4-OZ` | generated/generated | unverified | Jetta required |
| Bug Spray 4 oz | 4 oz | `4-oz` | `CG-BUG-SPRAY-4-OZ-4-OZ` | generated/generated | unverified | Jetta required |
| Facial Toner | 1 oz | `1-oz` | `CG-FACIAL-TONER-1-OZ` | generated/generated | unverified | Jetta required |
| Facial Toner | 4 oz | `4-oz` | `CG-FACIAL-TONER-4-OZ` | generated/generated | unverified | Jetta required |
| Headache and Fever | 1 oz | `1-oz` | `CG-HEADACHE-AND-FEVER-1-OZ` | generated/generated | unverified | Jetta required |
| Headache and Fever | 4 oz | `4-oz` | `CG-HEADACHE-AND-FEVER-4-OZ` | generated/generated | unverified | Jetta required |
| Joint Health | 1 oz | `1-oz` | `CG-JOINT-HEALTH-1-OZ` | generated/generated | unverified | Jetta required |
| Joint Health | 4 oz | `4-oz` | `CG-JOINT-HEALTH-4-OZ` | generated/generated | unverified | Jetta required |
| Reishi Turkey Tail | 1 oz | `1-oz` | `CG-REISHI-TURKEY-TAIL-1-OZ` | generated/generated | unverified | Jetta required |
| Reishi Turkey Tail | 4 oz | `4-oz` | `CG-REISHI-TURKEY-TAIL-4-OZ` | generated/generated | unverified | Jetta required |
| Allergy Relief | 1 oz | `1-oz` | `CG-ALLERGY-RELIEF-1-OZ` | generated/generated | unverified | Jetta required |
| Allergy Relief | 4 oz | `4-oz` | `CG-ALLERGY-RELIEF-4-OZ` | generated/generated | unverified | Jetta required |
| Moon Beams and Day Dreams | 1 oz | `1-oz` | `CG-MOON-BEAMS-AND-DAY-DREAMS-1-OZ` | generated/generated | unverified | Jetta required |
| Moon Beams and Day Dreams | 4 oz | `4-oz` | `CG-MOON-BEAMS-AND-DAY-DREAMS-4-OZ` | generated/generated | unverified | Jetta required |
| A Touch of Sunshine | 1 oz | `1 oz` | `CG-A-TOUCH-OF-SUNSHINE-1-OZ` | existing/generated | unverified | Jetta required |
| A Touch of Sunshine | 4 oz | `4 oz` | `CG-A-TOUCH-OF-SUNSHINE-4-OZ` | existing/generated | unverified | Jetta required |
| Bitters | 1 oz | `1-oz` | `CG-BITTERS-1-OZ` | generated/generated | unverified | Jetta required |
| Bitters | 4 oz | `4-oz` | `CG-BITTERS-4-OZ` | generated/generated | unverified | Jetta required |
| The Root Cause Bitters | 1 oz | `1-oz` | `CG-THE-ROOT-CAUSE-BITTERS-1-OZ` | generated/generated | unverified | Jetta required |
| The Root Cause Bitters | 4 oz | `4-oz` | `CG-THE-ROOT-CAUSE-BITTERS-4-OZ` | generated/generated | unverified | Jetta required |
| Cold and Flu | 1 oz | `1-oz` | `CG-COLD-AND-FLU-1-OZ` | generated/generated | unverified | Jetta required |
| Cold and Flu | 4 oz | `4-oz` | `CG-COLD-AND-FLU-4-OZ` | generated/generated | unverified | Jetta required |
| Lions Share | 1 oz | `1-oz` | `CG-LIONS-SHARE-1-OZ` | generated/generated | unverified | Jetta required |
| Lions Share | 4 oz | `4-oz` | `CG-LIONS-SHARE-4-OZ` | generated/generated | unverified | Jetta required |
| Free the Pee | 1 oz | `1-oz` | `CG-FREE-THE-PEE-1-OZ` | generated/generated | unverified | Jetta required |
| Free the Pee | 4 oz | `4-oz` | `CG-FREE-THE-PEE-4-OZ` | generated/generated | unverified | Jetta required |
| Goddess Moon | 1 oz | `1-oz` | `CG-GODDESS-MOON-1-OZ` | generated/generated | unverified | Jetta required |
| Goddess Moon | 4 oz | `4-oz` | `CG-GODDESS-MOON-4-OZ` | generated/generated | unverified | Jetta required |
| Dream Weaver 1/2 oz | 1/2 oz | `1-2-oz` | `CG-DREAM-WEAVER-1-2-OZ-1-2-OZ` | generated/generated | unverified | Jetta required |
| Original Blend 1/2 oz | 1/2 oz | `1-2-oz` | `CG-ORIGINAL-BLEND-1-2-OZ-1-2-OZ` | generated/generated | unverified | Jetta required |

## Blockers

- **productSkus** (sku-registry-unreadable): SKU ownership could not be verified (permission-denied).

## Warnings

- **a-touch-of-sunshine/1** (legacy-index-assumed): Missing priceOptionIndex; preview maps this row to option 1.
- **a-touch-of-sunshine/2** (legacy-index-assumed): Missing priceOptionIndex; preview maps this row to option 2.

## Excluded Firestore Products

- **Title**: Known inactive test record; excluded from migration.
- **test-basket**: Known inactive test record; excluded from migration.
