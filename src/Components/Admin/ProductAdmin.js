import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
} from "firebase/storage";

import {
  approvedProductCategories,
  buildProductSeed,
  legacyGiftProductIds,
  seedSlugify,
} from "../../data/adminProductSeed";

const emptyProduct = {
  slug: "",
  title: "",
  category: "",
  info: "",
  info1: "",
  info2: "",
  shipping: "17.00",
  priceOptions: [{ option: "", price: "" }],
  published: false,
  isActive: false,
  inStock: true,
  isHighlighted: false,
  sortOrder: "",
};

const emptyCategory = {
  slug: "",
  name: "",
  active: true,
  sortOrder: "",
};

const decimalPattern = /^\d+\.\d{2}$/;
const maxImageSize = 10 * 1024 * 1024;

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/['‘’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizePriceOptions = (priceOptions) => {
  if (!Array.isArray(priceOptions) || priceOptions.length === 0) {
    return [{ option: "", price: "" }];
  }

  return priceOptions.map((priceOption) => ({
    option: priceOption.option || "",
    price: priceOption.price || "",
  }));
};

const normalizePhotos = (photos) => {
  if (!Array.isArray(photos)) {
    return [];
  }

  return photos
    .map((photo, index) => {
      if (typeof photo === "string") {
        return {
          path: photo,
          alt: "",
          sortOrder: index,
        };
      }

      if (!photo || typeof photo !== "object" || !photo.path) {
        return null;
      }

      return {
        path: photo.path,
        alt: photo.alt || "",
        sortOrder: Number.isInteger(photo.sortOrder) ? photo.sortOrder : index,
      };
    })
    .filter(Boolean);
};

const buildImagePath = (productId, fileName) => {
  const safeName = slugify(fileName.replace(/\.[^.]+$/, "")) || "product-image";
  const extensionMatch = fileName.match(/\.([a-z0-9]+)$/i);
  const extension = extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : "";

  return `product-images/${productId}-${Date.now()}-${safeName}${extension}`;
};

const approvedCategoryIds = new Set(approvedProductCategories.map((category) => (
  seedSlugify(category)
)));

const isApprovedCategoryId = (categoryId) => approvedCategoryIds.has(categoryId);
const giftCategoryId = seedSlugify("Gifts");
const isGiftAllowedForProduct = (productId) => legacyGiftProductIds.has(productId);

const buildFormFromProduct = (product) => ({
  slug: product.id,
  title: product.title || "",
  category: product.category || "",
  info: product.info || "",
  info1: product.info1 || "",
  info2: product.info2 || "",
  shipping: product.shipping || "17.00",
  priceOptions: normalizePriceOptions(product.priceOptions),
  published: product.published === true,
  isActive: product.isActive === true,
  inStock: product.inStock !== false,
  isHighlighted: product.isHighlighted === true,
  sortOrder: product.sortOrder ?? "",
});

export default function ProductAdmin({ db, storage }) {
  const [form, setForm] = useState(emptyProduct);
  const [editingForm, setEditingForm] = useState(emptyProduct);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoAlt, setPhotoAlt] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [isProductIdEdited, setIsProductIdEdited] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    products: true,
  });
  const [expandedProductId, setExpandedProductId] = useState("");
  const [editingProductId, setEditingProductId] = useState("");
  const [productCardMessage, setProductCardMessage] = useState("");
  const [productFilters, setProductFilters] = useState({
    search: "",
    category: "all",
    published: "all",
    active: "all",
    stock: "all",
  });

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const productsQuery = query(collection(db, "products"), orderBy("title"));
      const snapshot = await getDocs(productsQuery);
      setProducts(snapshot.docs.map((productDoc) => ({
        id: productDoc.id,
        ...productDoc.data(),
      })));
    } catch (error) {
      setMessage("Products could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const loadCategories = useCallback(async () => {
    setIsLoadingCategories(true);
    setCategoryMessage("");

    try {
      const categoriesQuery = query(collection(db, "productCategories"), orderBy("name"));
      const snapshot = await getDocs(categoriesQuery);
      setCategories(snapshot.docs.map((categoryDoc) => ({
        id: categoryDoc.id,
        ...categoryDoc.data(),
      })));
    } catch (error) {
      setCategoryMessage("Categories could not be loaded.");
    } finally {
      setIsLoadingCategories(false);
    }
  }, [db]);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadCategories, loadProducts]);

  const updateForm = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateEditingForm = (field, value) => {
    setEditingForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateCategoryForm = (field, value) => {
    setCategoryForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateProductTitle = (value) => {
    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        title: value,
      };

      if (!isProductIdEdited) {
        nextForm.slug = slugify(value);
      }

      return nextForm;
    });
  };

  const updateProductId = (value) => {
    setIsProductIdEdited(true);
    updateForm("slug", slugify(value));
  };

  const toggleSection = (section) => {
    setExpandedSections((currentSections) => ({
      ...currentSections,
      [section]: !currentSections[section],
    }));
  };

  const updateFilter = (field, value) => {
    setProductFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyProduct);
    setIsProductIdEdited(false);
    setMessage("");
  };

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategory);
    setSelectedCategoryId("");
    setCategoryMessage("");
  };

  const selectProduct = (product) => {
    const normalizedProduct = {
      ...product,
      photos: normalizePhotos(product.photos),
    };

    setSelectedProductId(product.id);
    setSelectedProduct(normalizedProduct);
    setPhotoMessage("");
    setPhotoAlt("");
    setPhotoFile(null);
    setPhotoInputKey((currentKey) => currentKey + 1);
  };

  const toggleProductCard = (product) => {
    const nextProductId = expandedProductId === product.id ? "" : product.id;

    setExpandedProductId(nextProductId);
    setProductCardMessage("");

    if (nextProductId !== product.id && editingProductId === product.id) {
      setEditingProductId("");
      setEditingForm(emptyProduct);
    }
  };

  const startProductEdit = (product) => {
    setExpandedProductId(product.id);
    setEditingProductId(product.id);
    setEditingForm(buildFormFromProduct(product));
    setProductCardMessage("");
  };

  const cancelProductEdit = () => {
    setEditingProductId("");
    setEditingForm(emptyProduct);
    setProductCardMessage("");
  };

  const selectCategory = (category) => {
    setSelectedCategoryId(category.id);
    setCategoryForm({
      slug: category.id,
      name: category.name || "",
      active: category.active === true,
      sortOrder: category.sortOrder ?? "",
    });
    setCategoryMessage("");
  };

  const updatePriceOption = (index, field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      priceOptions: currentForm.priceOptions.map((priceOption, priceOptionIndex) => (
        priceOptionIndex === index
          ? { ...priceOption, [field]: value }
          : priceOption
      )),
    }));
  };

  const updateEditingPriceOption = (index, field, value) => {
    setEditingForm((currentForm) => ({
      ...currentForm,
      priceOptions: currentForm.priceOptions.map((priceOption, priceOptionIndex) => (
        priceOptionIndex === index
          ? { ...priceOption, [field]: value }
          : priceOption
      )),
    }));
  };

  const addPriceOption = () => {
    setForm((currentForm) => ({
      ...currentForm,
      priceOptions: [...currentForm.priceOptions, { option: "", price: "" }],
    }));
  };

  const addEditingPriceOption = () => {
    setEditingForm((currentForm) => ({
      ...currentForm,
      priceOptions: [...currentForm.priceOptions, { option: "", price: "" }],
    }));
  };

  const removePriceOption = (index) => {
    setForm((currentForm) => ({
      ...currentForm,
      priceOptions: currentForm.priceOptions.filter((priceOption, priceOptionIndex) => (
        priceOptionIndex !== index || currentForm.priceOptions.length === 1
      )),
    }));
  };

  const removeEditingPriceOption = (index) => {
    setEditingForm((currentForm) => ({
      ...currentForm,
      priceOptions: currentForm.priceOptions.filter((priceOption, priceOptionIndex) => (
        priceOptionIndex !== index || currentForm.priceOptions.length === 1
      )),
    }));
  };

  const validateProduct = (productId, productForm = form, isNewProduct = true) => {
    if (!productId || !productForm.title.trim() || !productForm.shipping.trim()) {
      return "Document ID, title, and shipping are required.";
    }

    if (isNewProduct && products.some((product) => product.id === productId)) {
      return "That product ID already exists. Change the title or edit the existing product.";
    }

    if (!productForm.category || !isApprovedCategoryId(productForm.category)) {
      return "Choose an approved category.";
    }

    if (productForm.category === giftCategoryId && !isGiftAllowedForProduct(productId)) {
      return "Gifts is reserved for the preserved legacy gift-set products.";
    }

    if (!decimalPattern.test(productForm.shipping.trim())) {
      return "Shipping must be a decimal like 17.00.";
    }

    if (productForm.sortOrder !== "" && !Number.isInteger(Number(productForm.sortOrder))) {
      return "Sort order must be a whole number.";
    }

    const hasInvalidPrice = productForm.priceOptions.some((priceOption) => (
      !decimalPattern.test(priceOption.price.trim())
    ));

    if (hasInvalidPrice) {
      return "Every price must be a decimal like 15.00.";
    }

    return "";
  };

  const validateCategory = (categoryId) => {
    if (!categoryId || !categoryForm.name.trim()) {
      return "Category ID and name are required.";
    }

    if (!isApprovedCategoryId(categoryId)) {
      return "Choose one of the approved product categories.";
    }

    if (!selectedCategoryId && categories.some((category) => category.id === categoryId)) {
      return "That category ID already exists. Change the name or edit the existing category.";
    }

    if (categoryForm.sortOrder !== "" && !Number.isInteger(Number(categoryForm.sortOrder))) {
      return "Category sort order must be a whole number.";
    }

    return "";
  };

  const buildProductPayload = (
    productId,
    productForm = form,
    currentProduct = null,
    isNewProduct = true,
    includePhotos = true
  ) => {
    const payload = {
      title: productForm.title.trim(),
      category: productForm.category.trim(),
      info: productForm.info.trim(),
      info1: productForm.info1.trim(),
      info2: productForm.info2.trim(),
      shipping: productForm.shipping.trim(),
      priceOptions: productForm.priceOptions.map((priceOption) => ({
        option: priceOption.option.trim(),
        price: priceOption.price.trim(),
      })),
      published: productForm.published,
      isActive: productForm.isActive,
      inStock: productForm.inStock,
      isHighlighted: productForm.isHighlighted,
      slug: productId,
      updatedAt: serverTimestamp(),
    };

    if (includePhotos) {
      payload.photos = normalizePhotos(currentProduct?.photos);
    }

    if (productForm.sortOrder !== "") {
      payload.sortOrder = Number(productForm.sortOrder);
    }

    if (isNewProduct) {
      payload.createdAt = serverTimestamp();
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const productId = slugify(form.slug);
    const validationMessage = validateProduct(productId, form, true);

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const payload = buildProductPayload(productId, form, null, true);

      await setDoc(doc(db, "products", productId), payload, {
        merge: true,
      });
      setSelectedProduct({
        id: productId,
        ...payload,
      });
      setMessage("Product saved to Firestore.");
      setSelectedProductId(productId);
      await loadProducts();
    } catch (error) {
      setMessage("Product could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProductCardSubmit = async (event, product) => {
    event.preventDefault();

    const validationMessage = validateProduct(product.id, editingForm, false);

    if (validationMessage) {
      setProductCardMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setProductCardMessage("");

    try {
      const payload = buildProductPayload(product.id, editingForm, product, false, false);

      await setDoc(doc(db, "products", product.id), payload, { merge: true });
      setProductCardMessage("Product saved to Firestore.");
      setEditingProductId("");
      setEditingForm(emptyProduct);
      await loadProducts();
    } catch (error) {
      setProductCardMessage("Product could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    event.preventDefault();

    if (!selectedProductId || !selectedProduct) {
      setPhotoMessage("Save or select a product before uploading photos.");
      return;
    }

    if (!storage) {
      setPhotoMessage("Firebase Storage is not configured.");
      return;
    }

    if (!photoFile) {
      setPhotoMessage("Choose an image to upload.");
      return;
    }

    if (!photoFile.type.startsWith("image/")) {
      setPhotoMessage("Product photos must be image files.");
      return;
    }

    if (photoFile.size >= maxImageSize) {
      setPhotoMessage("Product photos must be smaller than 10 MB.");
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoMessage("");

    try {
      const currentPhotos = normalizePhotos(selectedProduct.photos);
      const photoPath = buildImagePath(selectedProductId, photoFile.name);
      const photoRef = ref(storage, photoPath);

      await uploadBytes(photoRef, photoFile, {
        contentType: photoFile.type,
      });

      const updatedPhotos = [
        ...currentPhotos,
        {
          path: photoPath,
          alt: photoAlt.trim(),
          sortOrder: currentPhotos.length,
        },
      ];

      await setDoc(doc(db, "products", selectedProductId), {
        photos: updatedPhotos,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setSelectedProduct((currentProduct) => ({
        ...currentProduct,
        photos: updatedPhotos,
      }));
      setPhotoAlt("");
      setPhotoFile(null);
      setPhotoInputKey((currentKey) => currentKey + 1);
      setPhotoMessage("Photo uploaded and attached to this product.");
      await loadProducts();
    } catch (error) {
      setPhotoMessage("Photo could not be uploaded.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();

    const categoryId = selectedCategoryId || slugify(categoryForm.name);
    const validationMessage = validateCategory(categoryId);

    if (validationMessage) {
      setCategoryMessage(validationMessage);
      return;
    }

    setIsSavingCategory(true);
    setCategoryMessage("");

    const payload = {
      name: categoryForm.name.trim(),
      active: categoryForm.active,
      sortOrder: categoryForm.sortOrder === "" ? null : Number(categoryForm.sortOrder),
      updatedAt: serverTimestamp(),
    };

    if (!selectedCategoryId) {
      payload.createdAt = serverTimestamp();
    }

    try {
      await setDoc(doc(db, "productCategories", categoryId), payload, { merge: true });
      setSelectedCategoryId(categoryId);
      setCategoryMessage("Category saved to Firestore.");
      await loadCategories();
    } catch (error) {
      setCategoryMessage("Category could not be saved.");
    } finally {
      setIsSavingCategory(false);
    }
  };

  const previewProductSeed = () => {
    const seed = buildProductSeed();
    const existingProductIds = new Set(products.map((product) => product.id));
    const existingCategoryIds = new Set(categories.map((category) => category.id));

    setSeedResult({
      ...seed,
      missingCategories: seed.categories.filter((category) => !existingCategoryIds.has(category.id)),
      missingProducts: seed.products.filter((product) => !existingProductIds.has(product.id)),
    });
  };

  const seedMissingProducts = async () => {
    const seed = seedResult || buildProductSeed();
    const existingProductIds = new Set(products.map((product) => product.id));
    const existingCategoryIds = new Set(categories.map((category) => category.id));
    const missingCategories = seed.categories.filter((category) => !existingCategoryIds.has(category.id));
    const missingProducts = seed.products.filter((product) => !existingProductIds.has(product.id));

    if (seed.errors.length) {
      setSeedResult({
        ...seed,
        missingCategories,
        missingProducts,
      });
      return;
    }

    if (!missingCategories.length && !missingProducts.length) {
      setSeedResult({
        ...seed,
        missingCategories,
        missingProducts,
        message: "Everything from the static product list is already seeded.",
      });
      return;
    }

    setIsSeeding(true);

    try {
      const timestamp = serverTimestamp();
      let seededCategoryCount = 0;
      let seededProductCount = 0;

      if (missingCategories.length) {
        seededCategoryCount = await runTransaction(db, async (transaction) => {
          const categoryReads = [];

          for (const category of missingCategories) {
            const categoryRef = doc(db, "productCategories", category.id);
            const categorySnapshot = await transaction.get(categoryRef);
            categoryReads.push({
              category,
              categoryRef,
              categorySnapshot,
            });
          }

          let createdCount = 0;

          categoryReads.forEach(({ category, categoryRef, categorySnapshot }) => {
            if (!categorySnapshot.exists()) {
              transaction.set(categoryRef, {
                ...category.data,
                createdAt: timestamp,
                updatedAt: timestamp,
              });
              createdCount += 1;
            }
          });

          return createdCount;
        });
      }

      if (missingProducts.length) {
        seededProductCount = await runTransaction(db, async (transaction) => {
          const productReads = [];

          for (const product of missingProducts) {
            const productRef = doc(db, "products", product.id);
            const productSnapshot = await transaction.get(productRef);
            productReads.push({
              product,
              productRef,
              productSnapshot,
            });
          }

          let createdCount = 0;

          productReads.forEach(({ product, productRef, productSnapshot }) => {
            if (!productSnapshot.exists()) {
              transaction.set(productRef, {
                ...product.data,
                createdAt: timestamp,
                updatedAt: timestamp,
              });
              createdCount += 1;
            }
          });

          return createdCount;
        });
      }
      await loadCategories();
      await loadProducts();

      setSeedResult({
        ...seed,
        missingCategories: [],
        missingProducts: [],
        message: `Seeded ${seededProductCount} products and ${seededCategoryCount} categories.`,
      });
    } catch (error) {
      setSeedResult({
        ...seed,
        missingCategories,
        missingProducts,
        message: "Static products could not be seeded.",
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const search = productFilters.search.trim().toLowerCase();
    const title = String(product.title || product.id).toLowerCase();
    const matchesSearch = !search || title.includes(search) || product.id.includes(search);
    const matchesCategory = productFilters.category === "all" || product.category === productFilters.category;
    const matchesPublished = productFilters.published === "all"
      || (productFilters.published === "published" && product.published === true)
      || (productFilters.published === "draft" && product.published !== true);
    const matchesActive = productFilters.active === "all"
      || (productFilters.active === "active" && product.isActive === true)
      || (productFilters.active === "inactive" && product.isActive !== true);
    const matchesStock = productFilters.stock === "all"
      || (productFilters.stock === "inStock" && product.inStock !== false)
      || (productFilters.stock === "outOfStock" && product.inStock === false);

    return matchesSearch && matchesCategory && matchesPublished && matchesActive && matchesStock;
  });

  const approvedCategories = categories.filter((category) => isApprovedCategoryId(category.id));
  const productCategoryOptions = (productId) => approvedCategories.filter((category) => (
    category.id !== giftCategoryId || isGiftAllowedForProduct(productId)
  ));
  const unapprovedCategories = categories.filter((category) => !isApprovedCategoryId(category.id));
  const productsWithUnapprovedCategories = products.filter((product) => (
    product.category && !isApprovedCategoryId(product.category)
  ));
  const categoryNameById = categories.reduce((categoryNames, category) => ({
    ...categoryNames,
    [category.id]: category.name || category.id,
  }), {});

  return (
    <div className="admin_editor_grid">
      <section className="admin_panel admin_full_width">
        <div className="admin_form_header">
          <h3>Firestore Products</h3>
          <div className="admin_button_row">
            <button className="admin_secondary_button" disabled={isLoading} onClick={loadProducts} type="button">
              Refresh
            </button>
            <button className="admin_secondary_button" onClick={() => toggleSection("products")} type="button">
              {expandedSections.products ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>

        {expandedSections.products ? (
          <>
            <div className="admin_filter_grid">
              <label>
                Search
                <input
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Product title or ID"
                  value={productFilters.search}
                />
              </label>
              <label>
                Category
                <select onChange={(event) => updateFilter("category", event.target.value)} value={productFilters.category}>
                  <option value="all">All Categories</option>
                  {approvedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name || category.id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Published
                <select onChange={(event) => updateFilter("published", event.target.value)} value={productFilters.published}>
                  <option value="all">All</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
              <label>
                Active
                <select onChange={(event) => updateFilter("active", event.target.value)} value={productFilters.active}>
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label>
                Stock
                <select onChange={(event) => updateFilter("stock", event.target.value)} value={productFilters.stock}>
                  <option value="all">All</option>
                  <option value="inStock">In Stock</option>
                  <option value="outOfStock">Out of Stock</option>
                </select>
              </label>
            </div>

            {isLoading ? <p className="admin_status">Loading products...</p> : null}
            <p className="admin_status">{filteredProducts.length} of {products.length} products shown.</p>

            <div className="admin_product_list">
              {filteredProducts.map((product) => {
                const isExpanded = expandedProductId === product.id;
                const isEditing = editingProductId === product.id;

                return (
                  <article className="admin_product_card" key={product.id}>
                    <button
                      className="admin_product_card_header"
                      onClick={() => toggleProductCard(product)}
                      type="button"
                    >
                      <span>{product.title || product.id}</span>
                      <small>{isExpanded ? "Collapse" : "Expand"}</small>
                    </button>

                    <div className="admin_product_meta">
                      <span>{product.published ? "Published" : "Draft"}</span>
                      <span>{product.isActive ? "Active" : "Inactive"}</span>
                      <span>{product.inStock === false ? "Out of Stock" : "In Stock"}</span>
                      <span>{categoryNameById[product.category] || product.category || "No Category"}</span>
                    </div>

                    {isExpanded ? (
                      <div className="admin_product_card_body">
                        <dl className="admin_product_details">
                          <div>
                            <dt>ID</dt>
                            <dd>{product.id}</dd>
                          </div>
                          <div>
                            <dt>Shipping</dt>
                            <dd>{product.shipping || "None"}</dd>
                          </div>
                          <div>
                            <dt>Prices</dt>
                            <dd>
                              {normalizePriceOptions(product.priceOptions).map((priceOption, index) => (
                                <span key={`${product.id}-price-${index}`}>
                                  {priceOption.option ? `${priceOption.option}: ` : ""}${priceOption.price}
                                </span>
                              ))}
                            </dd>
                          </div>
                        </dl>

                        {!isEditing ? (
                          <div className="admin_button_row">
                            <button className="admin_primary_button" onClick={() => startProductEdit(product)} type="button">
                              Edit
                            </button>
                            <button className="admin_secondary_button" onClick={() => selectProduct(product)} type="button">
                              Use For Photos
                            </button>
                          </div>
                        ) : (
                          <form className="admin_inline_form" onSubmit={(event) => handleProductCardSubmit(event, product)}>
                            <label>
                              Product ID
                              <input disabled value={product.id} />
                            </label>
                            <label>
                              Title
                              <input
                                onChange={(event) => updateEditingForm("title", event.target.value)}
                                required
                                value={editingForm.title}
                              />
                            </label>
                            <label>
                              Category
                              <select
                                onChange={(event) => updateEditingForm("category", event.target.value)}
                                required
                                value={editingForm.category}
                              >
                                <option value="">Choose category</option>
                                {productCategoryOptions(product.id)
                                  .filter((category) => category.active || category.id === editingForm.category)
                                  .map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            <label>
                              Description
                              <textarea
                                onChange={(event) => updateEditingForm("info", event.target.value)}
                                rows="3"
                                value={editingForm.info}
                              />
                            </label>
                            <div className="admin_price_options">
                              {editingForm.priceOptions.map((priceOption, index) => (
                                <div className="admin_split_fields" key={`edit-price-option-${product.id}-${index}`}>
                                  <label>
                                    Option Label
                                    <input
                                      onChange={(event) => updateEditingPriceOption(index, "option", event.target.value)}
                                      value={priceOption.option}
                                    />
                                  </label>
                                  <label>
                                    Price
                                    <input
                                      inputMode="decimal"
                                      onChange={(event) => updateEditingPriceOption(index, "price", event.target.value)}
                                      required
                                      value={priceOption.price}
                                    />
                                  </label>
                                  <button
                                    className="admin_secondary_button"
                                    disabled={editingForm.priceOptions.length === 1}
                                    onClick={() => removeEditingPriceOption(index)}
                                    type="button"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                              <button className="admin_secondary_button" onClick={addEditingPriceOption} type="button">
                                Add Price Option
                              </button>
                            </div>
                            <label>
                              Shipping
                              <input
                                inputMode="decimal"
                                onChange={(event) => updateEditingForm("shipping", event.target.value)}
                                required
                                value={editingForm.shipping}
                              />
                            </label>
                            <div className="admin_checkbox_grid">
                              <label>
                                <input checked={editingForm.published} onChange={(event) => updateEditingForm("published", event.target.checked)} type="checkbox" />
                                Published
                              </label>
                              <label>
                                <input checked={editingForm.isActive} onChange={(event) => updateEditingForm("isActive", event.target.checked)} type="checkbox" />
                                Active
                              </label>
                              <label>
                                <input checked={editingForm.inStock} onChange={(event) => updateEditingForm("inStock", event.target.checked)} type="checkbox" />
                                In Stock
                              </label>
                              <label>
                                <input checked={editingForm.isHighlighted} onChange={(event) => updateEditingForm("isHighlighted", event.target.checked)} type="checkbox" />
                                Highlighted
                              </label>
                            </div>
                            <div className="admin_button_row">
                              <button className="admin_primary_button" disabled={isSaving} type="submit">
                                {isSaving ? "Saving..." : "Save Product"}
                              </button>
                              <button className="admin_secondary_button" onClick={cancelProductEdit} type="button">
                                Cancel
                              </button>
                            </div>
                            {productCardMessage ? <p className="admin_message">{productCardMessage}</p> : null}
                          </form>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </>
        ) : null}
      </section>

      <section className="admin_panel">
        <div className="admin_form_header">
          <h3>New Product</h3>
          <button className="admin_secondary_button" onClick={() => toggleSection("newProduct")} type="button">
            {expandedSections.newProduct ? "Collapse" : "Expand"}
          </button>
        </div>

        {expandedSections.newProduct ? (
          <form className="admin_form admin_embedded_form" onSubmit={handleSubmit}>
            <label>
              Document ID
              <input
                onChange={(event) => updateProductId(event.target.value)}
                placeholder="vermont-grown-saffron"
                required
                value={form.slug}
              />
              <small className="admin_help_text">
                Suggested from the title. This ID is locked after saving; use a new
                product if the ID needs to change later.
              </small>
            </label>

            <label>
              Title
              <input
                onChange={(event) => updateProductTitle(event.target.value)}
                required
                value={form.title}
              />
            </label>

            <label>
              Category
              <select
                onChange={(event) => updateForm("category", event.target.value)}
                required
                value={form.category}
              >
                <option value="">Choose category</option>
                {productCategoryOptions("")
                  .filter((category) => category.active || category.id === form.category)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              Description
              <textarea
                onChange={(event) => updateForm("info", event.target.value)}
                rows="4"
                value={form.info}
              />
            </label>

            <div className="admin_price_options">
              {form.priceOptions.map((priceOption, index) => (
                <div className="admin_split_fields" key={`price-option-${index}`}>
                  <label>
                    Option Label
                    <input
                      onChange={(event) => updatePriceOption(index, "option", event.target.value)}
                      placeholder="4 oz"
                      value={priceOption.option}
                    />
                  </label>
                  <label>
                    Price
                    <input
                      inputMode="decimal"
                      onChange={(event) => updatePriceOption(index, "price", event.target.value)}
                      placeholder="15.00"
                      required
                      value={priceOption.price}
                    />
                  </label>
                  <button
                    className="admin_secondary_button"
                    disabled={form.priceOptions.length === 1}
                    onClick={() => removePriceOption(index)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button className="admin_secondary_button" onClick={addPriceOption} type="button">
                Add Price Option
              </button>
            </div>

            <label>
              Shipping
              <input
                inputMode="decimal"
                onChange={(event) => updateForm("shipping", event.target.value)}
                required
                value={form.shipping}
              />
            </label>

            <div className="admin_checkbox_grid">
              <label>
                <input checked={form.published} onChange={(event) => updateForm("published", event.target.checked)} type="checkbox" />
                Published
              </label>
              <label>
                <input checked={form.isActive} onChange={(event) => updateForm("isActive", event.target.checked)} type="checkbox" />
                Active
              </label>
              <label>
                <input checked={form.inStock} onChange={(event) => updateForm("inStock", event.target.checked)} type="checkbox" />
                In Stock
              </label>
              <label>
                <input checked={form.isHighlighted} onChange={(event) => updateForm("isHighlighted", event.target.checked)} type="checkbox" />
                Highlighted
              </label>
            </div>

            <div className="admin_button_row">
              <button className="admin_primary_button" disabled={isSaving} type="submit">
                {isSaving ? "Saving..." : "Save Product"}
              </button>
              <button className="admin_secondary_button" onClick={resetForm} type="button">
                Clear
              </button>
            </div>

            {message ? <p className="admin_message">{message}</p> : null}
          </form>
        ) : null}
      </section>

      <section className="admin_panel admin_photo_panel">
        <div className="admin_form_header">
          <h3>Product Photos</h3>
          <button className="admin_secondary_button" onClick={() => toggleSection("photos")} type="button">
            {expandedSections.photos ? "Collapse" : "Expand"}
          </button>
        </div>

        {expandedSections.photos ? (
          <form className="admin_embedded_form" onSubmit={handlePhotoUpload}>
            {!selectedProductId ? (
              <p className="admin_status">Choose Use For Photos on a product card first.</p>
            ) : (
              <p className="admin_status">Uploading for {selectedProduct?.title || selectedProductId}</p>
            )}

            <label>
              Image File
              <input
                accept="image/*"
                disabled={!selectedProductId || isUploadingPhoto}
                key={photoInputKey}
                onChange={(event) => setPhotoFile(event.target.files?.[0] || null)}
                type="file"
              />
            </label>
            <label>
              Alt Text
              <input
                disabled={!selectedProductId || isUploadingPhoto}
                onChange={(event) => setPhotoAlt(event.target.value)}
                placeholder="Small jar of saffron salt"
                value={photoAlt}
              />
            </label>
            <button
              className="admin_primary_button"
              disabled={!selectedProductId || isUploadingPhoto}
              type="submit"
            >
              {isUploadingPhoto ? "Uploading..." : "Upload Photo"}
            </button>
            {photoMessage ? <p className="admin_message">{photoMessage}</p> : null}
            <div className="admin_photo_list">
              {normalizePhotos(selectedProduct?.photos).map((photo) => (
                <div className="admin_photo_row" key={photo.path}>
                  <span>{photo.alt || "No alt text"}</span>
                  <small>{photo.path}</small>
                </div>
              ))}
            </div>
          </form>
        ) : null}
      </section>

      <form className="admin_form admin_category_panel" onSubmit={handleCategorySubmit}>
        <div className="admin_form_header">
          <h3>{selectedCategoryId ? "Edit Category" : "Product Categories"}</h3>
          <div className="admin_button_row">
            <button className="admin_secondary_button" onClick={resetCategoryForm} type="button">
              New
            </button>
            <button className="admin_secondary_button" onClick={() => toggleSection("categories")} type="button">
              {expandedSections.categories ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>

        {expandedSections.categories ? (
          <>
            <label>
              Category Name
              <select
                disabled={Boolean(selectedCategoryId)}
                onChange={(event) => updateCategoryForm("name", event.target.value)}
                required
                value={categoryForm.name}
              >
                <option value="">Choose category</option>
                {approvedProductCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <small className="admin_help_text">
                Category IDs are generated only from this approved category list.
              </small>
            </label>

            <label>
              Category ID
              <input
                disabled
                readOnly
                placeholder="saffron"
                value={selectedCategoryId || slugify(categoryForm.name)}
              />
            </label>

            <label>
              Sort Order
              <input
                inputMode="numeric"
                onChange={(event) => updateCategoryForm("sortOrder", event.target.value)}
                value={categoryForm.sortOrder}
              />
            </label>

            <div className="admin_checkbox_grid">
              <label>
                <input
                  checked={categoryForm.active}
                  onChange={(event) => updateCategoryForm("active", event.target.checked)}
                  type="checkbox"
                />
                Active
              </label>
            </div>

            <button className="admin_primary_button" disabled={isSavingCategory} type="submit">
              {isSavingCategory ? "Saving..." : "Save Category"}
            </button>

            {categoryMessage ? <p className="admin_message">{categoryMessage}</p> : null}

            {isLoadingCategories ? <p className="admin_status">Loading categories...</p> : null}

            <div className="admin_product_list">
              {categories.map((category) => (
                <button
                  className="admin_product_row"
                  key={category.id}
                  onClick={() => selectCategory(category)}
                  type="button"
                >
                  <span>{category.name || category.id}</span>
                  <small>
                    {isApprovedCategoryId(category.id)
                      ? (category.active ? "Active" : "Inactive")
                      : "Unapproved"}
                  </small>
                </button>
              ))}
            </div>
            {unapprovedCategories.length ? (
              <p className="admin_message">
                Unapproved Firestore categories found: {unapprovedCategories.map((category) => category.name || category.id).join(", ")}.
                Remove them from Firestore before relying on this category list.
              </p>
            ) : null}
            {productsWithUnapprovedCategories.length ? (
              <p className="admin_message">
                Products with unapproved categories found: {productsWithUnapprovedCategories.map((product) => product.title || product.id).join(", ")}.
              </p>
            ) : null}
          </>
        ) : null}
      </form>

      <div className="admin_panel admin_seed_panel">
        <div className="admin_form_header">
          <h3>Seed Static Products</h3>
          <button className="admin_secondary_button" onClick={() => toggleSection("seed")} type="button">
            {expandedSections.seed ? "Collapse" : "Expand"}
          </button>
        </div>

        {expandedSections.seed ? (
          <>
            <p className="admin_status">
              Validate and copy missing static products into Firestore. Existing
              Firestore products are skipped, not overwritten.
            </p>

            <div className="admin_button_row">
              <button className="admin_secondary_button" onClick={previewProductSeed} type="button">
                Validate Seed
              </button>
              <button
                className="admin_primary_button"
                disabled={isSeeding || !seedResult || seedResult.errors.length > 0}
                onClick={seedMissingProducts}
                type="button"
              >
                {isSeeding ? "Seeding..." : "Seed Missing Products"}
              </button>
            </div>

            {seedResult ? (
              <div className="admin_seed_summary">
                <strong>
                  {seedResult.errors.length ? "Seed blocked by validation errors." : (
                    `${seedResult.missingProducts.length} products and ${seedResult.missingCategories.length} categories ready to seed.`
                  )}
                </strong>
                <small>
                  Checked {seedResult.products.length} static products and{" "}
                  {seedResult.categories.length} categories.
                </small>
                {seedResult.message ? <p className="admin_message">{seedResult.message}</p> : null}
                {seedResult.errors.length ? (
                  <div>
                    <strong>Errors</strong>
                    <ul>
                      {seedResult.errors.map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {seedResult.warnings.length ? (
                  <div>
                    <strong>Warnings</strong>
                    <ul>
                      {seedResult.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
