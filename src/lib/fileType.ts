export function isImageFileId(fileId?: string): boolean {
  if (!fileId) return false;
  const name = fileId.split('__').pop() ?? '';
  return /\.(png|jpe?g)$/i.test(name);
}
