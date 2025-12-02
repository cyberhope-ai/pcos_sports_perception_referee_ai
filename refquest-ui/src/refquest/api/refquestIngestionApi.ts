/**
 * Phase 12.6: RefQuest Ingestion API
 *
 * API layer for video ingestion: YouTube download, local upload, and job monitoring
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8088/api/v1';

// ============================================================================
// Types
// ============================================================================

export type IngestionJobStatus =
  | 'queued'
  | 'downloading'
  | 'uploading'
  | 'processing'
  | 'processing_skilldna'
  | 'generating_clips'
  | 'completed'
  | 'failed';

export interface VideoMetadata {
  resolution?: string;        // e.g., "1920x1080"
  width?: number;
  height?: number;
  fileSize?: number;          // bytes
  codec?: string;             // e.g., "h264", "av1"
  bitrate?: number;           // kbps
  fps?: number;
  encoder?: string;           // e.g., "NVENC", "x264"
}

export interface IngestionJob {
  id: string;
  gameId?: string;
  source: 'youtube' | 'upload' | 'url';
  status: IngestionJobStatus;
  progress: number;
  stage: string;
  videoFilename: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  duration?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  // Video metadata (Phase 13.5)
  metadata?: VideoMetadata;
  // Storage info
  storagePath?: string;
  inDatabase?: boolean;
}

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  duration: number;
  thumbnailUrl: string;
  channel: string;
  viewCount?: number;
}

// YouTube Data API Search Types
export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  thumbnailHigh?: string;
  channel: string;
  publishedAt: string;
  duration?: string;
}

export interface YouTubeSearchResponse {
  results: YouTubeSearchResult[];
  nextPageToken?: string;
  totalResults: number;
}

export interface IngestYouTubeRequest {
  url: string;
  sport?: string;
}

export interface IngestYouTubeResponse {
  jobId: string;
  gameId: string;
  status: string;
  message: string;
}

export interface GameStatusResponse {
  id: string;
  sport: string;
  status: IngestionJobStatus;
  video_path?: string;
  events_count?: number;
  clips_count?: number;
}

export interface UrlMetadata {
  url: string;
  sourceType: 'vimeo' | 'direct' | 'unknown';
  title?: string;
  author?: string;
  thumbnailUrl?: string;
  duration?: number;
  fileSize?: number;
  viewCount?: number;
  contentType?: string;
}

export interface IngestUrlRequest {
  url: string;
  sport?: string;
}

export interface IngestUrlResponse {
  jobId: string;
  gameId?: string;
  status: string;
  message: string;
}

// Cloud storage types (Phase 12.8)
export type CloudProvider = 's3' | 'gcs' | 'azure' | 'direct';

export interface CloudMetadata {
  url: string;
  provider: CloudProvider;
  filename?: string;
  fileSize?: number;
  contentType?: string;
  lastModified?: string;
}

export interface IngestCloudRequest {
  url: string;
  source?: CloudProvider | 'auto';
  sport?: string;
}

export interface IngestCloudResponse {
  jobId: string;
  gameId?: string;
  status: string;
  message: string;
}

// YouTube Data API configuration
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// ============================================================================
// YouTube API
// ============================================================================

/**
 * Search YouTube videos using YouTube Data API v3
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 12,
  pageToken?: string
): Promise<YouTubeSearchResponse> {
  if (!YOUTUBE_API_KEY) {
    console.warn('[IngestionAPI] No YouTube API key configured, using mock results');
    return mockYouTubeSearchResults(query);
  }

  try {
    // First, search for videos
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: maxResults.toString(),
      key: YOUTUBE_API_KEY,
      videoCategoryId: '17', // Sports category
      order: 'relevance',
    });
    if (pageToken) {
      searchParams.append('pageToken', pageToken);
    }

    const searchResponse = await fetch(`${YOUTUBE_API_BASE}/search?${searchParams}`);
    if (!searchResponse.ok) {
      throw new Error(`YouTube search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    // Extract video IDs for duration lookup
    const videoIds = searchData.items
      .map((item: { id: { videoId: string } }) => item.id.videoId)
      .join(',');

    // Fetch video details for duration
    let durations: Record<string, string> = {};
    if (videoIds) {
      const detailsParams = new URLSearchParams({
        part: 'contentDetails',
        id: videoIds,
        key: YOUTUBE_API_KEY,
      });

      const detailsResponse = await fetch(`${YOUTUBE_API_BASE}/videos?${detailsParams}`);
      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        durations = detailsData.items.reduce(
          (acc: Record<string, string>, item: { id: string; contentDetails: { duration: string } }) => {
            acc[item.id] = item.contentDetails.duration;
            return acc;
          },
          {}
        );
      }
    }

    // Transform results
    const results: YouTubeSearchResult[] = searchData.items.map(
      (item: {
        id: { videoId: string };
        snippet: {
          title: string;
          description: string;
          thumbnails: { medium: { url: string }; high?: { url: string } };
          channelTitle: string;
          publishedAt: string;
        };
      }) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.medium.url,
        thumbnailHigh: item.snippet.thumbnails.high?.url,
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        duration: durations[item.id.videoId],
      })
    );

    return {
      results,
      nextPageToken: searchData.nextPageToken,
      totalResults: searchData.pageInfo?.totalResults || results.length,
    };
  } catch (error) {
    console.warn('[IngestionAPI] YouTube search failed, using mock:', error);
    return mockYouTubeSearchResults(query);
  }
}

/**
 * Fetch YouTube video metadata
 */
export async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata> {
  try {
    const response = await fetch(`${API_BASE}/youtube/metadata?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[IngestionAPI] Fetching YouTube metadata failed, using mock:', error);
    // Extract video ID from URL for mock data
    const videoId = extractYouTubeVideoId(url);
    return mockYouTubeMetadata(videoId);
  }
}

/**
 * Ingest a YouTube video (download + process)
 * Phase 13.5: NO MOCK FALLBACK - returns real response or throws error
 */
export async function ingestYouTubeVideo(request: IngestYouTubeRequest): Promise<IngestYouTubeResponse> {
  const response = await fetch(`${API_BASE}/ingest/youtube`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ingestion failed: ${response.status} - ${errorText}`);
  }
  const result = await response.json();
  console.log('[IngestionAPI] YouTube ingestion started:', result);
  return result;
}

// ============================================================================
// File Upload API
// ============================================================================

/**
 * Upload a local video file for ingestion
 * Phase 13.5: NO MOCK FALLBACK - returns real response or throws error
 */
export async function uploadVideoFile(
  file: File,
  sport: string = 'basketball',
  onProgress?: (progress: number) => void
): Promise<IngestYouTubeResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('sport', sport);

  const xhr = new XMLHttpRequest();

  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const result = JSON.parse(xhr.responseText);
        console.log('[IngestionAPI] Video upload complete:', result);
        resolve(result);
      } else {
        reject(new Error(`Upload failed: ${xhr.status} - ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Upload failed: network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.open('POST', `${API_BASE}/ingest/video`);
    xhr.send(formData);
  });
}

// ============================================================================
// URL / Vimeo API
// ============================================================================

/**
 * Detect URL source type
 */
function detectUrlSourceType(url: string): 'vimeo' | 'direct' | 'unknown' {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('vimeo.com')) {
    return 'vimeo';
  }

  // Check for direct video file extensions
  if (lowerUrl.match(/\.(mp4|mov|avi|mkv|webm|m4v)(\?|$)/)) {
    return 'direct';
  }

  return 'unknown';
}

/**
 * Extract Vimeo video ID from URL
 */
function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch metadata for a URL (Vimeo oEmbed or HEAD request for direct links)
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const sourceType = detectUrlSourceType(url);

  if (sourceType === 'vimeo') {
    return fetchVimeoMetadata(url);
  } else {
    return fetchDirectLinkMetadata(url, sourceType);
  }
}

/**
 * Fetch Vimeo metadata via oEmbed API
 */
async function fetchVimeoMetadata(url: string): Promise<UrlMetadata> {
  try {
    const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      throw new Error(`Vimeo oEmbed failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      url,
      sourceType: 'vimeo',
      title: data.title,
      author: data.author_name,
      thumbnailUrl: data.thumbnail_url,
      duration: data.duration,
      viewCount: undefined, // oEmbed doesn't provide view count
    };
  } catch (error) {
    console.warn('[IngestionAPI] Vimeo metadata fetch failed, using mock:', error);
    const videoId = extractVimeoId(url) || 'unknown';
    return mockVimeoMetadata(url, videoId);
  }
}

/**
 * Fetch metadata for direct video links via HEAD request
 */
async function fetchDirectLinkMetadata(url: string, sourceType: 'direct' | 'unknown'): Promise<UrlMetadata> {
  try {
    // Try a HEAD request to get content-type and content-length
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      throw new Error(`HEAD request failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || undefined;
    const contentLength = response.headers.get('content-length');
    const fileSize = contentLength ? parseInt(contentLength, 10) : undefined;

    // Extract filename from URL
    const urlPath = new URL(url).pathname;
    const filename = urlPath.split('/').pop() || 'video';

    return {
      url,
      sourceType,
      title: filename,
      fileSize,
      contentType,
    };
  } catch (error) {
    console.warn('[IngestionAPI] Direct link metadata fetch failed, using mock:', error);
    return mockDirectLinkMetadata(url, sourceType);
  }
}

/**
 * Ingest video from URL (Vimeo or direct link)
 * Phase 13.5: NO MOCK FALLBACK - returns real response or throws error
 */
export async function ingestFromUrl(request: IngestUrlRequest): Promise<IngestUrlResponse> {
  const response = await fetch(`${API_BASE}/ingest/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`URL ingestion failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('[IngestionAPI] URL ingestion started:', result);
  return result;
}

// ============================================================================
// Job Monitoring API
// ============================================================================

/**
 * Fetch all ingestion jobs from backend
 * Phase 13.5: NO MOCK FALLBACK - returns real data or throws error
 */
export async function fetchIngestionJobs(): Promise<IngestionJob[]> {
  const response = await fetch(`${API_BASE}/games`);
  if (!response.ok) {
    throw new Error(`Failed to fetch jobs: ${response.status}`);
  }
  const data = await response.json();
  console.log('[IngestionAPI] Fetched', data.games?.length || 0, 'games from backend');
  // Transform games to IngestionJob format
  return (data.games || []).map(gameToIngestionJob);
}

/**
 * Fetch game status by ID
 */
export async function fetchGameStatus(gameId: string): Promise<GameStatusResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/games/${gameId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch game: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn('[IngestionAPI] Fetching game status failed:', error);
    return null;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractYouTubeVideoId(url: string): string {
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : 'unknown';
}

function gameToIngestionJob(game: {
  id: string;
  sport: string;
  status: string;
  video_path?: string;
  processing_status?: string;
}): IngestionJob {
  const status = (game.processing_status || game.status || 'queued') as IngestionJobStatus;
  const filename = game.video_path?.split('/').pop() || `game_${game.id.slice(0, 8)}.mp4`;

  return {
    id: game.id,
    gameId: game.id,
    source: 'upload',
    status,
    progress: getProgressForStatus(status),
    stage: getStageForStatus(status),
    videoFilename: filename,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function getProgressForStatus(status: IngestionJobStatus): number {
  const progressMap: Record<IngestionJobStatus, number> = {
    queued: 0,
    downloading: 20,
    uploading: 30,
    processing: 50,
    processing_skilldna: 70,
    generating_clips: 85,
    completed: 100,
    failed: 0,
  };
  return progressMap[status] || 0;
}

function getStageForStatus(status: IngestionJobStatus): string {
  const stageMap: Record<IngestionJobStatus, string> = {
    queued: 'Waiting in queue...',
    downloading: 'Downloading video...',
    uploading: 'Uploading to server...',
    processing: 'YOLOv8s Detection + ByteTrack Tracking',
    processing_skilldna: 'Generating SkillDNA profiles...',
    generating_clips: 'Extracting video clips...',
    completed: 'Processing complete',
    failed: 'Processing failed',
  };
  return stageMap[status] || 'Unknown';
}

// ============================================================================
// Mock Data
// ============================================================================

function mockYouTubeMetadata(videoId: string): YouTubeMetadata {
  return {
    videoId,
    title: `NBA Basketball Highlights - ${videoId}`,
    duration: 600, // 10 minutes
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    channel: 'NBA Official',
    viewCount: 1234567,
  };
}

function mockYouTubeSearchResults(query: string): YouTubeSearchResponse {
  const mockVideos: YouTubeSearchResult[] = [
    {
      videoId: 'dQw4w9WgXcQ',
      title: `NBA Foul Highlights 2024 - ${query}`,
      description: 'Watch the most controversial foul calls from the 2024 NBA season. Expert analysis of referee decisions.',
      thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      thumbnailHigh: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      channel: 'NBA Official',
      publishedAt: '2024-11-15T10:00:00Z',
      duration: 'PT12M45S',
    },
    {
      videoId: 'JxoQ2lQyeOA',
      title: `Basketball Referee Training - ${query}`,
      description: 'Complete guide to basketball officiating mechanics and positioning.',
      thumbnailUrl: 'https://img.youtube.com/vi/JxoQ2lQyeOA/mqdefault.jpg',
      thumbnailHigh: 'https://img.youtube.com/vi/JxoQ2lQyeOA/hqdefault.jpg',
      channel: 'Referee Academy',
      publishedAt: '2024-10-22T15:30:00Z',
      duration: 'PT8M30S',
    },
    {
      videoId: 'V7C318DgjFY',
      title: `Lakers vs Celtics Full Game - ${query}`,
      description: 'Full game highlights from the epic rivalry matchup.',
      thumbnailUrl: 'https://img.youtube.com/vi/V7C318DgjFY/mqdefault.jpg',
      thumbnailHigh: 'https://img.youtube.com/vi/V7C318DgjFY/hqdefault.jpg',
      channel: 'NBA',
      publishedAt: '2024-11-20T02:00:00Z',
      duration: 'PT15M12S',
    },
    {
      videoId: 'XfR9iY5y94s',
      title: `Controversial Calls Compilation - ${query}`,
      description: 'Analysis of questionable referee calls that changed game outcomes.',
      thumbnailUrl: 'https://img.youtube.com/vi/XfR9iY5y94s/mqdefault.jpg',
      thumbnailHigh: 'https://img.youtube.com/vi/XfR9iY5y94s/hqdefault.jpg',
      channel: 'Basketball Breakdown',
      publishedAt: '2024-11-18T08:45:00Z',
      duration: 'PT6M22S',
    },
    {
      videoId: 'sNPKxoN6BJc',
      title: `NCAA Tournament Highlights - ${query}`,
      description: 'March Madness best moments and clutch plays.',
      thumbnailUrl: 'https://img.youtube.com/vi/sNPKxoN6BJc/mqdefault.jpg',
      thumbnailHigh: 'https://img.youtube.com/vi/sNPKxoN6BJc/hqdefault.jpg',
      channel: 'NCAA Basketball',
      publishedAt: '2024-03-25T20:00:00Z',
      duration: 'PT10M55S',
    },
    {
      videoId: 'ZcvK4M3h6X4',
      title: `Basketball Officiating 101 - ${query}`,
      description: 'Learn the fundamentals of basketball officiating from experienced refs.',
      thumbnailUrl: 'https://img.youtube.com/vi/ZcvK4M3h6X4/mqdefault.jpg',
      thumbnailHigh: 'https://img.youtube.com/vi/ZcvK4M3h6X4/hqdefault.jpg',
      channel: 'Sports Officials Training',
      publishedAt: '2024-09-10T12:00:00Z',
      duration: 'PT22M18S',
    },
  ];

  return {
    results: mockVideos,
    totalResults: mockVideos.length,
  };
}

function mockIngestionJobs(): IngestionJob[] {
  return [
    {
      id: 'mock-job-1',
      gameId: 'mock-game-1',
      source: 'youtube',
      status: 'processing',
      progress: 45,
      stage: 'YOLOv8s Detection + ByteTrack Tracking',
      videoFilename: 'nba_lakers_vs_celtics.mp4',
      title: 'Lakers vs Celtics - Full Game Highlights',
      duration: 720,
      thumbnailUrl: 'https://img.youtube.com/vi/example1/maxresdefault.jpg',
      createdAt: new Date(Date.now() - 300000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-job-2',
      gameId: 'mock-game-2',
      source: 'upload',
      status: 'completed',
      progress: 100,
      stage: 'Processing complete',
      videoFilename: 'local_game_footage.mp4',
      title: 'Local Scrimmage - Nov 2025',
      duration: 1800,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'mock-job-3',
      gameId: 'mock-game-3',
      source: 'youtube',
      status: 'failed',
      progress: 0,
      stage: 'Processing failed',
      videoFilename: 'failed_video.mp4',
      error: 'Video processing pipeline error: CUDA out of memory',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 6000000).toISOString(),
    },
  ];
}

function mockVimeoMetadata(url: string, videoId: string): UrlMetadata {
  return {
    url,
    sourceType: 'vimeo',
    title: `Vimeo Video ${videoId}`,
    author: 'Vimeo Creator',
    thumbnailUrl: `https://i.vimeocdn.com/video/${videoId}_640.jpg`,
    duration: 420, // 7 minutes
    viewCount: 54321,
  };
}

function mockDirectLinkMetadata(url: string, sourceType: 'direct' | 'unknown'): UrlMetadata {
  // Extract filename from URL
  let filename = 'video';
  try {
    const urlPath = new URL(url).pathname;
    filename = urlPath.split('/').pop() || 'video';
  } catch {
    // Ignore URL parsing errors
  }

  return {
    url,
    sourceType,
    title: filename,
    fileSize: 157286400, // ~150MB
    contentType: 'video/mp4',
  };
}

// ============================================================================
// Cloud Storage API (Phase 12.8)
// ============================================================================

/**
 * Detect cloud provider from URL
 */
export function detectCloudProvider(url: string): CloudProvider {
  if (!url) return 'direct';
  const lowerUrl = url.toLowerCase();

  // AWS S3 patterns
  if (lowerUrl.includes('s3.amazonaws.com') || lowerUrl.includes('.amazonaws.com/')) {
    return 's3';
  }

  // Google Cloud Storage patterns
  if (lowerUrl.includes('storage.googleapis.com') || lowerUrl.includes('storage.cloud.google.com')) {
    return 'gcs';
  }

  // Azure Blob Storage patterns
  if (lowerUrl.includes('blob.core.windows.net')) {
    return 'azure';
  }

  return 'direct';
}

/**
 * Fetch cloud storage metadata via HEAD request
 */
export async function fetchCloudMetadata(url: string): Promise<CloudMetadata> {
  const provider = detectCloudProvider(url);

  try {
    // Try a HEAD request to get content-type and content-length
    const response = await fetch(url, { method: 'HEAD' });

    if (!response.ok) {
      throw new Error(`HEAD request failed: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || undefined;
    const contentLength = response.headers.get('content-length');
    const lastModified = response.headers.get('last-modified') || undefined;
    const fileSize = contentLength ? parseInt(contentLength, 10) : undefined;

    // Extract filename from URL
    let filename = 'video';
    try {
      const urlPath = new URL(url).pathname;
      filename = urlPath.split('/').pop() || 'video';
      // Remove query params from filename if present
      filename = filename.split('?')[0];
    } catch {
      // Ignore URL parsing errors
    }

    return {
      url,
      provider,
      filename,
      fileSize,
      contentType,
      lastModified,
    };
  } catch (error) {
    console.warn('[IngestionAPI] Cloud metadata fetch failed, using mock:', error);
    return mockCloudMetadata(url, provider);
  }
}

/**
 * Ingest video from cloud storage
 * Phase 13.5: NO MOCK FALLBACK - returns real response or throws error
 */
export async function ingestFromCloud(request: IngestCloudRequest): Promise<IngestCloudResponse> {
  const response = await fetch(`${API_BASE}/ingest/cloud`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloud ingestion failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('[IngestionAPI] Cloud ingestion started:', result);
  return result;
}

/**
 * Mock cloud metadata for development
 */
function mockCloudMetadata(url: string, provider: CloudProvider): CloudMetadata {
  let filename = 'video.mp4';
  try {
    const urlPath = new URL(url).pathname;
    filename = urlPath.split('/').pop() || 'video.mp4';
    filename = filename.split('?')[0];
  } catch {
    // Ignore URL parsing errors
  }

  return {
    url,
    provider,
    filename,
    fileSize: 524288000, // ~500MB
    contentType: 'video/mp4',
    lastModified: new Date().toISOString(),
  };
}
