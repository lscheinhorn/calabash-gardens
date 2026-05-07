import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

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

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
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

export default function ProductAdmin({ db }) {
  const [form, setForm] = useState(emptyProduct);
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
  const [message, setMessage] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");

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

  const updateCategoryForm = (field, value) => {
    setCategoryForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyProduct);
    setSelectedProductId("");
    setSelectedProduct(null);
    setMessage("");
  };

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategory);
    setSelectedCategoryId("");
    setCategoryMessage("");
  };

  const selectProduct = (product) => {
    setSelectedProductId(product.id);
    setSelectedProduct(product);
    setForm({
      slug: product.slug || product.id,
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
    setMessage("");
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

  const addPriceOption = () => {
    setForm((currentForm) => ({
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

  const validateProduct = (productId) => {
    const categoryIds = categories.map((category) => category.id);

    if (!productId || !form.title.trim() || !form.shipping.trim()) {
      return "Document ID, title, and shipping are required.";
    }

    if (!form.category || !categoryIds.includes(form.category)) {
      return "Choose an approved category.";
    }

    if (!decimalPattern.test(form.shipping.trim())) {
      return "Shipping must be a decimal like 17.00.";
    }

    if (form.sortOrder !== "" && !Number.isInteger(Number(form.sortOrder))) {
      return "Sort order must be a whole number.";
    }

    const hasInvalidPrice = form.priceOptions.some((priceOption) => (
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

    if (categoryForm.sortOrder !== "" && !Number.isInteger(Number(categoryForm.sortOrder))) {
      return "Category sort order must be a whole number.";
    }

    return "";
  };

  const buildProductPayload = (productId) => {
    const payload = {
      title: form.title.trim(),
      category: form.category.trim(),
      info: form.info.trim(),
      info1: form.info1.trim(),
      info2: form.info2.trim(),
      shipping: form.shipping.trim(),
      priceOptions: form.priceOptions.map((priceOption) => ({
        option: priceOption.option.trim(),
        price: priceOption.price.trim(),
      })),
      published: form.published,
      isActive: form.isActive,
      inStock: form.inStock,
      isHighlighted: form.isHighlighted,
      photos: selectedProduct?.photos || [],
      slug: productId,
      updatedAt: serverTimestamp(),
    };

    if (form.sortOrder !== "") {
      payload.sortOrder = Number(form.sortOrder);
    }

    if (!selectedProductId) {
      payload.createdAt = serverTimestamp();
    }

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const productId = selectedProductId || slugify(form.slug);
    const validationMessage = validateProduct(productId);

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await setDoc(doc(db, "products", productId), buildProductPayload(productId), {
        merge: true,
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

  return (
    <div className="admin_editor_grid">
      <form className="admin_form" onSubmit={handleSubmit}>
        <div className="admin_form_header">
          <h3>{selectedProductId ? "Edit Product" : "New Product"}</h3>
          <button className="admin_secondary_button" onClick={resetForm} type="button">
            New
          </button>
        </div>

        <label>
          Document ID
          <input
            disabled={Boolean(selectedProductId)}
            onChange={(event) => updateForm("slug", slugify(event.target.value))}
            placeholder="vermont-grown-saffron"
            required={!selectedProductId}
            value={form.slug}
          />
        </label>

        <label>
          Title
          <input
            onChange={(event) => updateForm("title", event.target.value)}
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
            {categories
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

        <div className="admin_split_fields">
          <label>
            Shipping
            <input
              inputMode="decimal"
              onChange={(event) => updateForm("shipping", event.target.value)}
              required
              value={form.shipping}
            />
          </label>
        </div>

        <div className="admin_checkbox_grid">
          <label>
            <input
              checked={form.published}
              onChange={(event) => updateForm("published", event.target.checked)}
              type="checkbox"
            />
            Published
          </label>
          <label>
            <input
              checked={form.isActive}
              onChange={(event) => updateForm("isActive", event.target.checked)}
              type="checkbox"
            />
            Active
          </label>
          <label>
            <input
              checked={form.inStock}
              onChange={(event) => updateForm("inStock", event.target.checked)}
              type="checkbox"
            />
            In Stock
          </label>
          <label>
            <input
              checked={form.isHighlighted}
              onChange={(event) => updateForm("isHighlighted", event.target.checked)}
              type="checkbox"
            />
            Highlighted
          </label>
        </div>

        <button className="admin_primary_button" disabled={isSaving} type="submit">
          {isSaving ? "Saving..." : "Save Product"}
        </button>

        {message ? <p className="admin_message">{message}</p> : null}
      </form>

      <div className="admin_panel">
        <div className="admin_form_header">
          <h3>Firestore Products</h3>
          <button className="admin_secondary_button" disabled={isLoading} onClick={loadProducts}>
            Refresh
          </button>
        </div>

        {isLoading ? <p className="admin_status">Loading products...</p> : null}

        <div className="admin_product_list">
          {products.map((product) => (
            <button
              className="admin_product_row"
              key={product.id}
              onClick={() => selectProduct(product)}
              type="button"
            >
              <span>{product.title || product.id}</span>
              <small>{product.published ? "Published" : "Draft"}</small>
            </button>
          ))}
        </div>
      </div>

      <form className="admin_form admin_category_panel" onSubmit={handleCategorySubmit}>
        <div className="admin_form_header">
          <h3>{selectedCategoryId ? "Edit Category" : "Product Categories"}</h3>
          <button className="admin_secondary_button" onClick={resetCategoryForm} type="button">
            New
          </button>
        </div>

        <label>
          Category ID
          <input
            disabled={Boolean(selectedCategoryId)}
            readOnly
            placeholder="saffron"
            value={selectedCategoryId || slugify(categoryForm.name)}
          />
        </label>

        <label>
          Category Name
          <input
            onChange={(event) => updateCategoryForm("name", event.target.value)}
            required
            value={categoryForm.name}
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
              <small>{category.active ? "Active" : "Inactive"}</small>
            </button>
          ))}
        </div>
      </form>
    </div>
  );
}
