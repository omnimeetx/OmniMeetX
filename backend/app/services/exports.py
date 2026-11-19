"""
OmniMeetX - Meeting notes export (PDF and Word).
Handles RTL shaping for Urdu/Arabic and per-script font selection.
"""
import os
import json
import logging
from datetime import datetime

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from docx import Document
from docx.shared import Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH

from app.services.notes_format import text_list

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# PDF Font Registration
# ---------------------------------------------------------------------------
DEFAULT_FONTS = {}

# Windows ships these fonts; Linux servers (Docker) get DejaVu from the
# fonts-dejavu-core package, which covers Latin + Arabic script.
FONT_DIRS = [
    "C:\\Windows\\Fonts",
    "/usr/share/fonts/truetype/dejavu",
    "/usr/share/fonts/dejavu",
]

font_configs = [
    ('Arial', 'arial.ttf', 'Standard/Arabic'),
    ('DejaVuSans', 'DejaVuSans.ttf', 'Standard/Arabic (Linux)'),
    ('Nirmala', 'Nirmala.ttf', 'Indic'),
    ('MSYH', 'msyh.ttc', 'Chinese'),
    ('MSJH', 'msjh.ttc', 'Traditional Chinese'),
    ('MSGothic', 'msgothic.ttc', 'Japanese'),
    ('Gulim', 'gulim.ttc', 'Korean'),
    ('SimSun', 'simsun.ttc', 'Chinese Sim'),
]

for font_name, filename, purpose in font_configs:
    path = next((os.path.join(d, filename) for d in FONT_DIRS if os.path.exists(os.path.join(d, filename))), None)
    if not path:
        continue
    try:
        pdfmetrics.registerFont(TTFont(font_name, path))
        DEFAULT_FONTS[font_name] = font_name
        logger.info(f"Registered font: {font_name}")
    except Exception as e:
        logger.warning(f"Failed to register font {font_name}: {e}")

DEFAULT_FONT = DEFAULT_FONTS.get('Arial') or DEFAULT_FONTS.get('DejaVuSans') or 'Helvetica'


def get_font_for_text(text):
    """Detect script and return the best registered font name."""
    if not text:
        return DEFAULT_FONT
    if any('\u4e00' <= c <= '\u9fff' or '\u3040' <= c <= '\u30ff' or '\uac00' <= c <= '\ud7af' for c in text):
        return DEFAULT_FONTS.get('MSYH') or DEFAULT_FONTS.get('SimSun') or DEFAULT_FONTS.get('MSGothic') or DEFAULT_FONT
    if any('\u0900' <= c <= '\u0d7f' for c in text):
        return DEFAULT_FONTS.get('Nirmala') or DEFAULT_FONT
    return DEFAULT_FONT


def fix_text_direction(text):
    """Handle RTL text shaping for Arabic/Urdu/Hebrew."""
    if not text:
        return ""
    try:
        if any('\u0600' <= c <= '\u06FF' or '\u0750' <= c <= '\u077F' or '\u08A0' <= c <= '\u08FF' or '\u0590' <= c <= '\u05FF' for c in text):
            reshaped_text = arabic_reshaper.reshape(text)
            bidi_text = get_display(reshaped_text)
            return bidi_text
        return text
    except Exception as e:
        logger.error(f"Error in fix_text_direction: {e}")
        return text


def create_enhanced_docx(meeting, user, filepath):
    """Create Word document export."""
    doc = Document()
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Arial'
    font.size = Pt(11)

    organizer_name = user.full_name if user else "AI Assistant"
    doc.add_heading(f"Meeting Notes: {meeting.title}", 0)
    doc.add_paragraph(f"Organizer: {organizer_name}")
    doc.add_paragraph(f"File: {meeting.filename}")
    doc.add_paragraph(f"Date: {meeting.upload_date.strftime('%Y-%m-%d %H:%M')}")

    try:
        notes = json.loads(meeting.notes or '{}')
        if notes.get("summary"):
            doc.add_heading("Executive Summary", level=1)
            p = doc.add_paragraph(notes["summary"])
            if any('\u0600' <= c <= '\u06FF' for c in notes["summary"]):
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

        if notes.get("key_points"):
            doc.add_heading("Key Discussion Points", level=1)
            for point in text_list(notes.get("key_points")):
                p = doc.add_paragraph(point, style="List Bullet")
                if any('\u0600' <= c <= '\u06FF' for c in point):
                    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

        doc.add_heading("Action Items", level=1)
        action_items = text_list(notes.get("action_items"))
        if action_items:
            for item in action_items:
                p = doc.add_paragraph(item, style="List Number")
                if any('\u0600' <= c <= '\u06FF' for c in item):
                    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        else:
            doc.add_paragraph("No specific action items identified.", style="Normal")

        doc.add_heading("Decisions Made", level=1)
        decisions = text_list(notes.get("decisions"))
        if decisions:
            for decision in decisions:
                p = doc.add_paragraph(decision, style="List Bullet")
                if any('\u0600' <= c <= '\u06FF' for c in decision):
                    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        else:
            doc.add_paragraph("No formal decisions recorded.", style="Normal")

        if notes.get("sentiment"):
            doc.add_heading("Overall Sentiment", level=1)
            p = doc.add_paragraph(notes["sentiment"])
            if any('\u0600' <= c <= '\u06FF' for c in notes["sentiment"]):
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

        transcription_data = json.loads(meeting.transcription or '{}')
        transcript_text = transcription_data.get('optimized') or transcription_data.get('translated') or transcription_data.get('raw')
        if transcript_text:
            doc.add_heading("Full Transcript", level=1)
            paragraphs = transcript_text.split('\n')
            for p_text in paragraphs:
                if p_text.strip():
                    para = doc.add_paragraph(p_text.strip())
                    if any('\u0600' <= c <= '\u06FF' for c in p_text):
                        para.alignment = WD_ALIGN_PARAGRAPH.RIGHT

    except Exception as e:
        doc.add_paragraph(f"Error parsing notes: {str(e)}")
        logger.error(f"Word generation error: {e}")

    doc.save(filepath)


def create_enhanced_pdf(meeting, user, filepath):
    """Create a premium, branded PDF meeting report."""
    try:
        from reportlab.lib import colors
        from reportlab.platypus import Table, TableStyle

        doc = SimpleDocTemplate(filepath, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
        styles = getSampleStyleSheet()
        story = []

        brand_blue = colors.HexColor("#3b82f6")
        brand_gray = colors.HexColor("#6b7280")

        title_style = ParagraphStyle('PremiumTitle', parent=styles['Heading1'], fontName=DEFAULT_FONT, fontSize=28, textColor=brand_blue, spaceAfter=10, leading=34)
        subtitle_style = ParagraphStyle('PremiumSubtitle', parent=styles['Normal'], fontName=DEFAULT_FONT, fontSize=12, textColor=brand_gray, spaceAfter=30)
        heading_style = ParagraphStyle('PremiumHeading', parent=styles['Heading2'], fontName=DEFAULT_FONT, fontSize=16, textColor=brand_blue, spaceBefore=25, spaceAfter=15)
        content_style = ParagraphStyle('PremiumContent', parent=styles['Normal'], fontName=DEFAULT_FONT, fontSize=11, leading=18, textColor=colors.HexColor("#374151"))

        organizer_name = user.full_name if user else "AI Assistant"
        current_time = datetime.now()

        story.append(Paragraph("OmniMeetX", subtitle_style))
        story.append(Paragraph(meeting.title, title_style))

        meta_data = [
            [Paragraph(f"<b>Organizer:</b> {organizer_name}", content_style),
             Paragraph(f"<b>Date:</b> {current_time.strftime('%b %d, %Y')}", content_style),
             Paragraph(f"<b>Time:</b> {current_time.strftime('%I:%M %p')}", content_style)]
        ]
        t = Table(meta_data, colWidths=[180, 180, 150])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ('LEFTPADDING', (0, 0), (-1, -1), 15),
            ('RIGHTPADDING', (0, 0), (-1, -1), 15),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ]))
        story.append(t)
        story.append(Spacer(1, 30))

        try:
            notes = json.loads(meeting.notes or '{}')

            if notes.get('summary'):
                story.append(Paragraph("Executive Summary", heading_style))
                story.append(Paragraph(fix_text_direction(notes['summary']), content_style))
                story.append(Spacer(1, 10))

            if notes.get('key_points'):
                story.append(Paragraph("Key Points", heading_style))
                for point in text_list(notes.get('key_points')):
                    story.append(Paragraph(f"• {fix_text_direction(point)}", content_style))
                story.append(Spacer(1, 10))

            story.append(Paragraph("Action Items", heading_style))
            action_items = text_list(notes.get('action_items'))
            if action_items:
                for item in action_items:
                    story.append(Paragraph(f"□ {fix_text_direction(item)}", content_style))
            else:
                story.append(Paragraph("No specific actions pending.", content_style))
            story.append(Spacer(1, 10))

            decisions = notes.get('decisions')
            if decisions:
                story.append(Paragraph("Decisions Made", heading_style))
                decisions_list = text_list(decisions)
                if decisions_list:
                    for decision in decisions_list:
                        story.append(Paragraph(f"✓ {fix_text_direction(decision)}", content_style))
                else:
                    story.append(Paragraph("No formal decisions recorded.", content_style))
                story.append(Spacer(1, 10))

            if notes.get('sentiment'):
                story.append(Paragraph("Overall Sentiment", heading_style))
                story.append(Paragraph(fix_text_direction(notes['sentiment']), content_style))
                story.append(Spacer(1, 10))

            transcription_data = json.loads(meeting.transcription or '{}')
            transcript_text = transcription_data.get('optimized') or transcription_data.get('translated') or transcription_data.get('raw')
            if transcript_text:
                story.append(Paragraph("Full Transcript", heading_style))
                paragraphs = transcript_text.split('\n')
                for p in paragraphs:
                    if p.strip():
                        current_font = get_font_for_text(p)
                        is_rtl = any('\u0600' <= c <= '\u06FF' for c in p)
                        alignment = 2 if is_rtl else 0
                        dynamic_style = ParagraphStyle(f'Dynamic_{current_font}_{alignment}', parent=content_style, fontName=current_font, alignment=alignment)
                        story.append(Paragraph(fix_text_direction(p.strip()), dynamic_style))
                        story.append(Spacer(1, 8))

            story.append(Spacer(1, 40))
            footer_style = ParagraphStyle('Footer', parent=content_style, fontSize=9, textColor=brand_gray, alignment=1)
            story.append(Paragraph("Generated by OmniMeetX", footer_style))

        except Exception as e:
            story.append(Paragraph(f"Report Generation Notice: {str(e)}", content_style))
            logger.error(f"PDF content error: {e}")

        doc.build(story)
    except Exception as e:
        logger.error(f"PDF design failed: {e}")
        raise


