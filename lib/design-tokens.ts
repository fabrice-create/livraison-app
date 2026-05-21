// lib/design-tokens.ts

export const colors = {
  gold: "#F59E0B",
  goldLight: "#FCD34D",
  goldDark: "#D97706",
  bg: "#0A0A0F",
  card: "#111118",
  cardHover: "#16161F",
  border: "#1E1E2E",
  borderHover: "#2E2E3E",
  success: "#4ADE80",
  successBg: "#052E16",
  info: "#60A5FA",
  infoBg: "#0C1E3E",
  danger: "#F87171",
  dangerBg: "#2D0F0F",
  warning: "#FB923C",
  warningBg: "#2D1500",
  textPrimary: "#F8F8FC",
  textSecondary: "#9898B0",
  textMuted: "#55556A",
} as const;

export const STATUS_CONFIG = {
  en_attente: {
    label: "En attente",
    color: colors.warning,
    bg: colors.warningBg,
    dot: "bg-orange-400",
  },
  confirme: {
    label: "Confirmé",
    color: colors.info,
    bg: colors.infoBg,
    dot: "bg-blue-400",
  },
  livre_paye: {
    label: "Livré + Payé",
    color: colors.success,
    bg: colors.successBg,
    dot: "bg-green-400",
  },
  gare: {
    label: "À la gare",
    color: colors.gold,
    bg: "#1A1200",
    dot: "bg-yellow-400",
  },
  annule: {
    label: "Annulé",
    color: colors.danger,
    bg: colors.dangerBg,
    dot: "bg-red-400",
  },
} as const;

export const SOURCE_ICONS: Record<string, string> = {
  whatsapp: "💬",
  shopify: "🛒",
  youcan: "🏪",
  woocommerce: "🔧",
  tally: "📋",
  direct: "🔗",
  wordpress: "🌐",
  google_forms: "📝",
  boutique: "🏬",
};
