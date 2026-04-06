#!/usr/bin/env python3
"""Generate Mark's Quick Start Guide PDF"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# Colors
DARK_BLUE = HexColor('#0F3D52')
TEAL = HexColor('#2AA198')
TEXT = HexColor('#1A2F3A')
TEXT_SOFT = HexColor('#4A5E6A')
LIGHT_BG = HexColor('#E6F2F7')
WHITE = HexColor('#FFFFFF')

# Styles
title_style = ParagraphStyle('Title', fontName='Helvetica-Bold', fontSize=18, textColor=DARK_BLUE, spaceAfter=4, alignment=TA_CENTER)
subtitle_style = ParagraphStyle('Subtitle', fontName='Helvetica', fontSize=9, textColor=TEXT_SOFT, spaceAfter=12, alignment=TA_CENTER)
section_style = ParagraphStyle('Section', fontName='Helvetica-Bold', fontSize=11, textColor=DARK_BLUE, spaceBefore=10, spaceAfter=4)
body_style = ParagraphStyle('Body', fontName='Helvetica', fontSize=8.5, textColor=TEXT, leading=12, spaceAfter=2)
bullet_style = ParagraphStyle('Bullet', fontName='Helvetica', fontSize=8.5, textColor=TEXT, leading=12, leftIndent=12, spaceAfter=1)
step_style = ParagraphStyle('Step', fontName='Helvetica', fontSize=8.5, textColor=TEXT, leading=12, leftIndent=12, spaceAfter=1)
tip_style = ParagraphStyle('Tip', fontName='Helvetica-Oblique', fontSize=8, textColor=TEAL, leftIndent=12, spaceAfter=2)
footer_style = ParagraphStyle('Footer', fontName='Helvetica-Bold', fontSize=9, textColor=TEAL, alignment=TA_CENTER, spaceBefore=8)
status_name = ParagraphStyle('StatusName', fontName='Helvetica-Bold', fontSize=8.5, textColor=DARK_BLUE)
status_desc = ParagraphStyle('StatusDesc', fontName='Helvetica', fontSize=8.5, textColor=TEXT)

doc = SimpleDocTemplate(
    '/Users/brianbruce/Documents/Chattanoogacleanwater/Mark-Quick-Start-Guide.pdf',
    pagesize=letter,
    topMargin=0.5*inch,
    bottomMargin=0.4*inch,
    leftMargin=0.6*inch,
    rightMargin=0.6*inch,
)

story = []

# Title
story.append(Paragraph('Chattanooga Clean Water', title_style))
story.append(Paragraph('Quick Start Guide', subtitle_style))
story.append(HRFlowable(width='100%', thickness=2, color=TEAL, spaceAfter=8))

# Getting Started
story.append(Paragraph('Getting Started', section_style))
story.append(Paragraph('<b>Admin Dashboard:</b> chattanoogacleanwater.com/admin.html', bullet_style))
story.append(Paragraph('Log in with the shared password. This is your home base for leads, live chat, and analytics.', bullet_style))

# How Leads Come In
story.append(Paragraph('How Leads Come In', section_style))
story.append(Paragraph('<b>1. Form Submission</b> -- Visitor fills out the form on the landing page (name + email or phone). It appears in your Leads table automatically.', step_style))
story.append(Paragraph('<b>2. Chat Escalation</b> -- Visitor chats with the AI assistant, then requests to talk to a real person. They enter their name and phone number. <b>You get a TEXT MESSAGE on your phone instantly.</b>', step_style))
story.append(Paragraph('<b>3. Callback Request</b> -- If you are set to "Away" or don\'t respond within 2 minutes, the visitor can schedule via Calendly or request a "call back anytime."', step_style))

# Responding to Live Chats
story.append(Paragraph('Responding to Live Chats', section_style))
story.append(Paragraph('1. You receive a text: "New chat request from [Name] on Chattanooga Clean Water"', step_style))
story.append(Paragraph('2. Go to <b>chattanoogacleanwater.com/admin.html</b> and log in', step_style))
story.append(Paragraph('3. In the <b>Live Chats</b> section, you will see a card with status "Waiting"', step_style))
story.append(Paragraph('4. Click the card to open the conversation', step_style))
story.append(Paragraph('5. Click <b>"Join Chat"</b> -- the visitor sees "A water quality specialist has joined"', step_style))
story.append(Paragraph('6. Type your replies in the message box -- the visitor sees them in real time', step_style))
story.append(Paragraph('7. When done, click <b>"Close Chat"</b>', step_style))
story.append(Spacer(1, 4))
story.append(Paragraph('<b>If you can\'t respond:</b> Click "Unavailable" to send them to Calendly, or just don\'t respond -- after 2 minutes the system automatically offers the callback option.', bullet_style))

# Setting Your Availability
story.append(Paragraph('Setting Your Availability', section_style))
story.append(Paragraph('In the Live Chats section, there is an <b>Available / Away</b> toggle switch.', bullet_style))
story.append(Paragraph('<b>Available</b> (green): Visitors who request a person will wait for you + you get a text.', bullet_style))
story.append(Paragraph('<b>Away</b>: Visitors immediately get the Calendly/callback option. No text sent to you.', bullet_style))
story.append(Paragraph('TIP: Toggle to Away when you are in meetings, after hours, or on the road.', tip_style))

# Managing Leads
story.append(Paragraph('Managing Leads', section_style))
story.append(Paragraph('The Leads table shows all leads with name, contact info, and status. Click <b>"Edit"</b> on any lead to update status, add notes, or delete. Use the search bar and filters to find specific leads.', bullet_style))

# Lead Statuses - as a table
story.append(Paragraph('Lead Statuses', section_style))

status_data = [
    [Paragraph('<b>Status</b>', status_name), Paragraph('<b>Meaning</b>', status_name)],
    [Paragraph('New', status_name), Paragraph('Just came in, hasn\'t been contacted', status_desc)],
    [Paragraph('Contacted', status_name), Paragraph('You\'ve reached out', status_desc)],
    [Paragraph('Qualified', status_name), Paragraph('Interested and a good fit', status_desc)],
    [Paragraph('Closed-Won', status_name), Paragraph('They bought!', status_desc)],
    [Paragraph('Closed-Lost', status_name), Paragraph('Didn\'t convert', status_desc)],
    [Paragraph('Calendly', status_name), Paragraph('Scheduled a callback via Calendly', status_desc)],
    [Paragraph('Callback', status_name), Paragraph('Requested a callback at any time', status_desc)],
]

status_table = Table(status_data, colWidths=[1.2*inch, 5*inch])
status_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), LIGHT_BG),
    ('TEXTCOLOR', (0, 0), (-1, 0), DARK_BLUE),
    ('FONTSIZE', (0, 0), (-1, -1), 8.5),
    ('TOPPADDING', (0, 0), (-1, -1), 3),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.5, HexColor('#DDE4E7')),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, HexColor('#F7FAFB')]),
]))
story.append(status_table)

# Dashboard Analytics
story.append(Paragraph('Dashboard Analytics', section_style))
story.append(Paragraph('Top stats show total leads + breakdown by A/B variant. The Analytics section shows page views, leads, and conversion rate (toggle 7-day or 30-day views). The <b>A/B Test Performance</b> table shows which form variant converts best. The <b>AI Conversations</b> section shows what people are asking the chatbot -- use this to understand common questions and craft your messaging.', bullet_style))

# Footer
story.append(Spacer(1, 8))
story.append(HRFlowable(width='100%', thickness=1, color=TEAL, spaceAfter=6))
story.append(Paragraph('Questions? Text Brian. Let\'s get some leads!', footer_style))

doc.build(story)
print('PDF created successfully!')
