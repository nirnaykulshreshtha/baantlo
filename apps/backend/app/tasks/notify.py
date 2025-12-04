from smtplib import SMTP
from email.message import EmailMessage
from twilio.rest import Client
from app.core.config import settings
from app.celery_app import celery_app
import logging


@celery_app.task(name="app.tasks.notify.send_email_verify")
def send_email_verify(email: str, token: str, code: str | None = None):
    logger = logging.getLogger(__name__)
    if not settings.smtp_host or not settings.smtp_from:
        logger.warning("SMTP not configured, skipping email to %s", email)
        return False
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = email
    msg["Subject"] = "Verify your email"
    
    web_url = f"{get_frontend_base_url()}/auth/verify?token={token}"
    mobile_url = f"{settings.deep_link_scheme}://verify-email?token={token}"
    universal_url = f"https://{settings.universal_domain}/auth/verify?token={token}"
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Verify Your Email</h2>
            <p>Welcome to {settings.app_name}! Please verify your email address to complete your registration.</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{universal_url}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Verify Email
                </a>
            </div>
            
            <p>If the button doesn't work, you can also:</p>
            <ul>
                <li>Open the {settings.app_name} app and the verification screen will appear automatically</li>
                <li>Copy and paste this link in your browser: <a href="{web_url}">{web_url}</a></li>
            </ul>
    """
    
    if code:
        html_content += f"""
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 10px 0; font-weight: bold;">Or enter this verification code in the app:</p>
                <div style="font-size: 24px; font-weight: bold; color: #2563eb; letter-spacing: 4px;">{code}</div>
            </div>
        """
        msg.set_content(f"Verify your email: {universal_url}\n\nOr enter this code: {code}\n\nIf the app is installed, it will open automatically. Otherwise, use this web link: {web_url}")
    else:
        msg.set_content(f"Verify your email: {universal_url}\n\nIf the app is installed, it will open automatically. Otherwise, use this web link: {web_url}")
    
    html_content += """
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                This verification link will expire in 24 hours. If you didn't create an account, please ignore this email.
            </p>
        </div>
    </body>
    </html>
    """
    
    msg.add_alternative(html_content, subtype='html')
    
    try:
        with SMTP(settings.smtp_host, settings.smtp_port or 25) as s:
            if settings.smtp_user and settings.smtp_pass:
                s.starttls()
                s.login(settings.smtp_user, settings.smtp_pass)
            s.send_message(msg)
        logger.info("Sent verify email to %s", email)
        return True
    except Exception:
        logger.exception("Failed sending verify email to %s", email)
        return False


@celery_app.task(name="app.tasks.notify.send_email_otp")
def send_email_otp(email: str, code: str):
    logger = logging.getLogger(__name__)
    if not settings.smtp_host or not settings.smtp_from:
        logger.warning("SMTP not configured, skipping email to %s", email)
        return False
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = email
    msg["Subject"] = "Your verification code"
    msg.set_content(f"Your verification code is {code}")
    try:
        with SMTP(settings.smtp_host, settings.smtp_port or 25) as s:
            if settings.smtp_user and settings.smtp_pass:
                s.starttls()
                s.login(settings.smtp_user, settings.smtp_pass)
            s.send_message(msg)
        logger.info("Sent email OTP to %s", email)
        return True
    except Exception:
        logger.exception("Failed sending email OTP to %s", email)
        return False


@celery_app.task(name="app.tasks.notify.send_sms_otp")
def send_sms_otp(phone: str, code: str):
    if not settings.twilio_account_sid or not settings.twilio_auth_token or not settings.twilio_from_number:
        return False
    client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    client.messages.create(to=phone, from_=settings.twilio_from_number, body=f"Your OTP is {code}")
    return True


def get_frontend_base_url() -> str:
    return getattr(settings, "frontend_base_url", "http://localhost:3000")


@celery_app.task(name="app.tasks.notify.send_password_reset")
def send_password_reset(email: str, token: str):
    logger = logging.getLogger(__name__)
    if not settings.smtp_host or not settings.smtp_from:
        logger.warning("SMTP not configured, skipping email to %s", email)
        return False
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = email
    msg["Subject"] = "Reset your password"
    
    web_url = f"{get_frontend_base_url()}/auth/reset-password?token={token}"
    mobile_url = f"{settings.deep_link_scheme}://reset-password?token={token}"
    universal_url = f"https://{settings.universal_domain}/auth/reset-password?token={token}"
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Reset Your Password</h2>
            <p>You requested to reset your password. Click the button below to reset it:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{universal_url}" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Reset Password
                </a>
            </div>
            
            <p>If the button doesn't work, you can also:</p>
            <ul>
                <li>Open the {settings.app_name} app and the reset screen will appear automatically</li>
                <li>Copy and paste this link in your browser: <a href="{web_url}">{web_url}</a></li>
            </ul>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
                This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
            </p>
        </div>
    </body>
    </html>
    """
    
    msg.set_content(f"Reset your password: {universal_url}\n\nIf the app is installed, it will open automatically. Otherwise, use this web link: {web_url}")
    msg.add_alternative(html_content, subtype='html')
    
    try:
        with SMTP(settings.smtp_host, settings.smtp_port or 25) as s:
            if settings.smtp_user and settings.smtp_pass:
                s.starttls()
                s.login(settings.smtp_user, settings.smtp_pass)
            s.send_message(msg)
        logger.info("Sent password reset email to %s", email)
        return True
    except Exception:
        logger.exception("Failed sending password reset email to %s", email)
        return False


@celery_app.task(name="app.tasks.notify.send_friend_invite_email")
def send_friend_invite_email(email: str, token: str, inviter_label: str | None = None):
    logger = logging.getLogger(__name__)
    if not settings.smtp_host or not settings.smtp_from:
        logger.warning("SMTP not configured, skipping email to %s", email)
        return False
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = email
    msg["Subject"] = f"{settings.app_name}: You have a friend invite"
    web_url = f"{get_frontend_base_url()}/login"
    accept_url = f"{get_frontend_base_url()}/friends?token={token}"
    universal_url = f"https://{settings.universal_domain}/friends/accept?token={token}"
    name = inviter_label or "A user"
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#2563eb;">Friend request</h2>
        <p>{name} invited you to connect on {settings.app_name}.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="{universal_url}" style="background:#2563eb;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Accept invite</a>
        </div>
        <p>If the button doesn't work, open {settings.app_name} and the invite will appear automatically, or copy this link: <a href="{accept_url}">{accept_url}</a></p>
        <p>If you don't have an account, sign up here: <a href="{web_url}">{web_url}</a></p>
      </div>
    </body>
    </html>
    """
    msg.set_content(f"You have a friend invite on {settings.app_name}. Accept: {universal_url}\nSign in: {web_url}")
    msg.add_alternative(html_content, subtype='html')
    try:
        with SMTP(settings.smtp_host, settings.smtp_port or 25) as s:
            if settings.smtp_user and settings.smtp_pass:
                s.starttls()
                s.login(settings.smtp_user, settings.smtp_pass)
            s.send_message(msg)
        logger.info("Sent friend invite email to %s", email)
        return True
    except Exception:
        logger.exception("Failed sending friend invite email to %s", email)
        return False



@celery_app.task(name="app.tasks.notify.send_group_invite_email")
def send_group_invite_email(email: str, token: str, group_name: str, inviter_label: str | None = None):
    logger = logging.getLogger(__name__)
    if not settings.smtp_host or not settings.smtp_from:
        logger.warning("SMTP not configured, skipping email to %s", email)
        return False
    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = email
    msg["Subject"] = f"{settings.app_name}: You are invited to group {group_name}"
    web_url = f"{get_frontend_base_url()}/login"
    accept_url = f"{get_frontend_base_url()}/groups/accept?token={token}"
    universal_url = f"https://{settings.universal_domain}/groups/accept?token={token}"
    name = inviter_label or "A user"
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#2563eb;">Group invite</h2>
        <p>{name} invited you to join the group <b>{group_name}</b> on {settings.app_name}.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="{universal_url}" style="background:#2563eb;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Accept invite</a>
        </div>
        <p>If the button doesn't work, open {settings.app_name} and the invite will appear automatically, or copy this link: <a href="{accept_url}">{accept_url}</a></p>
        <p>If you don't have an account, sign up here: <a href="{web_url}">{web_url}</a></p>
      </div>
    </body>
    </html>
    """
    msg.set_content(f"You have a group invite to {group_name} on {settings.app_name}. Accept: {universal_url}\nSign in: {web_url}")
    msg.add_alternative(html_content, subtype='html')
    try:
        with SMTP(settings.smtp_host, settings.smtp_port or 25) as s:
            if settings.smtp_user and settings.smtp_pass:
                s.starttls()
                s.login(settings.smtp_user, settings.smtp_pass)
            s.send_message(msg)
        logger.info("Sent group invite email to %s", email)
        return True
    except Exception:
        logger.exception("Failed sending group invite email to %s", email)
        return False


@celery_app.task(name="app.tasks.notify.send_group_invite_sms")
def send_group_invite_sms(phone: str, token: str, group_name: str, inviter_label: str | None = None):
    if not settings.twilio_account_sid or not settings.twilio_auth_token or not settings.twilio_from_number:
        return False
    client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    universal_url = f"https://{settings.universal_domain}/groups/accept?token={token}"
    name = inviter_label or "A user"
    body = f"{name} invited you to join {group_name} on {settings.app_name}. Accept: {universal_url}"
    client.messages.create(to=phone, from_=settings.twilio_from_number, body=body)
    return True
