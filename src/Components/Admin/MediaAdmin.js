import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref,
} from "firebase/storage";

const emptyFilters = {
  search: "",
  bin: "all",
  status: "active",
  tag: "",
};

const binOptions = [
  { id: "products", label: "Products" },
  { id: "events", label: "Events" },
  { id: "site", label: "Site" },
  { id: "other", label: "Other" },
];

const statusOptions = [
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];

const normalizeTags = (tags) => (
  Array.isArray(tags) ? tags : []
).map((tag) => String(tag || "").trim()).filter(Boolean);

const tagsToInput = (tags) => normalizeTags(tags).join(", ");

const inputToTags = (value) => Array.from(new Set(String(value || "")
  .split(",")
  .map((tag) => tag.trim().toLowerCase())
  .filter(Boolean)));

const normalizeMediaAsset = (snapshot) => {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    alt: String(data.alt || ""),
    bin: String(data.bin || "other"),
    linkedId: String(data.linkedId || ""),
    linkedType: String(data.linkedType || "none"),
    source: String(data.source || ""),
    sourcePath: String(data.sourcePath || ""),
    status: String(data.status || "active"),
    storagePath: String(data.storagePath || ""),
    tags: normalizeTags(data.tags),
    title: String(data.title || snapshot.id),
  };
};

const mediaAssetMatches = (asset, filters) => {
  const search = filters.search.trim().toLowerCase();
  const tag = filters.tag.trim().toLowerCase();
  const searchable = [
    asset.id,
    asset.title,
    asset.storagePath,
    asset.sourcePath,
    asset.linkedId,
    ...asset.tags,
  ].join(" ").toLowerCase();

  if (filters.bin !== "all" && asset.bin !== filters.bin) {
    return false;
  }

  if (filters.status !== "all" && asset.status !== filters.status) {
    return false;
  }

  if (tag && !asset.tags.some((assetTag) => assetTag.toLowerCase().includes(tag))) {
    return false;
  }

  return !search || searchable.includes(search);
};

const buildEditForm = (asset) => ({
  alt: asset.alt,
  bin: asset.bin,
  status: asset.status,
  tags: tagsToInput(asset.tags),
  title: asset.title,
});

export default function MediaAdmin({ db, storage }) {
  const [assets, setAssets] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [expandedAssetId, setExpandedAssetId] = useState("");
  const [editingAssetId, setEditingAssetId] = useState("");
  const [editingForm, setEditingForm] = useState(null);
  const [assetUrlsByPath, setAssetUrlsByPath] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadMediaAssets = useCallback(async () => {
    setIsLoading(true);
    setMessage("");

    try {
      const mediaQuery = query(collection(db, "mediaAssets"), orderBy("title"));
      const snapshot = await getDocs(mediaQuery);
      setAssets(snapshot.docs.map(normalizeMediaAsset));
    } catch (error) {
      setMessage("Media assets could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadMediaAssets();
  }, [loadMediaAssets]);

  useEffect(() => {
    let isCurrentLoad = true;

    const loadAssetUrls = async () => {
      if (!storage) {
        setAssetUrlsByPath({});
        return;
      }

      const storagePaths = Array.from(new Set(assets
        .map((asset) => asset.storagePath)
        .filter(Boolean)));

      const assetUrlEntries = await Promise.all(storagePaths.map(async (storagePath) => {
        try {
          return [storagePath, await getDownloadURL(ref(storage, storagePath))];
        } catch (error) {
          return [storagePath, ""];
        }
      }));

      if (isCurrentLoad) {
        setAssetUrlsByPath(Object.fromEntries(assetUrlEntries));
      }
    };

    loadAssetUrls();

    return () => {
      isCurrentLoad = false;
    };
  }, [assets, storage]);

  const filteredAssets = useMemo(() => (
    assets.filter((asset) => mediaAssetMatches(asset, filters))
  ), [assets, filters]);

  const updateFilter = (field, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const updateEditingForm = (field, value) => {
    setEditingForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const toggleAsset = (asset) => {
    const nextAssetId = expandedAssetId === asset.id ? "" : asset.id;

    setExpandedAssetId(nextAssetId);
    setMessage("");

    if (editingAssetId === asset.id && nextAssetId !== asset.id) {
      setEditingAssetId("");
      setEditingForm(null);
    }
  };

  const startEdit = (asset) => {
    setExpandedAssetId(asset.id);
    setEditingAssetId(asset.id);
    setEditingForm(buildEditForm(asset));
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingAssetId("");
    setEditingForm(null);
    setMessage("");
  };

  const saveMediaAsset = async (event, asset) => {
    event.preventDefault();

    if (!editingForm.title.trim()) {
      setMessage("Media title is required.");
      return;
    }

    if (!binOptions.some((option) => option.id === editingForm.bin)) {
      setMessage("Choose an approved media bin.");
      return;
    }

    if (!statusOptions.some((option) => option.id === editingForm.status)) {
      setMessage("Choose an approved status.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    const payload = {
      alt: editingForm.alt.trim(),
      bin: editingForm.bin,
      status: editingForm.status,
      tags: inputToTags(editingForm.tags),
      title: editingForm.title.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "mediaAssets", asset.id), payload, { merge: true });
      setAssets((currentAssets) => currentAssets.map((currentAsset) => (
        currentAsset.id === asset.id
          ? { ...currentAsset, ...payload, updatedAt: undefined }
          : currentAsset
      )));
      setEditingAssetId("");
      setEditingForm(null);
      setMessage("Media asset saved.");
      await loadMediaAssets();
    } catch (error) {
      setMessage("Media asset could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="admin_panel admin_full_width">
      <div className="admin_form_header">
        <div>
          <h3>Photos</h3>
          <p className="admin_status">Storage-backed media library.</p>
        </div>
        <button className="admin_secondary_button" disabled={isLoading} onClick={loadMediaAssets} type="button">
          Refresh
        </button>
      </div>

      <div className="admin_filter_grid admin_media_filters">
        <label>
          Search
          <input
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Title, tag, file, linked item"
            value={filters.search}
          />
        </label>
        <label>
          Bin
          <select onChange={(event) => updateFilter("bin", event.target.value)} value={filters.bin}>
            <option value="all">All</option>
            {binOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select onChange={(event) => updateFilter("status", event.target.value)} value={filters.status}>
            <option value="all">All</option>
            {statusOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Tag
          <input
            onChange={(event) => updateFilter("tag", event.target.value)}
            placeholder="saffron"
            value={filters.tag}
          />
        </label>
      </div>

      {isLoading ? <p className="admin_status">Loading media...</p> : null}
      {message ? <p className="admin_message">{message}</p> : null}
      <p className="admin_status">{filteredAssets.length} of {assets.length} media assets shown.</p>

      <div className="admin_media_grid">
        {filteredAssets.map((asset) => {
          const isExpanded = expandedAssetId === asset.id;
          const isEditing = editingAssetId === asset.id;

          return (
            <article className="admin_media_card" key={asset.id}>
              <button
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${asset.title}`}
                className="admin_product_card_header"
                onClick={() => toggleAsset(asset)}
                title={`${isExpanded ? "Collapse" : "Expand"} ${asset.title}`}
                type="button"
              >
                <span>{asset.title}</span>
                <small>{asset.bin}</small>
              </button>

              <div className="admin_product_meta">
                <span>{asset.status}</span>
                <span>{asset.linkedType === "none" ? "Unlinked" : `${asset.linkedType}: ${asset.linkedId}`}</span>
                {asset.tags.slice(0, 3).map((tag) => (
                  <span key={`${asset.id}-${tag}`}>{tag}</span>
                ))}
              </div>

              {isExpanded ? (
                <div className="admin_product_card_body">
                  {assetUrlsByPath[asset.storagePath] ? (
                    <img
                      alt={asset.alt || asset.title}
                      className="admin_media_preview"
                      src={assetUrlsByPath[asset.storagePath]}
                    />
                  ) : null}
                  <dl className="admin_product_details admin_media_details">
                    <div>
                      <dt>ID</dt>
                      <dd>{asset.id}</dd>
                    </div>
                    <div>
                      <dt>Storage Path</dt>
                      <dd>{asset.storagePath || "Not uploaded yet"}</dd>
                    </div>
                    <div>
                      <dt>Source Path</dt>
                      <dd>{asset.sourcePath || "Manual/admin source"}</dd>
                    </div>
                  </dl>

                  {!isEditing ? (
                    <div className="admin_button_row">
                      <button className="admin_primary_button" onClick={() => startEdit(asset)} type="button">
                        Edit Metadata
                      </button>
                    </div>
                  ) : (
                    <form className="admin_inline_form" onSubmit={(event) => saveMediaAsset(event, asset)}>
                      <label>
                        Title
                        <input
                          onChange={(event) => updateEditingForm("title", event.target.value)}
                          required
                          value={editingForm.title}
                        />
                      </label>
                      <label>
                        Alt Text
                        <input
                          onChange={(event) => updateEditingForm("alt", event.target.value)}
                          value={editingForm.alt}
                        />
                      </label>
                      <div className="admin_split_fields">
                        <label>
                          Bin
                          <select onChange={(event) => updateEditingForm("bin", event.target.value)} value={editingForm.bin}>
                            {binOptions.map((option) => (
                              <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Status
                          <select onChange={(event) => updateEditingForm("status", event.target.value)} value={editingForm.status}>
                            {statusOptions.map((option) => (
                              <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label>
                        Tags
                        <input
                          onChange={(event) => updateEditingForm("tags", event.target.value)}
                          placeholder="product, saffron"
                          value={editingForm.tags}
                        />
                        <small className="admin_help_text">Comma-separated tags.</small>
                      </label>
                      <div className="admin_button_row">
                        <button className="admin_primary_button" disabled={isSaving} type="submit">
                          {isSaving ? "Saving..." : "Save Metadata"}
                        </button>
                        <button className="admin_secondary_button" onClick={cancelEdit} type="button">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
