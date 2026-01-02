import { Hourglass } from 'ldrs/react';
import 'ldrs/react/Hourglass.css';

interface LoaderHourglassProps {
  label?: string;
  size?: number;
}

export function LoaderHourglass({ label, size = 40 }: LoaderHourglassProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Hourglass
        size={size}
        bgOpacity={0.1}
        speed={1.75}
        color="#ba4a3f"
      />
      {label && (
        <p className="text-sm text-muted-foreground text-center">
          {label}
        </p>
      )}
    </div>
  );
}
