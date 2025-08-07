

// استيراد الدوال المطلوبة من Firebase
import { 
  auth, 
  db,
  serverTimestamp,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  getDocs
} from './firebase-config.js';

class ChatManager {
  constructor(authManager, friendsManager) {
    this.authManager = authManager;
    this.friendsManager = friendsManager;
    this.currentChat = null;
    this.unsubscribe = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
    this.messagesData = []; // تخزين البيانات الخام للرسائل
    this.globalMessageListeners = new Map(); // مستمعين لجميع الدردشات
    
    // تشغيل تنظيف دوري للرسائل كل 30 دقيقة
    this.startPeriodicCleanup();
    
    // بدء الاستماع للرسائل الجديدة من جميع الأصدقاء
    this.startGlobalMessageListener();
  }

  // بدء التنظيف الدوري للرسائل
  startPeriodicCleanup() {
    // تنظيف فوري عند بدء التطبيق
    setTimeout(() => {
      this.performGlobalCleanup();
    }, 5000); // بعد 5 ثوانٍ من بدء التطبيق

    // تنظيف دوري كل 30 دقيقة
    setInterval(() => {
      this.performGlobalCleanup();
    }, 30 * 60 * 1000); // كل 30 دقيقة
  }

  // بدء الاستماع للرسائل الجديدة من جميع الأصدقاء
  async startGlobalMessageListener() {
    if (!this.authManager.isSignedIn()) return;

    // انتظار تحميل الأصدقاء
    await this.friendsManager.loadUserFriends();
    
    const friends = this.friendsManager.friends;
    
    friends.forEach(friend => {
      const chatId = this.generateChatId(this.authManager.currentUser.uid, friend.uid);
      
      // إذا لم يكن هناك مستمع لهذه الدردشة بالفعل
      if (!this.globalMessageListeners.has(chatId)) {
        const messagesRef = collection(db, 'chats', chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'desc'));
        
        let lastMessageTime = Date.now();
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const message = { id: change.doc.id, ...change.doc.data() };
              const messageTime = message.timestamp?.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
              
              // التحقق من أن الرسالة جديدة ومن صديق وليست من المستخدم الحالي
              if (messageTime.getTime() > lastMessageTime && 
                  message.senderId === friend.uid && 
                  message.senderId !== this.authManager.currentUser.uid) {
                
                // إظهار التنبيه فقط إذا لم تكن الدردشة مفتوحة مع هذا الصديق
                if (!this.currentChat || this.currentChat.friendId !== friend.uid) {
                  this.showNewMessageNotification(friend.name, 1, friend.uid);
                  this.playNotificationSound();
                } else {
                  // إذا كانت الدردشة مفتوحة، فقط تشغيل الصوت
                  this.playNotificationSound();
                }
              }
            }
          });
          
          // تحديث وقت آخر رسالة
          if (!snapshot.empty) {
            const latestMessage = snapshot.docs[0].data();
            const latestTime = latestMessage.timestamp?.toDate ? latestMessage.timestamp.toDate() : new Date(latestMessage.timestamp);
            if (latestTime.getTime() > lastMessageTime) {
              lastMessageTime = latestTime.getTime();
            }
          }
        });
        
        this.globalMessageListeners.set(chatId, unsubscribe);
      }
    });
  }

  // إيقاف جميع مستمعي الرسائل العامة
  stopGlobalMessageListener() {
    this.globalMessageListeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.globalMessageListeners.clear();
  }

  // تنظيف شامل لجميع الدردشات
  async performGlobalCleanup() {
    if (!this.authManager.isSignedIn()) return;

    try {
      console.log('بدء التنظيف الدوري للرسائل القديمة...');
      
      // في حالة وجود دردشة مفتوحة، قم بتنظيفها
      if (this.currentChat) {
        const messagesRef = collection(db, 'chats', this.currentChat.chatId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        
        // استعلام واحد للحصول على الرسائل
        const snapshot = await getDocs(q);
        await this.cleanOldMessages(snapshot.docs);
      }
      
      console.log('تم الانتهاء من التنظيف الدوري');
    } catch (error) {
      console.error('خطأ في التنظيف الدوري:', error);
    }
  }

  // فتح دردشة مع صديق
  async openChatWithFriend(friendId, friendName) {
    if (!this.authManager.isSignedIn()) {
      alert('يجب تسجيل الدخول أولاً لاستخدام الدردشة');
      return;
    }

    this.currentChat = {
      friendId: friendId,
      friendName: friendName,
      chatId: this.generateChatId(this.authManager.currentUser.uid, friendId)
    };

    this.createChatWindow();
    this.loadChatMessages();
  }

  // إنشاء معرف فريد للدردشة
  generateChatId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
  }

  // إنشاء نافذة الدردشة بتصميم محسن شبيه بـ WhatsApp
  createChatWindow() {
    // إزالة نافذة الدردشة السابقة إن وجدت
    const existingChat = document.getElementById('chatWindow');
    if (existingChat) {
      existingChat.remove();
    }

    const chatWindow = document.createElement('div');
    chatWindow.id = 'chatWindow';
    chatWindow.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      height: 600px;
      background: #f0f2f5;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 
                  0 10px 30px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      z-index: 10000;
      display: flex;
      flex-direction: column;
      font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      overflow: hidden;
      animation: slideInChat 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    `;

    // إضافة أنماط CSS للتحريك والتصميم
    if (!document.getElementById('chatStyles')) {
      const chatStyles = document.createElement('style');
      chatStyles.id = 'chatStyles';
      chatStyles.innerHTML = `
        @keyframes slideInChat {
          from { 
            opacity: 0; 
            transform: translateX(100%) scale(0.8); 
          }
          to { 
            opacity: 1; 
            transform: translateX(0) scale(1); 
          }
        }
        
        @keyframes messagePop {
          from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.8); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
        
        .message-bubble {
          animation: messagePop 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          margin-bottom: 8px;
        }
        
        .voice-recording {
          animation: pulse 1s infinite;
        }
        
        .chat-input:focus {
          outline: none;
          border-color: #00a884;
          box-shadow: 0 0 0 2px rgba(0, 168, 132, 0.2);
        }
        
        .chat-btn:hover {
          transform: scale(1.1);
          transition: transform 0.2s ease;
        }
        
        .chat-btn:active {
          transform: scale(0.95);
        }
        
        /* تحسين شريط التمرير */
        #messagesContainer::-webkit-scrollbar {
          width: 4px;
        }
        
        #messagesContainer::-webkit-scrollbar-track {
          background: transparent;
        }
        
        #messagesContainer::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 2px;
        }
        
        #messagesContainer::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.3);
        }

        /* تحسين تصميم الرسائل */
        .message-container {
          display: flex;
          flex-direction: column;
          margin-bottom: 12px;
          padding: 0 12px;
        }

        .message-content {
          max-width: 80%;
          word-wrap: break-word;
          position: relative;
        }

        .my-message {
          margin-left: 40px;
          align-self: flex-end;
        }

        .my-message .message-content {
          background: linear-gradient(135deg, #00a884, #00856e);
          color: white;
          border-radius: 18px 18px 4px 18px;
          padding: 12px 16px;
          box-shadow: 0 2px 8px rgba(0, 168, 132, 0.3);
        }

        .friend-message {
          margin-right: 40px;
          align-self: flex-start;
        }

        .friend-message .message-content {
          background: white;
          color: #111b21;
          border-radius: 18px 18px 18px 4px;
          padding: 12px 16px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .message-time {
          font-size: 11px;
          opacity: 0.7;
          margin-top: 4px;
          text-align: right;
        }

        .my-message .message-time {
          color: rgba(255, 255, 255, 0.8);
        }

        .friend-message .message-time {
          color: #667781;
        }
      `;
      document.head.appendChild(chatStyles);
    }

    chatWindow.innerHTML = `
      <!-- رأس النافذة المحسن بتصميم WhatsApp -->
      <div style="
        background: #00a884;
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 20px 20px 0 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            width: 40px;
            height: 40px;
            background: rgba(255, 255, 255, 0.15);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: 600;
          ">${this.currentChat.friendName.charAt(0).toUpperCase()}</div>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 500; line-height: 1.2;">${this.currentChat.friendName}</h3>
            <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">اضغط هنا للمعلومات</div>
          </div>
        </div>
        <button id="closeChatBtn" style="
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: white;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        " class="chat-btn">×</button>
      </div>

      <!-- منطقة الرسائل المحسنة بتصميم WhatsApp -->
      <div id="messagesContainer" style="
        flex: 1;
        padding: 12px 0;
        overflow-y: auto;
        background: #ffffff;
        position: relative;
        display: flex;
        flex-direction: column;
      ">
        <!-- رسالة ترحيبية -->
        <div style="
          text-align: center;
          color: #54656f;
          font-size: 13px;
          margin: 20px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        ">
          🔐 الرسائل محمية بالتشفير من الطرف إلى الطرف
        </div>
      </div>

      <!-- منطقة إرسال الرسائل المحسنة بتصميم WhatsApp -->
      <div style="
        padding: 12px 16px;
        background: #f0f2f5;
        border-radius: 0 0 20px 20px;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
      ">
        <div style="display: flex; gap: 8px; align-items: flex-end;">
          <input type="text" id="messageInput" placeholder="اكتب رسالة..." style="
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 24px;
            font-family: inherit;
            font-size: 15px;
            background: white;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            max-height: 120px;
            resize: none;
            line-height: 1.4;
            transition: box-shadow 0.2s ease;
          " class="chat-input">
          <button id="voiceBtn" style="
            background: #00a884;
            color: white;
            border: none;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 168, 132, 0.4);
          " class="chat-btn">🎤</button>
          <button id="sendTextBtn" style="
            background: #00a884;
            color: white;
            border: none;
            border-radius: 50%;
            width: 48px;
            height: 48px;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 168, 132, 0.4);
          " class="chat-btn">➤</button>
        </div>
        
        <!-- مؤشر الكتابة (مخفي افتراضياً) -->
        <div id="typingIndicator" style="
          display: none;
          margin-top: 8px;
          font-size: 12px;
          color: #667781;
          font-style: italic;
          padding: 0 16px;
        ">
          <span style="animation: typing 1.5s infinite;">●●●</span>
          ${this.currentChat.friendName} يكتب...
        </div>
      </div>
    `;

    document.body.appendChild(chatWindow);

    // إضافة مستمعي الأحداث المحسنة
    document.getElementById('closeChatBtn').addEventListener('click', () => {
      this.closeChatWindow();
    });

    document.getElementById('sendTextBtn').addEventListener('click', () => {
      this.sendTextMessage();
    });

    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendTextMessage();
      }
    });

    document.getElementById('voiceBtn').addEventListener('click', () => {
      this.toggleVoiceRecording();
    });

    // التركيز التلقائي على حقل الإدخال
    setTimeout(() => {
      messageInput.focus();
    }, 300);
  }

  // إغلاق نافذة الدردشة
  closeChatWindow() {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow) {
      chatWindow.style.animation = 'slideInChat 0.3s ease-out reverse';
      setTimeout(() => {
        chatWindow.remove();
      }, 300);
    }
    
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    this.currentChat = null;
    this.messagesData = [];
  }

  // تحميل رسائل الدردشة مع ترتيب صحيح وحذف الرسائل القديمة
  async loadChatMessages() {
    if (!this.currentChat) return;

    const messagesRef = collection(db, 'chats', this.currentChat.chatId, 'messages');
    // استخدام ترتيب تصاعدي من قاعدة البيانات مباشرة
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    this.unsubscribe = onSnapshot(q, async (snapshot) => {
      const messagesContainer = document.getElementById('messagesContainer');
      if (!messagesContainer) return;

      // تنظيف الرسائل القديمة (أكثر من 12 ساعة)
      await this.cleanOldMessages(snapshot.docs);

      // معالجة الرسائل مع الحفاظ على الترتيب الزمني من قاعدة البيانات
      const validMessages = [];
      const now = new Date();
      
      snapshot.docs.forEach(doc => {
        const message = { id: doc.id, ...doc.data() };
        
        // التحقق من صحة timestamp
        if (!message.timestamp) {
          console.warn('Message without timestamp:', message.id);
          return;
        }
        
        // التحقق من أن الرسالة ليست قديمة جداً (أقل من 12 ساعة)
        const messageTime = message.timestamp?.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
        const hoursDiff = (now - messageTime) / (1000 * 60 * 60);
        
        if (hoursDiff < 12) {
          validMessages.push(message);
        }
      });

      // التحقق من وجود رسائل جديدة من الصديق (فقط إذا كانت الدردشة مفتوحة)
      const previousMessageCount = this.messagesData.length;
      if (validMessages.length > previousMessageCount && previousMessageCount > 0) {
        const newMessages = validMessages.slice(previousMessageCount);
        const friendMessages = newMessages.filter(msg => 
          msg.senderId === this.currentChat.friendId && 
          msg.senderId !== this.authManager.currentUser.uid
        );
        
        // عرض إشعار فقط إذا كانت الدردشة مع هذا الصديق غير مفتوحة
        if (friendMessages.length > 0) {
          // لا نعرض إشعار هنا لأن الدردشة مفتوحة بالفعل
          // فقط نشغل الصوت
          this.playNotificationSound();
        }
      }

      // تحديث البيانات الخام مع الحفاظ على الترتيب
      this.messagesData = validMessages;

      // عرض الرسائل الجديدة فقط بدلاً من إعادة عرض كل شيء
      this.renderMessages();

      // التمرير لآخر رسالة
      this.scrollToBottom();
    });
  }

  // دالة منفصلة لعرض الرسائل مع تحسين الأداء
  renderMessages() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    // حفظ رسالة الترحيب
    const welcomeMessage = messagesContainer.querySelector('div:not(.message-container)');
    
    // إزالة كل الرسائل فقط (ليس رسالة الترحيب)
    const existingMessages = messagesContainer.querySelectorAll('.message-container');
    existingMessages.forEach(msg => msg.remove());

    // عرض الرسائل بالترتيب الزمني الصحيح
    this.messagesData.forEach((message, index) => {
      this.displayMessage(message, index);
    });
  }

  // تشغيل صوت التنبيه
  playNotificationSound() {
    try {
      const audio = new Audio('./sounds/friend-message.wav');
      audio.volume = 0.8;
      audio.preload = 'auto';
      
      // محاولة تشغيل الصوت مع معالجة أفضل للأخطاء
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Friend message notification sound played successfully');
          })
          .catch(error => {
            console.log('Could not play friend message notification sound:', error);
            // محاولة تشغيل بديلة مع تأخير أكبر
            setTimeout(() => {
              audio.currentTime = 0;
              audio.play().catch(e => console.log('Friend message sound retry failed:', e));
            }, 200);
          });
      }
    } catch (error) {
      console.log('Error creating friend message notification audio:', error);
    }
  }

  // إظهار تنبيه الرسائل الجديدة
  showNewMessageNotification(friendName, messageCount, friendId = null) {
    // إزالة التنبيه السابق إن وجد
    const existingNotification = document.getElementById('messageNotification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // إنشاء تنبيه جديد
    const notification = document.createElement('div');
    notification.id = 'messageNotification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: linear-gradient(135deg, #ff6b6b, #ee5a24);
      color: white;
      padding: 12px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 8px 25px rgba(255, 107, 107, 0.5);
      animation: messageNotificationSlideIn 0.5s ease-out;
      z-index: 10001;
      min-width: 250px;
      text-align: center;
      border: 2px solid white;
      pointer-events: auto;
      transform: translateX(0);
      cursor: pointer;
    `;
    
    const messageText = messageCount === 1 ? 'رسالة جديدة' : `${messageCount} رسائل جديدة`;
    notification.innerHTML = `📩 ${friendName}<br>${messageText}<br><small style="opacity: 0.8;">اضغط لفتح الدردشة</small>`;

    // إضافة الأنماط للتحريك
    if (!document.getElementById('messageNotificationStyles')) {
      const style = document.createElement('style');
      style.id = 'messageNotificationStyles';
      style.innerHTML = `
        @keyframes messageNotificationSlideIn {
          0% { 
            transform: translateX(-100%); 
            opacity: 0; 
          }
          100% { 
            transform: translateX(0); 
            opacity: 1; 
          }
        }
        
        @keyframes messageNotificationPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        #messageNotification {
          animation: messageNotificationSlideIn 0.5s ease-out, messageNotificationPulse 2s ease-in-out 1s infinite;
        }
        
        #messageNotification:hover {
          transform: scale(1.05) !important;
          cursor: pointer;
          box-shadow: 0 12px 35px rgba(255, 107, 107, 0.7) !important;
        }
      `;
      document.head.appendChild(style);
    }

    // إضافة التنبيه للجسم
    document.body.appendChild(notification);

    // إزالة التنبيه عند النقر عليه مع فتح الدردشة
    const removeNotification = () => {
      if (notification && notification.parentNode) {
        // تأثير الاختفاء
        notification.style.animation = 'messageNotificationSlideIn 0.3s ease-in reverse';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    };

    notification.addEventListener('click', (e) => {
      e.stopPropagation();
      removeNotification();
      
      // فتح الدردشة مع الصديق إذا كان معرف الصديق متوفر
      if (friendId && friendName) {
        this.openChatWithFriend(friendId, friendName);
      }
    });

    // إزالة التنبيه تلقائياً بعد 10 ثواني
    setTimeout(removeNotification, 10000);
  }

  // حذف الرسائل الأقدم من 12 ساعة
  async cleanOldMessages(docs) {
    const now = new Date();
    const messagesToDelete = [];

    docs.forEach(doc => {
      const message = doc.data();
      const messageTime = message.timestamp?.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
      const hoursDiff = (now - messageTime) / (1000 * 60 * 60);

      // إذا كانت الرسالة أقدم من 12 ساعة
      if (hoursDiff > 12) {
        messagesToDelete.push(doc.ref);
      }
    });

    // حذف الرسائل القديمة
    for (const messageRef of messagesToDelete) {
      try {
        await messageRef.delete();
        console.log('تم حذف رسالة قديمة:', messageRef.id);
      } catch (error) {
        console.error('خطأ في حذف الرسالة القديمة:', error);
      }
    }

    if (messagesToDelete.length > 0) {
      console.log(`تم حذف ${messagesToDelete.length} رسالة قديمة`);
    }
  }

  // عرض رسالة في نافذة الدردشة بتصميم محسن
  displayMessage(message, index = 0) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    // التحقق من وجود الرسالة مسبقاً لتجنب التكرار
    const existingMessage = document.getElementById(`message-${message.id}`);
    if (existingMessage) return;

    const isMyMessage = message.senderId === this.authManager.currentUser.uid;
    
    const messageDiv = document.createElement('div');
    messageDiv.id = `message-${message.id}`; // معرف فريد لكل رسالة
    messageDiv.className = `message-container message-bubble ${isMyMessage ? 'my-message' : 'friend-message'}`;
    
    // إضافة timestamp كـ data attribute للترتيب
    const messageTime = message.timestamp?.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
    messageDiv.setAttribute('data-timestamp', messageTime.getTime());

    let messageContent = '';
    
    if (message.type === 'text') {
      messageContent = `
        <div class="message-content">
          <div style="line-height: 1.4; word-wrap: break-word;">
            ${message.content}
          </div>
          <div class="message-time">
            ${this.formatMessageTime(message.timestamp)}
            ${isMyMessage ? '<span style="margin-right: 4px;">✓✓</span>' : ''}
          </div>
        </div>
      `;
    } else if (message.type === 'voice') {
      messageContent = `
        <div class="message-content" style="min-width: 200px;">
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 13px;
            opacity: 0.8;
          ">
            🎵 رسالة صوتية
          </div>
          
          <audio controls style="
            width: 100%; 
            height: 32px;
            border-radius: 16px;
            outline: none;
            margin-bottom: 4px;
          ">
            <source src="${message.audioUrl}" type="audio/webm">
            <source src="${message.audioUrl}" type="audio/wav">
            متصفحك لا يدعم تشغيل الملفات الصوتية
          </audio>
          
          <div class="message-time">
            ${this.formatMessageTime(message.timestamp)}
            ${isMyMessage ? '<span style="margin-right: 4px;">✓✓</span>' : ''}
          </div>
        </div>
      `;
    }

    messageDiv.innerHTML = messageContent;
    messagesContainer.appendChild(messageDiv);
  }

  // تنسيق وقت الرسالة
  formatMessageTime(timestamp) {
    if (!timestamp) return '';
    
    const messageTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(messageTime.getFullYear(), messageTime.getMonth(), messageTime.getDate());
    
    const timeStr = messageTime.toLocaleString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    if (messageDate.getTime() === today.getTime()) {
      return timeStr; // اليوم - اعرض الوقت فقط
    } else {
      return messageTime.toLocaleString('ar-EG', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  }

  // التمرير لأسفل
  scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    if (messagesContainer) {
      setTimeout(() => {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }

  // إرسال رسالة نصية
  async sendTextMessage() {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendTextBtn');
    if (!messageInput || !this.currentChat) return;

    const messageText = messageInput.value.trim();
    if (!messageText) {
      // تأثير اهتزاز للحقل الفارغ
      messageInput.style.animation = 'shake 0.5s';
      setTimeout(() => {
        messageInput.style.animation = '';
      }, 500);
      return;
    }

    // تأثير بصري للإرسال
    sendBtn.style.transform = 'scale(0.9)';
    sendBtn.innerHTML = '⏳';
    messageInput.disabled = true;
    messageInput.style.opacity = '0.7';

    try {
      const userData = this.authManager.currentUserData;
      const senderName = userData?.['الاسم الكامل'] || 
                        this.authManager.currentUser.displayName || 
                        'مستخدم';

      const messagesRef = collection(db, 'chats', this.currentChat.chatId, 'messages');
      const messageData = {
        senderId: this.authManager.currentUser.uid,
        senderName: senderName,
        content: messageText,
        type: 'text',
        timestamp: serverTimestamp(), // استخدام التوقيت المحلي
        chatId: this.currentChat.chatId,
        createdAt: Date.now() // وقت إضافي للمقارنة
      };
      
      await addDoc(messagesRef, messageData);

      // تنظيف الحقل مع تأثير سلس
      messageInput.value = '';

    } catch (error) {
      console.error('Error sending message:', error);
      alert('فشل في إرسال الرسالة، حاول مرة أخرى');
    } finally {
      // استعادة حالة الأزرار
      setTimeout(() => {
        sendBtn.style.transform = 'scale(1)';
        sendBtn.innerHTML = '➤';
        messageInput.disabled = false;
        messageInput.style.opacity = '1';
        messageInput.focus();
      }, 500);
    }
  }

  // تبديل تسجيل الصوت
  async toggleVoiceRecording() {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) return;

    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  // بدء تسجيل الصوت
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      const voiceBtn = document.getElementById('voiceBtn');
      if (voiceBtn) {
        voiceBtn.style.background = '#dc3545';
        voiceBtn.innerHTML = '⏹️';
        voiceBtn.classList.add('voice-recording');
      }

    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('🎙️ لا يمكن الوصول للميكروفون. تأكد من السماح بالوصول للميكروفون في إعدادات المتصفح.');
    }
  }

  // إيقاف تسجيل الصوت
  stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    this.isRecording = false;
    
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
      voiceBtn.style.background = '#00a884';
      voiceBtn.innerHTML = '🎤';
      voiceBtn.classList.remove('voice-recording');
    }
  }

  // معالجة التسجيل الصوتي وإرساله
  async processRecording() {
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    
    // تحويل البيانات الصوتية إلى Base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Audio = reader.result;
      await this.sendVoiceMessage(base64Audio);
    };
    reader.readAsDataURL(audioBlob);
  }

  // إرسال رسالة صوتية
  async sendVoiceMessage(audioData) {
    if (!this.currentChat) return;

    try {
      const userData = this.authManager.currentUserData;
      const senderName = userData?.['الاسم الكامل'] || 
                        this.authManager.currentUser.displayName || 
                        'مستخدم';

      const messagesRef = collection(db, 'chats', this.currentChat.chatId, 'messages');
      const messageData = {
        senderId: this.authManager.currentUser.uid,
        senderName: senderName,
        audioUrl: audioData,
        type: 'voice',
        timestamp: serverTimestamp(), // استخدام التوقيت المحلي
        chatId: this.currentChat.chatId,
        createdAt: Date.now() // وقت إضافي للمقارنة
      };
      
      await addDoc(messagesRef, messageData);

    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('فشل في إرسال الرسالة الصوتية');
    }
  }
}

export default ChatManager;
