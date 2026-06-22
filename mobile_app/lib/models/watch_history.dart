import 'video.dart';

class WatchHistory {
  final String id;
  final String userId;
  final String videoId;
  final String watchDate;
  final int watchTime;
  final int lastPosition;
  final int completionPercentage;
  final String status;
  final Video? video;

  WatchHistory({
    required this.id,
    required this.userId,
    required this.videoId,
    required this.watchDate,
    required this.watchTime,
    required this.lastPosition,
    required this.completionPercentage,
    required this.status,
    this.video,
  });

  factory WatchHistory.fromJson(Map<String, dynamic> json) {
    return WatchHistory(
      id: json['id'] ?? '',
      userId: json['userId'] ?? '',
      videoId: json['videoId'] ?? '',
      watchDate: json['watchDate'] ?? '',
      watchTime: json['watchTime'] ?? 0,
      lastPosition: json['lastPosition'] ?? 0,
      completionPercentage: json['completionPercentage'] ?? 0,
      status: json['status'] ?? 'unwatched',
      video: json['video'] != null ? Video.fromJson(json['video']) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'videoId': videoId,
      'watchDate': watchDate,
      'watchTime': watchTime,
      'lastPosition': lastPosition,
      'completionPercentage': completionPercentage,
      'status': status,
      'video': video?.toJson(),
    };
  }
}
