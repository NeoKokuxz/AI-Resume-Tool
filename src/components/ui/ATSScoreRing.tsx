import { getATSScoreColor } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ATSScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { size: 48, strokeWidth: 4, textSize: "text-xs", fontSize: 11 },
  md: { size: 72, strokeWidth: 5, textSize: "text-sm", fontSize: 16 },
  lg: { size: 100, strokeWidth: 6, textSize: "text-xl", fontSize: 22 },
};

export function ATSScoreRing({
  score,
  size = "md",
  showLabel = true,
  className,
}: ATSScoreRingProps) {
  const config = sizeConfig[size];
  const radius = (config.size - config.strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getStrokeColor = (s: number) => {
    if (s >= 80) return "#22c55e";
    if (s >= 60) return "#eab308";
    if (s >= 40) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <svg
        width={config.size}
        height={config.size}
        viewBox={`0 0 ${config.size} ${config.size}`}
      >
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke="#1f2937"
          strokeWidth={config.strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={radius}
          fill="none"
          stroke={getStrokeColor(score)}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${config.size / 2} ${config.size / 2})`}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
        {/* Score text */}
        <text
          x={config.size / 2}
          y={config.size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={config.fontSize}
          fontWeight="600"
          fill={getStrokeColor(score)}
        >
          {score}
        </text>
      </svg>
      {showLabel && (
        <p className={cn("text-gray-500 font-medium", config.textSize)}>
          ATS Score
        </p>
      )}
    </div>
  );
}
