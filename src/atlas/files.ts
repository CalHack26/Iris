import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

/** URLs for the phone atlas. The dev server serves these from public/atlas. */
const FILE_NAMES = [
  'lod0-bone.glb',
  'lod0-muscle.glb',
  'lod0-organ.glb',
  'lod0-skin.glb',
  'lod1-arm-left-bone.glb',
  'lod1-arm-left-muscle.glb',
  'lod1-arm-left-skin.glb',
  'lod1-arm-right-bone.glb',
  'lod1-arm-right-muscle.glb',
  'lod1-arm-right-skin.glb',
  'lod1-head-bone.glb',
  'lod1-head-muscle.glb',
  'lod1-head-organ.glb',
  'lod1-head-skin.glb',
  'lod1-leg-left-bone.glb',
  'lod1-leg-left-muscle.glb',
  'lod1-leg-left-organ.glb',
  'lod1-leg-left-skin.glb',
  'lod1-leg-right-bone.glb',
  'lod1-leg-right-muscle.glb',
  'lod1-leg-right-skin.glb',
  'lod1-torso-bone.glb',
  'lod1-torso-muscle.glb',
  'lod1-torso-organ.glb',
  'lod1-torso-skin.glb',
] as const;

export type AtlasFile = (typeof FILE_NAMES)[number];

/** Same origin that delivered the app bundle. Tunnel hosts are https; plain http stalls. */
function devOrigin(): string {
  if (Platform.OS === 'web') return '';
  const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;
  const fromScript = scriptURL?.match(/^(https?:\/\/[^/]+)/)?.[1];
  if (fromScript) return fromScript;
  const host = Constants.expoGoConfig?.debuggerHost ?? Constants.expoConfig?.hostUri ?? '';
  if (!host) return '';
  if (host.startsWith('http')) return host.replace(/\/$/, '');
  const tunnel = /exp\.direct|ngrok|exp\.host/.test(host);
  return `${tunnel ? 'https' : 'http'}://${host}`;
}

export function atlasUrl(file: AtlasFile): string {
  return `${devOrigin()}/atlas/${file}`;
}
