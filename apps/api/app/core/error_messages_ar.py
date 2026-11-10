"""Arabic translations for API error messages.

Errors are raised with stable English text (often with dynamic ids/details). The
HTTP handlers translate the exact message when an Arabic ``Accept-Language`` is
present, while preserving the machine-readable ``code`` and ``details``. Unknown
messages intentionally fall back to English rather than hiding the real cause.
"""
from __future__ import annotations

from app.core.i18n import Locale

AR_MESSAGES: dict[str, str] = {
    "Not found": "غير موجود",
    "Unauthorized": "غير مصرّح",
    "Forbidden": "محظور",
    "Conflict": "تعارض",
    "Bad request": "طلب غير صالح",
    "A subscription is required": "يلزم اشتراك للوصول إلى هذه الميزة",
    "Usage limit reached": "بلغت حدّ الاستخدام",
    "Add your own API key in Settings to use AI": "أضف مفتاح API الخاص بك في الإعدادات لاستخدام الذكاء الاصطناعي",
    "Invalid email or password": "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    "Email already registered": "البريد الإلكتروني مسجل بالفعل",
    "Invalid or expired token": "الرمز غير صالح أو منتهي الصلاحية",
    "Expected access token": "يلزم رمز وصول",
    "Token missing subject": "الرمز لا يحتوي على هوية المستخدم",
    "User not found": "لم يتم العثور على المستخدم",
    "Session expired, please log in again": "انتهت الجلسة، يرجى تسجيل الدخول مجددًا",
    "Missing bearer token": "رمز الدخول مفقود",
    "Invalid or expired refresh token": "رمز التحديث غير صالح أو منتهي الصلاحية",
    "Not a refresh token": "هذا ليس رمز تحديث صالحًا",
    "Invalid refresh token": "رمز التحديث غير صالح",
    "Refresh token reuse detected; all sessions revoked": "تم اكتشاف إعادة استخدام رمز التحديث؛ أُلغيت كل الجلسات",
    "Refresh token expired": "انتهت صلاحية رمز التحديث",
    "Character not found": "لم يتم العثور على الشخصية",
    "Mask not found": "لم يتم العثور على القناع",
    "State not found": "لم يتم العثور على الحالة",
    "Location not found": "لم يتم العثور على المكان",
    "Pick at least two characters in this story": "اختر شخصيتين على الأقل من هذه القصة",
    "story already has a publication": "لهذه القصة منشور بالفعل",
    "cannot publish: no chapters have been pushed yet": "لا يمكن النشر: لم تُدفع أي فصول بعد",
    "cannot delete a live publication - unpublish first": "لا يمكن حذف منشور حي — ألغِ النشر أولًا",
    "read at least the first chapter before rating": "اقرأ الفصل الأول على الأقل قبل التقييم",
    "open at least one chapter before leaving a review": "افتح فصلًا واحدًا على الأقل قبل كتابة مراجعة",
    "you have already submitted a review for this story": "لقد أرسلت مراجعة لهذه القصة بالفعل",
    "open at least one chapter before sending a note": "افتح فصلًا واحدًا على الأقل قبل إرسال ملاحظة",
    "sign in to follow stories": "سجّل الدخول لمتابعة القصص",
    "not your story": "هذه القصة ليست لك",
    "not your publication": "هذا المنشور ليس لك",
    "Empty file.": "الملف فارغ.",
    "That file is not a valid image.": "هذا الملف ليس صورة صالحة.",
    "Unsupported image type - use PNG, JPEG, WEBP, or GIF.": "نوع الصورة غير مدعوم — استخدم PNG أو JPEG أو WEBP أو GIF.",
    "That code already exists - pick another.": "هذا الرمز موجود بالفعل — اختر رمزًا آخر.",
    "Enter a code.": "أدخل الرمز.",
    "That code isn't valid.": "هذا الرمز غير صالح.",
    "This code has expired.": "انتهت صلاحية هذا الرمز.",
    "This code has been fully redeemed.": "تم استهلاك هذا الرمز بالكامل.",
    "You've already redeemed this code.": "لقد استخدمت هذا الرمز بالفعل.",
    "You already have an active paid subscription - a code can't be applied on top of it.": "لديك اشتراك مدفوع نشط بالفعل — لا يمكن تطبيق رمز إضافي عليه.",
    "Code not found.": "لم يتم العثور على الرمز.",
    "Tier must be a paid tier (dev_ai or byok).": "يجب أن تكون الخطة مدفوعة (dev_ai أو byok).",
    "duration_days must be positive, or null for lifetime.": "يجب أن تكون مدة الأيام موجبة، أو فارغة للاشتراك مدى الحياة.",
    "max_uses must be positive, or null for unlimited.": "يجب أن يكون حد الاستخدام موجبًا، أو فارغًا لغير المحدود.",
    "Code must be 3-64 characters.": "يجب أن يتكون الرمز من 3 إلى 64 حرفًا.",
    "Request body exceeds size limit": "حجم الطلب يتجاوز الحد المسموح",
}


_NOUNS = {
    "story": "القصة",
    "publication": "المنشور",
    "chapter": "الفصل",
    "profile": "الملف الشخصي",
    "review": "المراجعة",
    "note": "الملاحظة",
}


def localize_error(message: str, locale: Locale) -> str:
    if locale != "ar" or not message:
        return message
    if message in AR_MESSAGES:
        return AR_MESSAGES[message]
    if message in _NOUNS:
        return f"لم يتم العثور على {_NOUNS[message]}."
    if message.startswith("Story ") and message.endswith(" not found"):
        return "لم يتم العثور على القصة."
    if message.startswith("Unknown identity layer:"):
        return "طبقة هوية غير معروفة."
    if message.startswith("chapters not found:"):
        return "بعض الفصول المطلوبة غير موجودة."
    if message.startswith("Image exceeds the "):
        return "حجم الصورة يتجاوز الحد المسموح."
    return message
