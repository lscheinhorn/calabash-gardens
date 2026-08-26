import "./SiteContentBlocks.css";

const renderStaticContent = (fieldPath, label, children) => children;

const blockTypeLabels = {
  paragraph: "paragraph",
  subtitle: "subtitle",
  title: "title",
};

const normalizeBlocks = (blocks) => {
  if (!blocks || typeof blocks !== "object") {
    return [];
  }

  const entries = Array.isArray(blocks)
    ? blocks.map((block, index) => [block?.id || `block_${index + 1}`, block])
    : Object.entries(blocks);

  return entries
    .map(([id, block], index) => ({
      id,
      sortOrder: Number.isFinite(block?.sortOrder) ? block.sortOrder : index,
      text: String(block?.text || ""),
      type: blockTypeLabels[block?.type] ? block.type : "paragraph",
    }))
    .filter((block) => block.text.trim())
    .sort((firstBlock, secondBlock) => (
      firstBlock.sortOrder - secondBlock.sortOrder || firstBlock.id.localeCompare(secondBlock.id)
    ));
};

export default function SiteContentBlocks({
  blocks,
  fieldPathPrefix = "contentBlocks",
  labelPrefix = "Content",
  renderEditableContent = renderStaticContent,
  variant = "",
}) {
  const normalizedBlocks = normalizeBlocks(blocks);

  if (!normalizedBlocks.length) {
    return null;
  }

  return (
    <div className={["site_content_blocks", variant ? `site_content_blocks_${variant}` : ""].filter(Boolean).join(" ")}>
      {normalizedBlocks.map((block) => {
        const fieldPath = `${fieldPathPrefix}.${block.id}.text`;
        const label = `${labelPrefix} ${blockTypeLabels[block.type]}`;
        const content = renderEditableContent(fieldPath, label, block.text);

        if (block.type === "title") {
          return <h2 className="site_content_block_title" key={block.id}>{content}</h2>;
        }

        if (block.type === "subtitle") {
          return <h3 className="site_content_block_subtitle" key={block.id}>{content}</h3>;
        }

        return <p className="site_content_block_paragraph" key={block.id}>{content}</p>;
      })}
    </div>
  );
}
