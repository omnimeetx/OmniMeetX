"""
OmniMeetX - Transactional email HTML.
User-supplied values are HTML-escaped so nobody can inject markup into mail
sent from our domain.
"""
from html import escape


def verification_email(full_name: str, otp_code: str) -> str:
    return f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body {{ margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #111827; color: #ffffff; }}
    .email-wrapper {{ padding: 40px 20px; background: radial-gradient(ellipse at top left, rgba(56, 189, 248, 0.12) 0%, transparent 50%), radial-gradient(ellipse at top right, rgba(168, 85, 247, 0.12) 0%, transparent 50%), radial-gradient(ellipse at bottom, rgba(16, 185, 129, 0.12) 0%, transparent 50%), #111827; }}
    .container {{ max-width: 600px; margin: 0 auto; background-color: rgba(31, 41, 55, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; overflow: hidden; }}
    .header {{ padding: 40px 40px 20px; text-align: center; }}
    .logo {{ font-size: 24px; font-weight: 800; letter-spacing: -0.025em; background: linear-gradient(to right, #60a5fa, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 24px; }}
    .content {{ padding: 0 40px 40px; text-align: center; }}
    h1 {{ font-size: 28px; font-weight: 700; margin-bottom: 16px; color: #ffffff; }}
    p {{ font-size: 16px; line-height: 1.6; color: #9ca3af; margin-bottom: 32px; }}
    .otp-code {{ font-size: 32px; font-weight: 800; letter-spacing: 0.1em; color: #38bdf8; background: rgba(56, 189, 248, 0.1); padding: 16px 24px; border-radius: 12px; display: inline-block; margin-bottom: 32px; border: 1px solid rgba(56, 189, 248, 0.2); }}
    .footer {{ padding: 24px 40px; background-color: rgba(17, 24, 39, 0.5); border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; font-size: 14px; color: #6b7280; }}
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="container">
      <div class="header"><div class="logo">OmniMeetX</div></div>
      <div class="content">
        <h1>Verify Your Email</h1>
        <p>Hello {escape(full_name or "")},</p>
        <p>Please use the following verification code to complete your signup process. This code will expire in 10 minutes.</p>
        <div class="otp-code">{otp_code}</div>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      </div>
      <div class="footer">&copy; 2026 OmniMeetX. Built with ❤️ for productivity.</div>
    </div>
  </div>
</body>
</html>
    """


def _reset_email(title: str, heading: str, full_name: str, intro: str, link: str, button_label: str, button_gradient: str) -> str:
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>{title}</title>
<style>body{{margin:0;padding:0;font-family:Inter,sans-serif;background-color:#111827;color:#fff}}.email-wrapper{{padding:40px 20px;background:#111827}}.container{{max-width:600px;margin:0 auto;background-color:rgba(31,41,55,0.7);border:1px solid rgba(255,255,255,0.1);border-radius:24px;overflow:hidden}}.header{{padding:40px 40px 20px;text-align:center}}.logo{{font-size:24px;font-weight:800;background:linear-gradient(to right,#60a5fa,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:24px}}.content{{padding:0 40px 40px;text-align:center}}h1{{font-size:28px;font-weight:700;margin-bottom:16px;color:#fff}}p{{font-size:16px;line-height:1.6;color:#9ca3af;margin-bottom:32px}}.button{{display:inline-block;padding:16px 32px;background:{button_gradient};color:#fff!important;text-decoration:none;border-radius:12px;font-weight:600;font-size:16px}}.footer{{padding:24px 40px;background-color:rgba(17,24,39,0.5);border-top:1px solid rgba(255,255,255,0.05);text-align:center;font-size:14px;color:#6b7280}}</style></head>
<body><div class="email-wrapper"><div class="container"><div class="header"><div class="logo">OmniMeetX</div></div><div class="content"><h1>{heading}</h1><p>Hello {escape(full_name or "")},</p><p>{intro}</p><div style="margin-bottom:32px"><a href="{escape(link, quote=True)}" class="button">{button_label}</a></div><p>This link will expire in 1 hour.</p></div><div class="footer">&copy; 2026 OmniMeetX.</div></div></div></body></html>"""


def password_reset_email(full_name: str, reset_link: str) -> str:
    return _reset_email(
        "Reset Your Password", "Password Reset Request", full_name,
        "We received a request to reset your password.",
        reset_link, "Reset My Password", "linear-gradient(to right,#ef4444,#f87171)",
    )


def pin_reset_email(full_name: str, reset_link: str) -> str:
    return _reset_email(
        "Reset Your PIN", "PIN Reset Request", full_name,
        "We received a request to reset your security PIN.",
        reset_link, "Reset Security PIN", "linear-gradient(to right,#3b82f6,#8b5cf6)",
    )


def contact_inquiry_email(name: str, email: str, subject: str, message: str) -> str:
    name, email, subject, message = (escape(v or "") for v in (name, email, subject, message))
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>New Contact: {subject}</title></head>
<body style="margin:0;padding:40px;font-family:Inter,sans-serif;background:#111827;color:#fff">
<div style="max-width:600px;margin:0 auto;background:rgba(31,41,55,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:24px;overflow:hidden">
<div style="padding:40px;text-align:center"><div style="font-size:24px;font-weight:800;color:#60a5fa;margin-bottom:24px">OmniMeetX</div><h1 style="font-size:28px;color:#fff">New Contact Message</h1></div>
<div style="padding:0 40px 40px"><p><b>From:</b> {name}</p><p><b>Email:</b> {email}</p><p><b>Subject:</b> {subject}</p><div style="padding:20px;background:rgba(17,24,39,0.4);border-radius:12px;color:#d1d5db;white-space:pre-wrap">{message}</div></div>
<div style="padding:24px 40px;background-color:rgba(17,24,39,0.5);border-top:1px solid rgba(255,255,255,0.05);text-align:center;font-size:14px;color:#6b7280">&copy; 2026 OmniMeetX</div></div></body></html>"""


def meeting_notes_email(meeting_title: str, body: str) -> str:
    meeting_title, body = escape(meeting_title or ""), escape(body or "")
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>{meeting_title}</title></head>
<body style="margin:0;padding:40px;font-family:Inter,sans-serif;background:#111827;color:#fff">
<div style="max-width:800px;margin:0 auto;background:rgba(31,41,55,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:32px;overflow:hidden">
<div style="padding:48px 48px 32px"><div style="font-size:20px;font-weight:800;color:#60a5fa;margin-bottom:24px">OmniMeetX</div><h1 style="font-size:32px;font-weight:800;color:#fff">{meeting_title}</h1></div>
<div style="padding:0 48px 48px"><div style="padding:32px;background:rgba(17,24,39,0.4);border:1px solid rgba(255,255,255,0.05);border-radius:20px;font-size:16px;line-height:1.8;color:#d1d5db;white-space:pre-wrap">{body}</div></div>
<div style="padding:32px 48px;background-color:rgba(17,24,39,0.6);border-top:1px solid rgba(255,255,255,0.05);text-align:center;font-size:14px;color:#6b7280">Generated by OmniMeetX</div></div></body></html>"""


def feedback_notification_email(kind: str, message: str, user_email: str, page_url: str) -> str:
    kind, message, user_email, page_url = (escape(v or "") for v in (kind, message, user_email, page_url))
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>New feedback</title></head>
<body style="margin:0;padding:32px;font-family:Inter,sans-serif;background:#111827;color:#fff">
<div style="max-width:600px;margin:0 auto;background:rgba(31,41,55,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px">
<div style="font-size:20px;font-weight:800;color:#60a5fa;margin-bottom:16px">OmniMeetX · New {kind}</div>
<p><b>From:</b> {user_email or "unknown"}</p><p><b>Page:</b> {page_url or "-"}</p>
<div style="padding:16px;background:rgba(17,24,39,0.5);border-radius:12px;color:#d1d5db;white-space:pre-wrap">{message}</div></div></body></html>"""


def feature_request_email(title: str, description: str, user_email: str) -> str:
    title, description, user_email = (escape(v or "") for v in (title, description, user_email))
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>New feature request</title></head>
<body style="margin:0;padding:32px;font-family:Inter,sans-serif;background:#111827;color:#fff">
<div style="max-width:600px;margin:0 auto;background:rgba(31,41,55,0.8);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:32px">
<div style="font-size:20px;font-weight:800;color:#60a5fa;margin-bottom:16px">OmniMeetX · New feature request</div>
<h2 style="margin:0 0 12px">{title}</h2><p><b>From:</b> {user_email or "unknown"}</p>
<div style="padding:16px;background:rgba(17,24,39,0.5);border-radius:12px;color:#d1d5db;white-space:pre-wrap">{description or "(no description)"}</div></div></body></html>"""
