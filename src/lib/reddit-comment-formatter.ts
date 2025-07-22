// Reddit Comment Formatter Utility
// Handles markdown parsing, link detection, and Reddit-style comment formatting

export interface FormattedComment {
  html: string;
  plainText: string;
  hasLinks: boolean;
  linkCount: number;
}

// Simple markdown to HTML converter for Reddit-style formatting
export function formatRedditComment(text: string): FormattedComment {
  if (!text || typeof text !== 'string') {
    return { html: '', plainText: '', hasLinks: false, linkCount: 0 };
  }



  let html = text;
  let linkCount = 0;

  // Decode HTML entities first
  html = decodeHtmlEntities(html);

  // Convert markdown links [text](url) to HTML
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, url) => {
    linkCount++;
    return `<a href='${escapeHtml(url)}' target='_blank' rel='noopener noreferrer' class='text-blue-600 hover:text-blue-800 underline break-all'>${escapeHtml(linkText)}</a>`;
  });

  // Convert plain URLs to clickable links - more robust URL detection
  // First, handle complete URLs
  html = html.replace(/(https?:\/\/[^\s<>"']+)/g, (_match, url) => {
    linkCount++;
    // Clean up the URL by removing trailing punctuation that shouldn't be part of the URL
    const cleanUrl = url.replace(/[.,;:!?]+$/, '');
    return `<a href='${escapeHtml(cleanUrl)}' target='_blank' rel='noopener noreferrer' class='text-blue-600 hover:text-blue-800 underline break-all'>${escapeHtml(cleanUrl)}</a>`;
  });

  // Then handle potentially truncated URLs that end with common patterns
  html = html.replace(/(https?:\/\/[^\s<>"']*?)(?=\s|$|>|"|'|\)|,|\.|;|!|\?)/g, (_match, partialUrl) => {
    // Only process if it looks like a real URL that might be truncated
    if (partialUrl.startsWith('http') && partialUrl.length > 15 && !partialUrl.includes(' ') && !partialUrl.includes('<') && !partialUrl.includes('>')) {
      return `<a href='${escapeHtml(partialUrl)}' target='_blank' rel='noopener noreferrer' class='text-blue-600 hover:text-blue-800 underline break-all'>${escapeHtml(partialUrl)}</a>`;
    }
    return partialUrl;
  });

  // Special handling for common truncated URL patterns
  // Look for "https://www.document" and similar patterns that might be incomplete
  html = html.replace(/(https?:\/\/www\.document)(?=\s|$)/g, (_match, partialUrl) => {
    // For now, just make the partial URL clickable
    return `<a href='${escapeHtml(partialUrl)}' target='_blank' rel='noopener noreferrer' class='text-blue-600 hover:text-blue-800 underline break-all'>${escapeHtml(partialUrl)}</a>`;
  });

  // Convert Reddit-style links /r/subreddit and /u/username
  html = html.replace(/\/(r|u)\/([a-zA-Z0-9_-]+)/g, (_match, type, name) => {
    const url = type === 'r' ? `https://reddit.com/r/${name}` : `https://reddit.com/u/${name}`;
    return `<a href='${url}' target='_blank' rel='noopener noreferrer' class='text-blue-600 hover:text-blue-800 underline break-all'>${_match}</a>`;
  });

  // Convert **bold** text
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* text
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Convert `code` text
  html = html.replace(/`([^`]+)`/g, '<code class=\'bg-gray-100 px-1 py-0.5 rounded text-sm font-mono\'>$1</code>');

  // Normalize line breaks - remove extra whitespace and handle line breaks properly
  html = html.replace(/\r\n/g, '\n'); // Normalize Windows line endings
  html = html.replace(/\r/g, '\n'); // Normalize Mac line endings
  html = html.replace(/\n{3,}/g, '\n\n'); // Reduce 3+ consecutive line breaks to 2
  html = html.replace(/\n\n/g, '<br><br>'); // Double line breaks become double <br>
  html = html.replace(/\n/g, '<br>'); // Single line breaks become <br>

  // Convert multiple spaces to non-breaking spaces (preserve formatting)
  html = html.replace(/ {2,}/g, (match) => '&nbsp;'.repeat(match.length));

  return {
    html,
    plainText: text,
    hasLinks: linkCount > 0,
    linkCount
  };
}

// Decode common HTML entities
function decodeHtmlEntities(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// Escape HTML to prevent XSS
function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Format timestamp to Reddit-style relative time
export function formatRedditTime(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return 'unknown';
  
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}mo`;
  return `${Math.floor(diff / 31536000)}y`;
}

// Format score with Reddit-style formatting
export function formatRedditScore(score: number): string {
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}k`;
  }
  return score.toString();
}

// Create Reddit-style comment HTML
export function createRedditCommentHTML(comment: {
  text: string;
  score: number;
  author: string;
  created: number;
  permalink: string;
  id: string;
  depth: number;
}): string {
  const formatted = formatRedditComment(comment.text);
  const timeAgo = formatRedditTime(comment.created);
  const scoreFormatted = formatRedditScore(comment.score);
  const marginLeft = comment.depth * 20; // 20px per depth level

  return `
    <div class='reddit-comment bg-white border-l-4 border-gray-200 p-4 mb-3 rounded-r-lg' style='margin-left: ${marginLeft}px;'>
      <div class='flex items-start space-x-2 mb-2'>
        <div class='flex items-center space-x-1 text-xs text-gray-500'>
          <span class='font-medium text-gray-700'>${escapeHtml(comment.author)}</span>
          <span>•</span>
          <span>${timeAgo}</span>
          <span>•</span>
          <span class='flex items-center'>
            <svg class='w-3 h-3 mr-1' fill='currentColor' viewBox='0 0 20 20'>
              <path fill-rule='evenodd' d='M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z' clip-rule='evenodd'></path>
            </svg>
            ${scoreFormatted}
          </span>
        </div>
      </div>
      <div class='text-gray-800 leading-relaxed'>
        ${formatted.html}
      </div>
      <div class='flex items-center space-x-4 mt-2 text-xs text-gray-500'>
        <a href='https://reddit.com${comment.permalink}' target='_blank' rel='noopener noreferrer' class='hover:text-blue-600'>
          View on Reddit
        </a>
        ${formatted.hasLinks ? `<span>• ${formatted.linkCount} link${formatted.linkCount !== 1 ? 's' : ''}</span>` : ''}
      </div>
    </div>
  `;
} 