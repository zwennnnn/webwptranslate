

  // Sayfayı yüklendiğinde çalışacak kodlar
document.addEventListener('DOMContentLoaded', () => {
  console.log('WhatsApp Web Çevirici: Popup açıldı');
});



// Sayfayı yüklendiğinde ayarları getir
document.addEventListener('DOMContentLoaded', loadSettings);



/**
 * Storage'dan ayarları yükle
 */
function loadSettings() {
  // Ayarların yüklenmesi için bir işlem yok
  console.log('WhatsApp Web Çevirici: Ayarlar yüklendi');
}



/**
 * Aktif WhatsApp Web sekmesini bilgilendir
 */
function notifyWhatsAppTab() {
  try {
    if (chrome.tabs) {
      chrome.tabs.query({url: "*://web.whatsapp.com/*"}, (tabs) => {
        if (tabs && tabs.length > 0) {
          tabs.forEach(tab => {
            try {
              chrome.tabs.sendMessage(tab.id, {
                action: 'settingsUpdated'
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.log('Mesaj gönderme hatası: ', chrome.runtime.lastError.message);
                }
              });
            } catch (err) {
              console.log('Tab mesaj gönderme hatası:', err);
            }
          });
        } else {
          console.log('Aktif WhatsApp Web sekmesi bulunamadı');
        }
      });
    } else {
      console.log('chrome.tabs API\'si mevcut değil');
    }
  } catch (err) {
    console.log('notifyWhatsAppTab hatası:', err);
  }
} 