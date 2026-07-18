import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform, Linking } from 'react-native';
import Video from 'react-native-video';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

export default function PlayerScreen({ route, navigation }) {
  const { t } = useLanguage();
  const videoId = route.params;

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const videoRef = useRef(null);
  const trackingDataRef = useRef({
    isNewSession: true,
    watchTime: 0,
    pausedCount: 0,
    forwardedCount: 0,
    backwardCount: 0
  });

  const idRef = useRef(videoId);
  const videoRefData = useRef(null);
  const isPlayingRef = useRef(isPlaying);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);

  useEffect(() => {
    idRef.current = videoId;
  }, [videoId]);

  useEffect(() => {
    videoRefData.current = video;
  }, [video]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Load video details
  useEffect(() => {
    loadVideoDetails();
  }, [videoId]);

  // Track watchTime increment every second
  useEffect(() => {
    let timer = null;
    if (isPlaying) {
      timer = setInterval(() => {
        trackingDataRef.current.watchTime += 1;
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying]);

  // Cleanup/unmount watch tracking hook
  useEffect(() => {
    return () => {
      saveProgressOnExit();
    };
  }, []);

  const loadVideoDetails = async () => {
    setLoading(true);
    try {
      // Fetch details from UserDashboard endpoint
      const res = await api.dashboard.getUserDashboard('Dashboard');
      const data = Array.isArray(res) ? (res[0] || {}) : (res || {});
      const allVideos = [
        ...(data.recommended || []),
        ...(data.trending || []),
        ...(data.top_rated || data.topRated || []),
        ...(data.new_lessons || data.newVideos || [])
      ];
      const match = allVideos.find(v => v.id === videoId);
      if (match) {
        setVideo(match);
      } else {
        Alert.alert('Error', 'Video details not found');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeInSeconds) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const saveProgressOnExit = async () => {
    const id = idRef.current;
    const currentVideo = videoRefData.current;
    const pos = Math.round(currentTimeRef.current);
    const dur = Math.round(durationRef.current || 300);
    const watchSecs = trackingDataRef.current.watchTime;

    if (!id || pos <= 0) return;

    const title = currentVideo?.title || 'Video';
    const rawThumb = currentVideo?.thumbnail || currentVideo?.thumbnailUrl || currentVideo?.thumbnail_url || '';
    const rawVideoUrl = currentVideo?.videoUrl || currentVideo?.video_url || '';

    // 1. Call watchHistory API if watched >= 1s
    if (watchSecs >= 1) {
      try {
        await api.dashboard.trackWatchHistory({
          id,
          title,
          thumbnail: rawThumb,
          video_url: rawVideoUrl
        });
      } catch (err) {
        console.error("Failed to save watchHistory", err);
      }
    }

    // 2. Call watchsession API on exit
    if (watchSecs > 0) {
      try {
        await api.dashboard.trackWatchSession({
          id,
          videoid: id,
          videoId: id,
          lastPosition: pos,
          lastPositionTime: formatTime(pos),
          duration: formatTime(dur),
          isNewSession: trackingDataRef.current.isNewSession,
          watchTime: formatTime(watchSecs),
          pausedCount: trackingDataRef.current.pausedCount,
          forwardedCount: trackingDataRef.current.forwardedCount,
          backwardCount: trackingDataRef.current.backwardCount,
          title,
          thumbnail: rawThumb,
          video_url: rawVideoUrl
        });
      } catch (err) {
        console.error("Failed to save watchsession", err);
      }
    }
  };

  const handleVideoCompleted = async () => {
    setIsPlaying(false);
    
    const id = idRef.current;
    const currentVideo = videoRefData.current;
    const pos = Math.round(durationRef.current);
    const dur = Math.round(durationRef.current || 300);
    const watchSecs = trackingDataRef.current.watchTime;

    if (!id) return;

    // Call watchsession API on completion
    try {
      await api.dashboard.trackWatchSession({
        id,
        videoid: id,
        videoId: id,
        lastPosition: pos,
        lastPositionTime: formatTime(pos),
        duration: formatTime(dur),
        isNewSession: trackingDataRef.current.isNewSession,
        watchTime: formatTime(watchSecs),
        pausedCount: trackingDataRef.current.pausedCount,
        forwardedCount: trackingDataRef.current.forwardedCount,
        backwardCount: trackingDataRef.current.backwardCount,
        title: currentVideo?.title || 'Video',
        thumbnail: currentVideo?.thumbnail || currentVideo?.thumbnailUrl || currentVideo?.thumbnail_url || '',
        video_url: currentVideo?.videoUrl || currentVideo?.video_url || ''
      });
      // Clear watchTime to prevent duplicate calls on unmount
      trackingDataRef.current.watchTime = 0;
      trackingDataRef.current.isNewSession = false;
    } catch (err) {
      console.error(err);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    trackingDataRef.current.pausedCount += 1;
  };

  const handleSeekForward = () => {
    if (videoRef.current) {
      const nextPos = Math.min(currentTime + 10, duration);
      videoRef.current.seek(nextPos);
      trackingDataRef.current.forwardedCount += 1;
    }
  };

  const handleSeekBackward = () => {
    if (videoRef.current) {
      const prevPos = Math.max(currentTime - 10, 0);
      videoRef.current.seek(prevPos);
      trackingDataRef.current.backwardCount += 1;
    }
  };

  const handleSaveWatchLater = async () => {
    try {
      await api.dashboard.saveWatchLater({
        id: videoId,
        title: video?.title || '',
        thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || '',
        video_url: video?.videoUrl || video?.video_url || ''
      });
      setIsSaved(true);
      Alert.alert('Success', 'Added to Watch Later');
    } catch (e) {
      Alert.alert('Error', 'Failed to save to Watch Later');
    }
  };

  const handleDownloadVideo = async () => {
    const rawVideoUrl = video?.videoUrl || video?.video_url || '';
    if (!rawVideoUrl) return;
    
    setDownloading(true);
    try {
      // Simulate file download by redirecting to browser fallback and registering metadata webhook
      await Linking.openURL(rawVideoUrl);
      
      await api.dashboard.trackDownload({
        id: videoId,
        title: video?.title || '',
        thumbnail: video?.thumbnail || video?.thumbnailUrl || video?.thumbnail_url || '',
        video_url: rawVideoUrl
      });
      Alert.alert('Success', 'Download started in browser!');
    } catch (e) {
      Alert.alert('Error', 'Download redirect failed');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#E50914" size="large" />
      </View>
    );
  }

  const rawVideoUrl = video?.videoUrl || video?.video_url || '';
  const resolvedVideoUrl = rawVideoUrl.startsWith('http') 
    ? rawVideoUrl 
    : `https://uat-02-admin-api.darpanx.com/webhook/uploads/${rawVideoUrl.split('/').pop()}`;

  return (
    <View style={styles.container}>
      <View style={styles.videoPlayerContainer}>
        {resolvedVideoUrl ? (
          <Video
            ref={videoRef}
            source={{ uri: resolvedVideoUrl }}
            style={styles.videoPlayer}
            paused={!isPlaying}
            resizeMode="contain"
            onProgress={(data) => setCurrentTime(data.currentTime)}
            onLoad={(data) => setDuration(data.duration)}
            onEnd={handleVideoCompleted}
          />
        ) : (
          <View style={styles.videoError}>
            <Text style={styles.errorText}>Video URL not available</Text>
          </View>
        )}
      </View>

      {/* Customized Video Player Controls Overlay */}
      <View style={styles.controlsContainer}>
        <View style={styles.progressRow}>
          <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${(currentTime / (duration || 1)) * 100}%` }]} />
          </View>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={handleSeekBackward} style={styles.controlBtn}>
            <Text style={styles.controlBtnText}>⏮ 10s</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={isPlaying ? handlePause : () => setIsPlaying(true)} style={styles.playPauseBtn}>
            <Text style={styles.playPauseBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSeekForward} style={styles.controlBtn}>
            <Text style={styles.controlBtnText}>10s ⏭</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.detailsContainer}>
        <Text style={styles.title}>{video?.title || 'Lesson Title'}</Text>
        <Text style={styles.metaText}>{video?.category_name || video?.videoCategory || 'Coding'}</Text>
        
        <View style={styles.authorRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>VE</Text>
          </View>
          <View>
            <Text style={styles.authorName}>VStream Education</Text>
            <Text style={styles.subscribers}>120K subscribers</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={[styles.actionBtn, isSaved && styles.actionBtnActive]} 
            onPress={handleSaveWatchLater}
          >
            <Text style={styles.actionBtnText}>{isSaved ? t('player.saved') : t('player.save')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionBtn} 
            onPress={handleDownloadVideo}
            disabled={downloading}
          >
            <Text style={styles.actionBtnText}>
              {downloading ? t('player.downloading') : t('player.download')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.descriptionCard}>
          <Text style={styles.descTitle}>Description</Text>
          <Text style={styles.descText}>
            {video?.description || 'No description provided for this lesson.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0C',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0A0A0C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayerContainer: {
    width: width,
    height: (width * 9) / 16,
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoError: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  },
  controlsContainer: {
    backgroundColor: '#121217',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#27272A',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  timeText: {
    color: '#A0A0AB',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: '#27272A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#E50914',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 32,
  },
  controlBtn: {
    padding: 8,
  },
  controlBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playPauseBtn: {
    backgroundColor: '#E50914',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseBtnText: {
    color: '#FFF',
    fontSize: 20,
  },
  detailsContainer: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  metaText: {
    color: '#71717A',
    fontSize: 12,
    marginTop: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  authorName: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  subscribers: {
    color: '#71717A',
    fontSize: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#121217',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  actionBtnActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  descriptionCard: {
    backgroundColor: '#121217',
    borderRadius: 8,
    padding: 12,
    marginBottom: 32,
  },
  descTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 6,
  },
  descText: {
    color: '#A0A0AB',
    fontSize: 13,
    lineHeight: 18,
  }
});
