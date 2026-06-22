import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../services/api_service.dart';
import '../models/video.dart';

class PlayerScreen extends StatefulWidget {
  final String videoId;
  const PlayerScreen({Key? key, required this.videoId}) : super(key: key);

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  VideoPlayerController? _controller;
  Video? _video;
  bool _loading = true;
  String? _error;
  
  Timer? _progressTimer;
  bool _showControls = true;
  Timer? _controlsTimer;
  
  double _playbackSpeed = 1.0;
  bool _isFullscreen = false;

  @override
  void initState() {
    super.initState();
    _loadVideo();
  }

  @override
  void dispose() {
    _progressTimer?.cancel();
    _controlsTimer?.cancel();
    _saveProgressImmediate();
    
    // Restore orientations on exit
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
    ]);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.manual, overlays: SystemUiOverlay.values);
    
    _controller?.dispose();
    super.dispose();
  }

  void _loadVideo() async {
    final api = Provider.of<ApiService>(context, listen: false);
    try {
      final v = await api.fetchVideoDetails(widget.videoId);
      _video = v;

      // Construct streaming URL: fallback to bunny sample if missing
      final srcUrl = v.videoUrl.startsWith('/uploads')
          ? '${api.baseUrl.replaceAll('/api', '')}${v.videoUrl}'
          : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

      _controller = VideoPlayerController.network(srcUrl);
      await _controller!.initialize();
      
      if (mounted) {
        setState(() => _loading = false);
        _controller!.addListener(_onPlayerUpdate);
        
        // Check for resume history
        _checkResumeHistory(api);
        
        // Start 5-second progress saving interval
        _startProgressTimer();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to stream content: $e';
          _loading = false;
        });
      }
    }
  }

  void _onPlayerUpdate() {
    if (mounted) setState(() {});
  }

  void _checkResumeHistory(ApiService api) async {
    try {
      final history = await api.fetchWatchHistory();
      final record = history.firstWhere((h) => h.videoId == widget.videoId);
      
      if (record.lastPosition > 5 && record.completionPercentage < 95 && mounted) {
        final duration = _controller!.value.duration.inSeconds;
        if (record.lastPosition < duration) {
          _showResumeDialog(record.lastPosition);
        }
      } else {
        _controller!.play();
      }
    } catch (_) {
      // No record, start playing from beginning
      _controller!.play();
    }
  }

  void _showResumeDialog(int positionSeconds) {
    final minutes = positionSeconds ~/ 60;
    final seconds = positionSeconds % 60;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1B1B22),
        title: const Text('Resume Playback', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        content: Text(
          'Would you like to resume watching from $minutes:${seconds < 10 ? '0' : ''}$seconds?',
          style: const TextStyle(color: Colors.grey),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _controller!.play();
            },
            child: const Text('Start Over', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _controller!.seekTo(Duration(seconds: positionSeconds));
              _controller!.play();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Resume'),
          ),
        ],
      ),
    );
  }

  // Periodic API Save
  void _startProgressTimer() {
    _progressTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      _saveProgressImmediate();
    });
  }

  void _saveProgressImmediate() async {
    if (_controller != null && _controller!.value.isInitialized) {
      final pos = _controller!.value.position.inSeconds;
      final dur = _controller!.value.duration.inSeconds;
      if (pos > 0) {
        final api = Provider.of<ApiService>(context, listen: false);
        try {
          await api.trackProgress(widget.videoId, pos, dur);
        } catch (e) {
          print('Failed to track progress: $e');
        }
      }
    }
  }

  // Auto hide controls helper
  void _resetControlsTimer() {
    _controlsTimer?.cancel();
    setState(() => _showControls = true);
    _controlsTimer = Timer(const Duration(seconds: 4), () {
      if (mounted && _controller != null && _controller!.value.isPlaying) {
        setState(() => _showControls = false);
      }
    });
  }

  // Speed dialog selector
  void _showSpeedSelector() {
    showDialog(
      context: context,
      builder: (context) => SimpleDialog(
        backgroundColor: const Color(0xFF1B1B22),
        title: const Text('Select Playback Speed', style: TextStyle(color: Colors.white)),
        children: [0.5, 1.0, 1.5, 2.0].map((speed) {
          return SimpleDialogOption(
            onPressed: () {
              _controller?.setPlaybackSpeed(speed);
              setState(() => _playbackSpeed = speed);
              Navigator.pop(context);
              _resetControlsTimer();
            },
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${speed}x', style: const TextStyle(color: Colors.white, fontSize: 16)),
                  if (_playbackSpeed == speed) const Icon(Icons.check, color: Colors.red),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // Fullscreen toggle
  void _toggleFullscreen() {
    setState(() {
      _isFullscreen = !_isFullscreen;
    });

    if (_isFullscreen) {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
      ]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.manual, overlays: SystemUiOverlay.values);
    }
    _resetControlsTimer();
  }

  String _formatDuration(Duration d) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    final minutes = d.inMinutes;
    final seconds = d.inSeconds.remainder(60);
    return "$minutes:${twoDigits(seconds)}";
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: Colors.black,
        body: Center(child: CircularProgressIndicator(color: Colors.red)),
      );
    }

    if (_error != null || _controller == null) {
      return Scaffold(
        backgroundColor: Colors.black,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_error ?? 'Stream error', style: const TextStyle(color: Colors.red)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                child: const Text('Back'),
              ),
            ],
          ),
        ),
      );
    }

    final val = _controller!.value;

    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTap: _resetControlsTimer,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Video Player widget
            Center(
              child: AspectRatio(
                aspectRatio: val.aspectRatio,
                child: VideoPlayer(_controller!),
              ),
            ),

            // Premium Overlay Controls
            if (_showControls)
              Container(
                color: Colors.black.withOpacity(0.5),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // TOP BAR
                    AppBar(
                      backgroundColor: Colors.transparent,
                      elevation: 0,
                      leading: IconButton(
                        icon: const Icon(Icons.arrow_back, color: Colors.white),
                        onPressed: () => Navigator.pop(context),
                      ),
                      title: Text(_video?.title ?? '', style: const TextStyle(fontSize: 16, color: Colors.white)),
                      actions: [
                        IconButton(
                          icon: const Icon(Icons.speed, color: Colors.white),
                          onPressed: _showSpeedSelector,
                          tooltip: 'Speed',
                        ),
                      ],
                    ),

                    // MIDDLE SEEK BUTTONS
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          iconSize: 48,
                          icon: const Icon(Icons.replay_10, color: Colors.white),
                          onPressed: () {
                            _controller!.seekTo(val.position - const Duration(seconds: 10));
                            _resetControlsTimer();
                          },
                        ),
                        const SizedBox(width: 32),
                        IconButton(
                          iconSize: 64,
                          icon: Icon(val.isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled, color: Colors.white),
                          onPressed: () {
                            if (val.isPlaying) {
                              _controller!.pause();
                              _progressTimer?.cancel();
                            } else {
                              _controller!.play();
                              _startProgressTimer();
                            }
                            _resetControlsTimer();
                          },
                        ),
                        const SizedBox(width: 32),
                        IconButton(
                          iconSize: 48,
                          icon: const Icon(Icons.forward_10, color: Colors.white),
                          onPressed: () {
                            _controller!.seekTo(val.position + const Duration(seconds: 10));
                            _resetControlsTimer();
                          },
                        ),
                      ],
                    ),

                    // BOTTOM BAR CONTROLS
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Time slider track
                          VideoProgressIndicator(
                            _controller!,
                            allowScrubbing: true,
                            colors: const VideoProgressColors(
                              playedColor: Colors.red,
                              bufferedColor: Colors.white24,
                              backgroundColor: Colors.white12,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '${_formatDuration(val.position)} / ${_formatDuration(val.duration)}',
                                style: const TextStyle(color: Colors.white, fontSize: 13),
                              ),
                              IconButton(
                                icon: Icon(_isFullscreen ? Icons.fullscreen_exit : Icons.fullscreen, color: Colors.white),
                                onPressed: _toggleFullscreen,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
