import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

import { useColors } from '@/theme';

/**
 * One registry for every icon in the app: SF Symbols on iOS, Material Symbols on
 * Android and web (both rendered by expo-symbols). Names are type-checked.
 */
const ICONS = {
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  gallery: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  folder: { ios: 'folder', android: 'folder', web: 'folder' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  checkCircle: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  cube: { ios: 'cube.transparent', android: 'view_in_ar', web: 'view_in_ar' },
  rotate3d: { ios: 'rotate.3d', android: '3d_rotation', web: '3d_rotation' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  pencil: { ios: 'pencil', android: 'edit', web: 'edit' },
  info: { ios: 'info.circle', android: 'info', web: 'info' },
  warning: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
  error: { ios: 'xmark.octagon', android: 'error', web: 'error' },
  lightbulb: { ios: 'lightbulb', android: 'lightbulb', web: 'lightbulb' },
  sun: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  palette: { ios: 'paintpalette', android: 'palette', web: 'palette' },
  paintbrush: { ios: 'paintbrush', android: 'format_paint', web: 'format_paint' },
  sofa: { ios: 'sofa', android: 'weekend', web: 'weekend' },
  bed: { ios: 'bed.double', android: 'bed', web: 'bed' },
  dining: { ios: 'fork.knife', android: 'table_restaurant', web: 'table_restaurant' },
  kitchen: { ios: 'refrigerator', android: 'kitchen', web: 'kitchen' },
  bath: { ios: 'bathtub', android: 'bathtub', web: 'bathtub' },
  desk: { ios: 'desktopcomputer', android: 'desk', web: 'desk' },
  balcony: { ios: 'leaf', android: 'deck', web: 'deck' },
  grill: { ios: 'flame', android: 'outdoor_grill', web: 'outdoor_grill' },
  home: { ios: 'house', android: 'home', web: 'home' },
  grid: { ios: 'square.grid.2x2', android: 'grid_view', web: 'grid_view' },
  ruler: { ios: 'ruler', android: 'straighten', web: 'straighten' },
  shield: { ios: 'lock.shield', android: 'shield_lock', web: 'shield_lock' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  compare: { ios: 'square.split.2x1', android: 'compare', web: 'compare' },
  star: { ios: 'star.fill', android: 'star', web: 'star' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  wand: { ios: 'wand.and.stars', android: 'auto_fix_high', web: 'auto_fix_high' },
  money: { ios: 'banknote', android: 'payments', web: 'payments' },
  list: { ios: 'list.bullet.rectangle', android: 'list_alt', web: 'list_alt' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  expand: { ios: 'arrow.up.left.and.arrow.down.right', android: 'open_in_full', web: 'open_in_full' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
  external: { ios: 'safari', android: 'open_in_new', web: 'open_in_new' },
  flag: { ios: 'flag', android: 'flag', web: 'flag' },
  wallet: { ios: 'creditcard', android: 'account_balance_wallet', web: 'account_balance_wallet' },
  chair: { ios: 'chair.lounge', android: 'chair', web: 'chair' },
  key: { ios: 'key', android: 'key', web: 'key' },
  photoAdd: { ios: 'photo.badge.plus', android: 'add_photo_alternate', web: 'add_photo_alternate' },
  offline: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
  server: { ios: 'server.rack', android: 'dns', web: 'dns' },
  touch: { ios: 'hand.draw', android: 'touch_app', web: 'touch_app' },
  viewfinder: { ios: 'viewfinder', android: 'center_focus_strong', web: 'center_focus_strong' },
  plant: { ios: 'leaf', android: 'potted_plant', web: 'potted_plant' },
  layers: { ios: 'square.3.layers.3d', android: 'layers', web: 'layers' },
  arrowRight: { ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' },
  ban: { ios: 'nosign', android: 'block', web: 'block' },
  move: { ios: 'arrow.up.and.down.and.arrow.left.and.right', android: 'open_with', web: 'open_with' },
  swap: { ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' },
  dot: { ios: 'circle.fill', android: 'circle', web: 'circle' },
} as const satisfies Record<string, Extract<SymbolViewProps['name'], object>>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 22, color, style }: IconProps) {
  const colors = useColors();
  return (
    <SymbolView
      name={ICONS[name]}
      size={size}
      tintColor={color ?? colors.text}
      resizeMode="scaleAspectFit"
      style={style}
    />
  );
}
