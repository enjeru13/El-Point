import {
  Apple,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart2,
  Beef,
  Beer,
  Bell,
  BookOpen,
  Cake,
  Camera,
  Candy,
  Carrot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChefHat,
  Cherry,
  ChevronRight,
  Circle,
  Citrus,
  Clock,
  Coffee,
  Cookie,
  Croissant,
  Crosshair,
  CupSoda,
  Donut,
  Drumstick,
  Egg,
  EggFried,
  Eye,
  EyeOff,
  FileText,
  Fish,
  Flag,
  Flame,
  Grape,
  Ham,
  Hamburger,
  Heart,
  Home,
  IceCream,
  IceCreamCone,
  ImagePlus,
  LayoutList,
  Leaf,
  Lock,
  LogOut,
  Mail,
  Map,
  MapPin,
  MapPinned,
  Medal,
  MessageSquare,
  MessagesSquare,
  Milk,
  Minus,
  Navigation,
  Nut,
  PartyPopper,
  Pencil,
  Phone,
  Pizza,
  Plus,
  Popcorn,
  Reply,
  Salad,
  Sandwich,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Soup,
  Star,
  Store,
  Tag,
  ThumbsUp,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  Utensils,
  UtensilsCrossed,
  Vibrate,
  Volume2,
  Wheat,
  Wine,
  X,
  XCircle,
  type LucideIcon
} from "lucide-react-native";
import { View } from "react-native";
import { BrandGlyph, BRAND_GLYPHS, GoogleGlyph } from "@/components/ui/BrandGlyph";

const MAP: Record<string, LucideIcon> = {
  // Tabs
  home: Home,
  circle: Circle,
  // Navigation
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "chevron-right": ChevronRight,
  "navigation-variant": Navigation,
  // UI actions
  close: X,
  "close-circle": XCircle,
  "close-circle-outline": XCircle,
  check: Check,
  "chevron-down": ChevronDown,
  plus: Plus,
  minus: Minus,
  magnify: Search,
  search: Search,
  "tune-variant": SlidersHorizontal,
  "pencil-outline": Pencil,
  "delete-outline": Trash2,
  "share-variant-outline": Share2,
  // User & auth
  account: User,
  "lock-outline": Lock,
  logout: LogOut,
  "shield-outline": Shield,
  "shield-alert-outline": ShieldAlert,
  "shield-lock-outline": ShieldCheck,
  flag: Flag,
  "flag-outline": Flag,
  // google / instagram / whatsapp se pintan como marca real vía BrandGlyph (ver abajo).
  // Communication
  "bell-outline": Bell,
  "email-outline": Mail,
  "eye-outline": Eye,
  "eye-off-outline": EyeOff,
  "comment-text": MessageSquare,
  "comment-text-multiple": MessagesSquare,
  reply: Reply,
  "reply-outline": Reply,
  "phone-outline": Phone,
  // Map
  map: Map,
  "map-marker": MapPin,
  "map-marker-outline": MapPin,
  "map-marker-distance": MapPinned,
  "crosshairs-gps": Crosshair,
  // Business
  "store-outline": Store,
  "storefront-outline": Store,
  analytics: BarChart2,
  cog: Settings,
  "cog-outline": Settings,
  settings: Settings,
  // Gamification
  star: Star,
  "star-outline": Star,
  "star-circle": Award,
  medal: Medal,
  "trophy-outline": Trophy,
  "trending-up": TrendingUp,
  "thumb-up": ThumbsUp,
  "thumb-up-outline": ThumbsUp,
  "party-popper": PartyPopper,
  fire: Flame,
  heart: Heart,
  "heart-outline": Heart,
  "check-circle": CheckCircle2,
  "tag-outline": Tag,
  tag: Tag,
  // Food
  "silverware-fork-knife": Utensils,
  food: Utensils,
  "food-variant": Utensils,
  "food-off-outline": UtensilsCrossed,
  hamburger: Hamburger,
  pizza: Pizza,
  "food-hot-dog": Sandwich,
  sandwich: Sandwich,
  corn: Wheat,
  wheat: Wheat,
  noodles: Soup,
  soup: Soup,
  taco: Salad,
  salad: Salad,
  "chef-hat": ChefHat,
  coffee: Coffee,
  "ice-cream": IceCream,
  "ice-cream-cone": IceCreamCone,
  leaf: Leaf,
  croissant: Croissant,
  donut: Donut,
  cookie: Cookie,
  "food-steak": Beef,
  egg: Egg,
  "egg-fried": EggFried,
  fish: Fish,
  "food-apple": Apple,
  cherries: Cherry,
  carrot: Carrot,
  "cup-soda": CupSoda,
  beer: Beer,
  "glass-wine": Wine,
  milk: Milk,
  popcorn: Popcorn,
  cake: Cake,
  candy: Candy,
  "fruit-grapes": Grape,
  "fruit-citrus": Citrus,
  peanut: Nut,
  ham: Ham,
  "food-drumstick": Drumstick,
  // Media
  "camera-plus-outline": Camera,
  "image-plus": ImagePlus,
  "file-pdf-box": FileText,
  "file-check": FileText,
  "book-open-outline": BookOpen,
  // Settings
  vibrate: Vibrate,
  "volume-high": Volume2,
  "view-agenda-outline": LayoutList,
  "clock-outline": Clock,
};

export type IconName = keyof typeof MAP;

export function Icon({
  name,
  size = 24,
  color = "#000",
  strokeWidth = 2,
  fill,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
  style?: object;
}) {
  if (name === "google") {
    return (
      <View style={style}>
        <GoogleGlyph size={size} />
      </View>
    );
  }
  if (BRAND_GLYPHS.has(name)) {
    return (
      <View style={style}>
        <BrandGlyph name={name as "whatsapp" | "instagram"} size={size} color={color} />
      </View>
    );
  }
  const Component = MAP[name];
  if (!Component) return null;
  return (
    <Component
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      fill={fill ?? "none"}
      style={style}
    />
  );
}
