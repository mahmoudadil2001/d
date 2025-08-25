
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
  arrayUnion,
  arrayRemove
} from './firebase-config.js';

class FriendsManager {
  constructor(authManager) {
    this.authManager = authManager;
    this.currentUser = null;
    this.friends = [];
    this.friendRequests = [];
    this.sentRequests = [];

    // استمع لتغييرات حالة المصادقة
    this.authManager.setAuthChangeCallback((user) => {
      this.currentUser = user;
      if (user) {
        this.loadUserFriends();
      }
    });
  }

  // تحديث المستخدم الحالي
  updateCurrentUser(user) {
    this.currentUser = user;
    console.log('FriendsManager: currentUser updated to:', user?.uid || 'null');

    // تحديث آخر ظهور عند تسجيل الدخول
    if (user) {
      this.updateLastSeen();
      this.startActivityTracker();
      this.startRealtimeActivityListener();
      // تحميل بيانات الأصدقاء تلقائياً
      setTimeout(() => {
        this.loadUserFriends();
      }, 1000);
    } else {
      this.stopActivityTracker();
      this.stopRealtimeActivityListener();
    }
  }

  // تحميل قائمة أصدقاء المستخدم
  async loadUserFriends() {
    if (!this.currentUser) {
      console.log('No current user for loadUserFriends');
      return;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        this.friends = userData.friends || [];
        this.friendRequests = userData.friendRequests || [];
        this.sentRequests = userData.sentRequests || [];
        console.log('Friends data loaded successfully:', {
          friends: this.friends.length,
          requests: this.friendRequests.length,
          sent: this.sentRequests.length
        });
        
        // تحديث حالة النشاط للأصدقاء
        this.updateFriendsActivityStatus();
      } else {
        console.log('User document does not exist');
        this.friends = [];
        this.friendRequests = [];
        this.sentRequests = [];
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      this.friends = [];
      this.friendRequests = [];
      this.sentRequests = [];
    }
  }

  // تحديث حالة نشاط الأصدقاء في الواجهة
  async updateFriendsActivityStatus() {
    if (!this.friends.length) return;

    try {
      const friendsStatus = await this.getFriendsActivityStatus();
      
      // تحديث عناصر الواجهة إذا كانت موجودة
      this.friends.forEach(friend => {
        const friendElement = document.querySelector(`[data-friend-uid="${friend.uid}"]`);
        if (friendElement && friendsStatus[friend.uid]) {
          const statusElement = friendElement.querySelector('.friend-status');
          if (statusElement) {
            const status = friendsStatus[friend.uid];
            statusElement.innerHTML = `
              <span style="color: ${status.statusColor};">
                ${status.statusIcon} ${status.status}
              </span>
            `;
          }
        }
      });
    } catch (error) {
      console.error('Error updating friends activity status:', error);
    }
  }

  // تحديث آخر ظهور للمستخدم الحالي
  async updateLastSeen() {
    if (!this.currentUser) return;

    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(userRef, {
        lastSeen: new Date().toISOString(),
        isOnline: true,
        lastActivity: Date.now() // إضافة timestamp للنشاط
      });
    } catch (error) {
      console.error('Error updating last seen:', error);
    }
  }

  // بدء مراقبة الحالة في الوقت الفعلي
  startRealtimeActivityListener() {
    if (!this.currentUser || this.realtimeListenerActive) return;

    try {
      // مراقبة تغييرات حالة الأصدقاء في الوقت الفعلي
      const usersRef = collection(db, 'users');
      this.friendsActivityUnsubscribe = onSnapshot(usersRef, (snapshot) => {
        const changes = snapshot.docChanges();
        let shouldUpdateUI = false;

        changes.forEach((change) => {
          if (change.type === 'modified') {
            const userId = change.doc.id;
            // التحقق إذا كان التغيير يخص أحد الأصدقاء
            if (this.friends.some(friend => friend.uid === userId)) {
              shouldUpdateUI = true;
            }
          }
        });

        if (shouldUpdateUI) {
          // تحديث فوري للواجهة
          this.updateFriendsActivityStatus();
          this.updateOnlineFriendsBadge();
        }
      });

      this.realtimeListenerActive = true;
      console.log('Realtime activity listener started');
    } catch (error) {
      console.error('Error starting realtime listener:', error);
    }
  }

  // إيقاف مراقبة الحالة في الوقت الفعلي
  stopRealtimeActivityListener() {
    if (this.friendsActivityUnsubscribe) {
      this.friendsActivityUnsubscribe();
      this.friendsActivityUnsubscribe = null;
    }
    this.realtimeListenerActive = false;
    console.log('Realtime activity listener stopped');
  }

  // بدء تتبع النشاط
  startActivityTracker() {
    // إيقاف أي مؤقتات سابقة
    this.stopActivityTracker();

    // تحديث آخر ظهور كل 10 ثوانٍ بدلاً من 30
    this.activityInterval = setInterval(() => {
      this.updateLastSeen();
    }, 10000);

    // تحديث حالة الأصدقاء كل 15 ثانية بدلاً من دقيقة
    this.friendsActivityInterval = setInterval(() => {
      this.updateFriendsActivityStatus();
    }, 15000);

    // تتبع نشاط المستخدم (حركة الماوس، ضغطات المفاتيح، إلخ)
    this.lastActivityTime = Date.now();
    this.setupUserActivityDetection();

    // تحديث حالة الخروج عند إغلاق الصفحة
    this.beforeUnloadHandler = () => {
      this.setOfflineStatusImmediate();
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);

    // تحديث حالة النشاط عند تغيير visibility
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === 'visible') {
        this.updateLastSeen();
        this.updateFriendsActivityStatus();
        this.startPeriodicUpdates();
      } else {
        // عندما يخرج من التبويب، تحديث فوري
        this.setOfflineStatusImmediate();
        this.stopPeriodicUpdates();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityChangeHandler);

    // كشف إغلاق النافذة أو التنقل
    this.pagehideHandler = () => {
      this.setOfflineStatusImmediate();
    };
    window.addEventListener('pagehide', this.pagehideHandler);

    // كشف فقدان التركيز
    this.blurHandler = () => {
      setTimeout(() => {
        if (document.hidden) {
          this.setOfflineStatusImmediate();
        }
      }, 1000);
    };
    window.addEventListener('blur', this.blurHandler);
  }

  // إعداد كشف نشاط المستخدم
  setupUserActivityDetection() {
    const updateActivity = () => {
      this.lastActivityTime = Date.now();
    };

    // مراقبة أنشطة المستخدم
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // فحص عدم النشاط كل 30 ثانية
    this.inactivityCheckInterval = setInterval(() => {
      const timeSinceActivity = Date.now() - this.lastActivityTime;
      if (timeSinceActivity > 300000) { // 5 دقائق عدم نشاط
        this.setOfflineStatusImmediate();
      }
    }, 30000);
  }

  // بدء التحديثات الدورية
  startPeriodicUpdates() {
    if (!this.periodicUpdateInterval) {
      this.periodicUpdateInterval = setInterval(() => {
        this.updateLastSeen();
        this.updateFriendsActivityStatus();
      }, 10000);
    }
  }

  // إيقاف التحديثات الدورية
  stopPeriodicUpdates() {
    if (this.periodicUpdateInterval) {
      clearInterval(this.periodicUpdateInterval);
      this.periodicUpdateInterval = null;
    }
  }

  // إيقاف تتبع النشاط
  stopActivityTracker() {
    // إيقاف جميع المؤقتات
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
    if (this.friendsActivityInterval) {
      clearInterval(this.friendsActivityInterval);
      this.friendsActivityInterval = null;
    }
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }
    if (this.periodicUpdateInterval) {
      clearInterval(this.periodicUpdateInterval);
      this.periodicUpdateInterval = null;
    }

    // إزالة مستمعي الأحداث
    if (this.beforeUnloadHandler) {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }
    if (this.visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      this.visibilityChangeHandler = null;
    }
    if (this.pagehideHandler) {
      window.removeEventListener('pagehide', this.pagehideHandler);
      this.pagehideHandler = null;
    }
    if (this.blurHandler) {
      window.removeEventListener('blur', this.blurHandler);
      this.blurHandler = null;
    }

    this.setOfflineStatusImmediate();
  }

  // تحديث حالة الخروج الفوري
  async setOfflineStatusImmediate() {
    if (!this.currentUser) return;

    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(userRef, {
        isOnline: false,
        lastSeen: new Date().toISOString()
      });
      console.log('User status set to offline immediately');
    } catch (error) {
      console.error('Error setting offline status:', error);
      // إعادة المحاولة مرة واحدة
      setTimeout(() => {
        this.setOfflineStatusImmediate();
      }, 1000);
    }
  }

  // تحديث حالة المستخدم إلى غير متصل
  async setOfflineStatus() {
    if (!this.currentUser) return;

    try {
      const userRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(userRef, {
        isOnline: false,
        lastSeen: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error setting offline status:', error);
    }
  }

  // الحصول على حالة النشاط للأصدقاء - إصلاح شامل للمنطق
  async getFriendsActivityStatus() {
    if (!this.friends.length) return {};

    const friendsStatus = {};
    const now = new Date();
    const currentTime = Date.now();

    // استخدام Promise.all للسرعة مع معالجة أفضل للأخطاء
    const friendsData = await Promise.allSettled(
      this.friends.map(async (friend) => {
        try {
          const friendDoc = await getDoc(doc(db, 'users', friend.uid));
          return { friend, data: friendDoc.exists() ? friendDoc.data() : null };
        } catch (error) {
          console.error(`Error fetching data for friend ${friend.uid}:`, error);
          return { friend, data: null };
        }
      })
    );

    friendsData.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { friend, data: friendData } = result.value;
        
        // معالجة حالة عدم وجود بيانات
        if (!friendData) {
          friendsStatus[friend.uid] = {
            status: 'غير متاح',
            statusColor: '#6c757d',
            statusIcon: '⚪',
            lastSeen: 'غير محدد',
            isOnline: false,
            lastActivity: 0,
            isReallyOnline: false // إضافة حقل للتأكد من النشاط الحقيقي
          };
          return;
        }

        // استخراج البيانات مع التحقق الدقيق من الأنواع
        const lastSeenString = friendData.lastSeen;
        const isOnlineFlag = friendData.isOnline;
        const lastActivity = friendData.lastActivity;

        // التحقق من صحة lastSeen
        let lastSeen = null;
        if (lastSeenString && typeof lastSeenString === 'string') {
          try {
            lastSeen = new Date(lastSeenString);
            // التحقق من صحة التاريخ
            if (isNaN(lastSeen.getTime())) {
              lastSeen = null;
            }
          } catch (error) {
            console.error('Invalid lastSeen date:', lastSeenString);
            lastSeen = null;
          }
        }

        // التحقق من صحة isOnline
        const isOnline = isOnlineFlag === true;

        // التحقق من صحة lastActivity
        const validLastActivity = (typeof lastActivity === 'number' && lastActivity > 0) ? lastActivity : 0;

        // حساب الفروقات الزمنية
        const timeDiffFromLastSeen = lastSeen ? (now.getTime() - lastSeen.getTime()) : Infinity;
        const timeDiffFromLastActivity = validLastActivity > 0 ? (currentTime - validLastActivity) : Infinity;

        // منطق محسن لتحديد الحالة الحقيقية
        let status = 'غير متاح';
        let statusColor = '#6c757d';
        let statusIcon = '⚪';
        let isReallyOnline = false;

        // الشرط الأساسي: المستخدم متصل حقاً؟
        const isActuallyOnline = isOnline && 
                               lastSeen && 
                               timeDiffFromLastSeen < 60000 && // أقل من دقيقة واحدة من lastSeen
                               (validLastActivity === 0 || timeDiffFromLastActivity < 120000); // أقل من دقيقتين من النشاط

        if (isActuallyOnline) {
          // متصل حقاً
          if (timeDiffFromLastSeen < 30000) { // أقل من 30 ثانية
            status = 'متصل الآن 🔥';
            statusColor = '#28a745';
            statusIcon = '🟢';
            isReallyOnline = true;
          } else {
            status = 'نشط مؤخراً ⚡';
            statusColor = '#ffc107';
            statusIcon = '🟡';
            isReallyOnline = false;
          }
        } else if (lastSeen && timeDiffFromLastSeen < Infinity) {
          // غير متصل لكن لديه lastSeen صالح
          if (timeDiffFromLastSeen < 300000) { // أقل من 5 دقائق
            const minutes = Math.floor(timeDiffFromLastSeen / 60000);
            status = `آخر ظهور منذ ${minutes} دقيقة`;
            statusColor = '#17a2b8';
            statusIcon = '🔵';
          } else if (timeDiffFromLastSeen < 1800000) { // أقل من 30 دقيقة
            const minutes = Math.floor(timeDiffFromLastSeen / 60000);
            status = `آخر ظهور منذ ${minutes} دقيقة`;
            statusColor = '#fd7e14';
            statusIcon = '🟠';
          } else if (timeDiffFromLastSeen < 86400000) { // أقل من يوم
            const hours = Math.floor(timeDiffFromLastSeen / 3600000);
            status = `آخر ظهور منذ ${hours} ساعة`;
            statusColor = '#fd7e14';
            statusIcon = '🟠';
          } else {
            const days = Math.floor(timeDiffFromLastSeen / 86400000);
            status = `آخر ظهور منذ ${days} يوم`;
            statusColor = '#6c757d';
            statusIcon = '⚫';
          }
        } else {
          // لا توجد بيانات صالحة
          status = 'غير متاح';
          statusColor = '#6c757d';
          statusIcon = '⚪';
        }

        friendsStatus[friend.uid] = {
          status,
          statusColor,
          statusIcon,
          lastSeen: lastSeen ? lastSeen.toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' }) : 'غير محدد',
          isOnline: isOnline,
          lastActivity: validLastActivity,
          isReallyOnline: isReallyOnline,
          timeDiffFromLastSeen: timeDiffFromLastSeen,
          timeDiffFromLastActivity: timeDiffFromLastActivity
        };
      } else {
        // فشل في جلب البيانات
        friendsStatus[friend.uid] = {
          status: 'خطأ في التحميل',
          statusColor: '#dc3545',
          statusIcon: '❌',
          lastSeen: 'غير محدد',
          isOnline: false,
          lastActivity: 0,
          isReallyOnline: false
        };
      }
    });

    console.log('Friends activity status calculated:', friendsStatus);
    return friendsStatus;
  }

  // البحث عن المستخدمين بالاسم الكامل فقط عند وجود نص بحث
  async searchUsers(searchTerm = '') {
    if (!this.currentUser || !this.currentUser.uid) {
      console.error('No current user for search');
      return [];
    }

    // إذا لم يكن هناك نص بحث، لا نقوم بالبحث
    if (!searchTerm || searchTerm.trim() === '') {
      console.log('No search term provided');
      return [];
    }

    // التحقق من أن نص البحث يحتوي على كلمتين على الأقل، كل منها 3 أحرف على الأقل
    const searchWords = searchTerm.trim().split(/\s+/);
    if (searchWords.length < 2) {
      console.log('Search requires at least 2 words');
      return [];
    }

    for (const word of searchWords) {
      if (word.length < 3) {
        console.log('Each search word must be at least 3 characters');
        return [];
      }
    }

    try {
      // التأكد من تحميل بيانات المستخدم الحالي أولاً
      await this.loadUserFriends();

      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);

      const results = [];
      const addedEmails = new Set(); // مجموعة لتتبع الإيميلات المضافة
      const addedUIDs = new Set(); // مجموعة لتتبع UID التي تم إضافتها بالفعل

      // التحقق من المستخدمين واحداً تلو الآخر
      for (const doc of querySnapshot.docs) {
        const userData = doc.data();
        const fullName = userData["الاسم الكامل"] || userData.fullName || userData.name || '';
        const userEmail = userData["الايميل"] || userData.email || '';
        const userGroup = userData["الجروب"] || userData.group || userData["المجموعة"] || 'غير محدد';
        const uid = doc.id;

        if (uid && fullName && userEmail) {
          // التحقق من أن المستخدم لديه ايميل صالح (يحتوي على @)
          if (userEmail && userEmail.includes('@') && userEmail.trim() !== '') {

            // التحقق من وجود المستخدم في Firebase Authentication
            const isValidAuthUser = await this.checkUserExistsInAuth(uid, userEmail);

            if (isValidAuthUser) {
              // تصفية النتائج: استبعاد المستخدم الحالي والأصدقاء الحاليين
              if (uid !== this.currentUser.uid && 
                  !this.friends.some(friend => friend.uid === uid) &&
                  !addedUIDs.has(uid) &&
                  !addedEmails.has(userEmail.toLowerCase())) { // منع تكرار نفس الإيميل

                // فلتر بالاسم فقط
                const searchLower = searchTerm.toLowerCase();
                const nameMatch = fullName.toLowerCase().includes(searchLower);

                if (nameMatch) {
                  // التحقق من حالات طلبات الصداقة
                  const hasSentRequest = this.sentRequests.some(req => req.uid === uid);
                  const hasReceivedRequest = this.friendRequests.some(req => req.uid === uid);

                  addedUIDs.add(uid); // إضافة UID إلى المجموعة لمنع التكرار
                  addedEmails.add(userEmail.toLowerCase()); // إضافة الإيميل لمنع التكرار

                  results.push({
                    uid: uid,
                    name: fullName || 'غير محدد',
                    email: userEmail,
                    group: userGroup,
                    hasSentRequest: hasSentRequest,
                    hasReceivedRequest: hasReceivedRequest
                  });
                }
              }
            }
          }
        }
      }

      // ترتيب النتائج حسب الاسم
      results.sort((a, b) => {
        if (a.name === 'غير محدد' && b.name !== 'غير محدد') return 1;
        if (b.name === 'غير محدد' && a.name !== 'غير محدد') return -1;
        return a.name.localeCompare(b.name, 'ar');
      });

      console.log('Search results:', results.length, 'unique users found for search term:', searchTerm);
      return results;
    } catch (error) {
      console.error('Error searching users:', error);
      let errorMessage = 'فشل في البحث عن المستخدمين';

      if (error.code === 'permission-denied') {
        errorMessage = 'ليس لديك صلاحية للوصول لقاعدة البيانات';
      } else if (error.code === 'unavailable') {
        errorMessage = 'لا يمكن الاتصال بقاعدة البيانات، تحقق من الاتصال بالإنترنت';
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }

      this.showError(errorMessage);
      return [];
    }
  }

  // التحقق من وجود المستخدم في Firebase Authentication
  async checkUserExistsInAuth(uid, email) {
    try {
      // محاولة استرجاع معلومات المستخدم من Firebase Auth باستخدام Admin SDK (غير متاح من الكلايند)
      // بدلاً من ذلك، سنتحقق من صحة UID بطريقة أخرى

      // التحقق من تطابق UID مع المستخدم الحالي (إذا كان نفس المستخدم)
      if (uid === this.currentUser.uid) {
        return true;
      }

      // التحقق البسيط: إذا كان المستخدم موجود في Firestore ولديه UID صالح وإيميل صالح
      // فهذا يعني أنه تم إنشاؤه من خلال Firebase Auth

      // نتحقق من أن UID له تنسيق Firebase Auth الصحيح (طوله 28 حرف عادة)
      const isValidUID = typeof uid === 'string' && uid.length >= 20 && uid.length <= 50;

      // نتحقق من أن الإيميل صحيح
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValidEmail = emailRegex.test(email);

      if (isValidUID && isValidEmail) {
        // إجراء فحص إضافي: محاولة الوصول لبيانات المستخدم
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // التأكد من وجود حقول تم إنشاؤها بواسطة Firebase Auth
            const hasAuthFields = userData.uid === uid && userData["الايميل"] === email;
            return hasAuthFields;
          }
        } catch (error) {
          console.log('Error checking user document:', error);
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking user in auth:', error);
      return false;
    }
  }

  // إرسال طلب صداقة
  async sendFriendRequest(targetUserId) {
    if (!this.currentUser) {
      this.showError('يجب تسجيل الدخول أولاً');
      return false;
    }

    if (!targetUserId || targetUserId === this.currentUser.uid) {
      this.showError('لا يمكن إرسال طلب صداقة لنفسك');
      return false;
    }

    try {
      // التأكد من وجود المستخدم المستهدف
      const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
      if (!targetUserDoc.exists()) {
        this.showError('المستخدم المستهدف غير موجود');
        return false;
      }

      // التأكد من عدم وجود طلب سابق
      await this.loadUserFriends();
      if (this.sentRequests.includes(targetUserId)) {
        this.showError('تم إرسال طلب صداقة مسبقاً لهذا المستخدم');
        return false;
      }

      // التأكد من أن المستخدم ليس صديق بالفعل
      if (this.friends.some(friend => friend.uid === targetUserId)) {
        this.showError('هذا المستخدم صديق بالفعل');
        return false;
      }

      // إنشاء كائن الطلب بمعلومات المرسل
      const currentUserDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
      const currentUserData = currentUserDoc.exists() ? currentUserDoc.data() : {};

      const requestData = {
        uid: this.currentUser.uid,
        name: currentUserData["الاسم الكامل"] || currentUserData.fullName || this.currentUser.displayName || 'غير محدد',
        email: currentUserData["الايميل"] || currentUserData.email || this.currentUser.email || '',
        group: currentUserData["الجروب"] || currentUserData.group || 'غير محدد',
        timestamp: new Date().toISOString()
      };

      // إضافة الطلب للمستخدم المستهدف
      const targetUserRef = doc(db, 'users', targetUserId);
      await updateDoc(targetUserRef, {
        friendRequests: arrayUnion(requestData)
      });

      // إضافة معرف المستخدم المستهدف لقائمة الطلبات المرسلة
      const currentUserRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(currentUserRef, {
        sentRequests: arrayUnion(targetUserId)
      });

      // تحديث البيانات المحلية
      this.sentRequests.push(targetUserId);

      this.showSuccess('تم إرسال طلب الصداقة بنجاح');
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      let errorMessage = 'فشل في إرسال طلب الصداقة';

      if (error.code === 'permission-denied') {
        errorMessage = 'ليس لديك صلاحية للوصول لهذه البيانات';
      } else if (error.code === 'unavailable') {
        errorMessage = 'لا يمكن الاتصال بقاعدة البيانات، تحقق من الاتصال بالإنترنت';
      } else if (error.code === 'not-found') {
        errorMessage = 'المستخدم غير موجود';
      }

      this.showError(errorMessage);
      return false;
    }
  }

  // قبول طلب صداقة
  async acceptFriendRequest(friendUserId) {
    if (!this.currentUser) {
      this.showError('يجب تسجيل الدخول أولاً');
      return false;
    }

    try {
      // الحصول على بيانات الصديق
      const friendDoc = await getDoc(doc(db, 'users', friendUserId));
      if (!friendDoc.exists()) {
        this.showError('المستخدم غير موجود');
        return false;
      }

      const friendData = friendDoc.data();
      const currentUserDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
      const currentUserData = currentUserDoc.data();

      // التأكد من وجود طلب صداقة
      await this.loadUserFriends();
      const hasRequest = this.friendRequests.some(req => 
        (typeof req === 'string' ? req : req.uid) === friendUserId
      );

      if (!hasRequest) {
        this.showError('لا يوجد طلب صداقة من هذا المستخدم');
        return false;
      }

      // إضافة كل منهما لقائمة أصدقاء الآخر
      const friendInfo = {
        uid: friendUserId,
        name: friendData["الاسم الكامل"] || friendData.fullName || 'غير محدد',
        email: friendData["الايميل"] || friendData.email || '',
        group: friendData["الجروب"] || friendData.group || 'غير محدد',
        addedAt: new Date().toISOString()
      };

      const currentUserInfo = {
        uid: this.currentUser.uid,
        name: currentUserData["الاسم الكامل"] || currentUserData.fullName || this.currentUser.displayName || 'غير محدد',
        email: currentUserData["الايميل"] || currentUserData.email || this.currentUser.email || '',
        group: currentUserData["الجروب"] || currentUserData.group || 'غير محدد',
        addedAt: new Date().toISOString()
      };

      // البحث عن كائن الطلب الكامل لحذفه
      const requestToRemove = this.friendRequests.find(req => 
        (typeof req === 'string' ? req : req.uid) === friendUserId
      );

      // تحديث قوائم الأصدقاء وإزالة الطلبات
      const currentUserRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(currentUserRef, {
        friends: arrayUnion(friendInfo),
        friendRequests: arrayRemove(requestToRemove || friendUserId)
      });

      const friendUserRef = doc(db, 'users', friendUserId);
      await updateDoc(friendUserRef, {
        friends: arrayUnion(currentUserInfo),
        sentRequests: arrayRemove(this.currentUser.uid)
      });

      // تحديث البيانات المحلية
      this.friends.push(friendInfo);
      this.friendRequests = this.friendRequests.filter(req => 
        (typeof req === 'string' ? req : req.uid) !== friendUserId
      );

      this.showSuccess('تم قبول طلب الصداقة بنجاح');
      return true;
    } catch (error) {
      console.error('Error accepting friend request:', error);
      let errorMessage = 'فشل في قبول طلب الصداقة';

      if (error.code === 'permission-denied') {
        errorMessage = 'ليس لديك صلاحية للوصول لهذه البيانات';
      } else if (error.code === 'unavailable') {
        errorMessage = 'لا يمكن الاتصال بقاعدة البيانات، تحقق من الاتصال بالإنترنت';
      }

      this.showError(errorMessage);
      return false;
    }
  }

  // رفض طلب صداقة
  async rejectFriendRequest(friendUserId) {
    if (!this.currentUser) return false;

    try {
      // العثور على كائن الطلب الكامل لحذفه
      const requestToRemove = this.friendRequests.find(req => 
        (typeof req === 'string' ? req : req.uid) === friendUserId
      );

      // إزالة الطلب من قائمة المستخدم الحالي
      const currentUserRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(currentUserRef, {
        friendRequests: arrayRemove(requestToRemove || friendUserId)
      });

      // إزالة الطلب من قائمة المرسل
      const friendUserRef = doc(db, 'users', friendUserId);
      await updateDoc(friendUserRef, {
        sentRequests: arrayRemove(this.currentUser.uid)
      });

      // تحديث البيانات المحلية
      this.friendRequests = this.friendRequests.filter(req => 
        (typeof req === 'string' ? req : req.uid) !== friendUserId
      );

      this.showSuccess('تم رفض طلب الصداقة');
      return true;
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      this.showError('فشل في رفض طلب الصداقة');
      return false;
    }
  }

  // حذف صديق
  async removeFriend(friendUserId) {
    if (!this.currentUser) return false;

    try {
      // العثور على بيانات الصديق
      const friendInfo = this.friends.find(friend => friend.uid === friendUserId);
      if (!friendInfo) return false;

      const currentUserDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
      const currentUserData = currentUserDoc.data();
      const currentUserInfo = {
        uid: this.currentUser.uid,
        name: currentUserData["الاسم الكامل"] || currentUserData.fullName || '',
        email: currentUserData["الايميل"] || currentUserData.email || '',
        group: currentUserData["الجروب"] || currentUserData.group || '',
        addedAt: friendInfo.addedAt
      };

      // حذف من قائمة أصدقاء كل منهما
      const currentUserRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(currentUserRef, {
        friends: arrayRemove(friendInfo)
      });

      const friendUserRef = doc(db, 'users', friendUserId);
      await updateDoc(friendUserRef, {
        friends: arrayRemove(currentUserInfo)
      });

      // تحديث البيانات المحلية
      this.friends = this.friends.filter(friend => friend.uid !== friendUserId);

      this.showSuccess('تم حذف الصديق بنجاح');
      return true;
    } catch (error) {
      console.error('Error removing friend:', error);
      this.showError('فشل في حذف الصديق');
      return false;
    }
  }

  // الحصول على قائمة طلبات الصداقة مع تفاصيل المرسلين
  async getFriendRequestsWithDetails() {
    if (!this.friendRequests.length) return [];

    try {
      const requests = [];
      for (const request of this.friendRequests) {
        // التعامل مع الطلبات القديمة (مجرد string) والجديدة (كائن)
        let userId, requestData;

        if (typeof request === 'string') {
          userId = request;
          // جلب البيانات من قاعدة البيانات للطلبات القديمة
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const name = userData["الاسم الكامل"] || userData.fullName || 'غير محدد';
            const email = userData["الايميل"] || userData.email || '';
            const group = userData["الجروب"] || userData.group || 'غير محدد';

            requestData = {
              uid: userId,
              name: name,
              email: email,
              group: group
            };
          }
        } else {
          // للطلبات الجديدة التي تحتوي على البيانات
          requestData = {
            uid: request.uid,
            name: request.name || 'غير محدد',
            email: request.email || '',
            group: request.group || 'غير محدد'
          };
        }

        if (requestData) {
          requests.push(requestData);
        }
      }
      return requests;
    } catch (error) {
      console.error('Error getting friend requests details:', error);
      return [];
    }
  }

  // عرض رسالة نجاح
  showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #28a745;
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(40, 167, 69, 0.3);
      z-index: 10000;
      font-family: 'Tajawal', sans-serif;
      text-align: center;
      max-width: 300px;
    `;
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        document.body.removeChild(successDiv);
      }
    }, 4000);
  }

  // عرض رسالة خطأ
  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #dc3545;
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(220, 53, 69, 0.3);
      z-index: 10000;
      font-family: 'Tajawal', sans-serif;
      text-align: center;
      max-width: 300px;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
      if (document.body.contains(errorDiv)) {
        document.body.removeChild(errorDiv);
      }
    }, 4000);
  }
}

export default FriendsManager;
