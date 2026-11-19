import type { RawEditorOptions } from 'tinymce';
import { getApiErrorMessage, uploadInventoryDocument } from '@/lib/http';

type ImagesUploadHandler = NonNullable<
  RawEditorOptions['images_upload_handler']
>;

/** Image file extensions the image dialog's Upload tab accepts — the same
 * types as {@link IMAGE_MIME_TYPES}. */
export const IMAGE_FILE_TYPES = 'jpeg,jpg,png,webp,gif,svg';

/** Image MIME types the inventory upload endpoint accepts (a subset of the
 * backend's `ALLOWED_ATTACHMENT_MIME_TYPES`). */
const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

/** Client-side size cap mirroring the backend's `MAX_ATTACHMENT_BYTES` (10 MB). */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** A user-facing reason the file can't be uploaded, or `null` when it's fine. */
function validateImage(file: File): string | null {
  if (!IMAGE_MIME_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, WEBP, GIF or SVG images can be uploaded.';
  }
  if (file.size > MAX_IMAGE_BYTES) return 'The image must be 10 MB or smaller.';
  return null;
}

/**
 * Upload handler for TinyMCE's image dialog: uploads through the inventory
 * backend's own attachment endpoint (`POST /uploads/attachment`, the same one
 * the document fields use) and resolves to the stored image's URL. A rejection
 * shows TinyMCE's own error message in the dialog.
 */
export function createImageUploadHandler(): ImagesUploadHandler {
  return async (blobInfo) => {
    const blob = blobInfo.blob();
    const file =
      blob instanceof File
        ? blob
        : new File([blob], blobInfo.filename(), { type: blob.type });
    const invalid = validateImage(file);
    if (invalid) throw { message: invalid, remove: true };
    try {
      return await uploadInventoryDocument(file);
    } catch (ex) {
      throw {
        message: getApiErrorMessage(ex, 'Could not upload the image'),
        remove: true,
      };
    }
  };
}
