// Share functionality for social media platforms
export class ShareManager {
  constructor() {
    this.lastSharedResultId = null;
    this.lastSharedResultData = null;
  }

  // Enhanced share modal with social media platform options
  createShareModal(shareUrl, videoTitle, positive, neutral, negative) {
    // Remove any existing modal
    const existingModal = document.getElementById('share-modal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.id = 'share-modal';
    modal.className = 'fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl max-w-md w-full p-6 relative animate-fade-in">
        <button id="close-share-modal" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        
        <h3 class="text-xl font-bold text-gray-800 mb-6">Share Results</h3>
        
        <div class="grid grid-cols-3 gap-4 mb-6">
          ${this.generateShareButtons()}
        </div>
        
        <div class="border-t pt-4">
          <p class="text-xs text-gray-500 text-center">Share your YouTube sentiment analysis results</p>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.addModalStyles();
    this.attachModalEvents(modal, shareUrl, videoTitle, positive, neutral, negative);
  }

  generateShareButtons() {
    const platforms = [
      { name: 'twitter', label: 'X (Twitter)', color: 'black', icon: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
      { name: 'facebook', label: 'Facebook', color: 'blue-600', icon: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
      { name: 'linkedin', label: 'LinkedIn', color: 'blue-700', icon: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
      { name: 'whatsapp', label: 'WhatsApp', color: 'green-500', icon: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z' },
      { name: 'reddit', label: 'Reddit', color: 'orange-500', icon: 'M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z' },
      { name: 'copy', label: 'Copy Link', color: 'gray-600', icon: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3', stroke: true }
    ];

    return platforms.map(platform => `
      <button class="share-option flex flex-col items-center p-4 rounded-xl hover:bg-gray-50 transition-colors" data-platform="${platform.name}">
        <div class="w-12 h-12 bg-${platform.color} rounded-full flex items-center justify-center mb-2">
          <svg class="w-6 h-6 text-white" fill="${platform.stroke ? 'none' : 'currentColor'}" ${platform.stroke ? 'stroke="currentColor"' : ''} viewBox="0 0 24 24">
            <path ${platform.stroke ? 'stroke-linecap="round" stroke-linejoin="round" stroke-width="2"' : ''} d="${platform.icon}"></path>
          </svg>
        </div>
        <span class="text-sm text-gray-700">${platform.label}</span>
      </button>
    `).join('');
  }

  addModalStyles() {
    if (!document.getElementById('share-modal-styles')) {
      const style = document.createElement('style');
      style.id = 'share-modal-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
      `;
      document.head.appendChild(style);
    }
  }

  attachModalEvents(modal, shareUrl, videoTitle, positive, neutral, negative) {
    // Close modal events
    document.getElementById('close-share-modal')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });

    // Platform-specific share handlers
    modal.querySelectorAll('.share-option').forEach(button => {
      button.addEventListener('click', () => {
        const platform = button.getAttribute('data-platform');
        this.handlePlatformShare(platform, shareUrl, videoTitle, positive, neutral, negative, modal);
      });
    });
  }

  handlePlatformShare(platform, shareUrl, videoTitle, positive, neutral, negative, modal) {
    const shareMessages = {
      twitter: `🎥 YouTube sentiment analysis: "${videoTitle.length > 120 ? videoTitle.substring(0, 120) + '...' : videoTitle}"\n\n✅ ${positive} positive\n➖ ${neutral} neutral\n❌ ${negative} negative\n\nAnalyze any video! 🚀`,
      facebook: `I just analyzed the sentiment of "${videoTitle}" on YouTube!\n\n📊 Results:\n• Positive: ${positive}\n• Neutral: ${neutral}\n• Negative: ${negative}\n\nTry it yourself with any YouTube video!`,
      linkedin: `Interesting sentiment analysis of "${videoTitle}":\n\n📈 ${positive} positive comments\n➖ ${neutral} neutral comments\n📉 ${negative} negative comments\n\nGreat tool for content creators and marketers!`,
      whatsapp: `Check out this YouTube sentiment analysis!\n\n"${videoTitle}"\n✅ Positive: ${positive}\n➖ Neutral: ${neutral}\n❌ ${negative}\n\nTry it yourself:`,
      reddit: `[Tool] I analyzed the sentiment of "${videoTitle}" - ${positive} positive, ${neutral} neutral, ${negative} negative comments`
    };

    const hashtags = 'YouTubeSentiment,SentimentAnalysis,YouTube';

    switch(platform) {
      case 'twitter':
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessages.twitter)}&url=${encodeURIComponent(shareUrl)}&hashtags=${hashtags}`,
          '_blank',
          'width=550,height=420'
        );
        break;
        
      case 'facebook':
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessages.facebook)}`,
          '_blank',
          'width=550,height=420'
        );
        break;
        
      case 'linkedin':
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareMessages.linkedin)}`,
          '_blank',
          'width=550,height=520'
        );
        break;
        
      case 'whatsapp':
        window.open(
          `https://wa.me/?text=${encodeURIComponent(shareMessages.whatsapp + ' ' + shareUrl)}`,
          '_blank'
        );
        break;
        
      case 'reddit':
        window.open(
          `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareMessages.reddit)}`,
          '_blank',
          'width=850,height=550'
        );
        break;
        
      case 'copy':
        this.copyToClipboard(shareUrl, modal);
        break;
    }
    
    // Close modal after sharing (except for copy)
    if (platform !== 'copy') {
      setTimeout(() => {
        modal.remove();
      }, 500);
    }
  }

  copyToClipboard(text, modal) {
    navigator.clipboard.writeText(text).then(() => {
      // Show success feedback
      const copyButton = modal.querySelector('[data-platform="copy"]');
      if (copyButton) {
        const originalHTML = copyButton.innerHTML;
        copyButton.innerHTML = `
          <div class="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <span class="text-sm text-gray-700">Copied!</span>
        `;
        setTimeout(() => {
          if (copyButton) copyButton.innerHTML = originalHTML;
        }, 2000);
      }
    }).catch(() => {
      console.warn('Could not copy to clipboard');
    });
  }
}