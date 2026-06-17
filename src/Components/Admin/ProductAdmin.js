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
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import {
  approvedProductCategories,
  buildProductSeed,
  legacyGiftProductIds,
  seedSlugify,
} from "../../data/adminProductSeed";
import {
  activeAdminDrafts,
  applyAdminDrafts,
  discardAdminDraft,
  loadAdminDrafts,
  publishAdminDraft,
  saveAdminDraft,
} from "../../data/adminDrafts";
import AdminPublishReview from "./AdminPublishReview";

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
const recommendedImageSize = 10 * 1024 * 1024;
const maxOriginalImageSize = 25 * 1024 * 1024;
const optimizedImageMaxWidth = 1800;
const optimizedImageQuality = 0.82;

const CollapseIcon = ({ isExpanded }) => (
  <FontAwesomeIcon
    aria-hidden="true"
    className="admin_collapse_icon"
    icon={isExpanded ? faChevronDown : faChevronRight}
  />
);

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
        mediaAssetId: photo.mediaAssetId || "",
        sortOrder: Number.isInteger(photo.sortOrder) ? photo.sortOrder : index,
      };
    })
    .filter(Boolean);
};

const normalizeMediaAsset = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    alt: String(data.alt || ""),
    bin: String(data.bin || "other"),
    linkedId: String(data.linkedId || ""),
    linkedType: String(data.linkedType || "none"),
    status: String(data.status || "active"),
    storagePath: String(data.storagePath || ""),
    tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag || "").trim()).filter(Boolean) : [],
    title: String(data.title || snapshot.id),
  };
};

const formatFileSize = (size) => {
  if (!size) {
    return "0 MB";
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const fileExtensionFor = (fileName, contentType) => {
  if (contentType === "image/jpeg") {
    return ".jpg";
  }

  if (contentType === "image/png") {
    return ".png";
  }

  if (contentType === "image/webp") {
    return ".webp";
  }

  const extensionMatch = fileName.match(/\.([a-z0-9]+)$/i);

  return extensionMatch ? `.${extensionMatch[1].toLowerCase()}` : "";
};

const buildImagePath = (productId, fileName, contentType) => {
  const safeName = slugify(fileName.replace(/\.[^.]+$/, "")) || "product-image";
  const extension = fileExtensionFor(fileName, contentType);

  return `product-images/${productId}-${Date.now()}-${safeName}${extension}`;
};

const loadImage = (file) => new Promise((resolve, reject) => {
  const image = new Image();
  const imageUrl = URL.createObjectURL(file);

  image.onload = () => {
    URL.revokeObjectURL(imageUrl);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    reject(new Error("Image could not be read."));
  };
  image.src = imageUrl;
});

const canvasToBlob = (canvas, contentType, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) {
      resolve(blob);
      return;
    }

    reject(new Error("Image could not be optimized."));
  }, contentType, quality);
});

const optimizeImageFile = async (file) => {
  const image = await loadImage(file);
  const scale = Math.min(1, optimizedImageMaxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  return canvasToBlob(canvas, "image/jpeg", optimizedImageQuality);
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

export default function ProductAdmin({ db, storage, userId = "" }) {
  const [form, setForm] = useState(emptyProduct);
  const [editingForm, setEditingForm] = useState(emptyProduct);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [products, setProducts] = useState([]);
  const [liveProducts, setLiveProducts] = useState([]);
  const [draftsById, setDraftsById] = useState({});
  const [categories, setCategories] = useState([]);
  const [mediaAssets, setMediaAssets] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
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
  const [photoUploadChoice, setPhotoUploadChoice] = useState("optimize");
  const [photoUrlsByPath, setPhotoUrlsByPath] = useState({});
  const [selectedExistingMediaId, setSelectedExistingMediaId] = useState("");
  const [isAttachingPhoto, setIsAttachingPhoto] = useState(false);
  const [photoAltDrafts, setPhotoAltDrafts] = useState({});
  const [isUpdatingProductPhoto, setIsUpdatingProductPhoto] = useState(false);
  const [isProductIdEdited, setIsProductIdEdited] = useState(false);
  const [seedResult, setSeedResult] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedProductId, setExpandedProductId] = useState("");
  const [editingProductId, setEditingProductId] = useState("");
  const [productCardMessage, setProductCardMessage] = useState("");
  const [publishReview, setPublishReview] = useState(null);
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
      const [snapshot, drafts] = await Promise.all([
        getDocs(productsQuery),
        loadAdminDrafts({ db, targetCollection: "products" }),
      ]);
      const liveProductDocs = snapshot.docs.map((productDoc) => ({
        id: productDoc.id,
        ...productDoc.data(),
      }));

      setLiveProducts(liveProductDocs);
      setDraftsById(Object.fromEntries(activeAdminDrafts(drafts, "products").map((draft) => [
        draft.targetId,
        draft,
      ])));
      setProducts(applyAdminDrafts(liveProductDocs, drafts, "products")
        .sort((firstProduct, secondProduct) => String(firstProduct.title || "").localeCompare(String(secondProduct.title || ""))));
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

  const loadMediaAssets = useCallback(async () => {
    try {
      const mediaQuery = query(collection(db, "mediaAssets"), orderBy("title"));
      const snapshot = await getDocs(mediaQuery);
      setMediaAssets(snapshot.docs.map(normalizeMediaAsset));
    } catch (error) {
      setPhotoMessage("Media assets could not be loaded.");
    }
  }, [db]);

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadMediaAssets();
  }, [loadCategories, loadMediaAssets, loadProducts]);

  useEffect(() => {
    let isCurrentLoad = true;

    const loadPhotoUrls = async () => {
      if (!storage) {
        setPhotoUrlsByPath({});
        return;
      }

      const photoPaths = Array.from(new Set(products
        .flatMap((product) => normalizePhotos(product.photos))
        .map((photo) => photo.path)
        .filter(Boolean)));

      const photoUrlEntries = await Promise.all(photoPaths.map(async (photoPath) => {
        try {
          return [photoPath, await getDownloadURL(ref(storage, photoPath))];
        } catch (error) {
          return [photoPath, ""];
        }
      }));

      if (isCurrentLoad) {
        setPhotoUrlsByPath(Object.fromEntries(photoUrlEntries));
      }
    };

    loadPhotoUrls();

    return () => {
      isCurrentLoad = false;
    };
  }, [products, storage]);

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

  const updatePhotoAltDraft = (productId, photoPath, value) => {
    setPhotoAltDrafts((currentDrafts) => ({
      ...currentDrafts,
      [`${productId}:${photoPath}`]: value,
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

  const resetPhotoForm = () => {
    setPhotoMessage("");
    setPhotoAlt("");
    setPhotoFile(null);
    setPhotoUploadChoice("optimize");
    setSelectedExistingMediaId("");
    setPhotoInputKey((currentKey) => currentKey + 1);
  };

  const updatePhotoFile = (file) => {
    setPhotoFile(file);
    setPhotoMessage("");
    setPhotoUploadChoice(file && file.size >= recommendedImageSize ? "optimize" : "original");
  };

  const toggleProductCard = (product) => {
    const nextProductId = expandedProductId === product.id ? "" : product.id;

    setExpandedProductId(nextProductId);
    setProductCardMessage("");
    setSelectedProductId(nextProductId);
    resetPhotoForm();

    if (nextProductId !== product.id && editingProductId === product.id) {
      setEditingProductId("");
      setEditingForm(emptyProduct);
    }
  };

  const startProductEdit = (product) => {
    setExpandedProductId(product.id);
    setSelectedProductId(product.id);
    setEditingProductId(product.id);
    setEditingForm(buildFormFromProduct(product));
    setProductCardMessage("");
    resetPhotoForm();
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
    const selectedCategory = categories.find((category) => category.id === productForm.category);

    if (!productId || !productForm.title.trim() || !productForm.shipping.trim()) {
      return "Document ID, title, and shipping are required.";
    }

    if (isNewProduct && products.some((product) => product.id === productId)) {
      return "That product ID already exists. Change the title or edit the existing product.";
    }

    if (!productForm.category || !isApprovedCategoryId(productForm.category)) {
      return "Choose an approved category.";
    }

    if (!selectedCategory) {
      return "Choose a category that exists in Firestore.";
    }

    if (isNewProduct && selectedCategory.active !== true) {
      return "New products can only use active categories.";
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

  const buildProductDraftPayload = (product, photos = normalizePhotos(product.photos)) => (
    buildProductPayload(product.id, buildFormFromProduct(product), {
      ...product,
      photos,
    }, product._draftOnly === true, true)
  );

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
      if (products.some((product) => product.id === productId)) {
        setMessage("That product ID already exists. Open the existing product card to edit it.");
        return;
      }

      const payload = buildProductPayload(productId, form, null, true);

      await saveAdminDraft({
        data: payload,
        db,
        targetCollection: "products",
        targetId: productId,
        userId,
      });
      setPublishReview(null);
      setSelectedProductId(productId);
      resetForm();
      setMessage("Product saved as a preview draft.");
      await loadProducts();
    } catch (error) {
      setMessage("Product draft could not be saved.");
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
      const payload = buildProductPayload(product.id, editingForm, product, false, true);

      await saveAdminDraft({
        data: payload,
        db,
        targetCollection: "products",
        targetId: product.id,
        userId,
      });
      setPublishReview(null);
      setProductCardMessage("Product saved as a preview draft.");
      setEditingProductId("");
      setEditingForm(emptyProduct);
      await loadProducts();
    } catch (error) {
      setProductCardMessage("Product draft could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const requestPublishProductDraft = (product) => {
    const draft = draftsById[product.id];

    if (!draft?.data) {
      setProductCardMessage("Save a draft before reviewing publish changes.");
      return;
    }

    setProductCardMessage("");
    setPublishReview({
      data: draft.data,
      id: product.id,
      liveData: liveProducts.find((liveProduct) => liveProduct.id === product.id) || null,
      title: product.title || product.id,
    });
  };

  const confirmPublishProductDraft = async () => {
    if (!publishReview) {
      return;
    }

    setIsSaving(true);
    setProductCardMessage("");

    try {
      await publishAdminDraft({
        data: publishReview.data,
        db,
        targetCollection: "products",
        targetId: publishReview.id,
        userId,
      });
      setProductCardMessage("Product published to live Firestore.");
      setPublishReview(null);
      setEditingProductId("");
      setEditingForm(emptyProduct);
      await loadProducts();
    } catch (error) {
      setProductCardMessage("Product could not be published.");
    } finally {
      setIsSaving(false);
    }
  };

  const discardProductDraft = async (product) => {
    setIsSaving(true);
    setProductCardMessage("");

    try {
      await discardAdminDraft({
        db,
        targetCollection: "products",
        targetId: product.id,
        userId,
      });
      setProductCardMessage(`${product.title || product.id} draft discarded.`);
      setPublishReview(null);
      setEditingProductId("");
      setEditingForm(emptyProduct);
      await loadProducts();
    } catch (error) {
      setProductCardMessage("Product draft could not be discarded.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (event, product) => {
    event.preventDefault();

    if (!product?.id) {
      setPhotoMessage("Open a saved product before uploading photos.");
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

    if (photoUploadChoice === "original" && photoFile.size >= maxOriginalImageSize) {
      setPhotoMessage("Original photos must be smaller than 25 MB. Choose optimize for website.");
      return;
    }

    setIsUploadingPhoto(true);
    setSelectedProductId(product.id);
    setPhotoMessage("");

    try {
      const currentPhotos = normalizePhotos(product.photos);
      const shouldOptimize = photoUploadChoice === "optimize" && photoFile.size >= recommendedImageSize;
      const uploadBlob = shouldOptimize ? await optimizeImageFile(photoFile) : photoFile;
      const uploadContentType = uploadBlob.type || photoFile.type;

      if (shouldOptimize && uploadBlob.size >= recommendedImageSize) {
        setPhotoMessage("Optimized photo is still over 10 MB. Try a smaller image.");
        return;
      }

      const photoPath = buildImagePath(product.id, photoFile.name, uploadContentType);
      const photoRef = ref(storage, photoPath);

      await uploadBytes(photoRef, uploadBlob, {
        contentType: uploadContentType,
        customMetadata: {
          optimizedForWeb: shouldOptimize ? "true" : "false",
          originalFileName: photoFile.name,
          originalSize: String(photoFile.size),
          uploadSize: String(uploadBlob.size),
        },
      });

      const updatedPhotos = [
        ...currentPhotos,
        {
          path: photoPath,
          alt: photoAlt.trim(),
          sortOrder: currentPhotos.length,
        },
      ];

      await saveAdminDraft({
        data: buildProductDraftPayload(product, updatedPhotos),
        db,
        targetCollection: "products",
        targetId: product.id,
        userId,
      });
      setPublishReview(null);

      setProducts((currentProducts) => currentProducts.map((currentProduct) => (
        currentProduct.id === product.id
          ? { ...currentProduct, photos: updatedPhotos }
          : currentProduct
      )));
      setPhotoAlt("");
      setPhotoFile(null);
      setPhotoUploadChoice("optimize");
      setPhotoInputKey((currentKey) => currentKey + 1);
      setPhotoMessage(shouldOptimize ? "Photo optimized, uploaded, and attached to the product draft." : "Photo uploaded and attached to the product draft.");
      await loadProducts();
    } catch (error) {
      setPhotoMessage("Photo could not be uploaded.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const attachExistingPhoto = async (product) => {
    if (!product?.id) {
      setPhotoMessage("Open a saved product before attaching photos.");
      return;
    }

    const mediaAsset = mediaAssets.find((asset) => asset.id === selectedExistingMediaId);

    if (!mediaAsset) {
      setPhotoMessage("Choose an existing photo to attach.");
      return;
    }

    setIsAttachingPhoto(true);
    setSelectedProductId(product.id);
    setPhotoMessage("");

    try {
      let updatedPhotos = [];
      const latestPhotos = normalizePhotos(product.photos);

      if (latestPhotos.some((photo) => photo.mediaAssetId === mediaAsset.id || photo.path === mediaAsset.storagePath)) {
        setPhotoMessage("That photo is already attached to this product.");
        return;
      }

      const nextPhoto = {
        path: mediaAsset.storagePath,
        alt: mediaAsset.alt,
        mediaAssetId: mediaAsset.id,
        sortOrder: latestPhotos.length,
      };

      updatedPhotos = [...latestPhotos, nextPhoto];

      await saveAdminDraft({
        data: buildProductDraftPayload(product, updatedPhotos),
        db,
        targetCollection: "products",
        targetId: product.id,
        userId,
      });
      setPublishReview(null);

      setProducts((currentProducts) => currentProducts.map((currentProduct) => (
        currentProduct.id === product.id
          ? { ...currentProduct, photos: updatedPhotos }
          : currentProduct
      )));
      setSelectedExistingMediaId("");
      setPhotoMessage("Existing photo attached to the product draft.");
      await loadProducts();
    } catch (error) {
      setPhotoMessage("Existing photo could not be attached.");
    } finally {
      setIsAttachingPhoto(false);
    }
  };

  const updateProductPhotoList = async (product, changePhotos, successMessage) => {
    if (!product?.id) {
      setPhotoMessage("Open a saved product before changing photos.");
      return null;
    }

    setIsUpdatingProductPhoto(true);
    setSelectedProductId(product.id);
    setPhotoMessage("");

    try {
      let updatedPhotos = [];

      const latestPhotos = normalizePhotos(product.photos)
        .sort((firstPhoto, secondPhoto) => firstPhoto.sortOrder - secondPhoto.sortOrder);

      updatedPhotos = changePhotos(latestPhotos)
        .filter(Boolean)
        .map((photo, index) => ({
          ...photo,
          sortOrder: index,
        }));

      await saveAdminDraft({
        data: buildProductDraftPayload(product, updatedPhotos),
        db,
        targetCollection: "products",
        targetId: product.id,
        userId,
      });
      setPublishReview(null);

      setProducts((currentProducts) => currentProducts.map((currentProduct) => (
        currentProduct.id === product.id
          ? { ...currentProduct, photos: updatedPhotos }
          : currentProduct
      )));
      setPhotoMessage(successMessage);
      await loadProducts();
      return updatedPhotos;
    } catch (error) {
      setPhotoMessage("Product photo changes could not be saved.");
      return null;
    } finally {
      setIsUpdatingProductPhoto(false);
    }
  };

  const saveProductPhotoAlt = async (product, photo) => {
    const draftKey = `${product.id}:${photo.path}`;
    const nextAlt = (photoAltDrafts[draftKey] ?? photo.alt).trim();

    const updatedPhotos = await updateProductPhotoList(product, (latestPhotos) => latestPhotos.map((latestPhoto) => (
      latestPhoto.path === photo.path
        ? { ...latestPhoto, alt: nextAlt }
        : latestPhoto
    )), "Photo alt text saved.");

    if (!updatedPhotos) {
      return;
    }

    setPhotoAltDrafts((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      delete nextDrafts[draftKey];
      return nextDrafts;
    });
  };

  const moveProductPhoto = async (product, photo, direction) => {
    await updateProductPhotoList(product, (latestPhotos) => {
      const photoIndex = latestPhotos.findIndex((latestPhoto) => latestPhoto.path === photo.path);
      const swapIndex = photoIndex + direction;

      if (photoIndex < 0 || swapIndex < 0 || swapIndex >= latestPhotos.length) {
        return latestPhotos;
      }

      const nextPhotos = [...latestPhotos];
      [nextPhotos[photoIndex], nextPhotos[swapIndex]] = [nextPhotos[swapIndex], nextPhotos[photoIndex]];
      return nextPhotos;
    }, "Photo order saved.");
  };

  const detachProductPhoto = async (product, photo) => {
    const updatedPhotos = await updateProductPhotoList(product, (latestPhotos) => (
      latestPhotos.filter((latestPhoto) => latestPhoto.path !== photo.path)
    ), "Photo detached from this product.");

    return updatedPhotos;
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
    const existingProductIds = new Set(liveProducts.map((product) => product.id));
    const existingCategoryIds = new Set(categories.map((category) => category.id));

    setSeedResult({
      ...seed,
      missingCategories: seed.categories.filter((category) => !existingCategoryIds.has(category.id)),
      missingProducts: seed.products.filter((product) => !existingProductIds.has(product.id)),
    });
  };

  const seedMissingProducts = async () => {
    const seed = seedResult || buildProductSeed();
    const existingProductIds = new Set(liveProducts.map((product) => product.id));
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
  const attachableMediaAssets = mediaAssets.filter((asset) => (
    asset.bin === "other"
    && asset.status === "active"
    && asset.storagePath
  ));

  return (
    <div className="admin_editor_grid">
      <section className="admin_panel admin_full_width">
        <div className="admin_form_header">
          <h3>Firestore Products</h3>
          <div className="admin_button_row">
            <button className="admin_secondary_button" disabled={isLoading} onClick={loadProducts} type="button">
              Refresh
            </button>
            <button
              aria-expanded={expandedSections.products}
              aria-label={`${expandedSections.products ? "Collapse" : "Expand"} Firestore Products`}
              className="admin_icon_button"
              onClick={() => toggleSection("products")}
              title={`${expandedSections.products ? "Collapse" : "Expand"} Firestore Products`}
              type="button"
            >
              <CollapseIcon isExpanded={expandedSections.products} />
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
            {publishReview ? (
              <AdminPublishReview
                draftData={publishReview.data}
                isSaving={isSaving}
                liveData={publishReview.liveData}
                onCancel={() => setPublishReview(null)}
                onConfirm={confirmPublishProductDraft}
                title={publishReview.title}
                typeLabel="product"
              />
            ) : null}

            <div className="admin_product_list">
              {filteredProducts.map((product) => {
                const isExpanded = expandedProductId === product.id;
                const isEditing = editingProductId === product.id;
                const productPhotos = normalizePhotos(product.photos)
                  .sort((firstPhoto, secondPhoto) => firstPhoto.sortOrder - secondPhoto.sortOrder);
                const isPhotoTarget = selectedProductId === product.id;
                const hasDraft = Boolean(draftsById[product.id]);

                return (
                  <article className="admin_product_card" key={product.id}>
                    <button
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Collapse" : "Expand"} ${product.title || product.id}`}
                      className="admin_product_card_header"
                      onClick={() => toggleProductCard(product)}
                      title={`${isExpanded ? "Collapse" : "Expand"} ${product.title || product.id}`}
                      type="button"
                    >
                      <span>{product.title || product.id}</span>
                      <small aria-hidden="true">
                        <CollapseIcon isExpanded={isExpanded} />
                      </small>
                    </button>

                    <div className="admin_product_meta">
                      <span>{hasDraft ? "Draft changes pending" : "Live product"}</span>
                      {product._draftOnly ? <span>Draft-only new product</span> : null}
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
                            <button
                              className="admin_secondary_button"
                              disabled={isSaving || !hasDraft}
                              onClick={() => requestPublishProductDraft(product)}
                              type="button"
                            >
                              Review Publish
                            </button>
                            <button
                              className="admin_secondary_button"
                              disabled={isSaving || !hasDraft}
                              onClick={() => discardProductDraft(product)}
                              type="button"
                            >
                              Discard Draft
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
                                {isSaving ? "Saving..." : "Save Draft"}
                              </button>
                              <button
                                className="admin_secondary_button"
                                disabled={isSaving || !hasDraft}
                                onClick={() => requestPublishProductDraft(product)}
                                type="button"
                              >
                                Review Publish
                              </button>
                              <button
                                className="admin_secondary_button"
                                disabled={isSaving || !hasDraft}
                                onClick={() => discardProductDraft(product)}
                                type="button"
                              >
                                Discard Draft
                              </button>
                              <button className="admin_secondary_button" onClick={cancelProductEdit} type="button">
                                Cancel
                              </button>
                            </div>
                            {productCardMessage ? <p className="admin_message">{productCardMessage}</p> : null}
                          </form>
                        )}

                        <form className="admin_embedded_form admin_card_photo_form" onSubmit={(event) => handlePhotoUpload(event, product)}>
                          <div className="admin_form_header">
                            <h4>Photos</h4>
                            <span className="admin_status">{productPhotos.length} attached</span>
                          </div>

                          <div className="admin_photo_list">
                            {productPhotos.length ? productPhotos.map((photo, photoIndex) => {
                              const draftKey = `${product.id}:${photo.path}`;
                              const draftAlt = photoAltDrafts[draftKey] ?? photo.alt;

                              return (
                              <div className="admin_photo_row" key={photo.path}>
                                {photoUrlsByPath[photo.path] ? (
                                  <img alt={photo.alt || product.title || photo.path} src={photoUrlsByPath[photo.path]} />
                                ) : null}
                                <label className="admin_photo_alt_field">
                                  Alt Text
                                  <input
                                    disabled={isUpdatingProductPhoto}
                                    onChange={(event) => updatePhotoAltDraft(product.id, photo.path, event.target.value)}
                                    value={draftAlt}
                                  />
                                </label>
                                <small>{photo.path}</small>
                                <div className="admin_photo_actions">
                                  <button
                                    className="admin_secondary_button"
                                    disabled={isUpdatingProductPhoto || photoIndex === 0}
                                    onClick={() => moveProductPhoto(product, photo, -1)}
                                    type="button"
                                  >
                                    Up
                                  </button>
                                  <button
                                    className="admin_secondary_button"
                                    disabled={isUpdatingProductPhoto || photoIndex === productPhotos.length - 1}
                                    onClick={() => moveProductPhoto(product, photo, 1)}
                                    type="button"
                                  >
                                    Down
                                  </button>
                                  <button
                                    className="admin_secondary_button"
                                    disabled={isUpdatingProductPhoto || draftAlt.trim() === photo.alt}
                                    onClick={() => saveProductPhotoAlt(product, photo)}
                                    type="button"
                                  >
                                    Save Alt
                                  </button>
                                  <button
                                    className="admin_danger_button"
                                    disabled={isUpdatingProductPhoto}
                                    onClick={() => detachProductPhoto(product, photo)}
                                    type="button"
                                  >
                                    Detach
                                  </button>
                                </div>
                              </div>
                              );
                            }) : (
                              <p className="admin_status">No photos attached yet.</p>
                            )}
                          </div>

                          <label>
                            Image File
                            <input
                              accept="image/*"
                              disabled={isUploadingPhoto}
                              key={`${product.id}-${photoInputKey}`}
                              onChange={(event) => updatePhotoFile(event.target.files?.[0] || null)}
                              type="file"
                            />
                          </label>
                          {photoFile && isPhotoTarget ? (
                            <div className="admin_upload_notice">
                              <span>{photoFile.name}</span>
                              <small>{formatFileSize(photoFile.size)}</small>
                              {photoFile.size >= recommendedImageSize ? (
                                <div className="admin_upload_options">
                                  <label>
                                    <input
                                      checked={photoUploadChoice === "optimize"}
                                      disabled={isUploadingPhoto}
                                      name={`photo-upload-choice-${product.id}`}
                                      onChange={() => setPhotoUploadChoice("optimize")}
                                      type="radio"
                                    />
                                    Optimize for website
                                  </label>
                                  <label>
                                    <input
                                      checked={photoUploadChoice === "original"}
                                      disabled={isUploadingPhoto}
                                      name={`photo-upload-choice-${product.id}`}
                                      onChange={() => setPhotoUploadChoice("original")}
                                      type="radio"
                                    />
                                    Upload original
                                  </label>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          <label>
                            Alt Text
                            <input
                              disabled={isUploadingPhoto}
                              onChange={(event) => setPhotoAlt(event.target.value)}
                              placeholder="Small jar of saffron salt"
                              value={photoAlt}
                            />
                          </label>
                          <button className="admin_primary_button" disabled={isUploadingPhoto} type="submit">
                            {isUploadingPhoto && isPhotoTarget ? "Uploading..." : "Upload Photo"}
                          </button>
                          {isPhotoTarget && photoMessage ? <p className="admin_message">{photoMessage}</p> : null}
                        </form>

                        <div className="admin_embedded_form admin_attach_photo_panel">
                          <div className="admin_form_header">
                            <h4>Attach Existing Photo</h4>
                            <span className="admin_status">{attachableMediaAssets.length} in Other</span>
                          </div>
                          <label>
                            Photo From Other Bin
                            <select
                              disabled={isAttachingPhoto || attachableMediaAssets.length === 0}
                              onChange={(event) => setSelectedExistingMediaId(event.target.value)}
                              value={isPhotoTarget ? selectedExistingMediaId : ""}
                            >
                              <option value="">Choose photo</option>
                              {attachableMediaAssets.map((asset) => (
                                <option key={asset.id} value={asset.id}>
                                  {asset.title}
                                </option>
                              ))}
                            </select>
                          </label>
                          <button
                            className="admin_secondary_button"
                            disabled={isAttachingPhoto || !isPhotoTarget || !selectedExistingMediaId}
                            onClick={() => attachExistingPhoto(product)}
                            type="button"
                          >
                            {isAttachingPhoto && isPhotoTarget ? "Attaching..." : "Attach Photo"}
                          </button>
                        </div>
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
          <button
            aria-expanded={expandedSections.newProduct}
            aria-label={`${expandedSections.newProduct ? "Collapse" : "Expand"} New Product`}
            className="admin_icon_button"
            onClick={() => toggleSection("newProduct")}
            title={`${expandedSections.newProduct ? "Collapse" : "Expand"} New Product`}
            type="button"
          >
            <CollapseIcon isExpanded={expandedSections.newProduct} />
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
                {isSaving ? "Saving..." : "Save Draft"}
              </button>
              <button className="admin_secondary_button" onClick={resetForm} type="button">
                Clear
              </button>
            </div>

            {message ? <p className="admin_message">{message}</p> : null}
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
            <button
              aria-expanded={expandedSections.categories}
              aria-label={`${expandedSections.categories ? "Collapse" : "Expand"} Product Categories`}
              className="admin_icon_button"
              onClick={() => toggleSection("categories")}
              title={`${expandedSections.categories ? "Collapse" : "Expand"} Product Categories`}
              type="button"
            >
              <CollapseIcon isExpanded={expandedSections.categories} />
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
          <button
            aria-expanded={expandedSections.seed}
            aria-label={`${expandedSections.seed ? "Collapse" : "Expand"} Seed Static Products`}
            className="admin_icon_button"
            onClick={() => toggleSection("seed")}
            title={`${expandedSections.seed ? "Collapse" : "Expand"} Seed Static Products`}
            type="button"
          >
            <CollapseIcon isExpanded={expandedSections.seed} />
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
