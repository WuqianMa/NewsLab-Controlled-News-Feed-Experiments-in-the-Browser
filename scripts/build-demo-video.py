#!/usr/bin/env python3
"""Build the NewsLab function tour from real browser captures."""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

try:
    import imageio_ffmpeg
except ImportError as exc:
    raise SystemExit(
        "Install imageio-ffmpeg first: pip install --target /tmp/newslab-video imageio-ffmpeg"
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / ".video-work"
OUTPUT = ROOT / "public" / "demo"
WIDTH, HEIGHT = 1920, 1080
FPS = 30

BG = "#0d1119"
PANEL = "#171e2b"
WHITE = "#f7f8fa"
MUTED = "#aeb8c7"
TEAL = "#5fd0bd"
YELLOW = "#f4c95d"
CORAL = "#ef7f6d"


SCENES = [
    {
        "image": "01-dashboard.png",
        "stage": "OVERVIEW",
        "title": "One controlled research workflow",
        "points": ["Configure the study", "Run the participant experience", "Review structured records"],
        "narration": "NewsLab turns a research plan into a controlled, browser-based news-feed study.",
    },
    {
        "image": "02-experiment.png",
        "stage": "CONFIGURE",
        "title": "Define the experiment",
        "points": ["Assignment and sample targets", "Consent and completion rules", "Condition-specific feed controls"],
        "narration": "Researchers configure assignment, sample targets, consent, completion, and condition-specific feed controls in one experiment workspace.",
    },
    {
        "image": "03-content.png",
        "stage": "CONFIGURE",
        "title": "Control the stimuli",
        "points": ["Write or import articles", "Build approved content sets", "Fix or randomize item order"],
        "narration": "Articles become approved content sets, with direct control over the sequence delivered to each condition.",
    },
    {
        "image": "04-generate.png",
        "stage": "CONFIGURE",
        "title": "Review generated variants",
        "points": ["Optional LLM providers", "Template-based transformations", "Side-by-side human review"],
        "narration": "Optional AI providers can propose article variants. Every result enters a side-by-side human review before approval.",
    },
    {
        "image": "07-welcome.png",
        "stage": "EXPERIENCE",
        "title": "Begin with consent",
        "points": ["Study-specific information", "Explicit consent checks", "Condition assignment on entry"],
        "narration": "Participants enter through study-specific consent, then continue into the experience assigned to their condition.",
        "mobile": True,
    },
    {
        "image": "08-feed.png",
        "stage": "EXPERIENCE",
        "title": "Run the news feed",
        "points": ["Vertical, grid, or full-screen", "Open articles and react", "Resume from checkpoints"],
        "narration": "The responsive feed supports scrolling, article views, and like, share, or save controls while recording each interaction.",
        "mobile": True,
    },
    {
        "image": "10-survey.png",
        "stage": "EXPERIENCE",
        "title": "Continue to the survey",
        "points": ["Likert questions", "Single-choice questions", "Optional free text"],
        "narration": "The configured survey follows naturally, supporting Likert, choice, and optional free-text questions.",
        "mobile": True,
    },
    {
        "image": "05-participants.png",
        "stage": "OBSERVE",
        "title": "Monitor the study",
        "points": ["Status and completion", "Condition summaries", "Preview records kept separate"],
        "narration": "Back in the researcher workspace, participant and session summaries show progress while keeping preview records separate.",
    },
    {
        "image": "06-export.png",
        "stage": "EXPORT",
        "title": "Export structured files",
        "points": ["Events and participants", "Item exposures and surveys", "Included data dictionary"],
        "narration": "Finally, NewsLab exports events, participants, exposures, and survey responses as structured CSV files with a data dictionary. Researchers define the questions; NewsLab runs the workflow.",
    },
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        Path("/System/Library/Fonts/SFNS.ttf"),
        Path("/System/Library/Fonts/SFNSDisplay.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default()


FONT_LABEL = font(24, True)
FONT_TITLE = font(68, True)
FONT_POINT = font(31)
FONT_BRAND = font(30, True)
FONT_SMALL = font(21)


def wrapped_lines(draw: ImageDraw.ImageDraw, text: str, chosen_font, max_width: int):
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        trial = f"{current} {word}".strip()
        if current and draw.textbbox((0, 0), trial, font=chosen_font)[2] > max_width:
            lines.append(current)
            current = word
        else:
            current = trial
    if current:
        lines.append(current)
    return lines


def fit_inside(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    result = image.copy()
    result.thumbnail(box, Image.Resampling.LANCZOS)
    return result


def add_screenshot(canvas: Image.Image, source: Path, mobile: bool):
    shot = Image.open(source).convert("RGB")
    if mobile:
        target = fit_inside(shot, (500, 880))
        x = 1260 + (500 - target.width) // 2
        y = 100 + (880 - target.height) // 2
        frame_box = (x - 18, y - 18, x + target.width + 18, y + target.height + 18)
    else:
        target = fit_inside(shot, (1080, 760))
        x = 750 + (1080 - target.width) // 2
        y = 175 + (760 - target.height) // 2
        frame_box = (x - 14, y - 14, x + target.width + 14, y + target.height + 14)

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(frame_box, radius=12, fill=(0, 0, 0, 155))
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))
    canvas.alpha_composite(shadow)

    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(frame_box, radius=9, fill=PANEL, outline="#3a4659", width=2)
    canvas.paste(target.convert("RGBA"), (x, y))


def render_scene(index: int, scene: dict) -> Path:
    canvas = Image.new("RGBA", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(canvas)

    # Keep the presentation scaffold identical between scenes. Only content changes.
    draw.rectangle((0, 0, 34, HEIGHT), fill=TEAL)
    draw.rectangle((34, 0, 42, HEIGHT), fill=CORAL)
    draw.text((100, 70), "NEWSLAB", font=FONT_BRAND, fill=WHITE)
    draw.text((285, 76), "/ BUILD WEEK PITCH", font=FONT_SMALL, fill=MUTED)
    draw.text((100, 135), scene["stage"], font=FONT_LABEL, fill=TEAL)
    draw.text((578, 139), f"{index + 1:02d} / {len(SCENES):02d}", font=FONT_SMALL, fill=MUTED)

    title_y = 200
    for line in wrapped_lines(draw, scene["title"], FONT_TITLE, 570):
        draw.text((100, title_y), line, font=FONT_TITLE, fill=WHITE)
        title_y += 82

    point_y = max(470, title_y + 45)
    colors = (TEAL, YELLOW, CORAL)
    for point_index, point in enumerate(scene["points"]):
        color = colors[point_index % len(colors)]
        draw.rectangle((102, point_y + 11, 120, point_y + 29), fill=color)
        for line in wrapped_lines(draw, point, FONT_POINT, 535):
            draw.text((145, point_y), line, font=FONT_POINT, fill=WHITE)
            point_y += 42
        point_y += 24

    add_screenshot(canvas, WORK / scene["image"], bool(scene.get("mobile")))

    segment_width = (WIDTH - 200) / len(SCENES)
    for segment in range(len(SCENES)):
        x1 = int(100 + segment * segment_width)
        x2 = int(100 + (segment + 1) * segment_width - 8)
        draw.rounded_rectangle((x1, 1018, x2, 1028), radius=5, fill=TEAL if segment <= index else "#354052")

    path = WORK / f"scene-{index + 1:02d}.png"
    canvas.convert("RGB").save(path, quality=95)
    return path


def audio_duration(ffmpeg: str, audio: Path) -> float:
    result = subprocess.run([ffmpeg, "-i", str(audio)], capture_output=True, text=True)
    match = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", result.stderr)
    if not match:
        raise RuntimeError("Could not read narration duration")
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def subtitle_timestamp(seconds: float) -> str:
    milliseconds = max(0, round(seconds * 1000))
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    whole_seconds, milliseconds = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{whole_seconds:02d},{milliseconds:03d}"


def caption_chunks(text: str, max_words: int = 8) -> list[str]:
    words = text.split()
    chunks: list[str] = []
    current: list[str] = []
    for word in words:
        current.append(word)
        sentence_break = word.endswith((".", "?", "!", ";"))
        if len(current) >= max_words or (sentence_break and len(current) >= 5):
            chunks.append(" ".join(current))
            current = []
    if current:
        if chunks and len(current) < 4:
            chunks[-1] = f"{chunks[-1]} {' '.join(current)}"
        else:
            chunks.append(" ".join(current))
    return chunks


def write_subtitles(audio_lengths: list[float]) -> Path:
    entries: list[str] = []
    scene_start = 0.0
    subtitle_index = 1
    for scene, scene_audio_length in zip(SCENES, audio_lengths):
        chunks = caption_chunks(scene["narration"])
        word_counts = [len(chunk.split()) for chunk in chunks]
        total_words = sum(word_counts)
        chunk_start = scene_start
        for chunk, word_count in zip(chunks, word_counts):
            chunk_duration = scene_audio_length * word_count / total_words
            chunk_end = chunk_start + chunk_duration
            entries.append(
                f"{subtitle_index}\n"
                f"{subtitle_timestamp(chunk_start)} --> {subtitle_timestamp(chunk_end)}\n"
                f"{chunk}\n"
            )
            subtitle_index += 1
            chunk_start = chunk_end
        scene_start += scene_audio_length

    subtitles = WORK / "newslab-overview.srt"
    subtitles.write_text("\n".join(entries), encoding="utf-8")
    return subtitles


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    scene_paths = [render_scene(index, scene) for index, scene in enumerate(SCENES)]

    narration_text = "\n\n".join(scene["narration"] for scene in SCENES)
    narration_txt = WORK / "narration.txt"
    narration_aiff = WORK / "narration.aiff"
    narration_txt.write_text(narration_text, encoding="utf-8")

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    scene_audio: list[Path] = []
    audio_lengths: list[float] = []
    for index, scene in enumerate(SCENES):
        scene_text = WORK / f"narration-{index + 1:02d}.txt"
        scene_aiff = WORK / f"narration-{index + 1:02d}.aiff"
        scene_text.write_text(scene["narration"], encoding="utf-8")
        subprocess.run(
            ["/usr/bin/say", "-v", "Samantha", "-r", "190", "-f", str(scene_text), "-o", str(scene_aiff)],
            check=True,
        )
        scene_audio.append(scene_aiff)
        audio_lengths.append(audio_duration(ffmpeg, scene_aiff))

    audio_inputs: list[str] = []
    for path in scene_audio:
        audio_inputs.extend(["-i", str(path)])
    audio_labels = "".join(f"[{index}:a]" for index in range(len(scene_audio)))
    subprocess.run(
        [
            ffmpeg,
            "-y",
            *audio_inputs,
            "-filter_complex",
            f"{audio_labels}concat=n={len(scene_audio)}:v=0:a=1[audio]",
            "-map",
            "[audio]",
            str(narration_aiff),
        ],
        check=True,
    )

    subtitles = write_subtitles(audio_lengths)
    durations = list(audio_lengths)
    durations[-1] += 1.5

    command = [ffmpeg, "-y"]
    for duration, path in zip(durations, scene_paths):
        command += ["-framerate", str(FPS), "-loop", "1", "-t", f"{duration:.3f}", "-i", str(path)]
    command += ["-i", str(narration_aiff)]

    filters: list[str] = []
    for index, _duration in enumerate(durations):
        filters.append(
            f"[{index}:v]scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,"
            f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={FPS},format=yuv420p[v{index}]"
        )

    video_labels = "".join(f"[v{index}]" for index in range(len(SCENES)))
    filters.append(f"{video_labels}concat=n={len(SCENES)}:v=1:a=0[sequence]")
    running = "sequence"

    subtitle_path = str(subtitles).replace("'", r"\'")
    filters.append(
        f"[{running}]subtitles=filename='{subtitle_path}':"
        "force_style='FontName=Arial,FontSize=12,PrimaryColour=&H00FFFFFF,"
        "OutlineColour=&H60000000,BackColour=&H60000000,BorderStyle=3,"
        "Outline=1,Shadow=0,Alignment=2,MarginL=45,MarginR=45,MarginV=20'[captioned]"
    )
    running = "captioned"

    audio_index = len(SCENES)
    filters.append(f"[{audio_index}:a]apad=pad_dur=3[audio]")
    total_duration = sum(durations)
    output_video = OUTPUT / "newslab-overview.mp4"
    command += [
        "-filter_complex", ";".join(filters),
        "-map", f"[{running}]",
        "-map", "[audio]",
        "-t", f"{total_duration:.3f}",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        str(output_video),
    ]
    subprocess.run(command, check=True)

    poster = Image.open(scene_paths[0]).convert("RGB")
    poster.thumbnail((1280, 720), Image.Resampling.LANCZOS)
    poster.save(OUTPUT / "newslab-overview-poster.png", optimize=True)

    shutil.copy2(narration_txt, OUTPUT / "newslab-overview-transcript.txt")
    shutil.copy2(subtitles, OUTPUT / "newslab-overview.srt")
    print(f"Wrote {output_video} ({total_duration:.1f}s)")


if __name__ == "__main__":
    main()
