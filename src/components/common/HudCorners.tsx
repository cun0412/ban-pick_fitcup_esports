interface HudCornersProps {
  color?: string;
  size?: number;
  offset?: number;
}

/**
 * Chi tiết góc kỹ thuật (HUD corner brackets) chuẩn broadcast esports
 */
export default function HudCorners({
  color = '#FF4057',
  size = 14,
  offset = 8,
}: HudCornersProps) {
  const borderStyle = `2px solid ${color}`;
  const pos = `${offset}px`;

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <span
        className="absolute"
        style={{
          top: pos,
          left: pos,
          width: size,
          height: size,
          borderTop: borderStyle,
          borderLeft: borderStyle,
        }}
      />
      <span
        className="absolute"
        style={{
          top: pos,
          right: pos,
          width: size,
          height: size,
          borderTop: borderStyle,
          borderRight: borderStyle,
        }}
      />
      <span
        className="absolute"
        style={{
          bottom: pos,
          left: pos,
          width: size,
          height: size,
          borderBottom: borderStyle,
          borderLeft: borderStyle,
        }}
      />
      <span
        className="absolute"
        style={{
          bottom: pos,
          right: pos,
          width: size,
          height: size,
          borderBottom: borderStyle,
          borderRight: borderStyle,
        }}
      />
    </div>
  );
}
