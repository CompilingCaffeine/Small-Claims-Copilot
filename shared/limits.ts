export const MAX_DOCUMENTS = 10;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".txt", ".pdf"] as const;
// Pasted text has no file-size check on the server, so cap it in characters.
export const MAX_PASTE_CHARS = 200_000;
