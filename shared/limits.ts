export const MAX_DOCUMENTS = 10;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".txt", ".pdf", ".jpg", ".jpeg", ".png"] as const;
export const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"] as const;
// Claude rejects images larger than this on either side.
export const MAX_IMAGE_SIDE = 8000;
// Pasted text has no file-size check on the server, so cap it in characters.
export const MAX_PASTE_CHARS = 200_000;
