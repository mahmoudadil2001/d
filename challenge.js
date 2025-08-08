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

    // إعدادات التحدي الافتراضية
    this.challengeSettings = {
      timerEnabled: true, // المؤقت مفعل افتراضياً
      shuffleQuestions: true, // ترتيب الأسئلة عشوائي افتراضياً
      shuffleAnswers: true, // ترتيب الأجوبة عشوائي افتراضياً
      questionCount: 10, // عدد الأسئلة الافتراضي
      timePerQuestion: 30 // الوقت لكل سؤال بالثواني
    };

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

    // استمع للتحديات المقبولة (للمرسل)
    const acceptedQuery = query(
      challengesRef,
      where('challengerId', '==', this.currentUser.uid),
      where('status', '==', 'accepted')
    );

    const acceptedUnsubscribe = onSnapshot(acceptedQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified' || change.type === 'added') {
          const challengeData = change.doc.data();
          console.log('Challenge status changed:', challengeData.status, 'for challenger:', challengeData.challengerId);

          // التأكد من أن هذا التحدي للمستخدم الحالي وأنه تم قبوله
          if (challengeData.status === 'accepted' && challengeData.challengerId === this.currentUser.uid) {
            this.handleAcceptedChallenge(challengeData, change.doc.id);
          }
        }
      });
    });

    this.challengeListeners.set('accepted', acceptedUnsubscribe);
  }

  // Handle incoming challenge notification
  async handleIncomingChallenge(challengeData, challengeId) {
    try {
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
      } else {
        console.log('Incoming challenge notification not shown - already shown or old challenge');
      }
    } catch (error) {
      console.error('Error handling incoming challenge:', error);
    }
  }

  // Handle accepted challenge notification (for challenger)
  async handleAcceptedChallenge(challengeData, challengeId) {
    try {
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
        <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px;">
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
      </div>
    `;

    document.body.appendChild(modal);

    // Handle accept/decline
    modal.querySelector('#acceptChallenge').onclick = () => {
      this.acceptChallenge(challengeId, challengeData);
      document.body.removeChild(modal);
    };

    modal.querySelector('#declineChallenge').onclick = () => {
      this.declineChallenge(challengeId);
      document.body.removeChild(modal);
    };

    // Auto-close after 30 seconds
    setTimeout(() => {
      if (document.getElementById('challengeNotificationModal')) {
        this.declineChallenge(challengeId);
        document.body.removeChild(modal);
      }
    }, 30000);
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
        createdAt: serverTimestamp(),
        // إعدادات التحدي عند الإرسال
        settings: {
          timerEnabled: this.challengeSettings.timerEnabled,
          shuffleQuestions: this.challengeSettings.shuffleQuestions,
          shuffleAnswers: this.challengeSettings.shuffleAnswers,
          questionCount: this.challengeSettings.questionCount,
          timePerQuestion: this.challengeSettings.timePerQuestion
        }
      };

      await addDoc(collection(db, 'challenges'), challengeData);

      // Show success message
      this.showToast('تم إرسال التحدي بنجاح! 🚀', 'success');
    } catch (error) {
      console.error('Error sending challenge:', error);
      this.showToast('حدث خطأ في إرسال التحدي', 'error');
    }
  }

  // Show challenge accepted notification
  showChallengeAcceptedNotification(challengeData, challengeId, opponentName) {
    console.log('Showing challenge accepted notification for challenger');

    // إزالة أي إشعارات سابقة
    const existingModal = document.getElementById('challengeAcceptedModal');
    if (existingModal) {
      document.body.removeChild(existingModal);
    }

    // تشغيل صوت الإشعار
    this.playAcceptanceSound();

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
        border-radius: 15px;
        padding: 18px;
        max-width: 280px;
        width: 85%;
        text-align: center;
        color: white;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        animation: bounceIn 0.6s ease-out;
        font-family: 'Tajawal', sans-serif;
      ">
        <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
        <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">
          تم قبول التحدي!
        </h2>
        <p style="margin: 8px 0; font-size: 14px; line-height: 1.2;">
          <strong style="color: #fff200;">🏆 ${opponentName}</strong> قبل تحديك!
        </p>

        <div style="
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 10px;
          margin: 12px 0;
          border: 1px solid rgba(255, 255, 255, 0.3);
          font-size: 12px;
          line-height: 1.3;
        ">
          <div>📚 ${challengeData.subject}</div>
          <div>📖 المحاضرة ${challengeData.lecture}</div>
          <div>🔢 النسخة ${challengeData.version}</div>
        </div>

        <div style="display: flex; gap: 8px; justify-content: center; margin-top: 15px;">
          <button id="enterChallengeBtn" style="
            background: linear-gradient(135deg, #ff6b35, #f7931e);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 10px 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Tajawal', sans-serif;
            flex: 1;
          ">🚀 ابدأ</button>
          <button id="declineEnterBtn" style="
            background: linear-gradient(135deg, #6c757d, #495057);
            color: white;
            border: none;
            border-radius: 10px;
            padding: 10px 16px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Tajawal', sans-serif;
            flex: 1;
          ">❌ لاحقاً</button>
        </div>

        <div style="margin-top: 12px; font-size: 11px; opacity: 0.8;">
          ⏰ ينتهي خلال دقيقة
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

  // Play acceptance sound
  playAcceptanceSound() {
    try {
      const audio = new Audio('./sounds/uiclick.wav');
      audio.volume = 0.8;
      audio.play().catch(e => console.log('Could not play acceptance sound:', e));
    } catch (error) {
      console.log('Error playing acceptance sound:', error);
    }
  }

  // Accept challenge
  async acceptChallenge(challengeId, challengeData) {
    try {
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
        },
        // دمج إعدادات التحدي في غرفة التحدي
        settings: challengeData.settings || this.challengeSettings // استخدام إعدادات المرسل أو الافتراضية
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

      this.showToast('تم رفض التحدي', 'info');
    } catch (error) {
      console.error('Error declining challenge:', error);
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
    this.resultsShown = false; // إعادة تعيين حالة عرض النتائج
    this.challengeFinished = false; // إعادة تعيين حالة إنهاء التحدي

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
      // تحديث حالة اللاعب في playersReady
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

      let questions = await this.loadChallengeQuestions(
        challengeData.subject,
        challengeData.lecture,
        challengeData.version
      );

      // تطبيق الترتيب العشوائي للأسئلة إذا كان مفعلاً
      if (this.challengeSettings.shuffleQuestions) {
        questions = this.shuffleQuestions(questions);
        console.log('Questions shuffled based on challenge settings');
      }

      // تطبيق الترتيب العشوائي للأجوبة إذا كان مفعلاً
      if (this.challengeSettings.shuffleAnswers) {
        questions = questions.map(question => this.shuffleAnswers(question));
        console.log('Answers shuffled based on challenge settings');
      }

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
    // التأكد من وجود playersReady و players في roomData
    if (!roomData.playersReady || !roomData.players) {
      console.error('Invalid room data: playersReady or players missing');
      return;
    }

    // التأكد من وجود بيانات اللاعبين الحاليين
    const player1Data = roomData.players[this.currentChallenge.challengerId];
    const player2Data = roomData.players[this.currentChallenge.opponentId];

    if (!player1Data || !player2Data) {
      console.error('Invalid room data: player data missing');
      return;
    }

    // التحقق من أن كلا اللاعبين قد انضما
    const player1Joined = player1Data.joinedAt !== null;
    const player2Joined = player2Data.joinedAt !== null;

    // التحقق من أن كلا اللاعبين جاهزين (isReady)
    const player1Ready = roomData.playersReady[this.currentChallenge.challengerId] || false;
    const player2Ready = roomData.playersReady[this.currentChallenge.opponentId] || false;

    console.log('Players readiness check:', { player1Joined, player2Joined, player1Ready, player2Ready });

    // البدء فقط إذا كان كلا اللاعبين قد انضما وجاهزين، ولم يبدأ الاختبار بعد
    if (player1Joined && player2Joined && player1Ready && player2Ready && !this.quizStarted) {
      console.log('Both players ready, starting quiz!');

      // التأكد من تحميل الأسئلة قبل البدء
      if (!this.challengeQuestions || this.challengeQuestions.length === 0) {
        console.log('Questions not loaded yet, attempting to load...');
        // إعادة تحميل الأسئلة
        this.loadChallengeQuestions(
          this.currentChallenge.subject,
          this.currentChallenge.lecture,
          this.currentChallenge.version
        ).then((questions) => {
          // تطبيق الإعدادات عند إعادة التحميل
          if (this.challengeSettings.shuffleQuestions) {
            questions = this.shuffleQuestions(questions);
          }
          if (this.challengeSettings.shuffleAnswers) {
            questions = questions.map(question => this.shuffleAnswers(question));
          }

          this.challengeQuestions = questions;
          console.log('Questions reloaded successfully, count:', questions.length);

          if (this.challengeQuestions.length > 0) {
            this.quizStarted = true;
            this.showStartCountdown();
          } else {
            console.error('No questions available after reload, exiting challenge');
            this.showToast('خطأ: فشل في تحميل أسئلة التحدي', 'error');
            this.exitChallenge();
          }
        }).catch((error) => {
          console.error('Failed to reload questions:', error);
          this.showToast('خطأ في تحميل الأسئلة', 'error');
          this.exitChallenge();
        });
        return;
      }

      // إذا كانت الأسئلة متاحة بالفعل
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
            // تطبيق الإعدادات عند إعادة التحميل
            if (this.challengeSettings.shuffleQuestions) {
              questions = this.shuffleQuestions(questions);
            }
            if (this.challengeSettings.shuffleAnswers) {
              questions = questions.map(question => this.shuffleAnswers(question));
            }
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

  // Start challenge quiz
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
          // تطبيق الإعدادات عند إعادة التحميل
          if (this.challengeSettings.shuffleQuestions) {
            questions = this.shuffleQuestions(questions);
          }
          if (this.challengeSettings.shuffleAnswers) {
            questions = questions.map(question => this.shuffleAnswers(question));
          }
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
        border-radius: 12px;
        padding: 12px;
        margin-bottom: 15px;
        color: white;
        text-align: center;
        font-size: 14px;
      ">
        <h2 style="margin: 0 0 8px 0; font-size: 18px;">⚔️ وضع التحدي</h2>
        <div id="challengeProgress" style="
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
        ">
          <div id="player1Stats" style="
            flex: 1;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 8px;
            font-size: 12px;
          ">
            <h3 style="margin: 0 0 6px 0; font-size: 14px;">أنت</h3>
            <div class="stat">السؤال: <span id="p1CurrentQ">0</span></div>
            <div class="stat">✓ <span id="p1Correct">0</span></div>
            <div class="stat">✗ <span id="p1Wrong">0</span></div>
            <div id="p1Progress" style="
              width: 100%;
              height: 6px;
              background: rgba(255, 255, 255, 0.3);
              border-radius: 3px;
              margin-top: 6px;
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
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
          ">
            <div style="
              font-size: 16px;
              color: #ffd700;
              font-weight: bold;
            ">VS</div>
            
            <!-- المؤقت الدائري -->
            <div id="challengeTimerCircle" style="
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: conic-gradient(#28a745 0deg, #28a745 0deg, rgba(255, 255, 255, 0.3) 0deg);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 700;
              color: white;
              text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
              border: 2px solid rgba(255, 255, 255, 0.3);
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
              transition: all 0.3s ease;
            ">--</div>
          </div></div>

          <div id="player2Stats" style="
            flex: 1;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 8px;
            font-size: 12px;
          ">
            <h3 style="margin: 0 0 6px 0; font-size: 14px;" id="opponentName">الخصم</h3>
            <div class="stat">السؤال: <span id="p2CurrentQ">0</span></div>
            <div class="stat">✓ <span id="p2Correct">0</span></div>
            <div class="stat">✗ <span id="p2Wrong">0</span></div>
            <div id="p2Progress" style="
              width: 100%;
              height: 6px;
              background: rgba(255, 255, 255, 0.3);
              border-radius: 3px;
              margin-top: 6px;
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
        border-radius: 8px;
        padding: 8px 15px;
        font-size: 14px;
        cursor: pointer;
        margin-top: 15px;
        font-family: 'Tajawal', sans-serif;
        width: 100%;
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
          // تطبيق الإعدادات عند إعادة التحميل
          if (this.challengeSettings.shuffleQuestions) {
            questions = this.shuffleQuestions(questions);
          }
          if (this.challengeSettings.shuffleAnswers) {
            questions = questions.map(question => this.shuffleAnswers(question));
          }
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

    // إعادة تعيين متغير الإجابة لكل سؤال جديد
    this.questionAnswered = false;

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

    // تشغيل المؤقت فقط إذا كان مفعلاً في إعدادات التحدي
    if (this.challengeSettings?.timerEnabled) {
      console.log('Timer enabled, starting challenge timer...');
      this.startChallengeTimer();
    } else {
      console.log('Timer disabled in challenge settings');
      const navigatorTimer = document.getElementById("navigatorTimer");
      if (navigatorTimer) {
        navigatorTimer.style.display = "none";
      }
    }

    console.log('Question displayed successfully');
  }

  // Answer question in challenge
  async answerQuestion(selectedIndex) {
    console.log('Answer selected:', selectedIndex, 'for question:', this.currentQuestionIndex + 1);

    // منع الإجابة المتعددة
    if (this.questionAnswered) {
      console.log('Question already answered, ignoring additional answer');
      return;
    }

    if (!this.challengeQuestions || !this.challengeQuestions[this.currentQuestionIndex]) {
      console.error('Question data not available');
      return;
    }

    // تعيين السؤال كمجاب عليه
    this.questionAnswered = true;

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

    // إيقاف المؤقت فوراً
    this.stopChallengeTimer();

    // تعطيل جميع أزرار الإجابة
    const container = document.getElementById('challengeQuestionContainer');
    if (container) {
      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn, index) => {
        btn.disabled = true;
        if (index === selectedIndex) {
          btn.style.backgroundColor = isCorrect ? 'lightgreen' : 'salmon';
        } else if (index === question.answer && !isCorrect) {
          btn.style.backgroundColor = 'lightgreen';
        }
      });
    }

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

  // Mark player as left the challenge
  async markPlayerAsLeft() {
    try {
      const roomRef = doc(db, 'challengeRooms', this.currentRoom);
      const updateData = {};
      updateData[`players.${this.currentUser.uid}.hasLeft`] = true;
      updateData[`players.${this.currentUser.uid}.leftAt`] = serverTimestamp();

      await updateDoc(roomRef, updateData);
      console.log('Player marked as left the challenge');
    } catch (error) {
      console.error('Error marking player as left:', error);
    }
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
    const progress = totalQuestions > 0 ? (this.currentQuestionIndex / totalQuestions) * 100 : 0;

    document.getElementById('p1CurrentQ').textContent = this.currentQuestionIndex;
    document.getElementById('p1Correct').textContent = this.correctAnswers;
    document.getElementById('p1Wrong').textContent = this.wrongAnswers;

    const progressBar = document.querySelector('#p1Progress div');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  // Show answer feedback
  showAnswerFeedback(isCorrect, customMessage = null) {
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

    if (customMessage) {
      feedback.innerHTML = `<div style="font-size: 40px;">⏰</div><div>${customMessage}</div>`;
    } else {
      feedback.innerHTML = isCorrect ?
        '<div style="font-size: 40px;">✅</div><div>إجابة صحيحة!</div>' :
        '<div style="font-size: 40px;">❌</div><div>إجابة خاطئة!</div>';
    }

    document.body.appendChild(feedback);

    setTimeout(() => {
      if (document.body.contains(feedback)) {
        document.body.removeChild(feedback);
      }
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

        // Check if opponent left the challenge
        this.checkOpponentLeft(roomData);

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
    // تحديد معرف الخصم
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
    const progress = totalQuestions > 0 ? (opponentData.currentQuestion / totalQuestions) * 100 : 0;

    document.getElementById('p2CurrentQ').textContent = opponentData.currentQuestion;
    document.getElementById('p2Correct').textContent = opponentData.correctAnswers;
    document.getElementById('p2Wrong').textContent = opponentData.wrongAnswers;

    const progressBar = document.querySelector('#p2Progress div');
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  // Check if opponent left the challenge
  checkOpponentLeft(roomData) {
    if (!this.currentChallenge || this.resultsShown) return;

    const opponentId = this.currentChallenge.challengerId === this.currentUser.uid ?
      this.currentChallenge.opponentId : this.currentChallenge.challengerId;
    
    const opponentData = roomData.players[opponentId];
    
    // إذا تم تعيين الخصم كمنقطع
    if (opponentData && opponentData.hasLeft) {
      this.handleOpponentLeft(roomData, opponentId);
    }
  }

  // Handle when opponent leaves the challenge
  async handleOpponentLeft(roomData, opponentId) {
    if (this.resultsShown) return;
    this.resultsShown = true;

    // إيقاف المؤقت
    this.stopChallengeTimer();

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

    // Show opponent left notification
    this.showOpponentLeftNotification(opponentName, roomData);
  }

  // Show opponent left notification and victory
  showOpponentLeftNotification(opponentName, roomData) {
    const myData = roomData.players[this.currentUser.uid];
    const myScore = myData ? myData.correctAnswers : 0;
    const totalAnswered = myData ? myData.currentQuestion : 0;

    // Create victory modal
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
        @keyframes victorySlideIn {
          from { opacity: 0; transform: translateY(50px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes victoryPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(255, 193, 7, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
        }

        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }

        .victory-container {
          background: linear-gradient(135deg, #ffc107, #fd7e14);
          border-radius: 25px;
          padding: 40px 30px;
          max-width: 500px;
          width: 95%;
          text-align: center;
          color: white;
          animation: victorySlideIn 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
          position: relative;
          overflow: hidden;
        }

        .victory-icon {
          font-size: 100px;
          margin-bottom: 25px;
          animation: float 3s ease-in-out infinite;
          text-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
        }

        .victory-title {
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 15px;
          text-shadow: 0 4px 8px rgba(0, 0, 0, 0.7);
          animation: victoryPulse 2s infinite;
        }

        .opponent-left-message {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 15px;
          padding: 20px;
          margin: 25px 0;
          border: 2px solid rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(10px);
        }

        .opponent-left-message h3 {
          margin: 0 0 10px 0;
          font-size: 20px;
          color: #fff;
        }

        .opponent-left-message p {
          margin: 0;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.9);
        }

        .victory-stats {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 15px;
          padding: 20px;
          margin: 25px 0;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .victory-stats h4 {
          margin: 0 0 15px 0;
          color: #fff;
          font-size: 18px;
        }

        .stats-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          color: rgba(255, 255, 255, 0.9);
        }

        .action-button {
          background: rgba(255, 255, 255, 0.9);
          color: #fd7e14;
          border: none;
          border-radius: 15px;
          padding: 18px 35px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 25px;
          font-family: 'Tajawal', sans-serif;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 25px rgba(255, 255, 255, 0.3);
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
          background: rgba(253, 126, 20, 0.2);
          transition: all 0.5s ease;
          transform: translate(-50%, -50%);
        }

        .action-button:hover::before {
          width: 300px;
          height: 300px;
        }

        .action-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 35px rgba(255, 255, 255, 0.4);
        }

        @media (max-width: 480px) {
          .victory-container {
            padding: 30px 20px;
            width: 98%;
          }

          .victory-icon {
            font-size: 70px;
            margin-bottom: 20px;
          }

          .victory-title {
            font-size: 28px;
          }

          .opponent-left-message, .victory-stats {
            padding: 15px;
            margin: 20px 0;
          }

          .action-button {
            padding: 15px 25px;
            font-size: 16px;
          }
        }
      </style>

      <div class="victory-container">
        <div class="victory-icon">🎉</div>
        <div class="victory-title">فزت بالتحدي!</div>

        <div class="opponent-left-message">
          <h3>⚠️ خرج الخصم من التحدي</h3>
          <p><strong>${opponentName}</strong> انقطع عن التحدي وخرج من المباراة</p>
        </div>

        <div class="victory-stats">
          <h4>📊 إحصائياتك في التحدي:</h4>
          <div class="stats-row">
            <span>الأسئلة المجاب عليها:</span>
            <span><strong>${totalAnswered}</strong></span>
          </div>
          <div class="stats-row">
            <span>الإجابات الصحيحة:</span>
            <span><strong style="color: #28a745;">${myScore}</strong></span>
          </div>
          <div class="stats-row">
            <span>النتيجة:</span>
            <span><strong>🏆 الفوز بالانسحاب</strong></span>
          </div>
        </div>

        <button id="victoryBackToHomeBtn" class="action-button">
          🏠 العودة للرئيسية
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // تشغيل صوت الفوز
    setTimeout(() => {
      try {
        const victorySound = new Audio('./sounds/correct.wav');
        victorySound.volume = 0.8;
        victorySound.play().catch(e => console.log('Could not play victory sound:', e));
      } catch (error) {
        console.log('Error playing victory sound:', error);
      }
    }, 500);

    // إضافة مستمع الحدث لزر العودة للرئيسية
    setTimeout(() => {
      const backToHomeBtn = document.getElementById('victoryBackToHomeBtn');
      if (backToHomeBtn) {
        backToHomeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Victory back to home button clicked');

          // إزالة النافذة فوراً
          if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
          }

          // الخروج من التحدي والعودة للرئيسية
          this.exitChallenge();
        });
      }
    }, 100);

    // إضافة إمكانية الإغلاق بالضغط على الخلفية
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        console.log('Victory modal background clicked, closing challenge');
        this.exitChallenge();
      }
    });

    // Update challenge status to completed with winner
    try {
      updateDoc(doc(db, 'challengeRooms', this.currentRoom), {
        status: 'completed_by_forfeit',
        winner: this.currentUser.uid,
        completedAt: serverTimestamp(),
        reason: 'opponent_left'
      });
    } catch (error) {
      console.error('Error updating challenge status:', error);
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

    // تشغيل الصوت المناسب حسب النتيجة
    setTimeout(() => {
      try {
        if (myScore > opponentScore) {
          // صوت الفوز
          const winSound = new Audio('./sounds/correct.wav');
          winSound.volume = 0.7;
          winSound.play().catch(e => console.log('Could not play win sound:', e));
        } else if (myScore < opponentScore) {
          // صوت الخسارة
          const loseSound = new Audio('./sounds/wrong.wav');
          loseSound.volume = 0.5;
          loseSound.play().catch(e => console.log('Could not play lose sound:', e));
        } else {
          // صوت التعادل
          const tieSound = new Audio('./sounds/uiclick.wav');
          tieSound.volume = 0.6;
          tieSound.play().catch(e => console.log('Could not play tie sound:', e));
        }
      } catch (error) {
        console.log('Error playing result sound:', error);
      }
    }, 800);

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

    // Mark player as left if challenge is still active
    if (this.currentRoom && this.currentChallenge && !this.resultsShown) {
      this.markPlayerAsLeft();
    }

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

    // Remove only challenge-related modals, preserve friends modal
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

    // إعدادات التحدي الافتراضية عند فتح النافذة
    const defaultSettings = this.challengeSettings;

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

        <!-- قسم اختيار المحتوى -->
        <div id="contentSelection" style="display: block;">
          <div style="margin-bottom: 15px;">
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
        </div>

        <!-- قسم إعدادات التحدي (مخفي افتراضياً) -->
        <div id="challengeSettingsSection" style="display: none;">
          <div style="
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            margin: 25px 0;
            border: 1px solid rgba(255, 255, 255, 0.2);
          ">
            <h3 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 18px; font-weight: 700;">إعدادات التحدي</h3>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 10px; justify-content: space-between;">
                <label for="challengeTimer" style="color: #495057;">تفعيل المؤقت:</label>
                <input type="checkbox" id="challengeTimer" ${defaultSettings.timerEnabled ? 'checked' : ''} style="transform: scale(1.2);">
              </div>
              <div style="display: flex; align-items: center; gap: 10px; justify-content: space-between;">
                <label for="challengeShuffleQuestions" style="color: #495057;">عشوائية الأسئلة:</label>
                <input type="checkbox" id="challengeShuffleQuestions" ${defaultSettings.shuffleQuestions ? 'checked' : ''} style="transform: scale(1.2);">
              </div>
              <div style="display: flex; align-items: center; gap: 10px; justify-content: space-between;">
                <label for="challengeShuffleAnswers" style="color: #495057;">عشوائية الأجوبة:</label>
                <input type="checkbox" id="challengeShuffleAnswers" ${defaultSettings.shuffleAnswers ? 'checked' : ''} style="transform: scale(1.2);">
              </div>
              <div style="display: flex; align-items: center; gap: 10px; justify-content: space-between;">
                <label for="challengeQuestionCount" style="color: #495057;">عدد الأسئلة:</label>
                <input type="number" id="challengeQuestionCount" value="${defaultSettings.questionCount}" min="5" max="50" style="padding: 5px; border-radius: 8px; border: 1px solid #ccc;">
              </div>
              <div style="display: flex; align-items: center; gap: 10px; justify-content: space-between;">
                <label for="challengeTimePerQuestion" style="color: #495057;">وقت السؤال (ثانية):</label>
                <input type="number" id="challengeTimePerQuestion" value="${defaultSettings.timePerQuestion}" min="10" max="60" style="padding: 5px; border-radius: 8px; border: 1px solid #ccc;">
              </div>
            </div>
          </div>
        </div>

        <!-- عرض الإعدادات الحالية -->
        <div id="settingsSummary" style="
          background: rgba(102, 126, 234, 0.1);
          border-radius: 12px;
          padding: 15px;
          margin: 20px 0;
          border: 2px solid rgba(102, 126, 234, 0.3);
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0; color: #2c3e50; font-size: 16px;">الإعدادات الحالية:</h4>
            <button id="editSettingsBtn" style="
              background: linear-gradient(135deg, #667eea, #764ba2);
              color: white;
              border: none;
              border-radius: 8px;
              padding: 6px 12px;
              font-size: 12px;
              font-weight: 600;
              cursor: pointer;
              font-family: 'Tajawal', sans-serif;
              transition: all 0.3s ease;
            ">⚙️ تعديل</button>
          </div>
          <div id="settingsDisplay" style="color: #495057; font-size: 14px; line-height: 1.4;">
            المؤقت: ${defaultSettings.timerEnabled ? 'مفعل' : 'معطل'} | 
            الأسئلة العشوائية: ${defaultSettings.shuffleQuestions ? 'مفعلة' : 'معطلة'} | 
            الأجوبة العشوائية: ${defaultSettings.shuffleAnswers ? 'مفعلة' : 'معطلة'}<br>
            عدد الأسئلة: ${defaultSettings.questionCount} | 
            وقت السؤال: ${defaultSettings.timePerQuestion} ثانية
          </div>
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

    // Handle toggle between content selection and settings
    document.getElementById('editSettingsBtn').onclick = () => {
      const contentSelection = document.getElementById('contentSelection');
      const settingsSection = document.getElementById('challengeSettingsSection');
      const editBtn = document.getElementById('editSettingsBtn');

      if (settingsSection.style.display === 'none') {
        // إظهار الإعدادات وإخفاء اختيار المحتوى
        contentSelection.style.display = 'none';
        settingsSection.style.display = 'block';
        editBtn.textContent = '📋 العودة للاختيار';
        editBtn.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
      } else {
        // إظهار اختيار المحتوى وإخفاء الإعدادات
        contentSelection.style.display = 'block';
        settingsSection.style.display = 'none';
        editBtn.textContent = '⚙️ تعديل';
        editBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        
        // تحديث عرض الإعدادات
        this.updateSettingsDisplay();
      }
    };

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

  // Update settings display
  updateSettingsDisplay() {
    const timerEnabled = document.getElementById('challengeTimer').checked;
    const shuffleQuestions = document.getElementById('challengeShuffleQuestions').checked;
    const shuffleAnswers = document.getElementById('challengeShuffleAnswers').checked;
    const questionCount = document.getElementById('challengeQuestionCount').value;
    const timePerQuestion = document.getElementById('challengeTimePerQuestion').value;

    const settingsDisplay = document.getElementById('settingsDisplay');
    if (settingsDisplay) {
      settingsDisplay.innerHTML = `
        المؤقت: ${timerEnabled ? 'مفعل' : 'معطل'} | 
        الأسئلة العشوائية: ${shuffleQuestions ? 'مفعلة' : 'معطلة'} | 
        الأجوبة العشوائية: ${shuffleAnswers ? 'مفعلة' : 'معطلة'}<br>
        عدد الأسئلة: ${questionCount} | 
        وقت السؤال: ${timePerQuestion} ثانية
      `;
    }
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

    // تحديث إعدادات التحدي بناءً على المدخلات
    this.challengeSettings.timerEnabled = document.getElementById('challengeTimer').checked;
    this.challengeSettings.shuffleQuestions = document.getElementById('challengeShuffleQuestions').checked;
    this.challengeSettings.shuffleAnswers = document.getElementById('challengeShuffleAnswers').checked;
    this.challengeSettings.questionCount = parseInt(document.getElementById('challengeQuestionCount').value, 10);
    this.challengeSettings.timePerQuestion = parseInt(document.getElementById('challengeTimePerQuestion').value, 10);

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

  // Clear session notifications
  clearSessionNotifications() {
    // مسح جميع إشعارات التحديات من sessionStorage
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('challenge_accepted_') || key.startsWith('challenge_incoming_')) {
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
  }

  // Start the challenge timer
  startChallengeTimer() {
    console.log('Starting challenge timer...');
    
    // إيقاف أي مؤقت سابق أولاً
    this.stopChallengeTimer();

    // العثور على المؤقت الدائري
    const timerElement = document.getElementById('challengeTimerCircle');
    if (!timerElement) {
      console.log('Challenge timer circle not found');
      return;
    }

    // إظهار المؤقت وتعيين الوقت
    
    // تعيين الوقت الأقصى للسؤال من الإعدادات
    this.currentTimerValue = this.challengeSettings?.timePerQuestion || 30;
    console.log('Timer value set to:', this.currentTimerValue, 'seconds');
    
    // تحديث العرض فوراً
    this.updateTimerDisplay();

    // تشغيل المؤقت
    this.timerInterval = setInterval(() => {
      if (this.questionAnswered) {
        console.log('Question already answered, stopping timer');
        this.stopChallengeTimer();
        return;
      }

      this.currentTimerValue--;
      this.updateTimerDisplay();
      console.log('Timer tick:', this.currentTimerValue);

      if (this.currentTimerValue <= 0) {
        console.log('Timer reached zero, handling timeout');
        this.stopChallengeTimer();
        this.handleTimeOut();
      }
    }, 1000);

    console.log('Challenge timer started successfully');
  }

  // Update timer display
  updateTimerDisplay() {
    const timerElement = document.getElementById('challengeTimerCircle');
    if (timerElement && this.currentTimerValue !== undefined) {
      // عرض الوقت في الدائرة (ثوان فقط)
      timerElement.textContent = this.currentTimerValue;
      
      // حساب النسبة المئوية للوقت المتبقي
      const totalTime = this.challengeSettings?.timePerQuestion || 30;
      const percentage = (this.currentTimerValue / totalTime) * 100;
      const degrees = (percentage / 100) * 360;
      
      // تحديث الدائرة التقدمية
      let circleColor = '#28a745'; // أخضر افتراضي
      let borderColor = 'rgba(40, 167, 69, 0.5)';
      let animation = 'none';
      
      // تغيير لون المؤقت حسب الوقت المتبقي
      if (this.currentTimerValue <= 5) {
        circleColor = '#dc3545'; // أحمر
        borderColor = 'rgba(220, 53, 69, 0.7)';
        animation = 'pulse-danger 0.5s infinite';
      } else if (this.currentTimerValue <= 10) {
        circleColor = '#ffc107'; // أصفر
        borderColor = 'rgba(255, 193, 7, 0.7)';
        animation = 'pulse-warning 1.5s infinite';
      }
      
      // تطبيق التصميم
      timerElement.style.background = `conic-gradient(${circleColor} ${degrees}deg, rgba(255, 255, 255, 0.3) 0deg)`;
      timerElement.style.borderColor = borderColor;
      timerElement.style.animation = animation;
      
      console.log('Timer display updated:', timerElement.textContent, 'seconds');
    }
  }

  // Stop the challenge timer
  stopChallengeTimer() {
    console.log('Stopping challenge timer...');
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
      console.log('Timer interval cleared');
    }
    
    const timerElement = document.getElementById('challengeTimerCircle');
    if (timerElement) {
      timerElement.textContent = '--';
      timerElement.style.background = 'conic-gradient(#28a745 0deg, #28a745 0deg, rgba(255, 255, 255, 0.3) 0deg)';
      timerElement.style.animation = 'none';
      console.log('Timer element reset');
    }
  }

  // Handle time out for a question
  handleTimeOut() {
    console.log('Time out for question!');
    
    if (this.questionAnswered) {
      console.log('Question already answered, ignoring timeout');
      return;
    }

    // تعيين السؤال كمجاب عليه لمنع إجابات إضافية
    this.questionAnswered = true;
    
    // زيادة عدد الإجابات الخاطئة
    this.wrongAnswers++;
    this.currentQuestionIndex++;

    // إظهار الإجابة الصحيحة وتعطيل جميع الأزرار
    const container = document.getElementById('challengeQuestionContainer');
    if (container) {
      const buttons = container.querySelectorAll('button');
      const question = this.challengeQuestions[this.currentQuestionIndex - 1];
      
      buttons.forEach((btn, index) => {
        btn.disabled = true;
        if (index === question.answer) {
          btn.style.backgroundColor = 'lightgreen';
        }
      });
    }

    // تحديث التقدم
    this.updateChallengeProgress();
    this.updateLocalProgress();

    // عرض رسالة انتهاء الوقت
    this.showAnswerFeedback(false, 'انتهى الوقت! ⏰');

    // الانتقال للسؤال التالي بعد تأخير
    setTimeout(() => {
      this.displayChallengeQuestion();
    }, 2000);
  }

  // Shuffle array (Fisher-Yates Algorithm)
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Shuffle questions
  shuffleQuestions(questions) {
    return this.shuffleArray(questions);
  }

  // Shuffle answers within a question
  shuffleAnswers(question) {
    if (question && question.options && Array.isArray(question.options)) {
      // شفل للأجوبة
      const shuffledOptions = this.shuffleArray([...question.options]);
      // إيجاد الإجابة الصحيحة الجديدة
      const correctAnswerIndex = question.options.findIndex((option, index) => index === question.answer);
      const newAnswerIndex = shuffledOptions.findIndex(option => option === question.options[correctAnswerIndex]);

      // إنشاء نسخة جديدة من السؤال مع الأجوبة المبعثرة
      return {
        ...question,
        options: shuffledOptions,
        answer: newAnswerIndex
      };
    }
    return question;
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

  @keyframes pulse-safe {
    0% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.02); opacity: 1; }
    100% { transform: scale(1); opacity: 0.9; }
  }

  @keyframes pulse-warning {
    0% { transform: scale(1); opacity: 0.85; }
    50% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); opacity: 0.85; }
  }

  @keyframes pulse-danger {
    0% { transform: scale(1) rotate(-1deg); opacity: 0.8; }
    50% { transform: scale(1.08) rotate(1deg); opacity: 1; }
    100% { transform: scale(1) rotate(-1deg); opacity: 0.8; }
  }
`;
document.head.appendChild(style);

// Create global challenge manager instance
window.challengeManager = new ChallengeManager();

export default window.challengeManager;
