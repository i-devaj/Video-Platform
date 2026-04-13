const ALLOWED = /^[\p{L}\p{M}\p{N}\p{P}\p{S}\s]+$/u;
export const isCommentClean = (text) => ALLOWED.test(text.trim());
