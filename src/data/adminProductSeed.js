import { products as staticProducts } from "../resources/products";

const decimalPattern = /^\d+\.\d{2}$/;
const giftCategoryName = "Gifts";
const excludedProductTitles = new Set([
  "Test basket",
]);
const legacyGiftProductTitles = new Set([
  "Calabash Gifts Set",
  "Calabash Gift Set",
  "Spa Day Gift Set",
  "Erotic Gift Set",
]);

export const approvedProductCategories = [
  "Body Care",
  "Culinary",
  "Gifts",
  "Loose Leaf Tea",
  "Mambo Gede",
  "Ritual Smoking Blends",
  "Saffron",
  "Tinctures",
];

export const seedSlugify = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['‘’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const approvedCategoryIds = new Set(approvedProductCategories.map((category) => (
  seedSlugify(category)
)));
export const legacyGiftProductIds = new Set(Array.from(legacyGiftProductTitles).map((title) => (
  seedSlugify(title)
)));

const normalizeCategoryName = (category) => (
  category && String(category).trim() ? String(category).trim() : ""
);

const resolveCategoryName = (product) => {
  const categoryName = normalizeCategoryName(product?.category);
  const title = String(product?.title || "");

  if (categoryName) {
    return categoryName;
  }

  if (legacyGiftProductTitles.has(title)) {
    return giftCategoryName;
  }

  return "";
};

const isLegacyGiftProduct = (product) => (
  legacyGiftProductTitles.has(String(product?.title || "").trim())
);

const shouldSeedProduct = (product) => (
  !excludedProductTitles.has(String(product?.title || "").trim())
);

const normalizePriceOptions = (priceOptions) => (
  Array.isArray(priceOptions) ? priceOptions : []
).map((priceOption) => ({
  option: String(priceOption?.option || "").trim(),
  price: String(priceOption?.price || "").trim(),
}));

const normalizeStaticProduct = (product, index) => {
  const title = String(product?.title || "").trim();
  const id = seedSlugify(title);
  const categoryName = resolveCategoryName(product);
  const category = seedSlugify(categoryName);

  return {
    id,
    data: {
      title,
      category,
      info: String(product?.info || "").trim(),
      info1: String(product?.info1 || "").trim(),
      info2: String(product?.info2 || "").trim(),
      shipping: String(product?.shipping || "").trim(),
      priceOptions: normalizePriceOptions(product?.priceOptions),
      published: product?.isActive === true,
      isActive: product?.isActive === true,
      inStock: product?.inStock !== false,
      isHighlighted: product?.isHighlighted === true,
      photos: [],
      slug: id,
      sortOrder: index,
    },
    source: product,
  };
};

const validateProduct = (product) => {
  const errors = [];

  if (!product.id) {
    errors.push("Product ID is empty.");
  }

  if (!product.data.title) {
    errors.push("Title is required.");
  }

  if (!product.data.category) {
    errors.push("Category ID is empty.");
  }

  if (!decimalPattern.test(product.data.shipping)) {
    errors.push("Shipping must be a decimal like 17.00.");
  }

  if (!product.data.priceOptions.length) {
    errors.push("At least one price option is required.");
  }

  product.data.priceOptions.forEach((priceOption, priceIndex) => {
    if (!decimalPattern.test(priceOption.price)) {
      errors.push(`Price option ${priceIndex + 1} must be a decimal like 15.00.`);
    }
  });

  return errors;
};

const findDuplicateIds = (items) => {
  const seen = new Set();
  const duplicates = new Set();

  items.forEach((item) => {
    if (seen.has(item.id)) {
      duplicates.add(item.id);
    }

    seen.add(item.id);
  });

  return duplicates;
};

export const buildProductSeed = () => {
  const products = staticProducts.filter(shouldSeedProduct).map(normalizeStaticProduct);
  const productDuplicateIds = findDuplicateIds(products);
  const categoryMap = new Map();
  const errors = [];
  const warnings = [];

  products.forEach((product, index) => {
    const productLabel = product.data.title || `Product ${index + 1}`;
    const productErrors = validateProduct(product);

    productErrors.forEach((error) => {
      errors.push(`${productLabel}: ${error}`);
    });

    if (productDuplicateIds.has(product.id)) {
      errors.push(`${productLabel}: Product ID "${product.id}" is duplicated.`);
    }

    if (!product.source.category && product.data.category !== seedSlugify(giftCategoryName)) {
      errors.push(`${productLabel}: Missing category; approve a category mapping before seeding.`);
    }

    if (product.data.category && !approvedCategoryIds.has(product.data.category)) {
      errors.push(`${productLabel}: Category "${resolveCategoryName(product.source)}" is not approved for seeding.`);
    }

    if (product.data.category === seedSlugify(giftCategoryName) && !isLegacyGiftProduct(product.source)) {
      errors.push(`${productLabel}: Gifts is reserved for approved legacy gift-set products.`);
    }

    if (product.data.category && !categoryMap.has(product.data.category)) {
      categoryMap.set(product.data.category, {
        id: product.data.category,
        data: {
          name: resolveCategoryName(product.source),
          active: true,
          sortOrder: categoryMap.size,
        },
      });
    }
  });

  return {
    categories: Array.from(categoryMap.values()),
    errors,
    products,
    warnings,
  };
};
