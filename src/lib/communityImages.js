const allowedCommunityImagePath = /^\/storage\/v1\/object\/public\/portal-assets\/posts\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpe?g|webp)$/i;

export function isAllowedCommunityImageUrl(value) {
  try {
    const url = new URL(value);
    return url.origin === "https://vbgghmyboyxtmpxnvmvw.supabase.co"
      && allowedCommunityImagePath.test(url.pathname)
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}
