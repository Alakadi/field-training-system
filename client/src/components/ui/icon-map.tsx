import React from 'react';
import { 
  Bell, 
  User, 
  Users, 
  GraduationCap, 
  BookOpen, 
  MapPin, 
  FileText, 
  Home, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash, 
  Save, 
  Upload, 
  Download, 
  Search, 
  Eye, 
  Filter, 
  Check, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight, 
  Building, 
  Star, 
  Activity, 
  UserPlus, 
  BarChart, 
  ChevronLeft, 
  MoreHorizontal, 
  Dot, 
  Circle, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  CalendarDays, 
  Trophy, 
  Trash2, 
  AlertTriangle, 
  ChevronUp, 
  PanelLeft, 
  GripVertical,
  FileSpreadsheet,
  Printer,
  CheckAll,
  Loader,
  UserCheck,
  UserX
} from './icons';

interface IconProps {
  className?: string;
  size?: number;
}

// Icon map for string-based icon references
export const iconMap: Record<string, React.ComponentType<IconProps>> = {
  bell: Bell,
  user: User,
  users: Users,
  book_open: BookOpen,
  map_pin: MapPin,
  file_text: FileText,
  home: Home,
  settings: Settings,
  log_out: LogOut,
  menu: Menu,
  x: X,
  calendar: Calendar,
  clock: Clock,
  plus: Plus,
  edit: Edit,
  trash: Trash,
  save: Save,
  upload: Upload,
  download: Download,
  search: Search,
  eye: Eye,
  filter: Filter,
  check: Check,
  alert_circle: AlertCircle,
  chevron_down: ChevronDown,
  chevron_right: ChevronRight,
  building: Building,
  star: Star,
  activity: Activity,
  user_plus: UserPlus,
  bar_chart: BarChart,
  chevron_left: ChevronLeft,
  more_horizontal: MoreHorizontal,
  dot: Dot,
  circle: Circle,
  arrow_left: ArrowLeft,
  arrow_right: ArrowRight,
  "arrow-right": ArrowRight,
  "graduation-cap": GraduationCap,
  graduation_cap: GraduationCap,
  check_circle: CheckCircle,
  calendar_days: CalendarDays,
  trophy: Trophy,
  trash2: Trash2,
  alert_triangle: AlertTriangle,
  chevron_up: ChevronUp,
  panel_left: PanelLeft,
  grip_vertical: GripVertical,
  file_spreadsheet: FileSpreadsheet,
  printer: Printer,
  check_all: CheckAll,
  loader: Loader,
  user_check: UserCheck,
  user_x: UserX,
  // إضافة الأيقونات المفقودة
  dashboard: Home,
  person: User,
  menu_book: BookOpen,
  school: GraduationCap,
  grading: Trophy
};

// Simple Icon component for string-based references
interface IconComponentProps {
  name: string;
  className?: string;
  size?: number;
}

export const Icon: React.FC<IconComponentProps> = ({ 
  name, 
  className = "", 
  size = 24 
}) => {
  const IconComponent = iconMap[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return <div className={`w-6 h-6 ${className}`} style={{ width: size, height: size }} />;
  }
  
  return <IconComponent className={className} size={size} />;
};

export default Icon;