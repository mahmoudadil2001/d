import { 
  auth, 
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from './firebase-config.js';

class ChallengeManager {
  constructor() {
    this.currentUser = null;
    this.challengeListeners = new Map();
    this.roomListener = null;
    this.currentRoom = null;
    this.currentChallenge = null;
    this.quizStarted = false;
    this.sessionStartTime = Date.now(); // تسجيل وقت بداية الجلسة
    this.challengeQuestions = []; // تهيئة مصفوفة الأسئلة
    this.questionsLoadAttempts = 0; // عداد محاولات التحميل
    this.maxLoadAttempts = 2; // الحد الأقصى لمحاولات التحميل

    // Initialize when auth state changes
    auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      if (user) {
        this.startListeningForChallenges();
      } else {
        this.stopListening();
        // مسح إشعارات الجلسة عند تسجيل الخروج
        this.clearSessionNotifications();
      }
    });
  }

  // Start listening for incoming challenges
  startListeningForChallenges() {
    if (!this.currentUser) return;

    // استمع للتحديات الواردة (للمستقبل)
    const challengesRef = collection(db, 'challenges');
    const incomingQuery = query(
      challengesRef,
      where('opponentId', '==', this.currentUser.uid),
      where('status', '==', 'pending')
    );

    const incomingUnsubscribe = onSnapshot(incomingQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          this.handleIncomingChallenge(change.doc.data(), change.doc.id);
        }
      });
    });

    this.challengeListeners.set('incoming', incomingUnsubscribe);

    // استمع للتحديات المقبولة والمرفوضة (للمرسل)
    const statusQuery = query(
      challengesRef,
      where('challengerId', '==', this.currentUser.uid)
    );

    const statusUnsubscribe = onSnapshot(statusQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const challengeData = change.doc.data();
          console.log('Challenge status changed:', challengeData.status, 'for challenger:', challengeData.challengerId);

          // التأكد من أن هذا التحدي للمستخدم الحالي
          if (challengeData.challengerId === this.currentUser.uid) {
            if (challengeData.status === 'accepted') {
              this.handleAcceptedChallenge(challengeData, change.doc.id);
            } else if (challengeData.status === 'declined') {
              this.handleDeclinedChallenge(challengeData, change.doc.id);
            } else if (challengeData.status === 'no_response') {
              this.handleNoResponseChallenge(challengeData, change.doc.id);
            }
          }
        }
      });
    });

    this.challengeListeners.set('status', statusUnsubscribe);
  }

  // Handle incoming challenge notification
  async handleIncomingChallenge(challengeData, challengeId) {
    try {
      // التحقق من أن المرسل غير مكتوم
      const muteKey = `muted_challenger_${challengeData.challengerId}`;
      const muteEndTime = sessionStorage.getItem(muteKey);
      
      if (muteEndTime && Date.now() < parseInt(muteEndTime)) {
        console.log('Challenger is muted, ignoring challenge');
        return;
      } else if (muteEndTime && Date.now() >= parseInt(muteEndTime)) {
        // إزالة الكتم إذا انتهى الوقت
        sessionStorage.removeItem(muteKey);
      }

      // التحقق من أن التحدي لم يتم تجاهله من قبل
      const skipKey = `challenge_skipped_${challengeId}`;
      if (sessionStorage.getItem(skipKey)) {
        console.log('Challenge was skipped, ignoring');
        return;
      }

      // التحقق من أن التحدي جديد ولم نعرض إشعاره من قبل
      const notificationKey = `challenge_incoming_${challengeId}`;
      const hasShownNotification = sessionStorage.getItem(notificationKey);

      // التحقق من أن التحدي تم إنشاؤه بعد بداية الجلسة الحالية
      const createdAt = challengeData.createdAt;
      let isNewChallenge = true;

      if (createdAt && createdAt.toMillis) {
        const createdTime = createdAt.toMillis();
        isNewChallenge = createdTime > this.sessionStartTime;
      }

      if (!hasShownNotification && isNewChallenge) {
        // تسجيل أننا عرضنا الإشعار
        sessionStorage.setItem(notificationKey, 'true');

        // Get challenger's name
        const challengerDoc = await getDoc(doc(db, 'users', challengeData.challengerId));
        const challengerName = challengerDoc.exists() ? 
          challengerDoc.data()['الاسم الكامل'] : 'مستخدم غير معروف';

        // Show challenge notification
        this.showChallengeNotification(challengeData, challengeId, challengerName);

        // بدء مؤقت لتنبيه المرسل في حالة عدم الرد لمدة 20 ثانية
        this.startChallengeResponseTimer(challengeId, challengeData);
      } else {
        console.log('Incoming challenge notification not shown - already shown or old challenge');
      }
    } catch (error) {
      console.error('Error handling incoming challenge:', error);
    }
  }

  // Handle declined challenge notification (for challenger)
  async handleDeclinedChallenge(challengeData, challengeId) {
    try {
      // إلغاء مؤقت انتظار الرد
      this.cancelChallengeResponseTimer(challengeId);

      // التحقق من أن التحدي قد تم رفضه حديثاً وأن المستخدم الحالي هو المرسل
      if (challengeData.challengerId === this.currentUser.uid && challengeData.status === 'declined') {
        console.log('Challenge declined! Checking if notification should be shown...');

        // التحقق من أن التحدي تم رفضه مؤخراً (خلال آخر 30 ثانية)
        const declinedAt = challengeData.declinedAt;
        const now = Date.now();

        let shouldShowNotification = false;

        if (declinedAt && declinedAt.toMillis) {
          const declinedTime = declinedAt.toMillis();
          shouldShowNotification = (now - declinedTime) < 30000; // 30 ثانية
        } else {
          shouldShowNotification = true; // إظهار الإشعار إذا لم يكن هناك timestamp
        }

        // التحقق من أننا لم نعرض هذا الإشعار من قبل
        const notificationKey = `challenge_declined_${challengeId}`;
        const hasShownNotification = sessionStorage.getItem(notificationKey);

        if (shouldShowNotification && !hasShownNotification) {
          console.log('Showing challenge declined notification...');

          // تسجيل أننا عرضنا الإشعار
          sessionStorage.setItem(notificationKey, 'true');

          // Get opponent's name
          const opponentDoc = await getDoc(doc(db, 'users', challengeData.opponentId));
          const opponentName = opponentDoc.exists() ? 
            opponentDoc.data()['الاسم الكامل'] : 'مستخدم غير معروف';

          // Show declined notification
          this.showChallengeDeclinedNotification(challengeData, challengeId, opponentName);
        } else {
          console.log('Declined notification not shown - either too old or already shown');
        }
      }

    } catch (error) {
      console.error('Error handling declined challenge:', error);
    }
  }

  // Handle no response challenge notification (for challenger)
  async handleNoResponseChallenge(challengeData, challengeId) {
    try {
      // إلغاء مؤقت انتظار الرد
      this.cancelChallengeResponseTimer(challengeId);

      // التحقق من أن المستخدم الحالي هو المرسل
      if (challengeData.challengerId === this.currentUser.uid) {
        console.log('Challenge had no response! Checking if notification should be shown...');

        // التحقق من أن عدم الرد حدث مؤخراً (خلال آخر 30 ثانية)
        const noResponseAt = challengeData.noResponseAt;
        const now = Date.now();

        let shouldShowNotification = false;

        if (noResponseAt && noResponseAt.toMillis) {
          const noResponseTime = noResponseAt.toMillis();
          shouldShowNotification = (now - noResponseTime) < 30000; // 30 ثانية
        } else {
          shouldShowNotification = true; // إظهار الإشعار إذا لم يكن هناك timestamp
        }

        // التحقق من أننا لم نعرض هذا الإشعار من قبل
        const notificationKey = `challenge_no_response_${challengeId}`;
        const hasShownNotification = sessionStorage.getItem(notificationKey);

        if (shouldShowNotification && !hasShownNotification) {
          console.log('Showing challenge no response notification...');

          // تسجيل أننا عرضنا الإشعار
          sessionStorage.setItem(notificationKey, 'true');

          // Get opponent's name
          const opponentDoc = await getDoc(doc(db, 'users', challengeData.opponentId));
          const opponentName = opponentDoc.exists() ? 
            opponentDoc.data()['الاسم الكامل'] : 'مستخدم غير معروف';

          // Show no response notification
          this.showChallengeTimeoutNotification(challengeData, challengeId, opponentName);
        } else {
          console.log('No response notification not shown - either too old or already shown');
        }
      }

    } catch (error) {
      console.error('Error handling no response challenge:', error);
    }
  }

  // Handle accepted challenge notification (for challenger)
  async handleAcceptedChallenge(challengeData, challengeId) {
    try {
      // إلغاء مؤقت انتظار الرد
      this.cancelChallengeResponseTimer(challengeId);

      // التحقق من أن التحدي قد تم قبوله حديثاً وأن المستخدم الحالي هو المرسل
      if (challengeData.challengerId === this.currentUser.uid && challengeData.status === 'accepted') {
        console.log('Challenge accepted! Checking if notification should be shown...');

        // التحقق من أن التحدي تم قبوله مؤخراً (خلال آخر 30 ثانية)
        const acceptedAt = challengeData.acceptedAt;
        const lastUpdated = challengeData.lastUpdated;
        const now = Date.now();

        let shouldShowNotification = false;

        if (acceptedAt && acceptedAt.toMillis) {
          // إذا كان acceptedAt موجود كـ Firestore timestamp
          const acceptedTime = acceptedAt.toMillis();
          shouldShowNotification = (now - acceptedTime) < 30000; // 30 ثانية
        } else if (lastUpdated) {
          // إذا كان lastUpdated موجود كـ timestamp عادي
          shouldShowNotification = (now - lastUpdated) < 30000; // 30 ثانية
        } else {
          // إذا لم يكن هناك timestamp، لا نعرض الإشعار
          shouldShowNotification = false;
        }

        // التحقق من أننا لم نعرض هذا الإشعار من قبل
        const notificationKey = `challenge_accepted_${challengeId}`;
        const hasShownNotification = sessionStorage.getItem(notificationKey);

        if (shouldShowNotification && !hasShownNotification) {
          console.log('Showing challenge accepted notification...');

          // تسجيل أننا عرضنا الإشعار
          sessionStorage.setItem(notificationKey, 'true');

          // Get opponent's name
          const opponentDoc = await getDoc(doc(db, 'users', challengeData.opponentId));
          const opponentName = opponentDoc.exists() ? 
            opponentDoc.data()['الاسم الكامل'] : 'مستخدم غير معروف';

          // Show acceptance notification
          this.showChallengeAcceptedNotification(challengeData, challengeId, opponentName);
        } else {
          console.log('Notification not shown - either too old or already shown');
        }
      }

    } catch (error) {
      console.error('Error handling accepted challenge:', error);
    }
  }

  // Get challenge room ID from database
  async getChallengeRoomId(challengeId) {
    try {
      const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
      if (challengeDoc.exists()) {
        const data = challengeDoc.data();
        return data.roomId;
      }
      return null;
    } catch (error) {
      console.error('Error getting challenge room ID:', error);
      return null;
    }
  }

  // Show challenge notification modal
  showChallengeNotification(challengeData, challengeId, challengerName) {
    const modal = document.createElement('div');
    modal.id = 'challengeNotificationModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 20px;
        padding: 30px;
        max-width: 400px;
        width: 90%;
        text-align: center;
        color: white;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.5s ease-out;
        font-family: 'Tajawal', sans-serif;
      ">
        <div style="font-size: 60px; margin-bottom: 20px;">⚔️</div>
        <h2 style="margin: 0 0 15px 0; font-size: 24px; font-weight: 700;">تحدي جديد!</h2>
        <p style="margin: 10px 0; font-size: 18px; line-height: 1.4;">
          <strong>${challengerName}</strong> تحداك في:
        </p>
        <div style="
          background: rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 15px;
          margin: 20px 0;
          border: 1px solid rgba(255, 255, 255, 0.3);
        ">
          <p style="margin: 5px 0; font-weight: 600;">📚 المادة: ${challengeData.subject}</p>
          <p style="margin: 5px 0; font-weight: 600;">📖 المحاضرة: ${challengeData.lecture}</p>
          <p style="margin: 5px 0; font-weight: 600;">🔢 النسخة: ${challengeData.version}</p>
        </div>

        <!-- عداد الوقت المتبقي -->
        <div id="challengeTimer" style="
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 12px;
          margin: 15px 0;
          text-align: center;
        ">
          <div style="font-size: 24px; font-weight: bold; color: #ffd700;" id="timerDisplay">15</div>
          <div style="font-size: 12px; opacity: 0.9;">ثانية متبقية للرد</div>
          <div style="
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 2px;
            margin-top: 8px;
            overflow: hidden;
          ">
            <div id="timerProgress" style="
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, #ffd700, #ff6b35);
              border-radius: 2px;
              transition: width 1s ease-out;
            "></div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 15px; justify-content: center; margin-top: 25px;">
          <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="acceptChallenge" style="
              background: linear-gradient(135deg, #28a745, #20c997);
              color: white;
              border: none;
              border-radius: 12px;
              padding: 12px 25px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              font-family: 'Tajawal', sans-serif;
            ">✅ قبول التحدي</button>
            <button id="declineChallenge" style="
              background: linear-gradient(135deg, #dc3545, #c82333);
              color: white;
              border: none;
              border-radius: 12px;
              padding: 12px 25px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              font-family: 'Tajawal', sans-serif;
            ">❌ رفض</button>
          </div>
          
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="skipChallenge" style="
              background: linear-gradient(135deg, #6c757d, #495057);
              color: white;
              border: none;
              border-radius: 10px;
              padding: 8px 16px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.3s ease;
              font-family: 'Tajawal', sans-serif;
            ">⏭️ تجاهل</button>
            <button id="muteChallenger" style="
              background: linear-gradient(135deg, #ffc107, #fd7e14);
              color: white;
              border: none;
              border-radius: 10px;
              padding: 8px 16px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.3s ease;
              font-family: 'Tajawal', sans-serif;
            ">🔇 إيقاف لدقيقة</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // بدء العداد التنازلي للمستقبل
    let timeLeft = 15;
    let userResponded = false; // متتبع لمعرفة ما إذا كان المستخدم قد رد أم لا
    const timerDisplay = document.getElementById('timerDisplay');
    const timerProgress = document.getElementById('timerProgress');
    
    const timerInterval = setInterval(() => {
      timeLeft--;
      timerDisplay.textContent = timeLeft;
      
      // تحديث شريط التقدم
      const progressPercentage = (timeLeft / 15) * 100;
      timerProgress.style.width = `${progressPercentage}%`;
      
      // تغيير اللون عند اقتراب انتهاء الوقت
      if (timeLeft <= 5) {
        timerDisplay.style.color = '#ff4444';
        timerProgress.style.background = 'linear-gradient(90deg, #ff4444, #cc0000)';
      }
      
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        // إذا لم يرد المستخدم، أرسل إشعار "لا يوجد رد"
        if (!userResponded) {
          this.sendNoResponseNotification(challengeData, challengeId, challengerName);
        }
        // إغلاق النافذة تلقائياً
        if (document.getElementById('challengeNotificationModal')) {
          document.body.removeChild(modal);
        }
      }
    }, 1000);

    // Handle accept/decline/skip/mute
    modal.querySelector('#acceptChallenge').onclick = () => {
      userResponded = true; // تم الرد
      clearInterval(timerInterval);
      this.acceptChallenge(challengeId, challengeData);
      document.body.removeChild(modal);
    };

    modal.querySelector('#declineChallenge').onclick = () => {
      userResponded = true; // تم الرد (رفض مباشر)
      clearInterval(timerInterval);
      this.declineChallenge(challengeId);
      document.body.removeChild(modal);
    };

    modal.querySelector('#skipChallenge').onclick = () => {
      userResponded = true; // تم الرد (تجاهل)
      clearInterval(timerInterval);
      this.skipChallenge(challengeId);
      document.body.removeChild(modal);
    };

    modal.querySelector('#muteChallenger').onclick = () => {
      userResponded = true; // تم الرد (كتم)
      clearInterval(timerInterval);
      this.muteChallenger(challengeData.challengerId, challengeId);
      document.body.removeChild(modal);
    };

    // إلغاء المؤقت إذا تم إغلاق النافذة يدوياً
    modal.addEventListener('remove', () => {
      clearInterval(timerInterval);
    });
  }

  // Send challenge to a friend
  async sendChallenge(friendUid, subject, lecture, version) {
    try {
      const challengeData = {
        challengerId: this.currentUser.uid,
        opponentId: friendUid,
        subject: subject,
        lecture: lecture,
        version: version,
        status: 'pending',
        createdAt: serverTimestamp()
      };

      const challengeDocRef = await addDoc(collection(db, 'challenges'), challengeData);
      const challengeId = challengeDocRef.id;

      // Get friend's name for the countdown modal
      const friendDoc = await getDoc(doc(db, 'users', friendUid));
      const friendName = friendDoc.exists() ? 
        friendDoc.data()['الاسم الكامل'] : 'مستخدم غير معروف';

      // Show challenge countdown modal
      this.showChallengeCountdownModal(challengeId, friendName, subject, lecture, version);

    } catch (error) {
      console.error('Error sending challenge:', error);
      this.showToast('حدث خطأ في إرسال التحدي', 'error');
    }
  }

  // Show challenge countdown modal with cancel option
  showChallengeCountdownModal(challengeId, friendName, subject, lecture, version) {
    const modal = document.createElement('div');
    modal.id = 'challengeCountdownModal';
    modal.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 15px;
        padding: 20px;
        max-width: 320px;
        color: white;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        font-family: 'Tajawal', sans-serif;
        border: 2px solid rgba(255, 255, 255, 0.2);
      ">
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
          <div style="font-size: 35px;">⏰</div>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700;">تم إرسال التحدي!</h3>
            <p style="margin: 2px 0 0 0; font-size: 12px; opacity: 0.9;">إلى: <strong>${friendName}</strong></p>
          </div>
        </div>

        <div style="
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 15px;
          text-align: center;
        ">
          <div style="font-size: 24px; font-weight: bold; color: #ffd700;" id="countdownDisplay">15</div>
          <div style="font-size: 11px; opacity: 0.8;">ثانية متبقية</div>
          <div style="
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.3);
            border-radius: 2px;
            margin-top: 8px;
            overflow: hidden;
          ">
            <div id="countdownProgress" style="
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, #ffd700, #ff6b35);
              border-radius: 2px;
              transition: width 1s ease-out;
            "></div>
          </div>
        </div>

        <div style="display: flex; justify-content: center;">
          <button id="cancelChallengeBtn" style="
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: white;
            border: none;
            border-radius: 8px;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Tajawal', sans-serif;
            box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
          ">❌ إلغاء</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    let countdown = 15;
    const countdownDisplay = document.getElementById('countdownDisplay');
    const countdownProgress = document.getElementById('countdownProgress');

    // Start countdown
    const countdownInterval = setInterval(() => {
      countdown--;
      countdownDisplay.textContent = countdown;
      
      // Update progress bar
      const progressPercentage = (countdown / 15) * 100;
      countdownProgress.style.width = `${progressPercentage}%`;

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        document.body.removeChild(modal);
      }
    }, 1000);

    // Handle cancel challenge
    document.getElementById('cancelChallengeBtn').onclick = async () => {
      try {
        clearInterval(countdownInterval);
        
        // Cancel the response timer
        this.cancelChallengeResponseTimer(challengeId);
        
        // Delete the challenge from database
        await deleteDoc(doc(db, 'challenges', challengeId));
        
        document.body.removeChild(modal);
        this.showToast('تم إلغاء التحدي بنجاح', 'info');
        
      } catch (error) {
        console.error('Error cancelling challenge:', error);
        this.showToast('حدث خطأ في إلغاء التحدي', 'error');
      }
    };

    // Auto-close after 15 seconds
    setTimeout(() => {
      clearInterval(countdownInterval);
      if (document.getElementById('challengeCountdownModal')) {
        document.body.removeChild(modal);
      }
    }, 15000);

    // Show success toast
    this.showToast('تم إرسال التحدي! انتظار الرد...', 'success');
  }

  // Show challenge declined notification
  showChallengeDeclinedNotification(challengeData, challengeId, opponentName) {
    console.log('Showing challenge declined notification');

    // إزالة أي إشعارات سابقة
    const existingToast = document.getElementById('challengeDeclinedToast');
    if (existingToast) {
      document.body.removeChild(existingToast);
    }

    const toast = document.createElement('div');
    toast.id = 'challengeDeclinedToast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #dc3545, #c82333);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      font-family: 'Tajawal', sans-serif;
      font-weight: 600;
      z-index: 10001;
      animation: slideInRight 0.5s ease-out, fadeOut 0.5s ease-out 3.5s;
      box-shadow: 0 5px 15px rgba(220, 53, 69, 0.3);
      max-width: 300px;
      text-align: center;
    `;

    toast.innerHTML = `
      <div style="font-size: 20px; margin-bottom: 5px;">❌</div>
      <div style="font-size: 14px; margin-bottom: 3px; font-weight: 700;">تم رفض التحدي</div>
      <div style="font-size: 12px; opacity: 0.9;">من طرف ${opponentName}</div>
      <div style="font-size: 11px; margin-top: 5px; opacity: 0.8;">تم الرفض بشكل مباشر</div>
    `;

    document.body.appendChild(toast);

    // إغلاق تلقائي بعد 4 ثواني
    setTimeout(() => {
      if (document.getElementById('challengeDeclinedToast')) {
        document.body.removeChild(toast);
      }
    }, 4000);
  }

  // Show challenge timeout notification
  showChallengeTimeoutNotification(challengeData, challengeId, opponentName) {
    console.log('Showing challenge timeout notification');

    // إزالة أي إشعارات سابقة
    const existingToast = document.getElementById('challengeTimeoutToast');
    if (existingToast) {
      document.body.removeChild(existingToast);
    }

    const toast = document.createElement('div');
    toast.id = 'challengeTimeoutToast';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ff9800, #f57c00);
      color: white;
      padding: 10px 16px;
      border-radius: 8px;
      font-family: 'Tajawal', sans-serif;
      font-weight: 600;
      z-index: 10001;
      animation: slideInRight 0.3s ease-out, fadeOut 0.3s ease-out 2.7s;
      box-shadow: 0 3px 10px rgba(255, 152, 0, 0.3);
      max-width: 250px;
      text-align: center;
    `;

    toast.innerHTML = `
      <div style="font-size: 18px; margin-bottom: 4px;">⏰</div>
      <div style="font-size: 13px; font-weight: 700;">لا يوجد رد للتحدي</div>
      <div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">من ${opponentName}</div>
    `;

    document.body.appendChild(toast);

    // إغلاق تلقائي بعد 3 ثواني
    setTimeout(() => {
      if (document.getElementById('challengeTimeoutToast')) {
        document.body.removeChild(toast);
      }
    }, 3000);

    // تسجيل أننا عرضنا إشعار انتهاء المهلة الزمنية
    const notificationKey = `challenge_timeout_${challengeId}`;
    sessionStorage.setItem(notificationKey, 'true');
  }

  // Show challenge accepted notification
  showChallengeAcceptedNotification(challengeData, challengeId, opponentName) {
    console.log('Showing challenge accepted notification for challenger');

    // إزالة أي إشعارات سابقة
    const existingModal = document.getElementById('challengeAcceptedModal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }



    const modal = document.createElement('div');
    modal.id = 'challengeAcceptedModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(10px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
    `;

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #28a745, #20c997);
        border-radius: 20px;
        padding: 30px;
        max-width: 450px;
        width: 95%;
        text-align: center;
        color: white;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        animation: bounceIn 0.8s ease-out;
        font-family: 'Tajawal', sans-serif;
      ">
        <div style="font-size: 80px; margin-bottom: 20px; animation: pulse 2s infinite;">🎉</div>
        <h2 style="margin: 0 0 15px 0; font-size: 28px; font-weight: 700; text-shadow: 0 2px 10px rgba(0,0,0,0.3);">
          تم قبول التحدي!
        </h2>
        <p style="margin: 15px 0; font-size: 20px; line-height: 1.4; text-shadow: 0 1px 5px rgba(0,0,0,0.3);">
          <strong style="color: #fff200;">🏆 ${opponentName}</strong><br>
          قبل تحديك ويريد المواجهة!
        </p>

        <div style="
          background: rgba(255, 255, 255, 0.25);
          border-radius: 15px;
          padding: 20px;
          margin: 25px 0;
          border: 2px solid rgba(255, 255, 255, 0.4);
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);
        ">
          <p style="margin: 8px 0; font-weight: 600; font-size: 16px;">📚 المادة: <span style="color: #fff200;">${challengeData.subject}</span></p>
          <p style="margin: 8px 0; font-weight: 600; font-size: 16px;">📖 المحاضرة: <span style="color: #fff200;">${challengeData.lecture}</span></p>
          <p style="margin: 8px 0; font-weight: 600; font-size: 16px;">🔢 النسخة: <span style="color: #fff200;">${challengeData.version}</span></p>
        </div>

        <div style="
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
          padding: 15px;
          margin: 20px 0;
          border: 1px solid rgba(255, 255, 255, 0.3);
        ">
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #ffeb3b;">
            ⚡ هل أنت مستعد للمواجهة؟
          </p>
        </div>

        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 30px;">
          <button id="enterChallengeBtn" style="
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            border: none;
            border-radius: 15px;
            padding: 15px 30px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Tajawal', sans-serif;
            box-shadow: 0 8px 20px rgba(255, 107, 53, 0.4);
            text-shadow: 0 2px 5px rgba(0,0,0,0.3);
          ">🚀 ابدأ المواجهة</button>
          <button id="declineEnterBtn" style="
            background: linear-gradient(135deg, #6c757d, #495057);
            color: white;
            border: none;
            border-radius: 15px;
            padding: 15px 30px;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Tajawal', sans-serif;
            box-shadow: 0 8px 20px rgba(108, 117, 125, 0.4);
          ">❌ ليس الآن</button>
        </div>

        <div style="margin-top: 20px; font-size: 14px; opacity: 0.9;">
          ⏰ ستنتهي صلاحية هذا الإشعار خلال دقيقة واحدة
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Handle enter challenge
    modal.querySelector('#enterChallengeBtn').onclick = () => {
      console.log('User chose to enter challenge');
      document.body.removeChild(modal);

      // التأكد من وجود roomId والدخول للتحدي
      if (challengeData.roomId) {
        console.log('User clicked to enter challenge with roomId:', challengeData.roomId);
        this.startChallenge(challengeData.roomId, challengeData);
      } else {
        console.error('No roomId found, trying to get it from database');
        this.getChallengeRoomId(challengeId).then(roomId => {
          if (roomId) {
            challengeData.roomId = roomId;
            this.startChallenge(roomId, challengeData);
          } else {
            this.showToast('خطأ: لا يمكن الوصول للتحدي', 'error');
          }
        });
      }
    };

    // Handle decline
    modal.querySelector('#declineEnterBtn').onclick = () => {
      console.log('User declined to enter challenge');
      document.body.removeChild(modal);
      this.showToast('تم تأجيل دخول التحدي', 'info');
    };

    // Auto-close after 60 seconds with decline
    setTimeout(() => {
      if (document.getElementById('challengeAcceptedModal')) {
        document.body.removeChild(modal);
        this.showToast('انتهت صلاحية إشعار التحدي', 'info');
      }
    }, 60000);
  }



  // Accept challenge
  async acceptChallenge(challengeId, challengeData) {
    try {
      // إلغاء مؤقت انتظار الرد
      this.cancelChallengeResponseTimer(challengeId);

      // Create room for the challenge
      const roomId = `challenge_${challengeId}_${Date.now()}`;

      // تحديث بيانات التحدي لتشمل roomId
      challengeData.roomId = roomId;

      // Create challenge room first
      await setDoc(doc(db, 'challengeRooms', roomId), {
        challengeId: challengeId,
        challengerId: challengeData.challengerId,
        opponentId: challengeData.opponentId,
        subject: challengeData.subject,
        lecture: challengeData.lecture,
        version: challengeData.version,
        status: 'active',
        createdAt: serverTimestamp(),
        bothPlayersJoined: false,
        players: {
          [challengeData.challengerId]: {
            currentQuestion: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            isFinished: false,
            isReady: false,
            joinedAt: null
          },
          [challengeData.opponentId]: {
            currentQuestion: 0,
            correctAnswers: 0,
            wrongAnswers: 0,
            isFinished: false,
            isReady: false,
            joinedAt: null
          }
        }
      });

      console.log('Updating challenge status to accepted for challenge:', challengeId);

      // Update challenge status - هذا سيؤدي إلى تشغيل handleAcceptedChallenge عند المرسل
      await updateDoc(doc(db, 'challenges', challengeId), {
        status: 'accepted',
        roomId: roomId,
        acceptedAt: serverTimestamp(),
        lastUpdated: Date.now() // إضافة timestamp إضافي لضمان التحديث
      });

      console.log('Challenge status updated successfully');
      this.showToast('تم قبول التحدي! جاري التحضير... ⚔️', 'success');

      // Start challenge for accepter immediately
      setTimeout(() => {
        console.log('Starting challenge for accepter with roomId:', roomId);
        this.startChallenge(roomId, challengeData);
      }, 1500);

    } catch (error) {
      console.error('Error accepting challenge:', error);
      this.showToast('حدث خطأ في قبول التحدي', 'error');
    }
  }

  // Decline challenge
  async declineChallenge(challengeId) {
    try {
      await updateDoc(doc(db, 'challenges', challengeId), {
        status: 'declined',
        declinedAt: serverTimestamp()
      });

      // إلغاء مؤقت انتظار الرد إذا كان المستخدم الحالي هو المستقبل
      this.cancelChallengeResponseTimer(challengeId);

      this.showToast('تم رفض التحدي', 'info');
    } catch (error) {
      console.error('Error declining challenge:', error);
    }
  }

  // Skip challenge (delete challenge and let timeout notification handle it)
  async skipChallenge(challengeId) {
    try {
      // إلغاء مؤقت انتظار الرد لهذا المستقبل فقط (لا نلغيه للمرسل)
      // هذا سيسمح بإرسال إشعار timeout للمرسل
      
      // حذف التحدي بعد تأخير قصير للسماح للمؤقت بإرسال إشعار timeout
      setTimeout(async () => {
        try {
          await deleteDoc(doc(db, 'challenges', challengeId));
          console.log('Challenge deleted after skip');
        } catch (error) {
          console.error('Error deleting skipped challenge:', error);
        }
      }, 500);

      // تسجيل أن التحدي تم تجاهله محلياً
      const notificationKey = `challenge_skipped_${challengeId}`;
      sessionStorage.setItem(notificationKey, 'true');

      this.showToast('تم تجاهل التحدي', 'info');
    } catch (error) {
      console.error('Error skipping challenge:', error);
    }
  }

  // Mute challenger for 1 minute
  async muteChallenger(challengerId, challengeId = null) {
    try {
      // حفظ معرف المستخدم المكتوم مع وقت انتهاء الكتم
      const muteEndTime = Date.now() + 60000; // دقيقة واحدة
      const muteKey = `muted_challenger_${challengerId}`;
      sessionStorage.setItem(muteKey, muteEndTime.toString());

      // إذا تم تمرير challengeId، احذف التحدي الحالي بعد تأخير قصير
      // للسماح للمؤقت بإرسال إشعار timeout للمرسل
      if (challengeId) {
        setTimeout(async () => {
          try {
            await deleteDoc(doc(db, 'challenges', challengeId));
            console.log('Challenge deleted after mute');
          } catch (error) {
            console.error('Error deleting muted challenge:', error);
          }
        }, 500);
      }

      this.showToast('تم إيقاف الإشعارات من هذا المستخدم لمدة دقيقة', 'info');
    } catch (error) {
      console.error('Error muting challenger:', error);
    }
  }

  // Start challenge quiz
  async startChallenge(roomId, challengeData) {
    console.log('Starting challenge with roomId:', roomId, 'challengeData:', challengeData);

    this.currentRoom = roomId;
    this.currentChallenge = challengeData;
    this.reloadAttempted = false;
    this.quizReloadAttempted = false;
    this.isReloadingQuestions = false;

    // إغلاق قائمة الأصدقاء إذا كانت مفتوحة
    const friendsModal = document.getElementById('friendsModal');
    if (friendsModal && friendsModal.style.display === 'flex') {
      friendsModal.style.display = 'none';
      console.log('Friends modal closed automatically when entering challenge');
    }

    // Hide main interface
    document.getElementById('controlsContainer').style.display = 'none';
    document.getElementById('questionsContainer').style.display = 'none';

    // Show challenge interface
    this.createChallengeInterface();

    // Mark player as ready and joined
    try {
      const roomRef = doc(db, 'challengeRooms', roomId);
      const updateData = {};
      updateData[`players.${this.currentUser.uid}.joinedAt`] = serverTimestamp();
      updateData[`players.${this.currentUser.uid}.isReady`] = true;
      updateData[`playersReady.${this.currentUser.uid}`] = true;

      await updateDoc(roomRef, updateData);
      console.log('Player marked as ready in room:', roomId);
    } catch (error) {
      console.error('Error marking player as ready:', error);
    }

    // Start listening to room first
    this.startListeningToRoom(roomId);

    // Load questions
    try {
      console.log('Loading questions for challenge:', {
        subject: challengeData.subject,
        lecture: challengeData.lecture, 
        version: challengeData.version
      });

      const questions = await this.loadChallengeQuestions(
        challengeData.subject, 
        challengeData.lecture, 
        challengeData.version
      );

      console.log('Questions loaded successfully, count:', questions.length);
      this.challengeQuestions = questions;

      // Show waiting message until both players are ready
      this.showWaitingForOpponent();

    } catch (error) {
      console.error('Error loading challenge questions:', error);
      this.showToast('حدث خطأ في تحميل الأسئلة: ' + error.message, 'error');
      this.exitChallenge();
    }
  }

  // Show waiting for opponent message
  showWaitingForOpponent() {
    const container = document.getElementById('challengeQuestionContainer');
    if (!container) return;

    container.innerHTML = `
      <div style="
        text-align: center;
        color: white;
        padding: 40px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 20px;
        margin: 20px 0;
      ">
        <div style="font-size: 60px; margin-bottom: 20px;">⏳</div>
        <h2 style="margin: 0 0 15px 0;">في انتظار انضمام الخصم...</h2>
        <p style="font-size: 16px; opacity: 0.9;">يرجى الانتظار حتى ينضم خصمك للتحدي</p>
        <div style="
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        "></div>
      </div>
    `;
  }

  // Check if both players are ready and start the quiz
  checkPlayersReadiness(roomData) {
    const player1Ready = roomData.playersReady?.[this.currentChallenge.challengerId] || false;
    const player2Ready = roomData.playersReady?.[this.currentChallenge.opponentId] || false;

    console.log('Players readiness check:', { player1Ready, player2Ready });

    if (player1Ready && player2Ready && !this.quizStarted) {
      console.log('Both players ready, starting quiz!');

      // التأكد من تحميل الأسئلة قبل البدء
      if (!this.challengeQuestions || this.challengeQuestions.length === 0) {
        console.log('Questions not loaded yet, loading now...');
        // إعادة تحميل الأسئلة
        this.loadChallengeQuestions(
          this.currentChallenge.subject,
          this.currentChallenge.lecture,
          this.currentChallenge.version
        ).then((questions) => {
          this.challengeQuestions = questions;
          console.log('Questions reloaded successfully, count:', questions.length);
          this.quizStarted = true;
          this.showStartCountdown();
        }).catch((error) => {
          console.error('Failed to reload questions:', error);
          this.showToast('خطأ في تحميل الأسئلة', 'error');
          this.exitChallenge();
        });
        return;
      }

      this.quizStarted = true;

      // Show countdown before starting
      this.showStartCountdown();
    }
  }

  // Show countdown before starting the quiz
  showStartCountdown() {
    const container = document.getElementById('challengeQuestionContainer');
    if (!container) return;

    let countdown = 3;

    const updateCountdown = () => {
      container.innerHTML = `
        <div style="
          text-align: center;
          color: white;
          padding: 40px;
          background: linear-gradient(135deg, #28a745, #20c997);
          border-radius: 20px;
          margin: 20px 0;
        ">
          <div style="font-size: 120px; margin-bottom: 20px; font-weight: bold; text-shadow: 0 4px 8px rgba(0,0,0,0.3);">${countdown}</div>
          <h2 style="margin: 0; font-size: 24px;">التحدي سيبدأ خلال...</h2>
          <p style="font-size: 14px; margin-top: 10px; opacity: 0.9;">عدد الأسئلة: ${this.challengeQuestions ? this.challengeQuestions.length : 'يتم التحميل...'}</p>
        </div>
      `;
    };

    updateCountdown();

    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        updateCountdown();
      } else {
        clearInterval(countdownInterval);
        // الانتقال مباشرة للأسئلة بدون عرض "ابدأ الآن"
        console.log('Countdown finished, starting quiz immediately');

        if (this.challengeQuestions && this.challengeQuestions.length > 0) {
          console.log('Questions available, starting quiz with', this.challengeQuestions.length, 'questions');
          this.startChallengeQuiz();
        } else {
          console.error('Questions not available, attempting emergency reload...');
          container.innerHTML = `
            <div style="
              text-align: center;
              color: white;
              padding: 40px;
              background: linear-gradient(135deg, #dc3545, #c82333);
              border-radius: 20px;
              margin: 20px 0;
            ">
              <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
              <h2 style="margin: 0; font-size: 24px;">جاري إعادة تحميل الأسئلة...</h2>
            </div>
          `;

          // محاولة إعادة تحميل الأسئلة
          this.loadChallengeQuestions(
            this.currentChallenge.subject,
            this.currentChallenge.lecture,
            this.currentChallenge.version
          ).then((questions) => {
            this.challengeQuestions = questions;
            console.log('Emergency reload successful, starting quiz');
            this.startChallengeQuiz();
          }).catch((error) => {
            console.error('Emergency reload failed:', error);
            this.showToast('خطأ في تحميل الأسئلة: ' + error.message, 'error');
            this.exitChallenge();
          });
        }
      }
    }, 1000);
  }

  // Start challenge quiz (updated to work with new flow)
  startChallengeQuiz() {
    // إعادة تعيين مؤشرات إعادة التحميل
    this.reloadAttempted = false;
    this.isReloadingQuestions = false;

    if (!this.challengeQuestions || !Array.isArray(this.challengeQuestions) || this.challengeQuestions.length === 0) {
      console.error('No questions loaded for challenge, attempting reload...');

      // منع حلقة التحميل المستمرة
      if (this.quizReloadAttempted) {
        console.error('Quiz reload already attempted, exiting challenge');
        this.showToast('خطأ: فشل في تحميل أسئلة التحدي', 'error');
        setTimeout(() => this.exitChallenge(), 2000);
        return;
      }

      // محاولة إعادة تحميل الأسئلة
      if (this.currentChallenge && !this.reloadAttempted) {
        this.reloadAttempted = true;
        this.isReloadingQuestions = true;

        console.log('Attempting to reload questions in startChallengeQuiz...');

        this.loadChallengeQuestions(
          this.currentChallenge.subject,
          this.currentChallenge.lecture,
          this.currentChallenge.version
        ).then((questions) => {
          if (questions && Array.isArray(questions) && questions.length > 0) {
            this.challengeQuestions = questions;
            this.isReloadingQuestions = false;
            console.log('Questions reloaded in startChallengeQuiz, count:', questions.length);

            // إعادة تعيين المؤشرات وبدء التحدي
            this.currentQuestionIndex = 0;
            this.correctAnswers = 0;
            this.wrongAnswers = 0;

            // التأكد من وجود الحاوية
            const container = document.getElementById('challengeQuestionContainer');
            if (container) {
              this.displayChallengeQuestion();
            } else {
              console.error('Challenge question container not found after reload');
              this.showToast('خطأ في واجهة التحدي', 'error');
            }
          } else {
            throw new Error('Invalid questions array returned from reload');
          }
        }).catch((error) => {
          this.isReloadingQuestions = false;
          console.error('Failed to reload questions in startChallengeQuiz:', error);
          this.showToast('خطأ: فشل في تحميل الأسئلة - ' + error.message, 'error');
          setTimeout(() => this.exitChallenge(), 3000);
        });
      } else {
        this.showToast('خطأ: لا توجد بيانات التحدي', 'error');
        setTimeout(() => this.exitChallenge(), 2000);
      }
      return;
    }

    // إعادة تعيين حالة التحدي
    this.currentQuestionIndex = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;

    console.log('Starting challenge quiz with', this.challengeQuestions.length, 'questions');
    console.log('First question:', this.challengeQuestions[0]);

    // تأكد من أن الحاوية موجودة
    const container = document.getElementById('challengeQuestionContainer');
    if (!container) {
      console.error('Challenge question container not found');
      this.showToast('خطأ في واجهة التحدي', 'error');
      return;
    }

    this.displayChallengeQuestion();
  }

  // Create challenge interface
  createChallengeInterface() {
    const container = document.querySelector('.container');

    const challengeInterface = document.createElement('div');
    challengeInterface.id = 'challengeInterface';
    challengeInterface.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 20px;
        padding: 20px;
        margin-bottom: 20px;
        color: white;
        text-align: center;
      ">
        <h2 style="margin: 0 0 15px 0; font-size: 28px;">⚔️ وضع التحدي</h2>
        <div id="challengeProgress" style="
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 20px;
        ">
          <div id="player1Stats" style="
            flex: 1;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 15px;
          ">
            <h3 style="margin: 0 0 10px 0;">أنت</h3>
            <div class="stat">السؤال: <span id="p1CurrentQ">0</span></div>
            <div class="stat">صحيح: <span id="p1Correct">0</span></div>
            <div class="stat">خطأ: <span id="p1Wrong">0</span></div>
            <div id="p1Progress" style="
              width: 100%;
              height: 10px;
              background: rgba(255, 255, 255, 0.3);
              border-radius: 5px;
              margin-top: 10px;
              overflow: hidden;
            ">
              <div style="
                width: 0%;
                height: 100%;
                background: linear-gradient(90deg, #28a745, #20c997);
                transition: width 0.5s ease;
              "></div>
            </div>
          </div>

          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #ffd700;
          ">VS</div>

          <div id="player2Stats" style="
            flex: 1;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            padding: 15px;
          ">
            <h3 style="margin: 0 0 10px 0;" id="opponentName">الخصم</h3>
            <div class="stat">السؤال: <span id="p2CurrentQ">0</span></div>
            <div class="stat">صحيح: <span id="p2Correct">0</span></div>
            <div class="stat">خطأ: <span id="p2Wrong">0</span></div>
            <div id="p2Progress" style="
              width: 100%;
              height: 10px;
              background: rgba(255, 255, 255, 0.3);
              border-radius: 5px;
              margin-top: 10px;
              overflow: hidden;
            ">
              <div style="
                width: 0%;
                height: 100%;
                background: linear-gradient(90deg, #dc3545, #c82333);
                transition: width 0.5s ease;
              "></div>
            </div>
          </div>
        </div>
      </div>

      <div id="challengeQuestionContainer">
        <!-- Questions will be loaded here -->
      </div>

      <button id="exitChallenge" style="
        background: linear-gradient(135deg, #6c757d, #495057);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px 20px;
        font-size: 16px;
        cursor: pointer;
        margin-top: 20px;
        font-family: 'Tajawal', sans-serif;
      ">🚪 الخروج من التحدي</button>
    `;

    container.appendChild(challengeInterface);

    // Handle exit challenge
    document.getElementById('exitChallenge').onclick = () => {
      this.exitChallenge();
    };
  }

  // Load challenge questions
  async loadChallengeQuestions(subject, lecture, version) {
    const fileName = `./${subject}/${subject}${lecture}/${subject}${lecture}_v${version}.js`;

    try {
      console.log('Loading questions from:', fileName);

      // إضافة معامل عشوائي لتجنب الكاش
      const timestamp = Date.now();
      const moduleUrl = `${fileName}?t=${timestamp}`;

      const module = await import(moduleUrl);
      const questions = module.questions || module.default?.questions || module.default;

      if (!questions) {
        throw new Error(`No questions object found in ${fileName}`);
      }

      if (!Array.isArray(questions)) {
        throw new Error(`Questions is not an array in ${fileName}`);
      }

      if (questions.length === 0) {
        throw new Error(`No questions found in array from ${fileName}`);
      }

      // التحقق من صحة بنية الأسئلة
      const validQuestions = questions.filter(q => 
        q && 
        typeof q.question === 'string' && 
        Array.isArray(q.options) && 
        q.options.length > 0 && 
        typeof q.answer === 'number'
      );

      if (validQuestions.length === 0) {
        throw new Error(`No valid question structure found in ${fileName}`);
      }

      if (validQuestions.length !== questions.length) {
        console.warn(`Some questions have invalid structure in ${fileName}. Using ${validQuestions.length} valid questions out of ${questions.length}`);
      }

      console.log(`Successfully loaded ${validQuestions.length} valid questions from ${fileName}`);
      return validQuestions;
    } catch (error) {
      console.error('Error loading questions from:', fileName, error);
      throw new Error(`فشل في تحميل الأسئلة من: ${fileName} - ${error.message}`);
    }
  }

  // Start challenge quiz
  startChallengeQuiz(questions) {
    this.challengeQuestions = questions;
    this.currentQuestionIndex = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;

    this.displayChallengeQuestion();
  }

  // Display current challenge question
  displayChallengeQuestion() {
    console.log('displayChallengeQuestion called, currentIndex:', this.currentQuestionIndex);
    console.log('Total questions:', this.challengeQuestions ? this.challengeQuestions.length : 'undefined');

    // التحقق من وجود التحدي الحالي أولاً
    if (!this.currentChallenge) {
      console.log('No current challenge, exiting display function');
      return;
    }

    // التحقق من صحة الأسئلة مع معالجة محسنة للأخطاء
    if (!this.challengeQuestions || !Array.isArray(this.challengeQuestions) || this.challengeQuestions.length === 0) {
      console.error('challengeQuestions is undefined or not an array');

      // منع حلقة التحميل المستمرة
      if (this.isReloadingQuestions) {
        console.error('Already reloading questions, avoiding infinite loop');
        this.showToast('خطأ في تحميل الأسئلة', 'error');
        setTimeout(() => this.exitChallenge(), 2000);
        return;
      }

      // محاولة إعادة تحميل الأسئلة مرة واحدة فقط
      if (this.currentChallenge && !this.reloadAttempted) {
        this.reloadAttempted = true;
        this.isReloadingQuestions = true;
        console.log('Attempting to reload questions...');

        // عرض رسالة تحميل
        const container = document.getElementById('challengeQuestionContainer');
        if (container) {
          container.innerHTML = `
            <div style="
              text-align: center;
              color: white;
              padding: 40px;
              background: linear-gradient(135deg, #ffc107, #fd7e14);
              border-radius: 20px;
              margin: 20px 0;
            ">
              <div style="font-size: 60px; margin-bottom: 20px;">⚠️</div>
              <h2 style="margin: 0; font-size: 24px;">جاري إعادة تحميل الأسئلة...</h2>
              <div style="
                width: 40px;
                height: 40px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 20px auto;
              "></div>
            </div>
          `;
        }

        this.loadChallengeQuestions(
          this.currentChallenge.subject,
          this.currentChallenge.lecture,
          this.currentChallenge.version
        ).then((questions) => {
          if (questions && Array.isArray(questions) && questions.length > 0) {
            this.challengeQuestions = questions;
            this.isReloadingQuestions = false;
            console.log('Questions reloaded in displayChallengeQuestion, count:', questions.length);
            this.displayChallengeQuestion(); // إعادة استدعاء الدالة
          } else {
            throw new Error('Invalid questions array returned');
          }
        }).catch((error) => {
          this.isReloadingQuestions = false;
          console.error('Failed to reload questions in displayChallengeQuestion:', error);
          this.showToast('فشل في إعادة تحميل الأسئلة: ' + error.message, 'error');
          setTimeout(() => this.exitChallenge(), 3000);
        });
      } else {
        this.showToast('خطأ: الأسئلة غير متاحة', 'error');
        setTimeout(() => this.exitChallenge(), 2000);
      }
      return;
    }

    if (this.currentQuestionIndex >= this.challengeQuestions.length) {
      console.log('Reached end of questions, finishing challenge');
      this.finishChallenge();
      return;
    }

    const question = this.challengeQuestions[this.currentQuestionIndex];
    console.log('Displaying question:', this.currentQuestionIndex + 1, 'of', this.challengeQuestions.length);
    console.log('Question data:', question);

    const container = document.getElementById('challengeQuestionContainer');
    if (!container) {
      console.error('Challenge question container not found');
      this.showToast('خطأ: لا يمكن العثور على حاوية الأسئلة', 'error');
      return;
    }

    if (!question || !question.question || !question.options) {
      console.error('Invalid question data:', question);
      this.showToast('خطأ: بيانات السؤال غير صالحة', 'error');
      return;
    }

    container.innerHTML = `
      <div style="
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-radius: 15px;
        padding: 25px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        margin-bottom: 20px;
      ">
        <div style="
          color: #6c757d;
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 15px;
          text-align: left;
          direction: ltr;
          padding: 8px 12px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 8px;
          border-left: 4px solid #667eea;
        ">
          السؤال ${this.currentQuestionIndex + 1} من ${this.challengeQuestions.length}
        </div>

        <h2 style="
          color: #ffffff;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
          margin-bottom: 20px;
          font-size: 20px;
          line-height: 1.4;
        ">${question.question}</h2>

        <ul style="list-style: none; padding: 0; margin: 0;">
          ${question.options.map((option, index) => `
            <li style="margin: 12px 0;">
              <button onclick="challengeManager.answerQuestion(${index})" style="
                display: block;
                width: 100%;
                padding: 16px 20px;
                font-size: 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                cursor: pointer;
                text-align: right;
                color: #ffffff;
                text-shadow: 0 1px 5px rgba(0, 0, 0, 0.7);
                font-weight: 600;
                font-family: 'Tajawal', sans-serif;
                transition: all 0.3s ease;
                outline: none;
              " onmouseover="this.style.transform='translateX(-5px)'; this.style.borderColor='#667eea';" 
                 onmouseout="this.style.transform='translateX(0)'; this.style.borderColor='rgba(255, 255, 255, 0.3)';">
                ${option}
              </button>
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    console.log('Question displayed successfully');
  }

  // Answer question in challenge
  async answerQuestion(selectedIndex) {
    console.log('Answer selected:', selectedIndex, 'for question:', this.currentQuestionIndex + 1);

    if (!this.challengeQuestions || !this.challengeQuestions[this.currentQuestionIndex]) {
      console.error('Question data not available');
      return;
    }

    const question = this.challengeQuestions[this.currentQuestionIndex];
    const isCorrect = selectedIndex === question.answer;

    console.log('Answer is', isCorrect ? 'correct' : 'incorrect');
    console.log('Correct answer was:', question.answer);

    if (isCorrect) {
      this.correctAnswers++;
    } else {
      this.wrongAnswers++;
    }

    this.currentQuestionIndex++;

    // Update progress in Firebase
    await this.updateChallengeProgress();

    // Update local UI
    this.updateLocalProgress();

    // Show feedback
    this.showAnswerFeedback(isCorrect);

    // Move to next question after delay
    setTimeout(() => {
      console.log('Moving to next question, current index:', this.currentQuestionIndex);
      this.displayChallengeQuestion();
    }, 1500);
  }

  // Update challenge progress in Firebase
  async updateChallengeProgress() {
    if (!this.currentRoom) return;

    try {
      const roomRef = doc(db, 'challengeRooms', this.currentRoom);
      const updateData = {};
      updateData[`players.${this.currentUser.uid}.currentQuestion`] = this.currentQuestionIndex;
      updateData[`players.${this.currentUser.uid}.correctAnswers`] = this.correctAnswers;
      updateData[`players.${this.currentUser.uid}.wrongAnswers`] = this.wrongAnswers;

      if (this.currentQuestionIndex >= this.challengeQuestions.length) {
        updateData[`players.${this.currentUser.uid}.isFinished`] = true;
        updateData[`players.${this.currentUser.uid}.finishedAt`] = serverTimestamp();
      }

      await updateDoc(roomRef, updateData);
    } catch (error) {
      console.error('Error updating challenge progress:', error);
    }
  }

  // Update local progress display
  updateLocalProgress() {
    const totalQuestions = this.challengeQuestions.length;
    const progress = (this.currentQuestionIndex / totalQuestions) * 100;

    document.getElementById('p1CurrentQ').textContent = this.currentQuestionIndex;
    document.getElementById('p1Correct').textContent = this.correctAnswers;
    document.getElementById('p1Wrong').textContent = this.wrongAnswers;

    const progressBar = document.querySelector('#p1Progress div');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  // Show answer feedback
  showAnswerFeedback(isCorrect) {
    const container = document.getElementById('challengeQuestionContainer');
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${isCorrect ? 'linear-gradient(135deg, #28a745, #20c997)' : 'linear-gradient(135deg, #dc3545, #c82333)'};
      color: white;
      padding: 20px 30px;
      border-radius: 15px;
      font-size: 20px;
      font-weight: bold;
      z-index: 9999;
      animation: fadeInOut 1.5s ease-out;
      font-family: 'Tajawal', sans-serif;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    feedback.innerHTML = isCorrect ? 
      '<div style="font-size: 40px;">✅</div><div>إجابة صحيحة!</div>' : 
      '<div style="font-size: 40px;">❌</div><div>إجابة خاطئة!</div>';

    document.body.appendChild(feedback);

    setTimeout(() => {
      document.body.removeChild(feedback);
    }, 1500);
  }

  // Listen to room updates
  startListeningToRoom(roomId) {
    const roomRef = doc(db, 'challengeRooms', roomId);

    this.roomListener = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        const roomData = doc.data();

        // Check if both players are ready to start
        this.checkPlayersReadiness(roomData);

        // Update opponent progress (only if quiz has started)
        if (this.quizStarted) {
          this.updateOpponentProgress(roomData);
          this.checkChallengeCompletion(roomData);
        }
      }
    });
  }

  // Update opponent progress display
  async updateOpponentProgress(roomData) {
    const opponentId = this.currentChallenge.challengerId === this.currentUser.uid ? 
      this.currentChallenge.opponentId : this.currentChallenge.challengerId;

    const opponentData = roomData.players[opponentId];
    if (!opponentData) return;

    // Get opponent name if not already set
    const opponentNameElement = document.getElementById('opponentName');
    if (opponentNameElement && opponentNameElement.textContent === 'الخصم') {
      try {
        const opponentDoc = await getDoc(doc(db, 'users', opponentId));
        if (opponentDoc.exists()) {
          opponentNameElement.textContent = opponentDoc.data()['الاسم الكامل'];
        }
      } catch (error) {
        console.error('Error getting opponent name:', error);
      }
    }

    // Update progress
    const totalQuestions = this.challengeQuestions.length;
    const progress = (opponentData.currentQuestion / totalQuestions) * 100;

    document.getElementById('p2CurrentQ').textContent = opponentData.currentQuestion;
    document.getElementById('p2Correct').textContent = opponentData.correctAnswers;
    document.getElementById('p2Wrong').textContent = opponentData.wrongAnswers;

    const progressBar = document.querySelector('#p2Progress div');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  // Check if challenge is completed
  checkChallengeCompletion(roomData) {
    // التأكد من عدم إظهار النتائج أكثر من مرة
    if (this.resultsShown) return;

    const player1 = roomData.players[this.currentChallenge.challengerId];
    const player2 = roomData.players[this.currentChallenge.opponentId];

    if (player1.isFinished && player2.isFinished) {
      this.resultsShown = true;
      setTimeout(() => {
        this.showChallengeResults(roomData);
      }, 2000);
    }
  }

  // Finish challenge
  async finishChallenge() {
    // التأكد من تحديث التقدم مرة واحدة فقط
    if (this.challengeFinished) return;
    this.challengeFinished = true;

    await this.updateChallengeProgress();

    // Show completion message
    const container = document.getElementById('challengeQuestionContainer');
    if (container) {
      container.innerHTML = `
        <div style="
          text-align: center;
          color: white;
          padding: 40px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 20px;
          margin: 20px 0;
        ">
          <div style="font-size: 60px; margin-bottom: 20px;">🏁</div>
          <h2 style="margin: 0 0 15px 0;">انتهيت من التحدي!</h2>
          <p style="font-size: 18px;">في انتظار انتهاء الخصم...</p>
          <div style="
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          "></div>
        </div>
      `;
    }
  }

  // Show challenge results
  async showChallengeResults(roomData) {
    const player1 = roomData.players[this.currentChallenge.challengerId];
    const player2 = roomData.players[this.currentChallenge.opponentId];

    const myData = roomData.players[this.currentUser.uid];
    const opponentId = this.currentChallenge.challengerId === this.currentUser.uid ? 
      this.currentChallenge.opponentId : this.currentChallenge.challengerId;
    const opponentData = roomData.players[opponentId];

    // Get opponent name
    let opponentName = 'الخصم';
    try {
      const opponentDoc = await getDoc(doc(db, 'users', opponentId));
      if (opponentDoc.exists()) {
        opponentName = opponentDoc.data()['الاسم الكامل'];
      }
    } catch (error) {
      console.error('Error getting opponent name:', error);
    }

    const myScore = myData.correctAnswers;
    const opponentScore = opponentData.correctAnswers;
    const totalQuestions = this.challengeQuestions.length;
    const myPercentage = Math.round((myScore / totalQuestions) * 100);
    const opponentPercentage = Math.round((opponentScore / totalQuestions) * 100);

    let result, resultIcon, resultColor, resultGradient, motivationalText;
    if (myScore > opponentScore) {
      result = 'فزت! 🎉';
      resultIcon = '🏆';
      resultColor = '#28a745';
      resultGradient = 'linear-gradient(135deg, #28a745, #20c997)';
      motivationalText = 'تهانينا! لقد تفوقت على خصمك بنجاح 🌟';
    } else if (myScore < opponentScore) {
      result = 'خسرت 😔';
      resultIcon = '💪';
      resultColor = '#dc3545';
      resultGradient = 'linear-gradient(135deg, #dc3545, #c82333)';
      motivationalText = 'لا تستسلم! المحاولة القادمة ستكون أفضل 💪';
    } else {
      result = 'تعادل! 🤝';
      resultIcon = '🤝';
      resultColor = '#ffc107';
      resultGradient = 'linear-gradient(135deg, #ffc107, #fd7e14)';
      motivationalText = 'تعادل رائع! كلاكما متميز 🌟';
    }

    // Create results modal with enhanced design
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      backdrop-filter: blur(15px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.5s ease-out;
      font-family: 'Tajawal', sans-serif;
    `;

    modal.innerHTML = `
      <style>
        @keyframes resultSlideIn {
          from { opacity: 0; transform: translateY(50px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 ${resultColor}70; }
          70% { box-shadow: 0 0 0 20px ${resultColor}00; }
          100% { box-shadow: 0 0 0 0 ${resultColor}00; }
        }

        @keyframes sparkle {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }

        .challenge-result-container {
          background: transparent;
          border-radius: 0;
          padding: 30px 20px;
          max-width: 550px;
          width: 95%;
          text-align: center;
          color: white;
          animation: resultSlideIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          position: relative;
          overflow: hidden;
        }

        .result-icon {
          font-size: 100px;
          margin-bottom: 20px;
          animation: float 3s ease-in-out infinite;
          text-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
        }

        .result-title {
          font-size: 42px;
          font-weight: 700;
          color: ${resultColor};
          margin-bottom: 15px;
          text-shadow: 0 4px 8px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 255, 255, 0.3);
          animation: sparkle 2s ease-in-out infinite;
        }

        .motivational-text {
          font-size: 18px;
          color: #ffffff;
          margin-bottom: 30px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
          opacity: 0.95;
          font-weight: 500;
        }

        .scores-container {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin: 35px 0;
        }

        .player-score {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(15px);
          border-radius: 20px;
          padding: 25px 20px;
          flex: 1;
          border: 3px solid transparent;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .player-score.winner {
          border-color: #28a745;
          background: rgba(40, 167, 69, 0.2);
          animation: pulse 2s infinite;
        }

        .player-score.loser {
          border-color: rgba(255, 255, 255, 0.2);
        }

        .player-score.tie {
          border-color: #ffc107;
          background: rgba(255, 193, 7, 0.2);
        }

        .player-name {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 15px;
          color: #ffffff;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
        }

        .score-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: conic-gradient(${resultColor} 0deg, ${resultColor} 0deg, #e9ecef 0deg);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px;
          position: relative;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }

        .score-inner {
          width: 65px;
          height: 65px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
        }

        .score-details {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          margin-top: 8px;
        }

        .challenge-info {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 20px;
          margin: 25px 0;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .challenge-info h3 {
          margin: 0 0 10px 0;
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
        }

        .challenge-details {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.4;
        }

        .action-button {
          background: ${resultGradient};
          color: white;
          border: none;
          border-radius: 15px;
          padding: 18px 35px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 25px;
          font-family: 'Tajawal', sans-serif;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .action-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transition: all 0.5s ease;
          transform: translate(-50%, -50%);
        }

        .action-button:hover::before {
          width: 300px;
          height: 300px;
        }

        .action-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.4);
        }

        .action-button:active {
          transform: translateY(-1px);
        }

        /* Responsive Design */
        @media (max-width: 480px) {
          .challenge-result-container {
            padding: 20px 15px;
            width: 98%;
          }

          .result-icon {
            font-size: 70px;
            margin-bottom: 15px;
          }

          .result-title {
            font-size: 32px;
            margin-bottom: 10px;
          }

          .motivational-text {
            font-size: 16px;
            margin-bottom: 20px;
          }

          .scores-container {
            gap: 10px;
            margin: 25px 0;
          }

          .player-score {
            padding: 20px 15px;
          }

          .player-name {
            font-size: 16px;
            margin-bottom: 12px;
          }

          .score-circle {
            width: 65px;
            height: 65px;
          }

          .score-inner {
            width: 50px;
            height: 50px;
            font-size: 16px;
          }

          .action-button {
            padding: 15px 25px;
            font-size: 16px;
          }

          .challenge-info {
            padding: 15px;
            margin: 20px 0;
          }
        }
      </style>

      <div class="challenge-result-container">
        <div class="result-title">${result}</div>
        <div class="motivational-text">${motivationalText}</div>

        <div class="scores-container">
          <div class="player-score ${myScore > opponentScore ? 'winner' : myScore < opponentScore ? 'loser' : 'tie'}">
            <div class="player-name">أنت</div>
            <div class="score-circle" style="background: conic-gradient(${myScore > opponentScore ? '#28a745' : myScore < opponentScore ? '#6c757d' : '#ffc107'} ${myPercentage * 3.6}deg, #e9ecef 0deg);">
              <div class="score-inner">${myScore}</div>
            </div>
            <div class="score-details">${myPercentage}% (${myScore}/${totalQuestions})</div>
          </div>

          <div class="player-score ${opponentScore > myScore ? 'winner' : opponentScore < myScore ? 'loser' : 'tie'}">
            <div class="player-name">${opponentName}</div>
            <div class="score-circle" style="background: conic-gradient(${opponentScore > myScore ? '#28a745' : opponentScore < myScore ? '#6c757d' : '#ffc107'} ${opponentPercentage * 3.6}deg, #e9ecef 0deg);">
              <div class="score-inner">${opponentScore}</div>
            </div>
            <div class="score-details">${opponentPercentage}% (${opponentScore}/${totalQuestions})</div>
          </div>
        </div>

        <button id="challengeBackToHomeBtn" class="action-button">
          🏠 العودة للرئيسية
        </button>
      </div>
    `;

    document.body.appendChild(modal);



    // إضافة مستمع الحدث لزر العودة للرئيسية مع معالجة محسنة
    setTimeout(() => {
      const backToHomeBtn = document.getElementById('challengeBackToHomeBtn');
      if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Challenge back to home button clicked');

          // إزالة النافذة فوراً
          if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
          }

          // الخروج من التحدي والعودة للرئيسية
          this.exitChallenge();
        });

        console.log('Challenge back to home button event listener added successfully');
      } else {
        console.error('Challenge back to home button not found');
      }
    }, 100);

    // إضافة إمكانية الإغلاق بالضغط على الخلفية
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('Modal background clicked, closing challenge');
        this.exitChallenge();
      }
    });

    // Update challenge status to completed
    try {
      await updateDoc(doc(db, 'challengeRooms', this.currentRoom), {
        status: 'completed',
        completedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating challenge status:', error);
    }
  }

  // Exit challenge
  exitChallenge() {
    console.log('Exiting challenge...');

    // Stop listening
    if (this.roomListener) {
      this.roomListener();
      this.roomListener = null;
    }

    // Remove challenge interface
    const challengeInterface = document.getElementById('challengeInterface');
    if (challengeInterface) {
      challengeInterface.remove();
    }

    // Remove challenge-related modals, preserve friends modal
    const challengeModals = document.querySelectorAll('#challengeNotificationModal, #challengeAcceptedModal, #challengeSelectionModal');
    challengeModals.forEach(modal => {
      if (modal && modal.parentNode === document.body) {
        modal.remove();
      }
    });

    // Remove any result modals or other challenge-specific modals
    const resultModals = document.querySelectorAll('[id*="challenge"][id*="modal"], [id*="Challenge"][id*="Modal"]');
    resultModals.forEach(modal => {
      if (modal && modal.parentNode === document.body && modal.id !== 'friendsModal') {
        modal.remove();
      }
    });

    // Show main interface
    const controlsContainer = document.getElementById('controlsContainer');
    const questionsContainer = document.getElementById('questionsContainer');

    if (controlsContainer) controlsContainer.style.display = 'block';
    if (questionsContainer) questionsContainer.style.display = 'none';

    // إظهار العنوان عند العودة للرئيسية
    const titleElement = document.querySelector('h1');
    if (titleElement) {
      titleElement.style.display = 'block';
    }

    // Reset all state variables بشكل آمن
    this.currentRoom = null;
    this.currentChallenge = null;
    this.challengeQuestions = [];
    this.currentQuestionIndex = 0;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.quizStarted = false;
    this.challengeFinished = false;
    this.resultsShown = false;
    this.reloadAttempted = false;
    this.quizReloadAttempted = false;
    this.isReloadingQuestions = false;

    // إعادة تعيين متغيرات إضافية
    this.questionsLoadAttempts = 0;
    this.maxLoadAttempts = 2;

    // إعادة تفعيل مكونات التطبيق الرئيسية مع تأخيرات متدرجة
    setTimeout(() => {
      this.reactivateFriendsSystem();
    }, 100);

    setTimeout(() => {
      this.forceFriendsButtonReactivation();
    }, 400);

    setTimeout(() => {
      this.ensureFriendsSystemWorking();
    }, 700);

    // فحص نهائي وإصلاح طوارئ إذا لزم الأمر
    setTimeout(() => {
      const friendsBtn = document.getElementById("friendsBtn");
      if (!friendsBtn || friendsBtn.style.display === 'none') {
        console.log('Final emergency check - friends button needs fixing');
        this.emergencyFriendsButtonFix();
      }
    }, 1000);

    // إعادة ضبط الواجهة بالكامل
    setTimeout(() => {
      try {
        if (typeof window.updateVersionSelector === 'function') {
          window.updateVersionSelector();
        }
      } catch (error) {
        console.log('Error updating version selector:', error);
      }
    }, 100);

    console.log('Challenge exited successfully');
  }

  // إعادة تفعيل نظام الأصدقاء بعد التحدي
  reactivateFriendsSystem() {
    if (!this.currentUser) return;

    try {
      console.log('Starting friends system reactivation...');

      // التأكد من وجود نافذة الأصدقاء في DOM
      let friendsModal = document.getElementById('friendsModal');
      if (!friendsModal) {
        console.log('Friends modal missing, attempting to restore it...');
        this.restoreFriendsModal();
        friendsModal = document.getElementById('friendsModal');
      }

      // إعادة تفعيل الزر مباشرة
      const friendsBtn = document.getElementById("friendsBtn");
      if (friendsBtn) {
        // إظهار الزر
        friendsBtn.style.display = "flex";
        friendsBtn.style.visibility = "visible";
        friendsBtn.style.opacity = "1";
        friendsBtn.style.pointerEvents = "auto";

        // إزالة جميع المستمعين السابقين وإعادة إضافتهم
        const newFriendsBtn = friendsBtn.cloneNode(true);
        friendsBtn.parentNode.replaceChild(newFriendsBtn, friendsBtn);

        // إضافة مستمع جديد
        newFriendsBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Friends button clicked after reactivation');

          if (typeof window.openFriendsModal === 'function') {
            window.openFriendsModal();
          } else {
            // فتح النافذة مباشرة
            const friendsModal = document.getElementById('friendsModal');
            if (friendsModal) {
              friendsModal.style.display = 'flex';
              // تحديث البيانات
              setTimeout(() => {
                if (typeof window.switchTab === 'function' && typeof window.loadMyFriends === 'function') {
                  window.switchTab('myFriends');
                  window.loadMyFriends();
                }
              }, 100);
            } else {
              console.error('Friends modal still missing after reactivation');
              this.restoreFriendsModal();
            }
          }
        });

        console.log('Friends button reactivated with new event listener');
      }

      // إعادة تهيئة النظام
      if (typeof window.setupFriendsSystem === 'function') {
        window.setupFriendsSystem();
      }

      // تحديث التنبيهات
      setTimeout(() => {
        if (typeof window.updateFriendRequestsBadge === 'function') {
          window.updateFriendRequestsBadge();
        }
        if (typeof window.updateOnlineFriendsBadge === 'function') {
          window.updateOnlineFriendsBadge();
        }
      }, 300);

      console.log('Friends system reactivated successfully after challenge exit');

    } catch (error) {
      console.error('Error re-enabling friends system:', error);

      // محاولة طوارئ قوية
      setTimeout(() => {
        this.emergencyFriendsButtonFix();
      }, 500);
    }
  }

  // استعادة نافذة الأصدقاء إذا تم حذفها بالخطأ
  restoreFriendsModal() {
    console.log('Attempting to restore friends modal...');

    // التحقق من عدم وجود النافذة
    if (document.getElementById('friendsModal')) {
      console.log('Friends modal already exists');
      return;
    }

    try {
      // إعادة تحميل الصفحة كحل أخير إذا كانت النافذة مفقودة تماماً
      if (!document.getElementById('friendsModal')) {
        console.warn('Friends modal completely missing - page may need refresh');

        // عرض رسالة للمستخدم
        const notice = document.createElement('div');
        notice.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #ffc107;
          color: #212529;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 8px 25px rgba(255, 193, 7, 0.3);
          z-index: 10000;
          font-family: 'Tajawal', sans-serif;
          text-align: center;
          max-width: 300px;
        `;
        notice.innerHTML = `
          <div style="font-size: 24px; margin-bottom: 10px;">⚠️</div>
          <div>حدث خطأ في نظام الأصدقاء</div>
          <div style="font-size: 14px; margin-top: 10px;">يرجى تحديث الصفحة إذا استمر المشكل</div>
        `;
        document.body.appendChild(notice);

        setTimeout(() => {
          if (document.body.contains(notice)) {
            document.body.removeChild(notice);
          }
        }, 5000);
      }
    } catch (error) {
      console.error('Error restoring friends modal:', error);
    }
  }

  // إصلاح طوارئ لزر الأصدقاء
  emergencyFriendsButtonFix() {
    console.log('Attempting emergency friends button fix...');

    try {
      const friendsBtn = document.getElementById("friendsBtn");
      if (friendsBtn) {
        // التأكد من إظهار الزر بالقوة
        friendsBtn.style.cssText = `
          background: linear-gradient(135deg, #28a745, #20c997) !important;
          color: white !important;
          border: none !important;
          border-radius: 50% !important;
          width: 50px !important;
          height: 50px !important;
          cursor: pointer !important;
          font-size: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          position: relative !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3) !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        `;

        // إضافة مستمع أحداث مباشر
        friendsBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Emergency friends button clicked');

          // فتح النافذة مباشرة
          const friendsModal = document.getElementById('friendsModal');
          if (friendsModal) {
            friendsModal.style.display = 'flex';

            // تحديث البيانات والتنقل للأصدقاء
            setTimeout(() => {
              const myFriendsTab = document.getElementById('myFriendsTab');
              if (myFriendsTab) {
                myFriendsTab.click();
              }
            }, 200);
          } else {
            alert('نافذة الأصدقاء غير متوفرة، يرجى تحديث الصفحة');
          }
        };

        console.log('Emergency friends button fix completed');
        return true;
      }
    } catch (emergencyError) {
      console.error('Emergency fix failed:', emergencyError);
      return false;
    }

    return false;
  }

  // دالة قوية لإعادة تفعيل زر الأصدقاء بالقوة
  forceFriendsButtonReactivation() {
    console.log('Force reactivating friends button...');

    const friendsBtn = document.getElementById("friendsBtn");
    if (!friendsBtn) {
      console.log('Friends button not found!');
      return;
    }

    // إظهار الزر بالقوة
    friendsBtn.style.display = "flex";
    friendsBtn.style.visibility = "visible";
    friendsBtn.style.opacity = "1";
    friendsBtn.style.pointerEvents = "auto";

    // إزالة جميع مستمعي الأحداث السابقة
    const newBtn = friendsBtn.cloneNode(true);
    friendsBtn.parentNode.replaceChild(newBtn, friendsBtn);

    // إضافة مستمع أحداث جديد
    newBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Friends button clicked after challenge exit');

      if (typeof window.openFriendsModal === 'function') {
        window.openFriendsModal();
      } else {
        // فتح النافذة مباشرة
        const friendsModal = document.getElementById('friendsModal');
        if (friendsModal) {
          friendsModal.style.display = 'flex';
        }
      }
    });

    console.log('Friends button force reactivation completed');
  }

  // دالة للتأكد من أن نظام الأصدقاء يعمل
  ensureFriendsSystemWorking() {
    console.log('Ensuring friends system is working...');

    const friendsBtn = document.getElementById("friendsBtn");
    const friendsModal = document.getElementById("friendsModal");

    if (!friendsBtn) {
      console.error('Friends button missing after challenge!');
      return;
    }

    if (!friendsModal) {
      console.error('Friends modal missing after challenge!');
      return;
    }

    // تجربة فتح وإغلاق النافذة للتأكد من عملها
    try {
      friendsModal.style.display = 'flex';
      setTimeout(() => {
        friendsModal.style.display = 'none';
      }, 50);
      console.log('Friends system test passed');
    } catch (error) {
      console.error('Friends system test failed:', error);
    }

    // إعادة ربط الأحداث مرة أخرى للضمان
    if (typeof window.setupFriendsSystem === 'function') {
      window.setupFriendsSystem();
    }
  }

  // Show challenge selection modal
  showChallengeModal(friendUid, friendName) {
    const modal = document.createElement('div');
    modal.id = 'challengeSelectionModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease-out;
    `;

    modal.innerHTML = `
      <div style="
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(15px);
        border-radius: 20px;
        padding: 30px;
        max-width: 400px;
        width: 90%;
        font-family: 'Tajawal', sans-serif;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.5s ease-out;
      ">
        <h2 style="
          text-align: center;
          margin: 0 0 20px 0;
          color: #2c3e50;
          font-size: 24px;
        ">⚔️ تحدي ${friendName}</h2>

        <div style="margin-bottom: 15px;">
          <label style="
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #495057;
          ">اختر المادة:</label>
          <select id="challengeSubject" style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            font-size: 16px;
            font-family: 'Tajawal', sans-serif;
          ">
            <option value="">-- اختر المادة --</option>
          </select>
        </div>

        <div style="margin-bottom: 15px;">
          <label style="
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #495057;
          ">اختر المحاضرة:</label>
          <select id="challengeLecture" style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            font-size: 16px;
            font-family: 'Tajawal', sans-serif;
          ">
            <option value="">-- اختر المحاضرة --</option>
          </select>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #495057;
          ">اختر النسخة:</label>
          <select id="challengeVersion" style="
            width: 100%;
            padding: 12px;
            border: 2px solid #e9ecef;
            border-radius: 10px;
            font-size: 16px;
            font-family: 'Tajawal', sans-serif;
          ">
            <option value="">-- اختر النسخة --</option>
          </select>
        </div>

        <div style="
          display: flex;
          gap: 15px;
          justify-content: center;
        ">
          <button id="sendChallengeBtn" style="
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            transition: all 0.3s ease;
          ">🚀 إرسال التحدي</button>

          <button id="cancelChallengeBtn" style="
            background: linear-gradient(135deg, #6c757d, #495057);
            color: white;
            border: none;
            border-radius: 12px;
            padding: 12px 25px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            transition: all 0.3s ease;
          ">❌ إلغاء</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Load subjects
    this.loadChallengeSelectionOptions();

    // Handle events
    document.getElementById('challengeSubject').onchange = () => {
      this.loadChallengeLectures();
    };

    document.getElementById('challengeLecture').onchange = () => {
      this.loadChallengeVersions();
    };

    document.getElementById('sendChallengeBtn').onclick = () => {
      this.handleSendChallenge(friendUid);
    };

    document.getElementById('cancelChallengeBtn').onclick = () => {
      document.body.removeChild(modal);
    };

    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    };
  }

  // Load challenge selection options
  async loadChallengeSelectionOptions() {
    try {
      // Import visible lectures and lecture names
      const { visibleLectures } = await import('./show.js');
      const { lectureNames } = await import('./lectureNames.js');

      const subjectSelect = document.getElementById('challengeSubject');
      subjectSelect.innerHTML = '<option value="">-- اختر المادة --</option>';

      // استخدام نفس البنية المستخدمة في script.js
      Object.keys(visibleLectures).forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  }

  // Load challenge lectures
  async loadChallengeLectures() {
    const subjectSelect = document.getElementById('challengeSubject');
    const lectureSelect = document.getElementById('challengeLecture');
    const versionSelect = document.getElementById('challengeVersion');

    lectureSelect.innerHTML = '<option value="">-- اختر المحاضرة --</option>';
    versionSelect.innerHTML = '<option value="">-- اختر النسخة --</option>';

    if (!subjectSelect.value) return;

    try {
      const { visibleLectures } = await import('./show.js');
      const { lectureNames } = await import('./lectureNames.js');

      const selectedSubject = subjectSelect.value;
      const lectures = Object.keys(visibleLectures[selectedSubject] || {});

      lectures.forEach((lec) => {
        const option = document.createElement('option');
        option.value = lec;
        const name = lectureNames[selectedSubject]?.[lec] || "Unknown";
        option.textContent = `lec${lec} - ${name}`;
        lectureSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading lectures:', error);
    }
  }

  // Load challenge versions
  async loadChallengeVersions() {
    const subjectSelect = document.getElementById('challengeSubject');
    const lectureSelect = document.getElementById('challengeLecture');
    const versionSelect = document.getElementById('challengeVersion');

    versionSelect.innerHTML = '<option value="">-- اختر النسخة --</option>';

    if (!subjectSelect.value || !lectureSelect.value) return;

    try {
      const { visibleLectures } = await import('./show.js');
      const selectedSubject = subjectSelect.value;
      const selectedLecture = lectureSelect.value;
      const versions = visibleLectures[selectedSubject]?.[selectedLecture] || [];

      versions.forEach((v) => {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = `Version ${v}`;
        versionSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  }

  // Handle send challenge
  handleSendChallenge(friendUid) {
    const subject = document.getElementById('challengeSubject').value;
    const lecture = document.getElementById('challengeLecture').value;
    const version = document.getElementById('challengeVersion').value;

    if (!subject || !lecture || !version) {
      this.showToast('يرجى اختيار جميع الخيارات', 'error');
      return;
    }

    this.sendChallenge(friendUid, subject, lecture, version);
    document.body.removeChild(document.getElementById('challengeSelectionModal'));
  }

  // Utility: Show toast notification
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      font-family: 'Tajawal', sans-serif;
      font-weight: 600;
      z-index: 10001;
      animation: slideInRight 0.5s ease-out, fadeOut 0.5s ease-out 2.5s;
      box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  }

  // إرسال إشعار عدم الرد للمرسل
  async sendNoResponseNotification(challengeData, challengeId, challengerName) {
    try {
      // التحقق من أن المرسل متصل ومازال التحدي موجود
      const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
      if (!challengeDoc.exists()) {
        console.log('Challenge no longer exists');
        return;
      }

      const currentData = challengeDoc.data();
      if (currentData.status !== 'pending') {
        console.log('Challenge status changed, not sending no response notification');
        return;
      }

      // إظهار إشعار عدم الرد للمرسل
      if (currentData.challengerId !== this.currentUser.uid) {
        // نحن المستقبل، أرسل إشعار للمرسل عبر Firebase
        await updateDoc(doc(db, 'challenges', challengeId), {
          status: 'no_response',
          noResponseAt: serverTimestamp()
        });
      }

      // حذف التحدي بعد إرسال الإشعار
      setTimeout(async () => {
        try {
          await deleteDoc(doc(db, 'challenges', challengeId));
          console.log('Challenge deleted after no response');
        } catch (error) {
          console.error('Error deleting challenge after no response:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('Error sending no response notification:', error);
    }
  }

  // بدء مؤقت لتنبيه المرسل في حالة عدم الرد لمدة 20 ثانية (15 + 5 ثوان إضافية)
  startChallengeResponseTimer(challengeId, challengeData) {
    // حفظ معرف المؤقت لإمكانية إلغائه لاحقاً
    const timerId = setTimeout(async () => {
      try {
        // التحقق من حالة التحدي الحالية
        const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
        
        // إذا كان التحدي محذوف أو مُلغى، لا نرسل تنبيه
        if (!challengeDoc.exists()) {
          console.log('Challenge was deleted/cancelled, no timeout notification');
          return;
        }

        const currentData = challengeDoc.data();

        // إذا كان التحدي لا يزال في حالة انتظار وكان المستخدم الحالي هو المرسل
        if (currentData.status === 'pending' && currentData.challengerId === this.currentUser.uid) {
          // الحصول على اسم المستقبل
          const opponentDoc = await getDoc(doc(db, 'users', challengeData.opponentId));
          const opponentName = opponentDoc.exists() ? 
            opponentDoc.data()['الاسم الكامل'] : 'مستخدم غير معروف';

          // إظهار تنبيه انتهاء المهلة الزمنية للمرسل (في جميع الحالات: عدم رد، تجاهل، كتم)
          this.showChallengeTimeoutNotification(challengeData, challengeId, opponentName);
          
          // حذف التحدي من قاعدة البيانات لتجنب التراكم
          try {
            await deleteDoc(doc(db, 'challenges', challengeId));
            console.log('Challenge deleted after timeout');
          } catch (deleteError) {
            console.error('Error deleting timed out challenge:', deleteError);
          }
        }
      } catch (error) {
        console.error('Error checking challenge timeout:', error);
      }
    }, 20000); // 20 ثانية (15 + 5 ثوان إضافية)

    // حفظ معرف المؤقت مع معرف التحدي لإمكانية إلغائه
    if (!this.challengeTimers) {
      this.challengeTimers = new Map();
    }
    this.challengeTimers.set(challengeId, timerId);
  }

  // إلغاء مؤقت انتظار الرد (يستخدم عند قبول أو رفض التحدي)
  cancelChallengeResponseTimer(challengeId) {
    if (this.challengeTimers && this.challengeTimers.has(challengeId)) {
      const timerId = this.challengeTimers.get(challengeId);
      clearTimeout(timerId);
      this.challengeTimers.delete(challengeId);
      console.log('Challenge response timer cancelled for:', challengeId);
    }
  }

  // Clear session notifications
  clearSessionNotifications() {
    // مسح جميع إشعارات التحديات من sessionStorage
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('challenge_accepted_') || 
          key.startsWith('challenge_incoming_') || 
          key.startsWith('challenge_declined_') || 
          key.startsWith('challenge_timeout_') ||
          key.startsWith('challenge_skipped_') ||
          key.startsWith('muted_challenger_')) {
        sessionStorage.removeItem(key);
      }
    });
  }

  // Stop all listeners
  stopListening() {
    this.challengeListeners.forEach(unsubscribe => unsubscribe());
    this.challengeListeners.clear();

    if (this.roomListener) {
      this.roomListener();
      this.roomListener = null;
    }

    // إلغاء جميع مؤقتات التحديات المعلقة
    if (this.challengeTimers) {
      this.challengeTimers.forEach((timerId, challengeId) => {
        clearTimeout(timerId);
        console.log('Challenge timer cancelled for:', challengeId);
      });
      this.challengeTimers.clear();
    }
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(100%); }
    to { opacity: 1; transform: translateX(0); }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes bounceIn {
    0% { opacity: 0; transform: scale(0.3); }
    50% { opacity: 1; transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes fadeInOut {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  }
`;
document.head.appendChild(style);

// Create global challenge manager instance
window.challengeManager = new ChallengeManager();

export default window.challengeManager;