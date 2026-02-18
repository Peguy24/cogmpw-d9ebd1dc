

## Fix: "QuickTime is not supported" error when recording video on iPhone

### Problem
iPhones record video in `.MOV` (QuickTime) format by default. When you try to upload this video to a post, web browsers cannot play `.mov` files, causing the "QuickTime is not supported" error.

### Solution
Update the News and Event post forms to:

1. **Accept `.mov` files** but set a compatible content type for upload
2. **Convert the file input accept attribute** to explicitly include `video/mp4,video/webm,video/quicktime` so iOS offers the right recording options
3. **Map `.mov` files to `video/quicktime` content type** during upload so they store correctly
4. **Use the HTML5 `<video>` tag** which can play `.mov` on iOS Safari but show a fallback message on other browsers

Alternatively (and more robustly), we can add a note guiding users to record in `.mp4` format, and ensure the video preview and playback handle `.mov` gracefully.

### Files to change

**1. `src/components/NewsPostForm.tsx`**
- Update the file input `accept` attribute to be more specific: `image/*,video/mp4,video/webm,video/quicktime,.mov,.mp4,.webm`
- In `handleMediaChange`, if the file is `.mov`, explicitly set the content type to `video/quicktime`
- In the upload logic, ensure `.mov` files get the correct MIME type mapping
- Add a helper note in the form description mentioning that `.mp4` format is recommended for best compatibility

**2. `src/components/EventPostForm.tsx`**
- Apply the same changes as above for consistency

### Technical details

The key change in the upload logic for both forms:

```typescript
// Better content type detection for iOS .mov files
const getContentType = (file: File): string => {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    'mov': 'video/quicktime',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
};
```

The file input accept attribute will be updated to:
```
accept="image/*,video/mp4,video/webm,video/quicktime,.mov,.mp4,.webm"
```

The form description will be updated to note that `.mp4` is recommended for widest compatibility, while `.mov` (iPhone default) is also supported.

