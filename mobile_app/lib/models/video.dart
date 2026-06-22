class Video {
  final String id;
  final String title;
  final String description;
  final String category;
  final String thumbnail;
  final String videoUrl;
  final List<String> tags;
  final String visibility;
  final String uploadedBy;
  final List<String> assignedAdmins;
  final int views;
  final int duration;

  Video({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.thumbnail,
    required this.videoUrl,
    required this.tags,
    required this.visibility,
    required this.uploadedBy,
    required this.assignedAdmins,
    required this.views,
    required this.duration,
  });

  factory Video.fromJson(Map<String, dynamic> json) {
    return Video(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? '',
      thumbnail: json['thumbnail'] ?? '',
      videoUrl: json['videoUrl'] ?? '',
      tags: json['tags'] != null ? List<String>.from(json['tags']) : [],
      visibility: json['visibility'] ?? 'public',
      uploadedBy: json['uploadedBy'] ?? '',
      assignedAdmins: json['assignedAdmins'] != null
          ? List<String>.from(json['assignedAdmins'])
          : [],
      views: json['views'] ?? 0,
      duration: json['duration'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'category': category,
      'thumbnail': thumbnail,
      'videoUrl': videoUrl,
      'tags': tags,
      'visibility': visibility,
      'uploadedBy': uploadedBy,
      'assignedAdmins': assignedAdmins,
      'views': views,
      'duration': duration,
    };
  }
}
