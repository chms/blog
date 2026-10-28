export const tagSlug = (tag: string) => tag.trim().toLowerCase().replace(/\s+/g, '-');

export const tagUrl = (tag: string) => `/tags/${tagSlug(tag)}/`;
