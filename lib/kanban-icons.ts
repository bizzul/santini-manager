/**
 * Centralized icon library for Kanban module
 * Used for: Kanban boards, Kanban categories, Kanban columns
 */

import {
  Activity,
  AlarmClockPlus,
  Archive,
  ArchiveX,
  Armchair,
  ArrowDownWideNarrow,
  ArrowRightFromLine,
  Award,
  Axe,
  BadgeDollarSign,
  Beer,
  Bell,
  BellPlus,
  Bike,
  Binoculars,
  Bomb,
  BookCheck,
  Bookmark,
  Box,
  Boxes,
  Brain,
  Briefcase,
  Brush,
  Building,
  Calendar,
  Camera,
  Car,
  Cctv,
  ChartBar,
  ChartColumn,
  Check,
  CircleParking,
  CircleUser,
  ClipboardCheck,
  Clock,
  Coffee,
  Croissant,
  Drill,
  Droplet,
  Factory,
  Fan,
  FastForward,
  FileText,
  Fingerprint,
  Flag,
  // Additional commonly used icons
  Folder,
  Gem,
  Gift,
  Globe,
  Grid,
  Hammer,
  Handshake,
  Heart,
  Home,
  Hourglass,
  House,
  Inbox,
  KeyRound,
  Landmark,
  Layers,
  Layout,
  List,
  type LucideIcon,
  Mail,
  MailCheck,
  Map,
  MapPinCheck,
  Mic,
  Mouse,
  Network,
  Package,
  PackageCheck,
  PackageOpen,
  Paperclip,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Play,
  PrinterCheck,
  Rocket,
  Route,
  Ruler,
  Save,
  Send,
  Settings,
  ShoppingCart,
  Shovel,
  Siren,
  Snail,
  Sofa,
  Star,
  Tag,
  Target,
  TreeDeciduous,
  Truck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

export interface KanbanIconOption {
  value: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Complete list of icons available for the Kanban module
 * Icons from CSV + additional commonly used icons
 */
export const KANBAN_ICONS: KanbanIconOption[] = [
  // Icons from CSV
  { value: "Activity", label: "Grafico 1", icon: Activity },
  { value: "AlarmClockPlus", label: "Set time", icon: AlarmClockPlus },
  { value: "ArchiveX", label: "Lose", icon: ArchiveX },
  { value: "ArrowDownWideNarrow", label: "To Do", icon: ArrowDownWideNarrow },
  {
    value: "ArrowRightFromLine",
    label: "Elaborazione",
    icon: ArrowRightFromLine,
  },
  { value: "Axe", label: "Ascia", icon: Axe },
  { value: "BadgeDollarSign", label: "Dollaro", icon: BadgeDollarSign },
  { value: "Beer", label: "Birra", icon: Beer },
  { value: "Bell", label: "Campana", icon: Bell },
  { value: "BellPlus", label: "Campana +", icon: BellPlus },
  { value: "Binoculars", label: "Binocolo", icon: Binoculars },
  { value: "Bomb", label: "Bomba", icon: Bomb },
  { value: "BookCheck", label: "Vinta", icon: BookCheck },
  { value: "Brush", label: "Pennello", icon: Brush },
  { value: "Camera", label: "Camera", icon: Camera },
  { value: "Car", label: "Auto", icon: Car },
  { value: "Cctv", label: "Video", icon: Cctv },
  { value: "ChartBar", label: "Grafico 2", icon: ChartBar },
  { value: "ChartColumn", label: "Grafico 3", icon: ChartColumn },
  { value: "CircleParking", label: "Parcheggio", icon: CircleParking },
  { value: "CircleUser", label: "User", icon: CircleUser },
  { value: "Croissant", label: "Gipfel", icon: Croissant },
  { value: "Drill", label: "Trapano", icon: Drill },
  { value: "Droplet", label: "Goccia", icon: Droplet },
  { value: "Factory", label: "Fabbrica", icon: Factory },
  { value: "Fan", label: "Fan", icon: Fan },
  { value: "FastForward", label: "Avanti", icon: FastForward },
  { value: "FileText", label: "Documento", icon: FileText },
  { value: "Fingerprint", label: "Fingerprint", icon: Fingerprint },
  { value: "Flag", label: "Bandiera", icon: Flag },
  { value: "Gem", label: "Diamante", icon: Gem },
  { value: "Gift", label: "Regalo", icon: Gift },
  { value: "Handshake", label: "Accordo", icon: Handshake },
  { value: "Hourglass", label: "Clessidra", icon: Hourglass },
  { value: "House", label: "Casa", icon: House },
  { value: "KeyRound", label: "Chiave", icon: KeyRound },
  { value: "Landmark", label: "Tribunale", icon: Landmark },
  { value: "MapPinCheck", label: "Punto mappa", icon: MapPinCheck },
  { value: "MailCheck", label: "Inviato", icon: MailCheck },
  { value: "Bike", label: "Moto", icon: Bike },
  { value: "Mouse", label: "Mouse", icon: Mouse },
  { value: "Network", label: "Network", icon: Network },
  { value: "PackageCheck", label: "Spedito", icon: PackageCheck },
  { value: "PackageOpen", label: "Aperto", icon: PackageOpen },
  { value: "Paperclip", label: "Allegato", icon: Paperclip },
  { value: "Phone", label: "Telefono", icon: Phone },
  { value: "PhoneIncoming", label: "Call In", icon: PhoneIncoming },
  { value: "PhoneOutgoing", label: "Call Out", icon: PhoneOutgoing },
  { value: "PrinterCheck", label: "Print", icon: PrinterCheck },
  { value: "Rocket", label: "Razzo", icon: Rocket },
  { value: "Route", label: "In viaggio", icon: Route },
  { value: "Save", label: "Salvato", icon: Save },
  { value: "Siren", label: "Alarm", icon: Siren },
  { value: "Snail", label: "Lumaca", icon: Snail },
  { value: "Send", label: "Airplane", icon: Send },
  { value: "Shovel", label: "Pala", icon: Shovel },
  { value: "Mic", label: "Audio", icon: Mic },
  { value: "Brain", label: "Brain", icon: Brain },

  // Additional commonly used icons
  { value: "Folder", label: "Cartella", icon: Folder },
  { value: "Briefcase", label: "Valigetta", icon: Briefcase },
  { value: "Home", label: "Home", icon: Home },
  { value: "Building", label: "Edificio", icon: Building },
  { value: "Package", label: "Pacco", icon: Package },
  { value: "Settings", label: "Impostazioni", icon: Settings },
  { value: "Users", label: "Utenti", icon: Users },
  { value: "ShoppingCart", label: "Carrello", icon: ShoppingCart },
  { value: "Truck", label: "Camion", icon: Truck },
  { value: "Calendar", label: "Calendario", icon: Calendar },
  { value: "Clock", label: "Orologio", icon: Clock },
  { value: "Star", label: "Stella", icon: Star },
  { value: "Heart", label: "Cuore", icon: Heart },
  { value: "Zap", label: "Fulmine", icon: Zap },
  { value: "Target", label: "Obiettivo", icon: Target },
  { value: "Bookmark", label: "Segnalibro", icon: Bookmark },
  { value: "Tag", label: "Etichetta", icon: Tag },
  { value: "Archive", label: "Archivio", icon: Archive },
  { value: "Inbox", label: "Inbox", icon: Inbox },
  { value: "Mail", label: "Email", icon: Mail },
  { value: "Globe", label: "Globo", icon: Globe },
  { value: "Map", label: "Mappa", icon: Map },
  { value: "Coffee", label: "Caffè", icon: Coffee },
  { value: "Award", label: "Premio", icon: Award },
  { value: "Layers", label: "Livelli", icon: Layers },
  { value: "Grid", label: "Griglia", icon: Grid },
  { value: "List", label: "Lista", icon: List },
  { value: "Layout", label: "Layout", icon: Layout },
  { value: "Play", label: "Play", icon: Play },
  { value: "Check", label: "Check", icon: Check },
  { value: "Box", label: "Box", icon: Box },
  { value: "Boxes", label: "Scatole", icon: Boxes },
  { value: "Wrench", label: "Chiave inglese", icon: Wrench },
  { value: "Hammer", label: "Martello", icon: Hammer },
  { value: "Ruler", label: "Righello", icon: Ruler },
  { value: "Sofa", label: "Divano", icon: Sofa },
  { value: "Armchair", label: "Poltrona", icon: Armchair },
  { value: "TreeDeciduous", label: "Albero", icon: TreeDeciduous },
  { value: "ClipboardCheck", label: "Controllo", icon: ClipboardCheck },
];

/**
 * Map of icon names to icon components for quick lookup
 */
export const KANBAN_ICON_MAP: Record<string, LucideIcon> = KANBAN_ICONS.reduce(
  (acc, { value, icon }) => {
    acc[value] = icon;
    return acc;
  },
  {} as Record<string, LucideIcon>,
);

/**
 * Get icon component by name
 * @param iconName - The icon name (e.g., "Folder", "Factory")
 * @returns The Lucide icon component or Folder as default
 */
export function getKanbanIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Folder;
  return KANBAN_ICON_MAP[iconName] || Folder;
}

/**
 * Get icon option by name
 * @param iconName - The icon name
 * @returns The icon option or undefined
 */
export function getKanbanIconOption(
  iconName: string | null | undefined,
): KanbanIconOption | undefined {
  if (!iconName) return undefined;
  return KANBAN_ICONS.find((opt) => opt.value === iconName);
}
