export function countWords(s: string): number {
    if (!s) return 0;
  
    // Strip HTML tags and replace with spaces
    let cleaned = s.replace(/<[^>]*>/g, ' ');
  
    // Count Chinese characters (each as a "word")
    const chineseCount = (cleaned.match(/[\u4e00-\u9fff]/g) || []).length;
  
    // Remove Chinese characters and punctuation, then count Latin words
    const latinText = cleaned
      .replace(/[\u4e00-\u9fff]/g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .trim();
  
    const latinCount = latinText ? latinText.split(/\s+/).filter(Boolean).length : 0;
  
    return chineseCount + latinCount;
  }