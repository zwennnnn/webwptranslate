

console.log('WhatsApp Web Çevirici: Background script başlatıldı');

const defaultSettings = {
  sourceLanguage: 'auto',
  targetLanguage: 'tr',
  autoTranslate: false,
  apiKey: '',
  useLibreTranslate: true,
  translationService: 'lingva' 
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('WhatsApp Web Çevirici: Mesaj alındı', request.action);
  
    if (request.action === 'translate') {
    console.log('WhatsApp Web Çevirici: Çeviri isteği alındı', {
      kaynak: request.sourceLanguage,
      hedef: request.targetLanguage,
      metin_uzunluğu: request.text ? request.text.length : 0
    });
    
    translateText(
      request.text,
      request.sourceLanguage || defaultSettings.sourceLanguage,
      request.targetLanguage || defaultSettings.targetLanguage
    )
      .then(translatedText => {
        console.log('WhatsApp Web Çevirici: Çeviri başarılı');
        sendResponse({ translatedText });
      })
      .catch(error => {
        console.error('WhatsApp Web Çevirici: Çeviri hatası:', error);
        sendResponse({ error: error.message });
      });
    return true; 
  }
  
  return false;
});

/**
 * Metni çevirir
 * @param {string} text - Çevrilecek metin
 * @param {string} sourceLanguage - Kaynak dil kodu
 * @param {string} targetLanguage - Hedef dil kodu
 * @returns {Promise<string>} - Çevrilen metin
 */
async function translateText(text, sourceLanguage, targetLanguage) {
  if (!text || text.trim() === '') {
    throw new Error('Çevrilecek metin boş');
  }

  const settings = await getSettings();
  console.log('WhatsApp Web Çevirici: Çeviri ayarları alındı', settings);
  
  if (sourceLanguage !== 'auto' && sourceLanguage === targetLanguage) {
    console.log('WhatsApp Web Çevirici: Kaynak ve hedef dil aynı, çeviri atlanıyor');
    return text; 
  }
  
  try {
    console.log('WhatsApp Web Çevirici: Lingva Translate API kullanılıyor');
    return await translateWithLingva(text, sourceLanguage, targetLanguage);
  } catch (error) {
    console.error('WhatsApp Web Çevirici: Lingva API hatası, fallback servisi deneniyor:', error.message);
    return await translateWithFallback(text, sourceLanguage, targetLanguage);
  }
}

/**
 * Lingva Translate API ile çeviri yap 
 * @param {string} text - Çevrilecek metin
 * @param {string} sourceLanguage - Kaynak dil kodu
 * @param {string} targetLanguage - Hedef dil kodu
 * @returns {Promise<string>} - Çevrilen metin
 */
async function translateWithLingva(text, sourceLanguage, targetLanguage) {
  try {
    const baseUrl = 'https://lingva.ml'; 
    
    
    let url;
    if (sourceLanguage === 'auto') {
      url = `${baseUrl}/api/v1/auto/${targetLanguage}/${encodeURIComponent(text)}`;
    } else {
      url = `${baseUrl}/api/v1/${sourceLanguage}/${targetLanguage}/${encodeURIComponent(text)}`;
    }
    
    console.log('WhatsApp Web Çevirici: Lingva API isteği gönderiliyor', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('WhatsApp Web Çevirici: Lingva API hata kodu:', response.status);
      throw new Error(`Lingva API hatası: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('WhatsApp Web Çevirici: Lingva API yanıtı alındı', data);
    
    if (data && data.translation) {
      return data.translation;
    } else if (data && data.error) {
      throw new Error(`Lingva API yanıt hatası: ${data.error}`);
    } else {
      throw new Error('Lingva API yanıtında çeviri bulunamadı');
    }
  } catch (error) {
    console.error('WhatsApp Web Çevirici: Lingva hatası:', error.message);
    throw error; 
  }
}

/**
 * Storage'dan ayarları al
 * @returns {Promise<Object>} - Ayarlar nesnesi
 */
function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(defaultSettings, (settings) => {
      resolve(settings);
    });
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  console.log('WhatsApp Web Çevirici: Eklenti kuruldu/güncellendi', details.reason);
  
  if (details.reason === 'install') {
    chrome.storage.sync.set(defaultSettings, () => {
      console.log('WhatsApp Web Çevirici: Varsayılan ayarlar kaydedildi');
    });
    
    chrome.tabs.create({
      url: 'https://web.whatsapp.com/'
    });
  }
}); 