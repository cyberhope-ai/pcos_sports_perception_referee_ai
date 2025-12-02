/**
 * Phase 12.6: Ingestion Zustand Store
 *
 * Global state management for video ingestion workflows
 */

import { create } from 'zustand';
import type { IngestionJob, YouTubeMetadata, UrlMetadata, CloudMetadata, YouTubeSearchResult } from '../api/refquestIngestionApi';
import {
  fetchYouTubeMetadata,
  ingestYouTubeVideo,
  uploadVideoFile,
  fetchIngestionJobs,
  fetchUrlMetadata as fetchUrlMetadataApi,
  ingestFromUrl as ingestFromUrlApi,
  fetchCloudMetadata as fetchCloudMetadataApi,
  ingestFromCloud as ingestFromCloudApi,
  searchYouTubeVideos,
} from '../api/refquestIngestionApi';
import { emitPcosEvent, HUMAN_ACTOR, SYSTEM_ACTOR } from '../pcos/pcosEventBus';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parse ISO 8601 duration format (PT1H2M3S) to seconds
 */
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// ============================================================================
// PCOS Event Types for Ingestion
// ============================================================================

export const INGESTION_EVENTS = {
  STARTED: 'OFFICIATING.INGESTION.STARTED',
  DOWNLOAD_COMPLETE: 'OFFICIATING.INGESTION.DOWNLOAD_COMPLETE',
  UPLOAD_PROGRESS: 'OFFICIATING.INGESTION.UPLOAD_PROGRESS',
  PROCESSING: 'OFFICIATING.INGESTION.PROCESSING',
  FINISHED: 'OFFICIATING.INGESTION.FINISHED',
  FAILED: 'OFFICIATING.INGESTION.FAILED',
  METADATA_FETCHED: 'OFFICIATING.INGESTION.METADATA_FETCHED',
  // URL-specific events (Phase 12.7)
  URL_STARTED: 'OFFICIATING.INGESTION.URL.STARTED',
  URL_METADATA_FETCHED: 'OFFICIATING.INGESTION.URL.METADATA_FETCHED',
  URL_DOWNLOAD_COMPLETE: 'OFFICIATING.INGESTION.URL.DOWNLOAD_COMPLETE',
  URL_COMPLETED: 'OFFICIATING.INGESTION.URL.COMPLETED',
  // Cloud-specific events (Phase 12.8)
  CLOUD_STARTED: 'OFFICIATING.INGESTION.CLOUD.STARTED',
  CLOUD_METADATA_FETCHED: 'OFFICIATING.INGESTION.CLOUD.METADATA_FETCHED',
  CLOUD_DOWNLOAD_COMPLETE: 'OFFICIATING.INGESTION.CLOUD.DOWNLOAD_COMPLETE',
  CLOUD_PROCESSED: 'OFFICIATING.INGESTION.CLOUD.PROCESSED',
  CLOUD_COMPLETED: 'OFFICIATING.INGESTION.CLOUD.COMPLETED',
} as const;

// ============================================================================
// Types
// ============================================================================

type IngestionTab = 'youtube' | 'upload' | 'url' | 'cloud' | 'monitor';

interface IngestionState {
  // Active tab
  activeTab: IngestionTab;

  // YouTube search state
  searchQuery: string;
  searchResults: YouTubeSearchResult[];
  isSearching: boolean;
  searchNextPageToken: string | null;
  selectedSearchResult: YouTubeSearchResult | null;

  // YouTube ingestion state
  youtubeUrl: string;
  youtubeMetadata: YouTubeMetadata | null;
  isLoadingMetadata: boolean;
  isIngesting: boolean;

  // File upload state
  selectedFile: File | null;
  uploadProgress: number;
  isUploading: boolean;

  // URL ingestion state (Phase 12.7)
  urlInput: string;
  urlMetadata: UrlMetadata | null;
  isLoadingUrlMetadata: boolean;
  isIngestingUrl: boolean;

  // Cloud ingestion state (Phase 12.8)
  cloudUrlInput: string;
  cloudMetadata: CloudMetadata | null;
  isLoadingCloudMetadata: boolean;
  isIngestingCloud: boolean;

  // Jobs state
  jobs: IngestionJob[];
  isLoadingJobs: boolean;
  pollingInterval: ReturnType<typeof setInterval> | null;

  // Current job (for navigation after completion)
  currentJobId: string | null;

  // Error state
  error: string | null;

  // Actions
  setActiveTab: (tab: IngestionTab) => void;
  // YouTube search actions
  setSearchQuery: (query: string) => void;
  searchYouTube: () => Promise<void>;
  loadMoreResults: () => Promise<void>;
  selectSearchResult: (result: YouTubeSearchResult) => void;
  clearSearchResults: () => void;
  // YouTube URL actions
  setYoutubeUrl: (url: string) => void;
  fetchMetadata: () => Promise<void>;
  clearMetadata: () => void;
  ingestYoutube: () => Promise<string | null>;
  setSelectedFile: (file: File | null) => void;
  startUpload: () => Promise<string | null>;
  // URL actions (Phase 12.7)
  setUrlInput: (url: string) => void;
  fetchUrlMetadata: () => Promise<void>;
  clearUrlMetadata: () => void;
  ingestFromUrl: () => Promise<string | null>;
  // Cloud actions (Phase 12.8)
  setCloudUrlInput: (url: string) => void;
  fetchCloudMetadata: () => Promise<void>;
  clearCloudMetadata: () => void;
  ingestFromCloud: () => Promise<string | null>;
  refreshJobs: () => Promise<void>;
  startPolling: (intervalMs?: number) => void;
  stopPolling: () => void;
  getJobById: (jobId: string) => IngestionJob | undefined;
  clearError: () => void;
  clearFailedJobs: () => void;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useIngestionStore = create<IngestionState>((set, get) => ({
  // Initial state
  activeTab: 'youtube',
  // YouTube search initial state
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  searchNextPageToken: null,
  selectedSearchResult: null,
  // YouTube URL initial state
  youtubeUrl: '',
  youtubeMetadata: null,
  isLoadingMetadata: false,
  isIngesting: false,
  selectedFile: null,
  uploadProgress: 0,
  isUploading: false,
  // URL state (Phase 12.7)
  urlInput: '',
  urlMetadata: null,
  isLoadingUrlMetadata: false,
  isIngestingUrl: false,
  // Cloud state (Phase 12.8)
  cloudUrlInput: '',
  cloudMetadata: null,
  isLoadingCloudMetadata: false,
  isIngestingCloud: false,
  jobs: [],
  isLoadingJobs: false,
  pollingInterval: null,
  currentJobId: null,
  error: null,

  // Tab management
  setActiveTab: (tab) => set({ activeTab: tab }),

  // ============================================================================
  // YouTube Search Actions
  // ============================================================================

  // Set search query
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Search YouTube videos
  searchYouTube: async () => {
    const { searchQuery } = get();
    if (!searchQuery.trim()) return;

    set({ isSearching: true, error: null, searchResults: [], searchNextPageToken: null });

    try {
      const response = await searchYouTubeVideos(searchQuery);
      set({
        searchResults: response.results,
        searchNextPageToken: response.nextPageToken || null,
        isSearching: false,
      });

      // Emit PCOS event
      emitPcosEvent('OFFICIATING.INGESTION.YOUTUBE.SEARCH', {
        query: searchQuery,
        resultsCount: response.results.length,
        totalResults: response.totalResults,
      }, HUMAN_ACTOR);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      set({ error: message, isSearching: false });
    }
  },

  // Load more search results
  loadMoreResults: async () => {
    const { searchQuery, searchNextPageToken, searchResults } = get();
    if (!searchNextPageToken || !searchQuery) return;

    set({ isSearching: true, error: null });

    try {
      const response = await searchYouTubeVideos(searchQuery, 12, searchNextPageToken);
      set({
        searchResults: [...searchResults, ...response.results],
        searchNextPageToken: response.nextPageToken || null,
        isSearching: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load more results';
      set({ error: message, isSearching: false });
    }
  },

  // Select a search result (sets up for ingestion)
  selectSearchResult: (result) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${result.videoId}`;
    set({
      selectedSearchResult: result,
      youtubeUrl,
      youtubeMetadata: {
        videoId: result.videoId,
        title: result.title,
        duration: parseDuration(result.duration || 'PT0S'),
        thumbnailUrl: result.thumbnailHigh || result.thumbnailUrl,
        channel: result.channel,
      },
    });
  },

  // Clear search results
  clearSearchResults: () => set({
    searchQuery: '',
    searchResults: [],
    searchNextPageToken: null,
    selectedSearchResult: null,
  }),

  // YouTube URL management
  setYoutubeUrl: (url) => set({ youtubeUrl: url, youtubeMetadata: null, error: null }),

  // Fetch YouTube metadata
  fetchMetadata: async () => {
    const { youtubeUrl } = get();
    if (!youtubeUrl) return;

    set({ isLoadingMetadata: true, error: null });

    try {
      const metadata = await fetchYouTubeMetadata(youtubeUrl);
      set({ youtubeMetadata: metadata, isLoadingMetadata: false });

      // Emit PCOS event
      emitPcosEvent(INGESTION_EVENTS.METADATA_FETCHED, {
        url: youtubeUrl,
        videoId: metadata.videoId,
        title: metadata.title,
        duration: metadata.duration,
      }, HUMAN_ACTOR);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch metadata';
      set({ error: message, isLoadingMetadata: false });
    }
  },

  // Clear YouTube metadata
  clearMetadata: () => set({ youtubeMetadata: null, youtubeUrl: '' }),

  // Ingest YouTube video
  ingestYoutube: async () => {
    const { youtubeUrl, youtubeMetadata } = get();
    if (!youtubeUrl) return null;

    set({ isIngesting: true, error: null });

    // Emit PCOS event - Ingestion Started
    emitPcosEvent(INGESTION_EVENTS.STARTED, {
      source: 'youtube',
      url: youtubeUrl,
      title: youtubeMetadata?.title,
      duration: youtubeMetadata?.duration,
    }, HUMAN_ACTOR);

    try {
      const response = await ingestYouTubeVideo({ url: youtubeUrl, sport: 'basketball' });

      set({
        isIngesting: false,
        currentJobId: response.jobId,
        youtubeUrl: '',
        youtubeMetadata: null,
        activeTab: 'monitor',
      });

      // Emit PCOS event - Download complete (for YouTube, download is part of ingestion)
      emitPcosEvent(INGESTION_EVENTS.DOWNLOAD_COMPLETE, {
        jobId: response.jobId,
        gameId: response.gameId,
        source: 'youtube',
      }, SYSTEM_ACTOR);

      // Refresh jobs list
      get().refreshJobs();

      return response.gameId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ingestion failed';
      set({ error: message, isIngesting: false });

      // Emit PCOS event - Failed
      emitPcosEvent(INGESTION_EVENTS.FAILED, {
        source: 'youtube',
        url: youtubeUrl,
        error: message,
      }, SYSTEM_ACTOR);

      return null;
    }
  },

  // File upload management
  setSelectedFile: (file) => set({ selectedFile: file, uploadProgress: 0, error: null }),

  // Upload file
  startUpload: async () => {
    const { selectedFile: file } = get();
    if (!file) return null;

    set({ isUploading: true, uploadProgress: 0, error: null });

    // Emit PCOS event - Ingestion Started
    emitPcosEvent(INGESTION_EVENTS.STARTED, {
      source: 'upload',
      filename: file.name,
      fileSize: file.size,
      fileType: file.type,
    }, HUMAN_ACTOR);

    try {
      const response = await uploadVideoFile(file, 'basketball', (progress) => {
        set({ uploadProgress: progress });

        // Emit progress event every 25%
        if (progress % 25 === 0) {
          emitPcosEvent(INGESTION_EVENTS.UPLOAD_PROGRESS, {
            filename: file.name,
            progress,
          }, SYSTEM_ACTOR);
        }
      });

      set({
        isUploading: false,
        uploadProgress: 100,
        selectedFile: null,
        currentJobId: response.jobId,
        activeTab: 'monitor',
      });

      // Emit PCOS event - Processing
      emitPcosEvent(INGESTION_EVENTS.PROCESSING, {
        jobId: response.jobId,
        gameId: response.gameId,
        source: 'upload',
      }, SYSTEM_ACTOR);

      // Refresh jobs list
      get().refreshJobs();

      return response.gameId;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      set({ error: message, isUploading: false, uploadProgress: 0 });

      // Emit PCOS event - Failed
      emitPcosEvent(INGESTION_EVENTS.FAILED, {
        source: 'upload',
        filename: file.name,
        error: message,
      }, SYSTEM_ACTOR);

      return null;
    }
  },

  // ============================================================================
  // URL Ingestion Actions (Phase 12.7)
  // ============================================================================

  // Set URL input
  setUrlInput: (url) => set({ urlInput: url, urlMetadata: null, error: null }),

  // Fetch URL metadata (Vimeo oEmbed or HEAD for direct links)
  fetchUrlMetadata: async () => {
    const { urlInput } = get();
    if (!urlInput) return;

    set({ isLoadingUrlMetadata: true, error: null });

    try {
      const metadata = await fetchUrlMetadataApi(urlInput);
      set({ urlMetadata: metadata, isLoadingUrlMetadata: false });

      // Emit PCOS event
      emitPcosEvent(INGESTION_EVENTS.URL_METADATA_FETCHED, {
        url: urlInput,
        sourceType: metadata.sourceType,
        title: metadata.title,
        duration: metadata.duration,
      }, HUMAN_ACTOR);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch URL metadata';
      set({ error: message, isLoadingUrlMetadata: false });
    }
  },

  // Clear URL metadata
  clearUrlMetadata: () => set({ urlMetadata: null, urlInput: '' }),

  // Ingest video from URL
  ingestFromUrl: async () => {
    const { urlInput, urlMetadata } = get();
    if (!urlInput) return null;

    set({ isIngestingUrl: true, error: null });

    // Emit PCOS event - URL Ingestion Started
    emitPcosEvent(INGESTION_EVENTS.URL_STARTED, {
      source: 'url',
      url: urlInput,
      sourceType: urlMetadata?.sourceType,
      title: urlMetadata?.title,
      duration: urlMetadata?.duration,
    }, HUMAN_ACTOR);

    try {
      const response = await ingestFromUrlApi({ url: urlInput, sport: 'basketball' });

      set({
        isIngestingUrl: false,
        currentJobId: response.jobId,
        urlInput: '',
        urlMetadata: null,
        activeTab: 'monitor',
      });

      // Emit PCOS event - Download complete
      emitPcosEvent(INGESTION_EVENTS.URL_DOWNLOAD_COMPLETE, {
        jobId: response.jobId,
        gameId: response.gameId,
        source: 'url',
        sourceType: urlMetadata?.sourceType,
      }, SYSTEM_ACTOR);

      // Refresh jobs list
      get().refreshJobs();

      return response.gameId || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'URL ingestion failed';
      set({ error: message, isIngestingUrl: false });

      // Emit PCOS event - Failed
      emitPcosEvent(INGESTION_EVENTS.FAILED, {
        source: 'url',
        url: urlInput,
        error: message,
      }, SYSTEM_ACTOR);

      return null;
    }
  },

  // ============================================================================
  // Cloud Ingestion Actions (Phase 12.8)
  // ============================================================================

  // Set cloud URL input
  setCloudUrlInput: (url) => set({ cloudUrlInput: url, cloudMetadata: null, error: null }),

  // Fetch cloud metadata (HEAD request for S3/GCS/Azure)
  fetchCloudMetadata: async () => {
    const { cloudUrlInput } = get();
    if (!cloudUrlInput) return;

    set({ isLoadingCloudMetadata: true, error: null });

    try {
      const metadata = await fetchCloudMetadataApi(cloudUrlInput);
      set({ cloudMetadata: metadata, isLoadingCloudMetadata: false });

      // Emit PCOS event
      emitPcosEvent(INGESTION_EVENTS.CLOUD_METADATA_FETCHED, {
        url: cloudUrlInput,
        provider: metadata.provider,
        filename: metadata.filename,
        fileSize: metadata.fileSize,
      }, HUMAN_ACTOR);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch cloud metadata';
      set({ error: message, isLoadingCloudMetadata: false });
    }
  },

  // Clear cloud metadata
  clearCloudMetadata: () => set({ cloudMetadata: null, cloudUrlInput: '' }),

  // Ingest video from cloud storage
  ingestFromCloud: async () => {
    const { cloudUrlInput, cloudMetadata } = get();
    if (!cloudUrlInput) return null;

    set({ isIngestingCloud: true, error: null });

    // Emit PCOS event - Cloud Ingestion Started
    emitPcosEvent(INGESTION_EVENTS.CLOUD_STARTED, {
      source: 'cloud',
      url: cloudUrlInput,
      provider: cloudMetadata?.provider,
      filename: cloudMetadata?.filename,
      fileSize: cloudMetadata?.fileSize,
    }, HUMAN_ACTOR);

    try {
      const response = await ingestFromCloudApi({ url: cloudUrlInput, sport: 'basketball' });

      set({
        isIngestingCloud: false,
        currentJobId: response.jobId,
        cloudUrlInput: '',
        cloudMetadata: null,
        activeTab: 'monitor',
      });

      // Emit PCOS event - Download complete
      emitPcosEvent(INGESTION_EVENTS.CLOUD_DOWNLOAD_COMPLETE, {
        jobId: response.jobId,
        gameId: response.gameId,
        source: 'cloud',
        provider: cloudMetadata?.provider,
      }, SYSTEM_ACTOR);

      // Refresh jobs list
      get().refreshJobs();

      return response.gameId || null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cloud ingestion failed';
      set({ error: message, isIngestingCloud: false });

      // Emit PCOS event - Failed
      emitPcosEvent(INGESTION_EVENTS.FAILED, {
        source: 'cloud',
        url: cloudUrlInput,
        provider: cloudMetadata?.provider,
        error: message,
      }, SYSTEM_ACTOR);

      return null;
    }
  },

  // Refresh jobs from backend
  refreshJobs: async () => {
    set({ isLoadingJobs: true });

    try {
      const jobs = await fetchIngestionJobs();
      set({ jobs, isLoadingJobs: false });

      // Check for any newly completed jobs
      const completedJobs = jobs.filter((j) => j.status === 'completed');
      completedJobs.forEach((job) => {
        if (job.gameId) {
          emitPcosEvent(INGESTION_EVENTS.FINISHED, {
            jobId: job.id,
            gameId: job.gameId,
            source: job.source,
          }, SYSTEM_ACTOR);
        }
      });
    } catch (error) {
      console.error('[IngestionStore] Failed to refresh jobs:', error);
      set({ isLoadingJobs: false });
    }
  },

  // Start polling for job updates
  startPolling: (intervalMs = 5000) => {
    const { pollingInterval } = get();
    if (pollingInterval) return; // Already polling

    // Initial fetch
    get().refreshJobs();

    // Start interval
    const interval = setInterval(() => {
      get().refreshJobs();
    }, intervalMs);

    set({ pollingInterval: interval });
  },

  // Stop polling
  stopPolling: () => {
    const { pollingInterval } = get();
    if (pollingInterval) {
      clearInterval(pollingInterval);
      set({ pollingInterval: null });
    }
  },

  // Get job by ID
  getJobById: (jobId) => {
    const { jobs } = get();
    return jobs.find((j) => j.id === jobId);
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Clear all failed jobs from the list
  clearFailedJobs: () => {
    const { jobs } = get();
    set({ jobs: jobs.filter((j) => j.status !== 'failed') });
  },
}));

// ============================================================================
// Selectors (for more efficient component subscriptions)
// ============================================================================

export const selectActiveTab = (state: IngestionState) => state.activeTab;
export const selectYoutubeUrl = (state: IngestionState) => state.youtubeUrl;
export const selectYoutubeMetadata = (state: IngestionState) => state.youtubeMetadata;
export const selectIsLoadingMetadata = (state: IngestionState) => state.isLoadingMetadata;
export const selectIsIngesting = (state: IngestionState) => state.isIngesting;
export const selectSelectedFile = (state: IngestionState) => state.selectedFile;
export const selectUploadProgress = (state: IngestionState) => state.uploadProgress;
export const selectIsUploading = (state: IngestionState) => state.isUploading;
export const selectJobs = (state: IngestionState) => state.jobs;
export const selectIsLoadingJobs = (state: IngestionState) => state.isLoadingJobs;
export const selectError = (state: IngestionState) => state.error;

// YouTube search selectors
export const selectSearchQuery = (state: IngestionState) => state.searchQuery;
export const selectSearchResults = (state: IngestionState) => state.searchResults;
export const selectIsSearching = (state: IngestionState) => state.isSearching;
export const selectSearchNextPageToken = (state: IngestionState) => state.searchNextPageToken;
export const selectSelectedSearchResult = (state: IngestionState) => state.selectedSearchResult;

// URL selectors (Phase 12.7)
export const selectUrlInput = (state: IngestionState) => state.urlInput;
export const selectUrlMetadata = (state: IngestionState) => state.urlMetadata;
export const selectIsLoadingUrlMetadata = (state: IngestionState) => state.isLoadingUrlMetadata;
export const selectIsIngestingUrl = (state: IngestionState) => state.isIngestingUrl;

// Cloud selectors (Phase 12.8)
export const selectCloudUrlInput = (state: IngestionState) => state.cloudUrlInput;
export const selectCloudMetadata = (state: IngestionState) => state.cloudMetadata;
export const selectIsLoadingCloudMetadata = (state: IngestionState) => state.isLoadingCloudMetadata;
export const selectIsIngestingCloud = (state: IngestionState) => state.isIngestingCloud;

// Derived selectors
export const selectPendingJobs = (state: IngestionState) =>
  state.jobs.filter((j) => j.status === 'queued' || j.status === 'downloading');

export const selectActiveJobs = (state: IngestionState) =>
  state.jobs.filter((j) =>
    ['uploading', 'processing', 'processing_skilldna', 'generating_clips'].includes(j.status)
  );

export const selectCompletedJobs = (state: IngestionState) =>
  state.jobs.filter((j) => j.status === 'completed');

export const selectFailedJobs = (state: IngestionState) =>
  state.jobs.filter((j) => j.status === 'failed');
