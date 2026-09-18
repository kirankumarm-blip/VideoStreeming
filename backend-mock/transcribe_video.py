import os
import sys
import json
import argparse
import traceback
import subprocess
import soundfile as sf
import numpy as np
import imageio_ffmpeg
import urllib.parse
import urllib.request

FFMPEG_EXE = imageio_ffmpeg.get_ffmpeg_exe()
FFMPEG_DIR = os.path.dirname(FFMPEG_EXE)
os.environ['PATH'] = FFMPEG_DIR + os.pathsep + os.environ.get('PATH', '')

def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    int_secs = int(secs)
    millis = int(round((secs - int_secs) * 1000))
    if millis >= 1000:
        int_secs += 1
        millis = 0
    return f"{hours:02d}:{minutes:02d}:{int_secs:02d}.{millis:03d}"

def generate_vtt_content(cues):
    lines = ["WEBVTT", ""]
    for i, cue in enumerate(cues):
        start_str = format_timestamp(cue['start'])
        end_str = format_timestamp(cue['end'])
        lines.append(str(cue.get('id', i + 1)))
        lines.append(f"{start_str} --> {end_str}")
        lines.append(cue.get('text', '').strip())
        lines.append("")
    return "\n".join(lines)

import concurrent.futures

def batch_translate_texts(texts, target_lang):
    """Translate a list of text strings efficiently in chunks"""
    if not texts or target_lang == 'en':
        return texts
    
    results = []
    chunk_size = 25
    for i in range(0, len(texts), chunk_size):
        chunk = texts[i:i + chunk_size]
        combined = "\n".join(chunk)
        try:
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_lang}&dt=t&q={urllib.parse.quote(combined)}"
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5.0) as response:
                res_data = json.loads(response.read().decode('utf-8'))
                translated_text = ''.join([item[0] for item in res_data[0] if item and item[0]])
                translated_lines = translated_text.split('\n')
                if len(translated_lines) == len(chunk):
                    results.extend([t.strip() or c for t, c in zip(translated_lines, chunk)])
                else:
                    results.extend(chunk)
        except Exception:
            results.extend(chunk)
    return results

def translate_cues(source_cues, target_lang):
    if not source_cues or target_lang == 'en':
        return source_cues
    
    raw_texts = [c.get('text', '').strip() for c in source_cues]
    translated_texts = batch_translate_texts(raw_texts, target_lang)
    
    translated_cues = []
    for idx, cue in enumerate(source_cues):
        t_text = translated_texts[idx] if idx < len(translated_texts) else cue.get('text', '')
        translated_cues.append({
            'id': cue['id'],
            'start': cue['start'],
            'end': cue['end'],
            'speaker': cue.get('speaker', 'Instructor'),
            'text': t_text or cue.get('text', '')
        })
    return translated_cues

def main():
    parser = argparse.ArgumentParser(description="Video speech transcriber and multilingual subtitle generator")
    parser.add_argument("--video", required=True, help="Path to input video file")
    parser.add_argument("--output_dir", required=True, help="Directory to output VTT files")
    parser.add_argument("--model", default="tiny", help="Whisper model size")
    args = parser.parse_args()

    video_path = os.path.abspath(args.video)
    output_dir = os.path.abspath(args.output_dir)
    os.makedirs(output_dir, exist_ok=True)

    if not os.path.exists(video_path):
        print(json.dumps({"success": False, "error": f"Video file not found: {video_path}"}))
        sys.exit(1)

    temp_wav = os.path.join(output_dir, f"temp_audio_{os.getpid()}.wav")

    try:
        # 1. Extract 16kHz mono audio directly
        extract_cmd = [
            FFMPEG_EXE, '-y', '-i', video_path,
            '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
            temp_wav
        ]
        subprocess.run(extract_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

        # 2. Read audio
        audio_data, sample_rate = sf.read(temp_wav, dtype='float32')
        if len(audio_data.shape) > 1:
            audio_data = audio_data.mean(axis=1)

        total_duration = float(len(audio_data)) / float(sample_rate) if sample_rate > 0 else 0.0

        # 3. Transcribe with Whisper
        import torch
        import whisper
        torch.set_num_threads(min(8, os.cpu_count() or 4))
        
        model = whisper.load_model(args.model)
        transcribe_result = model.transcribe(
            audio_data,
            fp16=False,
            beam_size=1,
            best_of=1,
            temperature=0.0,
            condition_on_previous_text=False
        )

        detected_lang = transcribe_result.get('language', 'en')
        raw_segments = transcribe_result.get('segments', [])

        source_cues = []
        for idx, seg in enumerate(raw_segments):
            start = round(float(seg.get('start', 0.0)), 2)
            end = round(float(seg.get('end', 0.0)), 2)
            text = seg.get('text', '').strip()
            if text:
                source_cues.append({
                    'id': idx + 1,
                    'start': start,
                    'end': end,
                    'speaker': 'Instructor',
                    'text': text
                })

        # If audio had no detected speech, generate continuous cues across the video
        if not source_cues:
            cue_dur = 4.0
            num_cues = max(1, int(np.ceil(total_duration / cue_dur))) if total_duration > 0 else 10
            for i in range(num_cues):
                s = round(i * cue_dur, 2)
                e = round(min(total_duration or (num_cues * cue_dur), (i + 1) * cue_dur), 2)
                source_cues.append({
                    'id': i + 1,
                    'start': s,
                    'end': e,
                    'speaker': 'Instructor',
                    'text': f"Audio section {i + 1}"
                })

        # 4. Generate en, hi, kn, te in parallel
        target_languages = ['en', 'hi', 'kn', 'te']
        transcripts = {}
        vtt_files = {}

        def process_lang(lang):
            if detected_lang == lang or lang == 'en':
                cues = source_cues
            else:
                cues = translate_cues(source_cues, lang)
            
            vtt_content = generate_vtt_content(cues)
            vtt_path = os.path.join(output_dir, f"{lang}.vtt")
            with open(vtt_path, 'w', encoding='utf-8') as f:
                f.write(vtt_content)
            return lang, cues, vtt_path

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            future_to_lang = {executor.submit(process_lang, lang): lang for lang in target_languages}
            for future in concurrent.futures.as_completed(future_to_lang):
                lang, cues, vtt_path = future.result()
                transcripts[lang] = cues
                vtt_files[lang] = vtt_path

        output = {
            "success": True,
            "detected_language": detected_lang,
            "duration": total_duration,
            "transcripts": transcripts,
            "vttFiles": vtt_files
        }
        print(json.dumps(output))

    except Exception as e:
        err_msg = str(e)
        trace = traceback.format_exc()
        print(json.dumps({
            "success": False,
            "error": err_msg,
            "traceback": trace
        }))
        sys.exit(1)
    finally:
        if os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except Exception:
                pass

if __name__ == "__main__":
    main()
