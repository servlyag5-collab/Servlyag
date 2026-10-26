import * as ImageManipulator from 'expo-image-manipulator';

// Photos are shrunk before upload: at most MAX_WIDTH pixels wide, saved as JPEG at QUALITY.
// A typical 4 MB phone photo becomes about 200-500 KB, so listings load fast on mobile data.
export const MAX_WIDTH = 1600;
export const QUALITY = 0.7;

export async function shrinkPhoto(photo: { uri: string; width?: number }) {
  const actions = photo.width && photo.width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];
  const out = await ImageManipulator.manipulateAsync(photo.uri, actions, { compress: QUALITY, format: ImageManipulator.SaveFormat.JPEG });
  const buf = await (await fetch(out.uri)).arrayBuffer();
  return { buf, contentType: 'image/jpeg', ext: 'jpg' };
}
