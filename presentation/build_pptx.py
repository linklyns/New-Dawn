#!/usr/bin/env python3
"""
Build the New Dawn INTEX presentation PowerPoint.
Section 3, Group 9
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ── Colors ──────────────────────────────────────────────────
SLATE_NAVY   = RGBColor(0x2D, 0x3A, 0x4A)
DARK_NAVY    = RGBColor(0x1A, 0x26, 0x33)
SKY_BLUE     = RGBColor(0xA2, 0xC9, 0xE1)
SAGE_GREEN   = RGBColor(0x91, 0xB1, 0x91)
GOLDEN_HONEY = RGBColor(0xFF, 0xCC, 0x66)
CORAL_PINK   = RGBColor(0xFF, 0xE6, 0xE1)
WHITE        = RGBColor(0xFF, 0xFF, 0xFF)
LIGHT_GRAY   = RGBColor(0xF5, 0xF5, 0xF5)
MED_GRAY     = RGBColor(0x99, 0x99, 0x99)
DARK_TEXT     = RGBColor(0x33, 0x33, 0x33)

prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)

W = prs.slide_width
H = prs.slide_height


# ── Helpers ─────────────────────────────────────────────────
def add_bg(slide, color):
    bg = slide.background.fill
    bg.solid()
    bg.fore_color.rgb = color


def add_shape(slide, left, top, width, height, fill=None, line_color=None, line_width=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.line.fill.background()
    if fill:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill
    if line_color:
        shape.line.color.rgb = line_color
        shape.line.width = Pt(line_width or 1)
    return shape


def add_rounded_rect(slide, left, top, width, height, fill=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.line.fill.background()
    if fill:
        shape.fill.solid()
        shape.fill.fore_color.rgb = fill
    return shape


def add_text(slide, text, left, top, width, height,
             font_size=18, color=WHITE, bold=False, alignment=PP_ALIGN.LEFT,
             font_name="Calibri", line_spacing=1.2, anchor=MSO_ANCHOR.TOP):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    txBox.text_frame.word_wrap = True
    txBox.text_frame.auto_size = None
    p = txBox.text_frame.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = color
    p.font.bold = bold
    p.font.name = font_name
    p.alignment = alignment
    p.line_spacing = Pt(int(font_size * line_spacing))
    return txBox


def add_bullet_list(slide, items, left, top, width, height,
                    font_size=16, color=WHITE, font_name="Calibri",
                    bullet_color=None, spacing=1.5):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    tf = txBox.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = item
        p.font.size = Pt(font_size)
        p.font.color.rgb = color
        p.font.name = font_name
        p.line_spacing = Pt(int(font_size * spacing))
        p.level = 0
        pPr = p._pPr
        if pPr is None:
            from pptx.oxml.ns import qn
            pPr = p._p.get_or_add_pPr()
        from pptx.oxml.ns import qn
        buNone = pPr.findall(qn("a:buNone"))
        for bn in buNone:
            pPr.remove(bn)
        # Add bullet char
        from lxml import etree
        buChar = etree.SubElement(pPr, qn("a:buChar"))
        buChar.set("char", "\u2022")
        if bullet_color:
            buClr = etree.SubElement(pPr, qn("a:buClr"))
            srgb = etree.SubElement(buClr, qn("a:srgbClr"))
            srgb.set("val", "%02X%02X%02X" % (bullet_color[0], bullet_color[1], bullet_color[2]))
    return txBox


def add_accent_line(slide, left, top, width, color=GOLDEN_HONEY, height=Pt(4)):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape


def add_slide_number(slide, num, total):
    add_text(slide, f"{num} / {total}", Inches(12.2), Inches(7.05),
             Inches(1), Inches(0.4), font_size=10, color=MED_GRAY,
             alignment=PP_ALIGN.RIGHT)


TOTAL_SLIDES = 15


# ════════════════════════════════════════════════════════════
# SLIDE 1 — TITLE
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank
add_bg(slide, DARK_NAVY)

# Accent bar top
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

# Main title
add_text(slide, "NEW DAWN", Inches(1.5), Inches(1.8), Inches(10), Inches(1.2),
         font_size=64, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER,
         font_name="Calibri Light")

add_accent_line(slide, Inches(5.5), Inches(3.1), Inches(2.3), GOLDEN_HONEY, Pt(3))

add_text(slide, "A Path to Healing and Hope", Inches(1.5), Inches(3.4), Inches(10), Inches(0.8),
         font_size=28, color=SKY_BLUE, bold=False, alignment=PP_ALIGN.CENTER,
         font_name="Calibri Light")

add_text(slide, "An intelligent safehouse management platform\nfor girls rescued from abuse and trafficking in the Philippines",
         Inches(2.5), Inches(4.3), Inches(8), Inches(1.2),
         font_size=18, color=MED_GRAY, alignment=PP_ALIGN.CENTER)

add_text(slide, "Section 3  |  Group 9", Inches(1.5), Inches(5.8), Inches(10), Inches(0.5),
         font_size=16, color=GOLDEN_HONEY, alignment=PP_ALIGN.CENTER, bold=True)

add_text(slide, "Zack Hada   |   Lincoln Lyons   |   [Team Members]",
         Inches(1.5), Inches(6.2), Inches(10), Inches(0.5),
         font_size=14, color=MED_GRAY, alignment=PP_ALIGN.CENTER)

add_slide_number(slide, 1, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 2 — THE PROBLEM
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "THE CHALLENGE", Inches(0.8), Inches(0.4), Inches(10), Inches(0.8),
         font_size=14, color=GOLDEN_HONEY, bold=True, font_name="Calibri")

add_text(slide, "Three Critical Problems", Inches(0.8), Inches(0.9), Inches(10), Inches(0.8),
         font_size=40, color=WHITE, bold=True, font_name="Calibri Light")

add_accent_line(slide, Inches(0.8), Inches(1.65), Inches(2), GOLDEN_HONEY, Pt(3))

# Problem cards
card_y = Inches(2.2)
card_h = Inches(4.5)
card_w = Inches(3.6)
gap = Inches(0.4)
start_x = Inches(0.8)

# Card 1
c1 = add_rounded_rect(slide, start_x, card_y, card_w, card_h, fill=SLATE_NAVY)
add_text(slide, "01", start_x + Inches(0.3), card_y + Inches(0.3),
         Inches(1), Inches(0.5), font_size=32, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Girls Falling Through\nthe Cracks", start_x + Inches(0.3), card_y + Inches(0.9),
         Inches(3), Inches(0.9), font_size=20, color=WHITE, bold=True)
add_text(slide, "Limited staff managing multiple safehouses can't track which girls are progressing vs. struggling. No system to predict readiness for reintegration or flag rising risk levels.",
         start_x + Inches(0.3), card_y + Inches(2.0),
         Inches(3), Inches(2.2), font_size=14, color=RGBColor(0xBB, 0xBB, 0xBB))

# Card 2
c2_x = start_x + card_w + gap
c2 = add_rounded_rect(slide, c2_x, card_y, card_w, card_h, fill=SLATE_NAVY)
add_text(slide, "02", c2_x + Inches(0.3), card_y + Inches(0.3),
         Inches(1), Inches(0.5), font_size=32, color=GOLDEN_HONEY, bold=True)
add_text(slide, "No Social Media\nStrategy", c2_x + Inches(0.3), card_y + Inches(0.9),
         Inches(3), Inches(0.9), font_size=20, color=WHITE, bold=True)
add_text(slide, "Founders post sporadically without knowing what content drives donations vs. just likes. No dedicated marketing team and no budget to hire one.",
         c2_x + Inches(0.3), card_y + Inches(2.0),
         Inches(3), Inches(2.2), font_size=14, color=RGBColor(0xBB, 0xBB, 0xBB))

# Card 3
c3_x = c2_x + card_w + gap
c3 = add_rounded_rect(slide, c3_x, card_y, card_w, card_h, fill=SLATE_NAVY)
add_text(slide, "03", c3_x + Inches(0.3), card_y + Inches(0.3),
         Inches(1), Inches(0.5), font_size=32, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Donor Retention\n& Growth", c3_x + Inches(0.3), card_y + Inches(0.9),
         Inches(3), Inches(0.9), font_size=20, color=WHITE, bold=True)
add_text(slide, "The organization depends entirely on donations but loses donors without understanding why. No way to identify at-risk supporters or personalize outreach at scale.",
         c3_x + Inches(0.3), card_y + Inches(2.0),
         Inches(3), Inches(2.2), font_size=14, color=RGBColor(0xBB, 0xBB, 0xBB))

add_slide_number(slide, 2, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 3 — OUR SOLUTION (OVERVIEW)
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "OUR SOLUTION", Inches(0.8), Inches(0.4), Inches(10), Inches(0.5),
         font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "One Platform, Three Solutions", Inches(0.8), Inches(0.9), Inches(10), Inches(0.8),
         font_size=40, color=WHITE, bold=True, font_name="Calibri Light")
add_accent_line(slide, Inches(0.8), Inches(1.65), Inches(2), GOLDEN_HONEY, Pt(3))

add_text(slide, "New Dawn is a full-stack web application that combines case management,\ndonor intelligence, and AI-powered social media tools into a single platform.",
         Inches(0.8), Inches(2.0), Inches(11), Inches(0.8),
         font_size=18, color=RGBColor(0xCC, 0xCC, 0xCC))

# Three solution boxes
sol_y = Inches(3.2)
sol_h = Inches(3.5)
sol_w = Inches(3.6)

# Solution 1
s1 = add_rounded_rect(slide, start_x, sol_y, sol_w, sol_h, fill=SLATE_NAVY)
add_shape(slide, start_x, sol_y, sol_w, Inches(0.06), fill=SAGE_GREEN)
add_text(slide, "Caseload Intelligence", start_x + Inches(0.3), sol_y + Inches(0.3),
         Inches(3), Inches(0.6), font_size=20, color=SAGE_GREEN, bold=True)
add_text(slide, "ML-powered risk prediction flags at-risk residents before they regress. Causal analysis identifies which interventions actually drive successful reintegration.",
         start_x + Inches(0.3), sol_y + Inches(1.0),
         Inches(3), Inches(1.5), font_size=14, color=RGBColor(0xBB, 0xBB, 0xBB))
add_text(slide, "Pipelines: Risk Prediction, Reintegration Causal Analysis",
         start_x + Inches(0.3), sol_y + Inches(2.7),
         Inches(3), Inches(0.6), font_size=11, color=MED_GRAY)

# Solution 2
s2_x = start_x + sol_w + gap
s2 = add_rounded_rect(slide, s2_x, sol_y, sol_w, sol_h, fill=SLATE_NAVY)
add_shape(slide, s2_x, sol_y, sol_w, Inches(0.06), fill=SKY_BLUE)
add_text(slide, "AI Social Editor", s2_x + Inches(0.3), sol_y + Inches(0.3),
         Inches(3), Inches(0.6), font_size=20, color=SKY_BLUE, bold=True)
add_text(slide, "Real-time ML predictions show expected donations, engagement, and reach as staff craft posts. Optimal posting times maximize fundraising impact.",
         s2_x + Inches(0.3), sol_y + Inches(1.0),
         Inches(3), Inches(1.5), font_size=14, color=RGBColor(0xBB, 0xBB, 0xBB))
add_text(slide, "Pipelines: Social Referrals, Best Posting Times",
         s2_x + Inches(0.3), sol_y + Inches(2.7),
         Inches(3), Inches(0.6), font_size=11, color=MED_GRAY)

# Solution 3
s3_x = s2_x + sol_w + gap
s3 = add_rounded_rect(slide, s3_x, sol_y, sol_w, sol_h, fill=SLATE_NAVY)
add_shape(slide, s3_x, sol_y, sol_w, Inches(0.06), fill=GOLDEN_HONEY)
add_text(slide, "Donor Intelligence", s3_x + Inches(0.3), sol_y + Inches(0.3),
         Inches(3), Inches(0.6), font_size=20, color=GOLDEN_HONEY, bold=True)
add_text(slide, "ML predicts donor likelihood to give again within 180 days. SHAP-driven reasons explain each prediction so staff can personalize outreach.",
         s3_x + Inches(0.3), sol_y + Inches(1.0),
         Inches(3), Inches(1.5), font_size=14, color=RGBColor(0xBB, 0xBB, 0xBB))
add_text(slide, "Pipeline: Donor Likelihood Prediction",
         s3_x + Inches(0.3), sol_y + Inches(2.7),
         Inches(3), Inches(0.6), font_size=11, color=MED_GRAY)

add_slide_number(slide, 3, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 4 — TECH DEMO INTRO
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "LIVE DEMO", Inches(1.5), Inches(2.5), Inches(10), Inches(1.2),
         font_size=56, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER,
         font_name="Calibri Light")

add_accent_line(slide, Inches(5.5), Inches(3.7), Inches(2.3), GOLDEN_HONEY, Pt(3))

add_text(slide, "new-dawn-virid.vercel.app", Inches(1.5), Inches(4.1), Inches(10), Inches(0.6),
         font_size=22, color=SKY_BLUE, alignment=PP_ALIGN.CENTER)

add_text(slide, "Landing  >  Impact Dashboard  >  Admin Dashboard  >  Caseload + ML Risk\n>  Social Editor + AI Predictions  >  Donor Intelligence  >  Reports",
         Inches(2), Inches(5.0), Inches(9), Inches(1.0),
         font_size=16, color=MED_GRAY, alignment=PP_ALIGN.CENTER)

add_slide_number(slide, 4, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 5 — DEMO: LANDING PAGE & PUBLIC EXPERIENCE
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "DEMO", Inches(0.8), Inches(0.4), Inches(2), Inches(0.5),
         font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Public Experience", Inches(0.8), Inches(0.9), Inches(10), Inches(0.8),
         font_size=36, color=WHITE, bold=True, font_name="Calibri Light")
add_accent_line(slide, Inches(0.8), Inches(1.55), Inches(1.5), GOLDEN_HONEY, Pt(3))

# Left side - talking points
add_text(slide, "What to show:", Inches(0.8), Inches(2.0), Inches(5), Inches(0.5),
         font_size=16, color=SKY_BLUE, bold=True)

items = [
    "Landing page: mission, three pillars (Caring, Healing, Teaching)",
    "Live impact stats pulled from the database",
    "Impact Dashboard with charts (residents served, outcomes, donations)",
    "Donation tiers ($25-$250/mo) with impact messaging",
    "Privacy policy (GDPR-compliant) + cookie consent banner",
    "Dark / light mode toggle (saved in browser cookie)",
    "Google OAuth login + MFA setup flow",
]
add_bullet_list(slide, items, Inches(0.8), Inches(2.5), Inches(5.5), Inches(4.5),
                font_size=15, color=RGBColor(0xCC, 0xCC, 0xCC),
                bullet_color=(0xFF, 0xCC, 0x66))

# Right side - screenshot placeholder
placeholder = add_rounded_rect(slide, Inches(7.2), Inches(1.8), Inches(5.5), Inches(4.8), fill=SLATE_NAVY)
add_text(slide, "[SCREENSHOT]\nLanding Page", Inches(7.2), Inches(3.5), Inches(5.5), Inches(1.5),
         font_size=20, color=MED_GRAY, alignment=PP_ALIGN.CENTER)

add_text(slide, "SPEAKER NOTE: Start with the public experience. Show the landing page, scroll through pillars, click Impact Dashboard, show charts. Toggle dark mode. Show privacy policy footer link. Show cookie consent.",
         Inches(0.8), Inches(6.8), Inches(11), Inches(0.6),
         font_size=10, color=RGBColor(0x66, 0x66, 0x66))

add_slide_number(slide, 5, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 6 — DEMO: ADMIN DASHBOARD
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "DEMO", Inches(0.8), Inches(0.4), Inches(2), Inches(0.5),
         font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Admin Command Center", Inches(0.8), Inches(0.9), Inches(10), Inches(0.8),
         font_size=36, color=WHITE, bold=True, font_name="Calibri Light")
add_accent_line(slide, Inches(0.8), Inches(1.55), Inches(1.5), GOLDEN_HONEY, Pt(3))

items = [
    "Admin Dashboard: active residents, recent donations, open interventions",
    "Quick-nav cards to every operational area",
    "Role-based access: Admin sees everything, Donor sees own data",
    "Full CRUD with delete confirmation modals",
    "Pagination on all list views (20 per page)",
]
add_bullet_list(slide, items, Inches(0.8), Inches(2.2), Inches(5.5), Inches(4),
                font_size=16, color=RGBColor(0xCC, 0xCC, 0xCC),
                bullet_color=(0xFF, 0xCC, 0x66))

placeholder = add_rounded_rect(slide, Inches(7.2), Inches(1.8), Inches(5.5), Inches(4.8), fill=SLATE_NAVY)
add_text(slide, "[SCREENSHOT]\nAdmin Dashboard", Inches(7.2), Inches(3.5), Inches(5.5), Inches(1.5),
         font_size=20, color=MED_GRAY, alignment=PP_ALIGN.CENTER)

add_text(slide, "SPEAKER NOTE: Log in as admin. Show dashboard overview. Highlight the quick-nav cards. Demonstrate RBAC by noting what a Donor user would see vs Admin.",
         Inches(0.8), Inches(6.8), Inches(11), Inches(0.6),
         font_size=10, color=RGBColor(0x66, 0x66, 0x66))

add_slide_number(slide, 6, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 7 — DEMO: CASELOAD + ML RISK
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "DEMO  |  SOLUTION 1", Inches(0.8), Inches(0.4), Inches(5), Inches(0.5),
         font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Caseload Intelligence", Inches(0.8), Inches(0.9), Inches(10), Inches(0.8),
         font_size=36, color=SAGE_GREEN, bold=True, font_name="Calibri Light")
add_accent_line(slide, Inches(0.8), Inches(1.55), Inches(1.5), SAGE_GREEN, Pt(3))

add_text(slide, "No more girls falling through the cracks.",
         Inches(0.8), Inches(1.9), Inches(10), Inches(0.5),
         font_size=18, color=RGBColor(0xBB, 0xBB, 0xBB))

items = [
    "Residents list with ML risk predictions (arrows when ML disagrees with stored value)",
    "Resident detail: demographics, case info, disability, family profile",
    "ML Risk Assessment card: predicted risk + confidence + top SHAP factors",
    "Reintegration Insights: causal factors from logistic regression analysis",
    "Process recordings (counseling), education, health, interventions, incidents",
    "Full case lifecycle from intake to reintegration",
]
add_bullet_list(slide, items, Inches(0.8), Inches(2.5), Inches(5.5), Inches(4),
                font_size=15, color=RGBColor(0xCC, 0xCC, 0xCC),
                bullet_color=(0x91, 0xB1, 0x91))

placeholder = add_rounded_rect(slide, Inches(7.2), Inches(1.8), Inches(5.5), Inches(4.8), fill=SLATE_NAVY)
add_text(slide, "[SCREENSHOT]\nResident Detail\nwith ML Risk Card", Inches(7.2), Inches(3.2), Inches(5.5), Inches(2),
         font_size=18, color=MED_GRAY, alignment=PP_ALIGN.CENTER)

add_text(slide, "SPEAKER NOTE: Show residents list. Point out the ML risk arrows. Click into a resident. Show the ML Risk Assessment card and Reintegration Insights. Briefly show process recordings. Emphasize that these predictions update nightly.",
         Inches(0.8), Inches(6.8), Inches(11), Inches(0.6),
         font_size=10, color=RGBColor(0x66, 0x66, 0x66))

add_slide_number(slide, 7, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 8 — DEMO: SOCIAL EDITOR (HIGHLIGHT)
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "DEMO  |  SOLUTION 2  |  HIGHLIGHT", Inches(0.8), Inches(0.4), Inches(8), Inches(0.5),
         font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "AI-Powered Social Editor", Inches(0.8), Inches(0.9), Inches(10), Inches(0.8),
         font_size=36, color=SKY_BLUE, bold=True, font_name="Calibri Light")
add_accent_line(slide, Inches(0.8), Inches(1.55), Inches(1.5), SKY_BLUE, Pt(3))

add_text(slide, "Turns a social media novice into a data-driven content strategist.",
         Inches(0.8), Inches(1.9), Inches(10), Inches(0.5),
         font_size=18, color=RGBColor(0xBB, 0xBB, 0xBB))

# Feature cards
feat_y = Inches(2.7)
feat_h = Inches(2.0)
feat_w = Inches(3.7)

# Prediction cards
f1 = add_rounded_rect(slide, Inches(0.8), feat_y, feat_w, feat_h, fill=SLATE_NAVY)
add_text(slide, "Live Predictions", Inches(1.1), feat_y + Inches(0.2),
         Inches(3.2), Inches(0.4), font_size=16, color=SKY_BLUE, bold=True)
add_text(slide, "6 real-time ML metrics update as you edit:\nDonation referrals, donation value,\nengagement rate, forwards, profile\nvisits, impressions",
         Inches(1.1), feat_y + Inches(0.7),
         Inches(3.2), Inches(1.2), font_size=13, color=RGBColor(0xBB, 0xBB, 0xBB))

f2 = add_rounded_rect(slide, Inches(4.8), feat_y, feat_w, feat_h, fill=SLATE_NAVY)
add_text(slide, "Golden Window Optimizer", Inches(5.1), feat_y + Inches(0.2),
         Inches(3.2), Inches(0.4), font_size=16, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Simulates all 168 day/hour combos\nto find the optimal posting window.\nTop 15 slots ranked by predicted\ndonation value with 1-click scheduling",
         Inches(5.1), feat_y + Inches(0.7),
         Inches(3.2), Inches(1.2), font_size=13, color=RGBColor(0xBB, 0xBB, 0xBB))

f3 = add_rounded_rect(slide, Inches(8.8), feat_y, feat_w, feat_h, fill=SLATE_NAVY)
add_text(slide, "Content Builder", Inches(9.1), feat_y + Inches(0.2),
         Inches(3.2), Inches(0.4), font_size=16, color=SAGE_GREEN, bold=True)
add_text(slide, "Platform, post type, media type,\ntopic, sentiment, CTA selector.\nCaption editor with character count.\nSchedule for any date/time.",
         Inches(9.1), feat_y + Inches(0.7),
         Inches(3.2), Inches(1.2), font_size=13, color=RGBColor(0xBB, 0xBB, 0xBB))

# Bottom emphasis
add_rounded_rect(slide, Inches(0.8), Inches(5.1), Inches(11.7), Inches(1.6), fill=SLATE_NAVY)
add_text(slide, "THE DEMO MOMENT", Inches(1.1), Inches(5.3),
         Inches(3), Inches(0.4), font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Change the platform from Instagram to LinkedIn, switch the CTA from LearnMore to DonateNow, and watch all 6 prediction cards update in real time. Then click an optimal time slot to auto-schedule. This is the feature that turns a small nonprofit with zero marketing budget into a data-driven fundraising machine.",
         Inches(1.1), Inches(5.7), Inches(11.2), Inches(0.9),
         font_size=14, color=RGBColor(0xCC, 0xCC, 0xCC))

add_text(slide, "SPEAKER NOTE: This is the star of the show. Spend 3-4 minutes here. Build a post from scratch. Change attributes and narrate the prediction changes. Show the optimal times. Click one to schedule. Emphasize: no marketing hire needed.",
         Inches(0.8), Inches(6.8), Inches(11), Inches(0.6),
         font_size=10, color=RGBColor(0x66, 0x66, 0x66))

add_slide_number(slide, 8, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 9 — DEMO: DONOR INTELLIGENCE
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "DEMO  |  SOLUTION 3", Inches(0.8), Inches(0.4), Inches(5), Inches(0.5),
         font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Donor Intelligence", Inches(0.8), Inches(0.9), Inches(10), Inches(0.8),
         font_size=36, color=GOLDEN_HONEY, bold=True, font_name="Calibri Light")
add_accent_line(slide, Inches(0.8), Inches(1.55), Inches(1.5), GOLDEN_HONEY, Pt(3))

add_text(slide, "Know your donors before they leave.",
         Inches(0.8), Inches(1.9), Inches(10), Inches(0.5),
         font_size=18, color=RGBColor(0xBB, 0xBB, 0xBB))

items = [
    "Supporters list with ML likelihood scores: High / Medium / Low",
    "SHAP-derived top reasons explain each prediction in plain language",
    "Color-coded badges for instant triage (green = likely, red = at-risk)",
    "Sort by likelihood to prioritize outreach to at-risk donors first",
    "Donor detail: full history, total lifetime value, frequency, avg gift",
    "Donation tracking across all types (monetary, in-kind, time, skills, social)",
    "Allocation view: see exactly where each dollar goes (by safehouse/program)",
]
add_bullet_list(slide, items, Inches(0.8), Inches(2.5), Inches(5.5), Inches(4.3),
                font_size=15, color=RGBColor(0xCC, 0xCC, 0xCC),
                bullet_color=(0xFF, 0xCC, 0x66))

placeholder = add_rounded_rect(slide, Inches(7.2), Inches(1.8), Inches(5.5), Inches(4.8), fill=SLATE_NAVY)
add_text(slide, "[SCREENSHOT]\nSupporters List\nwith Likelihood Badges", Inches(7.2), Inches(3.2), Inches(5.5), Inches(2),
         font_size=18, color=MED_GRAY, alignment=PP_ALIGN.CENTER)

add_text(slide, "SPEAKER NOTE: Show supporters list. Point out the likelihood badges. Click into a donor detail. Show their history and the SHAP reasons. Demonstrate sorting by likelihood. Show allocations page.",
         Inches(0.8), Inches(6.8), Inches(11), Inches(0.6),
         font_size=10, color=RGBColor(0x66, 0x66, 0x66))

add_slide_number(slide, 9, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 10 — DEMO: REPORTS & ANALYTICS
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "DEMO", Inches(0.8), Inches(0.4), Inches(2), Inches(0.5),
         font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Reports & Analytics", Inches(0.8), Inches(0.9), Inches(10), Inches(0.8),
         font_size=36, color=WHITE, bold=True, font_name="Calibri Light")
add_accent_line(slide, Inches(0.8), Inches(1.55), Inches(1.5), GOLDEN_HONEY, Pt(3))

items = [
    "Donation trends over time (monthly totals and counts)",
    "Education progress by safehouse (avg progress %, enrollment)",
    "Health & wellbeing trends (nutrition, sleep, energy, general health)",
    "Reintegration success rates per safehouse",
    "Incident summary by type and severity (pie charts)",
    "Social media post performance and platform comparison",
    "Structured to align with Philippine Annual Accomplishment Report format",
]
add_bullet_list(slide, items, Inches(0.8), Inches(2.2), Inches(5.5), Inches(4.5),
                font_size=15, color=RGBColor(0xCC, 0xCC, 0xCC),
                bullet_color=(0xFF, 0xCC, 0x66))

placeholder = add_rounded_rect(slide, Inches(7.2), Inches(1.8), Inches(5.5), Inches(4.8), fill=SLATE_NAVY)
add_text(slide, "[SCREENSHOT]\nReports Page\nwith Charts", Inches(7.2), Inches(3.2), Inches(5.5), Inches(2),
         font_size=18, color=MED_GRAY, alignment=PP_ALIGN.CENTER)

add_slide_number(slide, 10, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 11 — ML PIPELINES OVERVIEW
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "UNDER THE HOOD", Inches(0.8), Inches(0.4), Inches(5), Inches(0.5),
         font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "5 Production ML Pipelines", Inches(0.8), Inches(0.9), Inches(10), Inches(0.8),
         font_size=36, color=WHITE, bold=True, font_name="Calibri Light")
add_accent_line(slide, Inches(0.8), Inches(1.55), Inches(1.5), GOLDEN_HONEY, Pt(3))

# Pipeline table
pipelines = [
    ("1", "Donor Likelihood", "Predictive", "Gradient Boosting", "F1: 0.98, AUC: 0.98", "Supporters list badges"),
    ("2", "Social Referrals", "Explanatory + Predictive", "GBM / Ridge / LightGBM", "6 target models", "Social Editor live cards"),
    ("3", "Best Posting Times", "Predictive", "Regression", "168 day/hr combos", "Social Editor scheduler"),
    ("4", "Reintegration Causal", "Explanatory", "Logistic (statsmodels)", "Odds ratios, p<0.05", "Resident detail insights"),
    ("5", "Risk Prediction", "Predictive", "Random Forest", "Accuracy: 65%", "Residents list + detail"),
]

# Header row
header_y = Inches(2.0)
add_shape(slide, Inches(0.6), header_y, Inches(12.1), Inches(0.45), fill=SLATE_NAVY)
cols = [("#", 0.6, 0.4), ("Pipeline", 1.1, 2.2), ("Approach", 3.4, 2.2), ("Algorithm", 5.7, 2.2),
        ("Key Metric", 8.0, 2.0), ("Integration", 10.1, 2.6)]
for label, x, w in cols:
    add_text(slide, label, Inches(x), header_y + Inches(0.05), Inches(w), Inches(0.35),
             font_size=12, color=GOLDEN_HONEY, bold=True)

# Data rows
for i, (num, name, approach, algo, metric, integration) in enumerate(pipelines):
    row_y = header_y + Inches(0.5) + Inches(i * 0.55)
    bg_color = SLATE_NAVY if i % 2 == 0 else RGBColor(0x24, 0x30, 0x3E)
    add_shape(slide, Inches(0.6), row_y, Inches(12.1), Inches(0.5), fill=bg_color)
    vals = [num, name, approach, algo, metric, integration]
    for j, (label, x, w) in enumerate(cols):
        add_text(slide, vals[j], Inches(x), row_y + Inches(0.07), Inches(w), Inches(0.35),
                 font_size=12, color=WHITE if j > 0 else SKY_BLUE, bold=(j==0))

# Bottom note
add_rounded_rect(slide, Inches(0.8), Inches(5.2), Inches(11.7), Inches(1.3), fill=SLATE_NAVY)
add_text(slide, "All 5 pipelines run nightly at 2:00 AM via automated scheduler. Models serialized with joblib. Predictions served through .NET API endpoints as CSV lookups. Every pipeline follows the full lifecycle: Problem Framing > Data Prep > Exploration > Modeling > Feature Selection > Evaluation > Deployment.",
         Inches(1.1), Inches(5.4), Inches(11.2), Inches(1.0),
         font_size=14, color=RGBColor(0xBB, 0xBB, 0xBB))

add_slide_number(slide, 11, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 12 — ARCHITECTURE & SECURITY
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "ARCHITECTURE & SECURITY", Inches(0.8), Inches(0.4), Inches(8), Inches(0.5),
         font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Built for Trust", Inches(0.8), Inches(0.9), Inches(10), Inches(0.8),
         font_size=36, color=WHITE, bold=True, font_name="Calibri Light")
add_accent_line(slide, Inches(0.8), Inches(1.55), Inches(1.5), GOLDEN_HONEY, Pt(3))

# Left column - Architecture
add_text(slide, "Tech Stack", Inches(0.8), Inches(2.0), Inches(5), Inches(0.5),
         font_size=18, color=SKY_BLUE, bold=True)
arch_items = [
    "Frontend: React 19 + TypeScript + Vite + Tailwind CSS",
    "Backend: .NET 10 / C# Web API + EF Core 9",
    "Database: PostgreSQL on Supabase",
    "State: Zustand (client) + React Query (server)",
    "Charts: Recharts | Forms: react-hook-form + Zod",
    "ML: Python + scikit-learn + statsmodels + joblib",
    "Deployment: Vercel (frontend) + Cloud (backend)",
]
add_bullet_list(slide, arch_items, Inches(0.8), Inches(2.5), Inches(5.5), Inches(4),
                font_size=14, color=RGBColor(0xCC, 0xCC, 0xCC),
                bullet_color=(0xA2, 0xC9, 0xE1))

# Right column - Security
add_text(slide, "Security (IS 414)", Inches(7), Inches(2.0), Inches(5), Inches(0.5),
         font_size=18, color=SAGE_GREEN, bold=True)
sec_items = [
    "HTTPS/TLS with HTTP > HTTPS redirect",
    "ASP.NET Identity + JWT auth + custom password policy",
    "Role-Based Access Control (Admin / Donor / Public)",
    "Google OAuth third-party authentication",
    "Multi-Factor Authentication (TOTP authenticator app)",
    "Content-Security-Policy header via middleware",
    "HSTS enabled | Delete confirmation required",
    "GDPR privacy policy + functional cookie consent",
    "Data sanitization on all inputs",
    "Credentials in env vars, not in repo",
    "Real DBMS (PostgreSQL) for identity store",
]
add_bullet_list(slide, sec_items, Inches(7), Inches(2.5), Inches(5.5), Inches(4.5),
                font_size=13, color=RGBColor(0xCC, 0xCC, 0xCC),
                bullet_color=(0x91, 0xB1, 0x91))

add_slide_number(slide, 12, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 13 — RESPONSIVENESS & ACCESSIBILITY
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "QUALITY", Inches(0.8), Inches(0.4), Inches(5), Inches(0.5),
         font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Design, Responsiveness & Accessibility", Inches(0.8), Inches(0.9), Inches(10), Inches(0.8),
         font_size=34, color=WHITE, bold=True, font_name="Calibri Light")
add_accent_line(slide, Inches(0.8), Inches(1.55), Inches(1.5), GOLDEN_HONEY, Pt(3))

# Cards
cards_data = [
    ("Clean, Calming Design", "Purpose-built color palette: Sky Blue, Sage Green, Golden Honey. Designed to feel safe and professional -- not clinical. Significant whitespace, no harsh imagery. Consistent typography (Inter/Poppins headings, Montserrat body).", SKY_BLUE),
    ("Fully Responsive", "Every page tested on desktop and mobile. Tailwind CSS responsive utilities ensure layouts adapt gracefully. Navigation collapses to mobile menu. Tables scroll horizontally on small screens.", SAGE_GREEN),
    ("Accessible", "Targeting Lighthouse accessibility score >= 90 on all pages. Semantic HTML, proper ARIA labels, keyboard navigation support, sufficient color contrast ratios.", GOLDEN_HONEY),
    ("Dark Mode", "Full dark/light mode with class-based toggling. Preference stored in a browser-accessible cookie (nd_theme). React reads and applies the theme on load.", CORAL_PINK),
]

for i, (title, desc, color) in enumerate(cards_data):
    x = Inches(0.8) + Inches(i * 3.1)
    card = add_rounded_rect(slide, x, Inches(2.2), Inches(2.85), Inches(4.5), fill=SLATE_NAVY)
    add_shape(slide, x, Inches(2.2), Inches(2.85), Inches(0.06), fill=color)
    add_text(slide, title, x + Inches(0.2), Inches(2.5), Inches(2.45), Inches(0.5),
             font_size=15, color=color, bold=True)
    add_text(slide, desc, x + Inches(0.2), Inches(3.1), Inches(2.45), Inches(3.4),
             font_size=12, color=RGBColor(0xBB, 0xBB, 0xBB))

add_slide_number(slide, 13, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 14 — BUSINESS CASE / WHY INVEST
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "THE CASE FOR INVESTMENT", Inches(0.8), Inches(0.4), Inches(8), Inches(0.5),
         font_size=14, color=GOLDEN_HONEY, bold=True)
add_text(slide, "Why New Dawn Deserves\nContinued Investment", Inches(0.8), Inches(0.9), Inches(10), Inches(1.2),
         font_size=36, color=WHITE, bold=True, font_name="Calibri Light")
add_accent_line(slide, Inches(0.8), Inches(2.05), Inches(2), GOLDEN_HONEY, Pt(3))

# Left - key stats
stats = [
    ("5", "Production ML\nPipelines"),
    ("17", "Database Tables\nSeeded"),
    ("60+", "Residents\nManaged"),
    ("6", "Social Platforms\nSupported"),
]
for i, (num, label) in enumerate(stats):
    x = Inches(0.8) + Inches(i * 1.7)
    add_text(slide, num, x, Inches(2.5), Inches(1.5), Inches(0.7),
             font_size=36, color=GOLDEN_HONEY, bold=True, alignment=PP_ALIGN.CENTER)
    add_text(slide, label, x, Inches(3.2), Inches(1.5), Inches(0.8),
             font_size=12, color=MED_GRAY, alignment=PP_ALIGN.CENTER)

# Right - value props
add_text(slide, "Value Delivered", Inches(7.2), Inches(2.3), Inches(5), Inches(0.5),
         font_size=18, color=GOLDEN_HONEY, bold=True)
value_items = [
    "Replaces manual risk tracking with ML-powered early warning",
    "Eliminates guesswork from social media with real-time predictions",
    "Predicts donor lapse before it happens, enabling proactive retention",
    "Full case lifecycle management in one place for limited staff",
    "All pipelines refresh nightly -- the system gets smarter over time",
    "Built with enterprise-grade security for the most sensitive data",
]
add_bullet_list(slide, value_items, Inches(7.2), Inches(2.8), Inches(5.5), Inches(3.5),
                font_size=14, color=RGBColor(0xCC, 0xCC, 0xCC),
                bullet_color=(0xFF, 0xCC, 0x66))

add_text(slide, "\"New Dawn doesn't just manage data -- it transforms data into decisions\nthat protect girls and grow the mission.\"",
         Inches(0.8), Inches(5.8), Inches(11.5), Inches(0.8),
         font_size=18, color=SKY_BLUE, alignment=PP_ALIGN.CENTER, font_name="Calibri Light")

add_slide_number(slide, 14, TOTAL_SLIDES)


# ════════════════════════════════════════════════════════════
# SLIDE 15 — CLOSING / Q&A
# ════════════════════════════════════════════════════════════
slide = prs.slides.add_slide(prs.slide_layouts[6])
add_bg(slide, DARK_NAVY)
add_shape(slide, 0, 0, W, Inches(0.08), fill=GOLDEN_HONEY)

add_text(slide, "NEW DAWN", Inches(1.5), Inches(1.8), Inches(10), Inches(1.2),
         font_size=56, color=WHITE, bold=True, alignment=PP_ALIGN.CENTER,
         font_name="Calibri Light")

add_accent_line(slide, Inches(5.5), Inches(3.1), Inches(2.3), GOLDEN_HONEY, Pt(3))

add_text(slide, "A Path to Healing and Hope", Inches(1.5), Inches(3.4), Inches(10), Inches(0.8),
         font_size=28, color=SKY_BLUE, alignment=PP_ALIGN.CENTER, font_name="Calibri Light")

add_text(slide, "Thank You  |  Questions?", Inches(1.5), Inches(4.6), Inches(10), Inches(0.8),
         font_size=24, color=GOLDEN_HONEY, alignment=PP_ALIGN.CENTER, bold=True)

add_text(slide, "new-dawn-virid.vercel.app", Inches(1.5), Inches(5.5), Inches(10), Inches(0.5),
         font_size=18, color=MED_GRAY, alignment=PP_ALIGN.CENTER)

add_text(slide, "Section 3  |  Group 9\nZack Hada   |   Lincoln Lyons   |   [Team Members]",
         Inches(1.5), Inches(6.1), Inches(10), Inches(0.8),
         font_size=14, color=MED_GRAY, alignment=PP_ALIGN.CENTER)

add_slide_number(slide, 15, TOTAL_SLIDES)


# ── Save ────────────────────────────────────────────────────
output_path = "/Users/zackhada/Documents/coding/school/New-Dawn/presentation/New_Dawn_Presentation.pptx"
prs.save(output_path)
print(f"Saved: {output_path}")
print(f"Total slides: {len(prs.slides)}")
