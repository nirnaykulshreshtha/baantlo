from typing import Tuple


def normalize_email(value: str) -> str:
    if not isinstance(value, str):
        value = str(value)
    return value.strip().lower()


def normalize_phone_e164(value: str) -> str:
    if not isinstance(value, str):
        value = str(value)
    s = (
        value.replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )
    if s.startswith("+"):
        digits = s[1:]
        if not digits.isdigit():
            raise ValueError("invalid_phone")
        if s.startswith("+91") and len(digits) == 12:
            return s
        if s.startswith("+91") and len(digits) == 10:
            return "+91" + digits
        if s.startswith("+91") and len(digits) == 11 and digits.startswith("0"):
            return "+91" + digits[1:]
        raise ValueError("unsupported_region")
    digits = ''.join(ch for ch in s if ch.isdigit())
    if len(digits) == 10 and digits[0] in {"6", "7", "8", "9"}:
        return "+91" + digits
    if len(digits) == 11 and digits.startswith("0"):
        d = digits[1:]
        if len(d) == 10 and d[0] in {"6", "7", "8", "9"}:
            return "+91" + d
    if digits.startswith("91") and len(digits) == 12:
        return "+" + digits
    raise ValueError("invalid_phone")


