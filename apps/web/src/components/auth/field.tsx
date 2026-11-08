interface FieldProps {
  label: string;
  name: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  errors?: string[];
  hint?: string;
  inputMode?: "text" | "email" | "numeric";
  maxLength?: number;
  pattern?: string;
}

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = false,
  defaultValue,
  errors,
  hint,
  inputMode,
  maxLength,
  pattern,
}: FieldProps) {
  const describedBy = errors !== undefined && errors.length > 0 ? `${name}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        aria-invalid={errors !== undefined && errors.length > 0 ? true : undefined}
        aria-describedby={describedBy}
        className="w-full rounded-md border border-border px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
      {hint !== undefined && <p className="text-xs text-muted-foreground">{hint}</p>}
      {errors?.map((message) => (
        <p key={message} id={describedBy} role="alert" className="text-xs text-red-600">
          {message}
        </p>
      ))}
    </div>
  );
}
