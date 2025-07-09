import type { APIRoute } from 'astro';
import { Redis } from '@upstash/redis';
import { 
  createCanvas, 
  loadImage, 
  type Canvas, 
  type CanvasRenderingContext2D, 
  type Image 
} from 'canvas';

export const config = {
  runtime: 'nodejs',
};

interface SentimentData {
  positive?: number;
  neutral?: number;
  negative?: number;
  summary?: string;
}

interface VideoInfo {
  title?: string;
  channelId?: string;
  channelTitle?: string;
}

interface ChannelInfo {
  channelTitle?: string;
  channelThumbnails?: {
    default?: { url?: string };
    medium?: { url?: string };
    high?: { url?: string };
  };
}

interface ResultData {
  sentimentData?: SentimentData;
  meta?: {
    videoInfo?: VideoInfo;
    channelInfo?: ChannelInfo;
    analyzedCount?: number;
    totalComments?: number;
    mostLiked?: {
      text?: string;
      likeCount?: number;
    };
  };
  videoInfo?: VideoInfo;
  channelInfo?: ChannelInfo;
  analyzedCount?: number;
  totalComments?: number;
  mostLiked?: {
    text?: string;
    likeCount?: number;
  };
  videoUrl?: string;
  platform?: string;
}

// Canvas dimensions
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;

// Colors
const COLORS = {
  background: '#e0e7ff',
  backgroundEnd: '#f1f5f9',
  cardBg: '#ffffff',
  shadow: 'rgba(30, 64, 175, 0.07)',
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    green: '#16a34a',
    red: '#dc2626',
    gray: '#52525b',
    blue: '#2563eb',
    purple: '#9333ea'
  },
  border: '#e0e7ef',
  bars: {
    green: '#10b981',
    gray: '#6b7280',
    red: '#ef4444',
    background: '#e5e7eb'
  }
} as const;

// Helper function to create error image
function createErrorCanvas(message: string): Buffer {
  const canvas: Canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');
  
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  ctx.fillStyle = 'white';
  ctx.font = 'bold 60px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  
  return canvas.toBuffer('image/png');
}

// Helper function to wrap text
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words: string[] = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}

// Helper function to draw rounded rectangle
function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

// Helper function to draw gradient background
function drawGradientBackground(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  gradient.addColorStop(0, COLORS.background);
  gradient.addColorStop(1, COLORS.backgroundEnd);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// Helper function to draw card shadow
function drawCardShadow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.save();
  ctx.shadowColor = COLORS.shadow;
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;
  
  ctx.fillStyle = COLORS.cardBg;
  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.fill();
  
  ctx.restore();
}

// Helper function to load image with fallback - using loadImage directly for URLs
async function loadImageSafe(url: string): Promise<Image | null> {
  try {
    // loadImage from canvas package supports URLs directly
    const image = await loadImage(url);
    return image;
  } catch (error: unknown) {
    console.warn('Failed to load image:', url, error);
    return null;
  }
}

// Helper function to extract video ID from URL
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*&v=([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1] && match[1].length === 11) return match[1];
  }
  
  return null;
}

// Helper function to safely get environment variable
function getEnvVar(key: string): string | undefined {
  // Try import.meta.env first (Astro), then process.env (Node.js)
  return import.meta.env?.[key] || process.env[key];
}

export const GET: APIRoute = async ({ url }): Promise<Response> => {
  try {
    const searchParams = new URL(url).searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return new Response(createErrorCanvas('ID MISSING'), {
        headers: { 'Content-Type': 'image/png' }
      });
    }

    const redisUrl = getEnvVar('KV_REST_API_URL');
    const redisToken = getEnvVar('KV_REST_API_TOKEN');

    if (!redisUrl || !redisToken) {
      return new Response(createErrorCanvas('Missing ENV'), {
        headers: { 'Content-Type': 'image/png' }
      });
    }

    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    const resultData = await redis.get(id) as ResultData | null;

    if (!resultData) {
      return new Response(createErrorCanvas('NOT FOUND'), {
        headers: { 'Content-Type': 'image/png' }
      });
    }

    // Extract data with fallbacks for both root and nested structure
    const sentiment = (resultData as any).sentimentData || (resultData as any).meta?.sentimentData || {};
    const meta = resultData.meta || resultData;
    const videoTitle = (meta as any).videoInfo?.title || (resultData as any).videoInfo?.title || 'YouTube Video';
    const channelTitle = (meta as any).channelInfo?.channelTitle || (resultData as any).channelInfo?.channelTitle || 'Unknown Channel';
    const channelAvatar = (meta as any).channelInfo?.channelThumbnails?.default?.url || 
                         (resultData as any).channelInfo?.channelThumbnails?.default?.url || null;
    const analyzedCount = (meta as any).analyzedCount || (resultData as any).analyzedCount || 0;
    const totalComments = (meta as any).totalComments || (resultData as any).totalComments || 0;
    const summary = (sentiment as any).summary || '';
    const mostLiked = (meta as any).mostLiked || (resultData as any).mostLiked || null;
    const videoUrl = (resultData as any).videoUrl || (meta as any).videoUrl || '';
    const platform = (resultData as any).platform || (meta as any).platform || 'youtube';

    // Validate required data
    if (!videoTitle || !channelTitle || typeof sentiment.positive !== 'number') {
      return new Response(createErrorCanvas('DATA ERROR'), {
        headers: { 'Content-Type': 'image/png' }
      });
    }

    // Create canvas
    const canvas: Canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');

    // Draw gradient background
    drawGradientBackground(ctx);

    // Card dimensions
    const cardX = 125;
    const cardY = 65;
    const cardWidth = 950;
    const cardHeight = 500;
    const cardRadius = 32;

    // Draw card shadow and background
    drawCardShadow(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);

    // Set clipping path for card content
    ctx.save();
    drawRoundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius);
    ctx.clip();

    // Platform branding
    let platformName = 'YouTube';
    let platformColor: string = COLORS.text.blue;
    if (platform === 'reddit') {
      platformName = 'Reddit';
      platformColor = '#FF4500';
    } else if (platform === 'twitter' || platform === 'x') {
      platformName = 'X (Twitter)';
      platformColor = '#000000';
    }

    // Draw platform icon placeholder (circular background)
    const iconX = cardX + 44;
    const iconY = cardY + 44;
    const iconSize = 50;
    
    ctx.fillStyle = platformColor;
    ctx.beginPath();
    ctx.arc(iconX + iconSize/2, iconY + iconSize/2, iconSize/2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw platform letter in icon
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(platformName[0], iconX + iconSize/2, iconY + iconSize/2);

    // Draw video title
    ctx.fillStyle = COLORS.text.primary;
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    const titleX = iconX + iconSize + 20;
    const titleY = iconY;
    const maxTitleWidth = cardWidth - (titleX - cardX) - 44;
    
    const titleText = `${platformName}: ${videoTitle}`;
    const titleLines = wrapText(ctx, titleText, maxTitleWidth);
    
    titleLines.slice(0, 2).forEach((line, index) => {
      ctx.fillText(line, titleX, titleY + (index * 34));
    });

    // Draw channel info
    ctx.fillStyle = COLORS.text.secondary;
    ctx.font = '400 20px Arial';
    
    const channelY = titleY + (Math.min(titleLines.length, 2) * 34) + 10;
    let channelX = titleX;

    // Draw channel avatar if available
    if (channelAvatar) {
      try {
        const avatarImage = await loadImageSafe(channelAvatar);
        if (avatarImage) {
          const avatarSize = 30;
          ctx.save();
          ctx.beginPath();
          ctx.arc(channelX + avatarSize/2, channelY + avatarSize/2, avatarSize/2, 0, 2 * Math.PI);
          ctx.clip();
          ctx.drawImage(avatarImage, channelX, channelY, avatarSize, avatarSize);
          ctx.restore();
          channelX += avatarSize + 10;
        }
      } catch (error: unknown) {
        console.warn('Failed to load channel avatar:', error);
      }
    }

    ctx.fillText(channelTitle, channelX, channelY + 22);

    // Sentiment bars section
    const barsY = cardY + 170;
    const barHeight = 12;
    const barWidth = 150;
    const barSpacing = 38;
    
    const positive = sentiment.positive || 0;
    const neutral = sentiment.neutral || 0;
    const negative = sentiment.negative || 0;

    // Helper function to draw sentiment bar
    function drawSentimentBar(label: string, percentage: number, color: string, x: number): void {
      // Percentage text
      ctx.fillStyle = color;
      ctx.font = 'bold 34px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`${percentage}%`, x, barsY);

      // Progress bar background
      ctx.fillStyle = COLORS.bars.background;
      drawRoundedRect(ctx, x, barsY + 45, barWidth, barHeight, 8);
      ctx.fill();

      // Progress bar fill
      ctx.fillStyle = color;
      const fillWidth = (percentage / 100) * barWidth;
      drawRoundedRect(ctx, x, barsY + 45, fillWidth, barHeight, 8);
      ctx.fill();

      // Label
      ctx.fillStyle = color;
      ctx.font = 'bold 17px Arial';
      ctx.fillText(label, x, barsY + 75);
    }

    // Draw sentiment bars
    let barX = cardX + 44;
    drawSentimentBar('Positive', positive, COLORS.text.green, barX);
    barX += barWidth + barSpacing;
    drawSentimentBar('Neutral', neutral, COLORS.text.gray, barX);
    barX += barWidth + barSpacing;
    drawSentimentBar('Negative', negative, COLORS.text.red, barX);

    // Summary section
    if (summary) {
      const summaryY = barsY + 110;
      const summaryX = cardX + 44;
      const summaryWidth = cardWidth - 88;
      const summaryHeight = 70;

      // Summary background
      ctx.fillStyle = '#f1f5f9';
      drawRoundedRect(ctx, summaryX, summaryY, summaryWidth, summaryHeight, 14);
      ctx.fill();

      // Summary text
      ctx.fillStyle = COLORS.text.secondary;
      ctx.font = '500 18px Arial';
      ctx.textAlign = 'left';
      
      const summaryLines = wrapText(ctx, summary, summaryWidth - 50);
      summaryLines.slice(0, 2).forEach((line, index) => {
        ctx.fillText(line, summaryX + 25, summaryY + 25 + (index * 22));
      });
    }

    // Stats section
    const statsY = cardY + cardHeight - 120;
    
    ctx.fillStyle = COLORS.text.secondary;
    ctx.font = '600 18px Arial';
    
    let statsX = cardX + 44;
    ctx.fillText(`${analyzedCount} analyzed`, statsX, statsY);
    
    statsX += 180;
    ctx.fillText(`${totalComments} total comments`, statsX, statsY);
    
    if (mostLiked?.likeCount) {
      statsX += 220;
      ctx.fillStyle = '#eab308';
      ctx.fillText(`👍 ${mostLiked.likeCount} most liked`, statsX, statsY);
    }

    // AI Powered badge
    statsX += 220;
    const badgeWidth = 120;
    const badgeHeight = 28;
    
    ctx.strokeStyle = '#ddd6fe';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, statsX, statsY - 20, badgeWidth, badgeHeight, 7);
    ctx.stroke();
    
    ctx.fillStyle = '#faf5ff';
    drawRoundedRect(ctx, statsX, statsY - 20, badgeWidth, badgeHeight, 7);
    ctx.fill();
    
    ctx.fillStyle = COLORS.text.purple;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('AI Powered', statsX + badgeWidth/2, statsY - 6);

    // Bottom branding
    const bottomY = cardY + cardHeight - 50;
    
    // Senti-Meter logo placeholder
    ctx.fillStyle = COLORS.text.blue;
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Senti-Meter', cardX + 44, bottomY);

    // Call to action
    ctx.fillStyle = COLORS.text.blue;
    ctx.font = 'bold 21px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('Try it free at www.senti-meter.com', cardX + cardWidth - 44, bottomY);

    ctx.restore(); // Remove clipping

    // Generate PNG buffer
    const buffer = canvas.toBuffer('image/png');

    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    });

  } catch (error: unknown) {
    console.error('Error generating OG image:', error);
    return new Response(createErrorCanvas('SERVER ERROR'), {
      headers: { 'Content-Type': 'image/png' }
    });
  }
};