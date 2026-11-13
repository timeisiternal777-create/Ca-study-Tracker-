import { CastleScene } from './art/scene';

/** The picture on Lanternfell's card in Settings: the real castle scene, still, cropped to the card. */
export default function PickerArt() {
  return <span className="wp-art wp-art--scene" aria-hidden><CastleScene id="wpa" flags={false} /></span>;
}
