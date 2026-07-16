const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
  "linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function gradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

type UserAvatarProps = {
  displayName: string;
  size?: number;
  className?: string;
};

export default function UserAvatar({ displayName, size = 56, className = "" }: UserAvatarProps) {
  const initials = getInitials(displayName);
  const fontSize = size <= 32 ? "text-[10px]" : size <= 40 ? "text-xs" : "text-sm";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${fontSize} ${className}`}
      style={{
        width: size,
        height: size,
        background: gradientForName(displayName || "?"),
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
