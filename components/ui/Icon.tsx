import {
  Aperture, ArrowLeft, ArrowRight, Award, BarChart2, Bell, BookOpen,
  Camera, CheckCircle2, ChefHat, ChevronRight, Circle, Clock, Coffee,
  Crosshair, Flame, Globe, Heart, Home, IceCream, ImagePlus,
  Leaf, LayoutList, Lock, LogOut, Map, MapPin,
  MapPinned, Medal, MessageCircle, MessageSquare, MessagesSquare,
  Minus, Navigation, PartyPopper, Pencil, Phone, Pizza, Plus,
  Reply, Sandwich, Search, Settings, Settings2, Share2, Shield, ShieldCheck,
  SlidersHorizontal, Smartphone, Star, Store, Tag, Trash2,
  TrendingUp, Trophy, User, Utensils, UtensilsCrossed,
  Volume2, Wheat, X, XCircle, FileText, Vibrate,
  type LucideIcon,
} from 'lucide-react-native';

const MAP: Record<string, LucideIcon> = {
  // Tabs
  'home':                 Home,
  'circle':               Circle,
  // Navigation
  'arrow-left':           ArrowLeft,
  'arrow-right':          ArrowRight,
  'chevron-right':        ChevronRight,
  'navigation-variant':   Navigation,
  // UI actions
  'close':                X,
  'close-circle':         XCircle,
  'close-circle-outline': XCircle,
  'plus':                 Plus,
  'minus':                Minus,
  'magnify':              Search,
  'search':               Search,
  'tune-variant':         SlidersHorizontal,
  'pencil-outline':       Pencil,
  'delete-outline':       Trash2,
  'share-variant-outline':Share2,
  // User & auth
  'account':              User,
  'lock-outline':         Lock,
  'logout':               LogOut,
  'shield-outline':       Shield,
  'shield-lock-outline':  ShieldCheck,
  'google':               Globe,
  'instagram':            Aperture,
  'whatsapp':             MessageCircle,
  // Communication
  'bell-outline':         Bell,
  'comment-text':         MessageSquare,
  'comment-text-multiple':MessagesSquare,
  'reply':                Reply,
  'reply-outline':        Reply,
  'phone-outline':        Phone,
  // Map
  'map':                  Map,
  'map-marker':           MapPin,
  'map-marker-outline':   MapPin,
  'map-marker-distance':  MapPinned,
  'crosshairs-gps':       Crosshair,
  // Business
  'store-outline':        Store,
  'storefront-outline':   Store,
  'analytics':            BarChart2,
  'cog':                  Settings,
  'cog-outline':          Settings,
  'settings':             Settings,
  // Gamification
  'star':                 Star,
  'star-outline':         Star,
  'star-circle':          Award,
  'medal':                Medal,
  'trophy-outline':       Trophy,
  'trending-up':          TrendingUp,
  'party-popper':         PartyPopper,
  'fire':                 Flame,
  'heart':                Heart,
  'heart-outline':        Heart,
  'check-circle':         CheckCircle2,
  'tag-outline':          Tag,
  // Food
  'silverware-fork-knife':Utensils,
  'food':                 Utensils,
  'food-variant':         Utensils,
  'food-off-outline':     UtensilsCrossed,
  'hamburger':            Sandwich,
  'pizza':                Pizza,
  'food-hot-dog':         Sandwich,
  'corn':                 Wheat,
  'noodles':              Utensils,
  'taco':                 Utensils,
  'chef-hat':             ChefHat,
  'coffee':               Coffee,
  'ice-cream':            IceCream,
  'leaf':                 Leaf,
  // Media
  'camera-plus-outline':  Camera,
  'image-plus':           ImagePlus,
  'file-pdf-box':         FileText,
  'book-open-outline':    BookOpen,
  // Settings
  'vibrate':              Vibrate,
  'volume-high':          Volume2,
  'view-agenda-outline':  LayoutList,
  'clock-outline':        Clock,
};

export type IconName = keyof typeof MAP;

export function Icon({
  name,
  size = 24,
  color = '#000',
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
  const Component = MAP[name];
  if (!Component) return null;
  return <Component size={size} color={color} strokeWidth={strokeWidth} fill={fill ?? 'none'} style={style} />;
}
