interface ConditionVisualizationProps {
  condition: string;
  /**
   * Last inspection date (optional)
   */
  lastInspectionDate?: string;
}

export const ConditionVisualization = ({
  condition,
  lastInspectionDate,
}: ConditionVisualizationProps) => {
  return (
    <div className="space-y-2">
      {lastInspectionDate && (
        <p className="text-xs text-muted-foreground italic">
          Last inspected: {lastInspectionDate}
        </p>
      )}
      
      <p className="text-xs text-muted-foreground">
        Condition ratings are based on owner assessment and may vary. Inspect equipment before use.
      </p>
    </div>
  );
};

