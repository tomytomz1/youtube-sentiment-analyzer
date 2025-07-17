// UI utilities for managing application state and progress
import { SecurityUtils } from './security.js';

export class UIManager {
  constructor(elements) {
    this.elements = elements;
    this.progressInterval = null;
    this.progressStage = 0;
    this.progressMessages = [
      'Validating URL...',
      'Connecting to YouTube...',
      'Fetching comments...',
      'Preparing for analysis...',
      'Analyzing sentiment with AI...',
      'Generating results...'
    ];
  }

  hideAllStates() {
    [
      this.elements.loadingState,
      this.elements.errorState,
      this.elements.resultsContainer,
      this.elements.sampleInfo,
      this.elements.mostLikedCallout,
      this.elements.videoInfoCard,
      this.elements.progressBar,
      this.elements.urlError
    ].forEach(el => el?.classList.add('hidden'));
    
    this.clearProgress();
  }

  showLoading(message) {
    this.hideAllStates();
    SecurityUtils.safeSetText(this.elements.loadingText, message);
    this.elements.loadingState?.classList.remove('hidden');
    this.elements.progressBar?.classList.remove('hidden');
    
    if (this.elements.analyzeButton) {
      this.elements.analyzeButton.disabled = true;
    }
    
    this.startProgress();
  }

  showError(message) {
    this.hideAllStates();
    SecurityUtils.safeSetText(this.elements.errorMessage, message);
    this.elements.errorState?.classList.remove('hidden');
    
    if (this.elements.analyzeButton) {
      this.elements.analyzeButton.disabled = false;
    }

    // Add helpful suggestions based on error type
    let suggestion = '';
    if (message.toLowerCase().includes('url') || message.toLowerCase().includes('format')) {
      suggestion = 'Tip: Copy the complete URL from your browser\'s address bar.';
    } else if (message.toLowerCase().includes('comments') || message.toLowerCase().includes('disabled')) {
      suggestion = 'Tip: Make sure the video is public and allows comments.';
    } else if (message.toLowerCase().includes('quota') || message.toLowerCase().includes('limit')) {
      suggestion = 'Tip: Wait a few minutes before trying again.';
    }
    
    SecurityUtils.safeSetText(this.elements.errorSuggestions, suggestion);
  }

  startProgress() {
    this.progressStage = 0;
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = '0%';
    }
    this.updateProgress();
    this.progressInterval = setInterval(() => this.updateProgress(), 1000);
  }

  updateProgress() {
    if (this.progressStage < this.progressMessages.length) {
      SecurityUtils.safeSetText(this.elements.loadingText, this.progressMessages[this.progressStage]);
      const progress = ((this.progressStage + 1) / this.progressMessages.length) * 90;
      if (this.elements.progressFill) {
        this.elements.progressFill.style.width = `${progress}%`;
      }
      this.progressStage++;
    }
  }

  clearProgress() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    this.progressStage = 0;
  }

  showResults(data, meta) {
    this.hideAllStates();
    
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = '100%';
    }

    // Display results based on platform
    // YouTube data structure
    if (meta && meta.videoInfo && meta.channelInfo) {
      this.displayVideoInfo(meta);
    }
    // Reddit data structure
    else if (data && data.thread_title) {
      this.displayRedditInfo(data);
    }

    // Display sample info if available
    if (meta && meta.analyzedCount && meta.totalComments) {
      this.displaySampleInfo(meta);
    } else if (data && data.analyzed_count) {
      this.displaySampleInfo({ analyzedCount: data.analyzed_count, totalComments: data.sampling_quality?.total_comments_available || 0 });
    }

    // Display most liked/upvoted comment
    if (meta && meta.mostLiked) {
      this.displayMostLikedComment(meta.mostLiked);
    }

    this.displaySentimentData(data);
    this.displaySampleComments(data);

    this.elements.resultsContainer?.classList.remove('hidden');
    
    if (this.elements.analyzeButton) {
      this.elements.analyzeButton.disabled = false;
    }
  }

  displayRedditInfo(data) {
    // Display Reddit thread information
    if (this.elements.videoTitle) {
      SecurityUtils.safeSetText(this.elements.videoTitle, data.thread_title || '');
    }
    
    if (this.elements.channelLink && data.thread_url) {
      this.elements.channelLink.href = data.thread_url;
      this.elements.channelLink.textContent = `r/${data.subreddit || 'reddit'}`;
    }
    
    if (this.elements.channelTitle) {
      SecurityUtils.safeSetText(this.elements.channelTitle, `r/${data.subreddit || 'reddit'}`);
    }
    
    if (this.elements.channelDesc) {
      SecurityUtils.safeSetText(this.elements.channelDesc, `Posted by u/${data.thread_post_author || 'unknown'}`);
    }
    
    // Use Reddit logo for thread image
    if (this.elements.videoThumb) {
      this.elements.videoThumb.src = data.thread_image_url || '/reddit-logo.png';
      this.elements.videoThumb.alt = SecurityUtils.escapeHtml(data.thread_title || 'Reddit thread');
    }
    
    // Show the video info card
    if (this.elements.videoInfoCard) {
      this.elements.videoInfoCard.classList.remove('hidden');
    }
  }

  displayVideoInfo(meta) {
    const videoId = this.extractVideoId(window.currentVideoUrl);
    
    if (videoId && this.elements.videoThumb) {
      const thumbUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      this.elements.videoThumb.src = thumbUrl;
      this.elements.videoThumb.alt = SecurityUtils.escapeHtml(meta.videoInfo.title || 'Video thumbnail');
    }

    SecurityUtils.safeSetText(this.elements.videoTitle, meta.videoInfo.title || '');

    if (this.elements.channelLink && meta.channelInfo) {
      let channelUrl = '#';
      if (meta.channelInfo.channelCustomUrl) {
        channelUrl = `https://www.youtube.com/${SecurityUtils.escapeHtml(meta.channelInfo.channelCustomUrl)}`;
      } else if (meta.videoInfo.channelId) {
        channelUrl = `https://www.youtube.com/channel/${SecurityUtils.escapeHtml(meta.videoInfo.channelId)}`;
      }
      this.elements.channelLink.href = channelUrl;
      this.elements.channelLink.target = '_blank';
      this.elements.channelLink.rel = 'noopener noreferrer';
    }

    if (this.elements.channelThumb && meta.channelInfo?.channelThumbnails) {
      const thumbUrl = meta.channelInfo.channelThumbnails.high?.url ||
                      meta.channelInfo.channelThumbnails.default?.url ||
                      meta.channelInfo.channelThumbnails.medium?.url;
      
      if (thumbUrl && SecurityUtils.isValidImageUrl(thumbUrl)) {
        this.elements.channelThumb.src = thumbUrl;
        this.elements.channelThumb.alt = SecurityUtils.escapeHtml(meta.channelInfo.channelTitle || 'Channel thumbnail');
      } else {
        this.elements.channelThumb.style.display = 'none';
      }
    }

    SecurityUtils.safeSetText(this.elements.channelTitle, meta.channelInfo?.channelTitle || '');
    SecurityUtils.safeSetText(this.elements.channelDesc, meta.channelInfo?.channelDescription || '');

    this.elements.videoInfoCard?.classList.remove('hidden');
  }

  displaySampleInfo(meta) {
    let infoText = '';
    if (meta.totalComments <= meta.analyzedCount) {
      infoText = `Analyzed all ${meta.analyzedCount} comments for this video.`;
    } else {
      infoText = `Analyzed a randomized sample of ${meta.analyzedCount} out of ${meta.totalComments} comments.`;
    }
    
    SecurityUtils.safeSetText(this.elements.sampleInfo, infoText);
    this.elements.sampleInfo?.classList.remove('hidden');
  }

  displayMostLikedComment(mostLiked) {
    if (mostLiked.text && typeof mostLiked.likeCount === 'number') {
      SecurityUtils.safeSetText(this.elements.mostLikedLabel, `Most liked comment (${mostLiked.likeCount} likes):`);
      SecurityUtils.safeSetText(this.elements.mostLikedText, `"${mostLiked.text}"`);
      this.elements.mostLikedCallout?.classList.remove('hidden');
    }
  }

  displaySentimentData(data) {
    // Handle both YouTube (flat) and Reddit (nested) data structures
    let sentimentData = data;
    let summaryText = '';
    
    // Reddit API returns nested structure with overall_sentiment
    if (data.overall_sentiment) {
      sentimentData = data.overall_sentiment;
      summaryText = data.overall_sentiment.explainability || '';
    } else {
      // YouTube API returns flat structure
      summaryText = data.summary || '';
    }
    
    // Validate and display percentages
    const positive = Math.max(0, Math.min(100, Math.round(Number(sentimentData.positive) || 0)));
    const neutral = Math.max(0, Math.min(100, Math.round(Number(sentimentData.neutral) || 0)));
    const negative = Math.max(0, Math.min(100, Math.round(Number(sentimentData.negative) || 0)));

    SecurityUtils.safeSetText(this.elements.positivePercentage, `${positive}%`);
    SecurityUtils.safeSetText(this.elements.neutralPercentage, `${neutral}%`);
    SecurityUtils.safeSetText(this.elements.negativePercentage, `${negative}%`);

    // Animate bars
    setTimeout(() => {
      if (this.elements.positiveBar) this.elements.positiveBar.style.width = `${positive}%`;
      if (this.elements.neutralBar) this.elements.neutralBar.style.width = `${neutral}%`;
      if (this.elements.negativeBar) this.elements.negativeBar.style.width = `${negative}%`;
    }, 100);

    // Display summary safely
    SecurityUtils.safeSetText(this.elements.sentimentSummary, summaryText);
  }

  displaySampleComments(data) {
    if (!data) return;

    // Handle YouTube structure (sampleComments)
    if (data.sampleComments) {
      this.updateCommentsContainer(this.elements.positiveComments, data.sampleComments.positive, 'text-green-700');
      this.updateCommentsContainer(this.elements.neutralComments, data.sampleComments.neutral, 'text-gray-700');
      this.updateCommentsContainer(this.elements.negativeComments, data.sampleComments.negative, 'text-red-700');
    }
    // Handle Reddit structure (top_positive_comments, top_negative_comments)
    else if (data.top_positive_comments || data.top_negative_comments) {
      const positiveComments = data.top_positive_comments ? data.top_positive_comments.map(c => c.text) : [];
      const negativeComments = data.top_negative_comments ? data.top_negative_comments.map(c => c.text) : [];
      
      this.updateCommentsContainer(this.elements.positiveComments, positiveComments, 'text-green-700');
      this.updateCommentsContainer(this.elements.neutralComments, [], 'text-gray-700'); // Reddit API doesn't provide neutral samples
      this.updateCommentsContainer(this.elements.negativeComments, negativeComments, 'text-red-700');
    }
    // Handle direct sampleComments structure
    else if (data.positive || data.neutral || data.negative) {
      this.updateCommentsContainer(this.elements.positiveComments, data.positive, 'text-green-700');
      this.updateCommentsContainer(this.elements.neutralComments, data.neutral, 'text-gray-700');
      this.updateCommentsContainer(this.elements.negativeComments, data.negative, 'text-red-700');
    }
  }

  updateCommentsContainer(container, comments, textColor) {
    if (!container || !Array.isArray(comments)) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    comments.forEach(comment => {
      let commentText = '';
      
      // Handle string comments (YouTube format)
      if (typeof comment === 'string' && comment.trim()) {
        commentText = comment.trim();
      }
      // Handle object comments (Reddit format)
      else if (typeof comment === 'object' && comment.text && comment.text.trim()) {
        commentText = comment.text.trim();
      }
      
      if (commentText) {
        const commentDiv = document.createElement('div');
        commentDiv.className = `text-sm ${textColor} bg-white p-3 rounded-lg border border-gray-200`;
        SecurityUtils.safeSetText(commentDiv, `"${commentText}"`);
        container.appendChild(commentDiv);
      }
    });
  }

  extractVideoId(url) {
    if (!SecurityUtils.isValidYouTubeUrl(url)) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*&v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[1].length === 11) {
        return match[1];
      }
    }
    
    return null;
  }
}