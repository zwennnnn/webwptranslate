

let settings = {
  sourceLanguage: 'auto',
  targetLanguage: 'tr',
  autoTranslate: false,
  apiKey: ''
};


chrome.storage.sync.get(['sourceLanguage', 'targetLanguage', 'autoTranslate', 'apiKey'], (result) => {
  if (result.sourceLanguage) settings.sourceLanguage = result.sourceLanguage; 
  if (result.targetLanguage) settings.targetLanguage = result.targetLanguage; 
  if (result.autoTranslate !== undefined) settings.autoTranslate = result.autoTranslate; 
  if (result.apiKey) settings.apiKey = result.apiKey;
  
  console.log('WhatsApp Web Çevirici: Ayarlar yüklendi', settings);
});


chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    if (changes.sourceLanguage) settings.sourceLanguage = changes.sourceLanguage.newValue;
    if (changes.targetLanguage) settings.targetLanguage = changes.targetLanguage.newValue;
    if (changes.autoTranslate) settings.autoTranslate = changes.autoTranslate.newValue;
    if (changes.apiKey) settings.apiKey = changes.apiKey.newValue;
    
    console.log('WhatsApp Web Çevirici: Ayarlar güncellendi', settings);
  }
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'settingsUpdated') {
    console.log('WhatsApp Web Çevirici: Ayarların güncellendiği bildirildi');
    sendResponse({ status: 'ok' });
  }
  return true; 
});


function waitForWhatsAppLoad() {
  console.log('WhatsApp Web Çevirici: Sayfa yüklenmesi bekleniyor...');
  let attempts = 0;
  const maxAttempts = 30; 

  const checkInterval = setInterval(() => {
    attempts++;
    const conversationPanel = document.querySelector('div.xnpuxes.copyable-area > div[class*="x10l6tqk"][class*="x13vifvy"]');
    
    if (conversationPanel) {
      console.log("WhatsApp Web Çevirici: Mesaj paneli bulundu (seçici: 'div.xnpuxes.copyable-area > div[class*=\"x10l6tqk\"][class*=\"x13vifvy\"]').");
      clearInterval(checkInterval);
      initializeTranslator(conversationPanel); 
      console.log('WhatsApp Web Çevirici: WhatsApp ana arayüzü yüklendi, çevirici başlatıldı');
    } else {
      console.log(`WhatsApp Web Çevirici: Mesaj paneli bulunamadı (seçici: 'div.xnpuxes.copyable-area > div[class*="x10l6tqk"][class*="x13vifvy"]', Deneme: ${attempts}/${maxAttempts})`);
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error("WhatsApp Web Çevirici: Zaman aşımı! WhatsApp mesaj paneli yüklenemedi veya belirtilen seçiciyle bulunamadı.");
      }
    }
  }, 1000);
}


function initializeTranslator(chatContainerElement) { 
  if (!chatContainerElement) {
    console.error('WhatsApp Web Çevirici: initializeTranslator chatContainerElement olmadan çağrıldı!');
    return;
  }
  console.log('WhatsApp Web Çevirici: initializeTranslator çağrıldı, izlenecek element:', chatContainerElement);

  if (globalChatObserver) {
    globalChatObserver.disconnect();
    console.log("WhatsApp Web Çevirici: Önceki MutationObserver durduruldu.");
  }

  globalChatObserver = new MutationObserver((mutations) => { 
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        checkForNewMessages();
      }
    }
  });
  
  function observeChats() {
    if (chatContainerElement && globalChatObserver) { 
      globalChatObserver.observe(chatContainerElement, { childList: true, subtree: true });
      console.log("WhatsApp Web Çevirici: Yeni MutationObserver mesaj paneli üzerinde başlatıldı.");
    } else {
      console.error('WhatsApp Web Çevirici: MutationObserver başlatılamadı, izlenecek chatContainerElement veya observer bulunamadı!');
    }
  }
  
  observeChats();
  
  function checkForNewMessages() {
    const messages = document.querySelectorAll('.message-in:not(.wp-translator-processed), .message-out:not(.wp-translator-processed)');
    
    messages.forEach((messageContainer) => {
      messageContainer.classList.add('wp-translator-processed');
      
      const textContainer = messageContainer.querySelector('.copyable-text');
      if (!textContainer) return;
      
      let messageText = '';
      const actualTextSpan = textContainer.querySelector('div._akbu span._ao3e.selectable-text.copyable-text > span');
      if (actualTextSpan && actualTextSpan.innerText) {
          messageText = actualTextSpan.innerText.trim();
      } else {
          const flatterTextSpan = textContainer.querySelector('span._ao3e.selectable-text.copyable-text > span');
          if (flatterTextSpan && flatterTextSpan.innerText) {
              messageText = flatterTextSpan.innerText.trim();
          } else {
              const linkElement = textContainer.querySelector('a._ao3e.selectable-text.copyable-text');
              if (linkElement && linkElement.href) {
                  messageText = linkElement.innerText.trim() || linkElement.href;
              } else {
                const innerMostAo3e = textContainer.querySelector('span._ao3e');
                if (innerMostAo3e && innerMostAo3e.innerText){
                    messageText = innerMostAo3e.innerText.trim();
                } else {
                    console.log('WhatsApp Web Çevirici: Çeviri butonu için metin bulunamadı.', messageContainer);
                    return;
                }
              }
          }
      }
            
      if (!messageText || messageText.trim() === '') {
        console.log('WhatsApp Web Çevirici: Boş mesaj, çeviri butonu eklenmeyecek.', messageContainer);
        return; 
      }

      addTranslateButton(messageContainer, messageText);
    });
  }
  
  function addTranslateButton(messageContainer, messageText) {
    if (messageContainer.querySelector('.wp-translate-button-container')) {
        return;
    }

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'wp-translate-button-container'; 
    controlsContainer.style.marginTop = '5px';
    controlsContainer.style.display = 'flex'; 
    controlsContainer.style.alignItems = 'center';
    controlsContainer.style.justifyContent = messageContainer.classList.contains('message-out') ? 'flex-end' : 'flex-start';

    const translateButton = document.createElement('button');
    translateButton.innerText = 'Çevir'; 
    translateButton.className = 'wp-translate-button';
    translateButton.style.background = '#128C7E';
    translateButton.style.color = 'white';
    translateButton.style.border = 'none';
    translateButton.style.borderRadius = '5px';
    translateButton.style.padding = '5px 10px';
    translateButton.style.fontSize = '12px';
    translateButton.style.cursor = 'pointer';
    translateButton.style.opacity = '0.85';
      translateButton.style.marginRight = '5px'; 

    const targetLanguageSelect = document.createElement('select');
    targetLanguageSelect.className = 'wp-target-language-select';
    targetLanguageSelect.style.padding = '4px';
    targetLanguageSelect.style.fontSize = '12px';
    targetLanguageSelect.style.borderRadius = '4px';
    targetLanguageSelect.style.border = '1px solid #ccc';

    
    const languages = {
        'tr': 'Türkçe',
        'en': 'İngilizce',
        'es': 'İspanyolca',
        'fr': 'Fransızca',
        'de': 'Almanca',
        'it': 'İtalyanca',
        'ru': 'Rusça',
        'pt': 'Portekizce',
        'ar': 'Arapça',
        'zh': 'Çince (Basit)',
        'ja': 'Japonca',
        'ko': 'Korece',
        'nl': 'Hollandaca',
        'pl': 'Lehçe',
        'sv': 'İsveççe',
        'da': 'Danca',
        'fi': 'Fince',
        'el': 'Yunanca',
        'cs': 'Çekçe',
        'hu': 'Macarca',
        'ro': 'Romence',
        'bg': 'Bulgarca',
        'uk': 'Ukraynaca',
        'hi': 'Hintçe',
        'id': 'Endonezce',
        'ms': 'Malayca',
        'th': 'Tayca',
        'vi': 'Vietnamca',
        'fa': 'Farsça',
        'he': 'İbranice'
    };

    for (const langCode in languages) {
        const option = document.createElement('option');
        option.value = langCode;
        option.innerText = languages[langCode];
        targetLanguageSelect.appendChild(option);
    }
   
    targetLanguageSelect.value = settings.targetLanguage || 'tr';

    translateButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const selectedTargetLang = targetLanguageSelect.value;
      
      translateMessage(messageContainer, messageText, 'auto', selectedTargetLang);
    });

    controlsContainer.appendChild(translateButton);
    controlsContainer.appendChild(targetLanguageSelect);

    const copyableTextElement = messageContainer.querySelector('.copyable-text');
    if (copyableTextElement && copyableTextElement.parentNode) {
        copyableTextElement.parentNode.appendChild(controlsContainer);
    } else {
        messageContainer.appendChild(controlsContainer); 
    }
  }
  
 
  function translateMessage(messageContainer, messageText, sourceLang, targetLang) {
 

    console.log('WhatsApp Web Çevirici: Butonla çeviri isteği.', { originalText: messageText, from: sourceLang, to: targetLang });

    if (sourceLang !== 'auto' && sourceLang === targetLang) {
        console.log('WhatsApp Web Çevirici: Kaynak ve hedef dil aynı. Çeviri atlanıyor (butonla).');
        return;
    }
    if (!messageText || messageText.trim() === '') {
        console.log('WhatsApp Web Çevirici: Çevrilecek metin boş (butonla).');
        return;
    }

  
    const existingStatus = messageContainer.querySelector('.wp-translation-status');
    if (existingStatus) existingStatus.remove();
    const existingTranslation = messageContainer.querySelector('.wp-translation');
    if (existingTranslation) existingTranslation.remove();

    const translationStatusElem = document.createElement('div');
    translationStatusElem.className = 'wp-translation-status';
    translationStatusElem.innerText = '🔄 Çeviriliyor...';
    translationStatusElem.style.fontSize = '12px';
    translationStatusElem.style.fontStyle = 'italic';
    translationStatusElem.style.margin = '5px 0';
    translationStatusElem.style.color = '#888';
    
    
    const copyableTextElementForStatus = messageContainer.querySelector('.copyable-text');
    if (copyableTextElementForStatus && copyableTextElementForStatus.parentNode) {
       
        copyableTextElementForStatus.parentNode.insertBefore(translationStatusElem, copyableTextElementForStatus.nextSibling);
    } else {
    
        messageContainer.appendChild(translationStatusElem);
    }
    
   
    try {
      chrome.runtime.sendMessage({
        action: 'translate',
        text: messageText,
        sourceLanguage: sourceLang, 
        targetLanguage: targetLang  
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Çeviri isteği hatası:', chrome.runtime.lastError.message);
          let errorMessage = '❌ Çeviri yapılamadı: Bağlantı hatası.';
          if (chrome.runtime.lastError.message.includes('Extension context invalidated')) {
            errorMessage = '❌ Çeviri bağlantısı koptu. Lütfen eklentiyi sayfasından (genellikle tarayıcı araç çubuğundaki eklenti simgesine sağ tıklayıp "Eklentiyi Yönet" veya benzeri bir seçenekle) devre dışı bırakıp tekrar etkinleştirin veya tarayıcınızı yeniden başlatın.';
          } else if (chrome.runtime.lastError.message.includes('Could not establish connection')) {
            errorMessage = '❌ Çeviri servisine ulaşılamadı. İnternet bağlantınızı kontrol edin veya eklentiyi yeniden yüklemeyi deneyin.';
          }
          translationStatusElem.innerText = errorMessage;
          translationStatusElem.style.color = '#e74c3c';
          return;
        }
        
        if (response && response.translatedText) {
        
          showTranslation(messageContainer, response.translatedText);
          translationStatusElem.remove();
        } else if (response && response.error) {
        
          console.error('Çeviri hatası (background):', response.error);
          translationStatusElem.innerText = `❌ Çeviri hatası: ${response.error}`;
          translationStatusElem.style.color = '#e74c3c';
        } else {
         
          translationStatusElem.innerText = '❌ Çeviri yapılamadı (bilinmeyen hata).';
          translationStatusElem.style.color = '#e74c3c';
        }
      });
    } catch (error) {
      console.error('Mesaj gönderme genel hatası:', error);
      let catchErrorMessage = '❌ Eklenti hatası oluştu.';
      if (error.message.includes('Extension context invalidated')) {
        catchErrorMessage = '❌ Eklenti durumu geçersiz. Lütfen eklentiyi yeniden etkinleştirin veya tarayıcıyı yeniden başlatın.';
      } else {
        catchErrorMessage = `❌ Eklenti hatası: ${error.message}`;
      }
      translationStatusElem.innerText = catchErrorMessage;
      translationStatusElem.style.color = '#e74c3c';
    }
  }
  
  function showTranslation(messageContainer, translatedText) {
   
    let translationElem = messageContainer.querySelector('.wp-translation');
    if (translationElem) {
      translationElem.innerHTML = ''; 
    } else {
      translationElem = document.createElement('div');
      translationElem.className = 'wp-translation';
    }
    
   
    translationElem.style.margin = '5px 0px 5px 40px'; 
    translationElem.style.padding = '8px 10px';
    translationElem.style.backgroundColor = 'rgba(255, 235, 238, 0.8)'; 
    translationElem.style.borderRadius = '7.5px';
    translationElem.style.fontSize = '13px'; 
    translationElem.style.borderLeft = '3px solid #e74c3c'; 
    translationElem.style.color = '#333'; 
    translationElem.style.fontStyle = 'italic'; 

    const translationContent = document.createElement('div');
    translationContent.innerText = translatedText;
    
    translationElem.appendChild(translationContent);
    
    
    
    const copyableTextElement = messageContainer.querySelector('.copyable-text');
    if (copyableTextElement) {
        const parentOfCopyable = copyableTextElement.parentNode;
        if (parentOfCopyable) {
            parentOfCopyable.appendChild(translationElem);
        } else {
            messageContainer.appendChild(translationElem); 
        }
    } else {
        messageContainer.appendChild(translationElem);
    }
  }
  
  
  checkForNewMessages();
}


document.addEventListener('DOMContentLoaded', () => {
  console.log('WhatsApp Web Çevirici: DOMContentLoaded olayı tetiklendi');
  waitForWhatsAppLoad();
});


window.addEventListener('load', () => {
  console.log('WhatsApp Web Çevirici: load olayı tetiklendi');
  waitForWhatsAppLoad();
});


document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log('WhatsApp Web Çevirici: Sayfa tekrar görünür oldu.');
    const conversationPanel = document.querySelector('div.xnpuxes.copyable-area > div[class*="x10l6tqk"][class*="x13vifvy"]');
    if (conversationPanel) {
      console.log('WhatsApp Web Çevirici: Görünürlük değişimi sonrası mesaj paneli bulundu, initializeTranslator çağrılıyor.');
      initializeTranslator(conversationPanel); 
    } else {
      console.log('WhatsApp Web Çevirici: Sayfa görünür oldu ancak mesaj paneli bulunamadı, waitForWhatsAppLoad çağrılıyor.');
      waitForWhatsAppLoad(); 
    }
  }
});


let globalChatObserver = null; 


document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    console.log('WhatsApp Web Çevirici: Sayfa tekrar görünür oldu.');
    const conversationPanel = document.querySelector('div.xnpuxes.copyable-area > div[class*="x10l6tqk"][class*="x13vifvy"]');
    if (conversationPanel) {
      console.log('WhatsApp Web Çevirici: Görünürlük değişimi sonrası mesaj paneli bulundu, initializeTranslator çağrılıyor.');
      initializeTranslator(conversationPanel); 
    } else {
      console.log('WhatsApp Web Çevirici: Sayfa görünür oldu ancak mesaj paneli bulunamadı, waitForWhatsAppLoad çağrılıyor.');
      waitForWhatsAppLoad(); 
    }
  }
}); 