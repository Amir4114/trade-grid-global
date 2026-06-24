type TrustScoreProps = {
  score: number;
  compact?: boolean;
};

export default function TrustScore({ score, compact = false }: TrustScoreProps) {
  return (
    <div>
      <div className="text-sm text-neutral-500">Trust Score</div>
      <div className={`font-semibold text-neutral-950 ${compact ? "text-lg" : "text-4xl"}`}>{score}</div>
      <div className="mt-2 h-1.5 rounded-full bg-neutral-200">
        <div className="h-full rounded-full bg-neutral-950" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
