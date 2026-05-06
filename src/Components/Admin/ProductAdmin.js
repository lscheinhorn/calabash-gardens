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
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const updateForm = (field, value) => {
    setForm((currentForm) => ({
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
    const hasValidPrices = form.priceOptions.every((priceOption) => priceOption.price.trim());

    if (!productId || !form.title.trim() || !form.shipping.trim() || !hasValidPrices) {
      setMessage("Document ID, title, shipping, and every price are required.");
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
          <input
            onChange={(event) => updateForm("category", event.target.value)}
            value={form.category}
          />
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
    </div>
  );
}
