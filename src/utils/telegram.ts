import { SystemSettings } from '../types.ts';

export async function sendTelegramNotification(
  settings: SystemSettings | undefined,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!settings?.telegramToken?.trim() || !settings?.telegramChatId?.trim()) {
    return {
      success: false,
      error: "يرجى ضبط توكن البوت ومعرف المحادثة (Chat ID) في إعدادات النظام أولاً."
    };
  }

  try {
    const token = settings.telegramToken.trim();
    const chatId = settings.telegramChatId.trim();
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const data = await response.json();
    if (data.ok) {
      return { success: true };
    }
    return { success: false, error: data.description || "خطأ استجابة من خادم تيليجرام" };
  } catch (error) {
    console.error("Telegram notification error:", error);
    return {
      success: false,
      error: "تعذر الاتصال بخادم تيليجرام. يرجى التحقق من الاتصال بالشبكة."
    };
  }
}
