import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";

const wholeNumber = (value) => /^\d+$/.test(String(value).trim());

export default function AdminQuantityStepper({
  ariaLabel,
  decrementLabel,
  disabled = false,
  incrementLabel,
  max = Number.MAX_SAFE_INTEGER,
  min = 0,
  onChange,
  placeholder = "0",
  value,
}) {
  const numericValue = wholeNumber(value) ? Number(value) : min;
  const adjustValue = (amount) => {
    onChange(String(Math.max(min, Math.min(max, numericValue + amount))));
  };

  return (
    <div className="admin_quantity_stepper">
      <button
        aria-label={decrementLabel}
        disabled={disabled || numericValue <= min}
        onClick={() => adjustValue(-1)}
        title="Decrease by one"
        type="button"
      >
        <FontAwesomeIcon aria-hidden="true" icon={faMinus} />
      </button>
      <input
        aria-label={ariaLabel}
        disabled={disabled}
        inputMode="numeric"
        onChange={(event) => {
          if (/^\d*$/.test(event.target.value)) {
            onChange(event.target.value);
          }
        }}
        pattern="[0-9]*"
        placeholder={placeholder}
        value={value}
      />
      <button
        aria-label={incrementLabel}
        disabled={disabled || numericValue >= max}
        onClick={() => adjustValue(1)}
        title="Increase by one"
        type="button"
      >
        <FontAwesomeIcon aria-hidden="true" icon={faPlus} />
      </button>
    </div>
  );
}
