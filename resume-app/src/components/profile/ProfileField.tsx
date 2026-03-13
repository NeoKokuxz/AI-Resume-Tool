"use client";

interface ProfileFieldProps {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}

export function ProfileField({
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
}: ProfileFieldProps) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
        {icon}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={type === "number" ? 0 : undefined}
        className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
      />
    </div>
  );
}
