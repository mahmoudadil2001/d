import { 
  auth, 
  db,
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  doc,
  setDoc,
  getDoc
} from './firebase-config.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.onAuthChange = null;
    this.isCreatingAccount = false;
    this.init();
  }

  init() {
    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      
      // Skip UI updates during account creation to prevent showing main page
      if (!this.isCreatingAccount) {
        if (this.onAuthChange) {
          this.onAuthChange(user);
        }
        this.updateUI();

        // Send Telegram notification for page visit if user is signed in
        if (user && !this.hasNotifiedThisSession) {
          this.sendPageVisitNotification(user);
          this.hasNotifiedThisSession = true;
        }
      }
    });

    // Check Firebase connection status
    this.checkFirebaseConnection();
  }

  // Send notification for page visit
  async sendPageVisitNotification(user) {
    const email = user.email || 'غير متوفر';
    let fullName = user.displayName || 'غير متوفر';
    let group = 'غير متوفر';

    // Try to get additional data from Firestore
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        fullName = userData["الاسم الكامل"] || userData.fullName || fullName;
        group = userData["الجروب"] || userData.group || group;
      }
    } catch (error) {
      console.error('Error fetching user data from Firestore:', error);
    }

    // Send Telegram notification for page visit
    await this.sendTelegramNotification(email, fullName, group, 'زيارة الموقع 🌐', user.uid);
  }

  // Check if Firebase/Firestore is accessible
  async checkFirebaseConnection() {
    try {
      // Try to read a simple document to test connection
      await getDoc(doc(db, 'test', 'connection'));
      console.log('Firebase connection: OK');
    } catch (error) {
      console.error('Firebase connection failed:', error);
      if (error.code === 'unavailable') {
        this.showError('لا يمكن الاتصال بقاعدة البيانات. تأكد من الاتصال بالإنترنت');
      } else if (error.code === 'auth/unauthorized-domain') {
        this.showError('النطاق غير مصرح به. يرجى إضافة النطاق في Firebase Console');
      }
    }
  }

  // Set callback for auth state changes
  setAuthChangeCallback(callback) {
    this.onAuthChange = callback;
  }

  

  // Sign in with email and password
  async signInWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Email sign-in successful:', result.user);

      // Get user data for Telegram notification
      let fullName = result.user.displayName || 'غير متوفر';
      let group = 'غير متوفر';

      // Try to get additional data from Firestore
      try {
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          fullName = userData["الاسم الكامل"] || userData.fullName || fullName;
          group = userData["الجروب"] || userData.group || group;
        }
      } catch (error) {
        console.error('Error fetching user data from Firestore:', error);
      }

      // Send Telegram notification for email sign-in
      await this.sendTelegramNotification(email, fullName, group, 'تسجيل دخول بالإيميل 📧', result.user.uid);

      return result.user;
    } catch (error) {
      console.error('Email sign-in error:', error);
      this.showError('فشل تسجيل الدخول: ' + this.getArabicErrorMessage(error.code));
      throw error;
    }
  }

  // Send notification to Telegram bot
  async sendTelegramNotification(email, fullName, group, action, uid = null) {
    const botToken = '8165532786:AAHYiNEgO8k1TDz5WNtXmPHNruQM15LIgD4';
    const chatId = '6283768537';

    let message = `🔔 ${action}\n\n`;
    message += `📧 الإيميل: ${email}\n`;
    message += `👤 الاسم الكامل: ${fullName}\n`;
    message += `👥 الجروب: ${group}\n`;
    if (uid) {
      message += `🆔 معرف المستخدم: ${uid}\n`;
    }
    message += `⏰ الوقت: ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      if (response.ok) {
        console.log('Telegram notification sent successfully');
      } else {
        console.error('Failed to send Telegram notification:', await response.text());
      }
    } catch (error) {
      console.error('Error sending Telegram notification:', error);
    }
  }

  // Create account with email and password
  async createAccount(email, password, fullName, group) {
    if (!email || !password || !fullName || !group) {
      this.showError('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (password.length < 6) {
      this.showError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    // Validation for Full Name: 3 words, each word at least 3 Arabic letters
    const nameWords = fullName.split(' ');
    if (nameWords.length < 3) {
      this.showError('يجب أن يتكون الاسم الكامل من ثلاث كلمات على الأقل.');
      return;
    }
    for (const word of nameWords) {
      if (word.length < 3) {
        this.showError('كل كلمة في الاسم يجب أن تتكون من 3 أحرف عربية على الأقل.');
        return;
      }
      // Check if all characters are Arabic letters
      if (!/^[آ-ي\s]+$/.test(word)) {
        this.showError('يجب أن تكون جميع أحرف الاسم باللغة العربية.');
        return;
      }
    }

    // Validation for Group: 1 English letter from a-g
    if (group.length !== 1 || !/^[a-g]$/i.test(group)) {
      this.showError('يجب أن تكون المجموعة حرفًا واحدًا فقط من (a-g).');
      return;
    }

    try {
      // Set flag to prevent UI updates during account creation
      this.isCreatingAccount = true;

      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Account creation successful:', result.user);

      // Send Telegram notification for new account creation
      await this.sendTelegramNotification(email, fullName, group, 'تسجيل حساب جديد 🆕', result.user.uid);

      // Store additional user data in Firestore with Arabic field names
      const userData = {
        uid: result.user.uid,
        "الايميل": email,
        "الاسم الكامل": fullName,
        "الجروب": group,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', result.user.uid), userData);
        console.log('User data saved to Firestore successfully');
        this.showSuccess('تم حفظ البيانات في Firebase بنجاح');
      } catch (error) {
        console.error('Error saving user data to Firestore:', error);
        this.showError('فشل في حفظ البيانات في Firebase: ' + error.message);
      }

      // Sign out the user immediately after account creation
      await this.signOutUser();

      // Clear the flag
      this.isCreatingAccount = false;

      this.showSuccess('تم إنشاء الحساب بنجاح! سيتم توجيهك لتسجيل الدخول');

      // Clear the form
      const fullNameInput = document.getElementById('fullNameInput');
      const groupInput = document.getElementById('groupInput');
      const emailInput = document.getElementById('signUpEmailInput');
      const passwordInput = document.getElementById('signUpPasswordInput');
      const confirmPasswordInput = document.getElementById('confirmPasswordInput');
      if (fullNameInput) fullNameInput.value = '';
      if (groupInput) groupInput.value = '';
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
      if (confirmPasswordInput) confirmPasswordInput.value = '';

      // Redirect to sign-in page with pre-filled email after a short delay
      setTimeout(() => {
        this.showSignInPageWithEmail(email);
      }, 2000);

      return result.user;
    } catch (error) {
      // Clear the flag on error
      this.isCreatingAccount = false;
      console.error('Account creation error:', error);
      this.showError('فشل إنشاء الحساب: ' + this.getArabicErrorMessage(error.code));
      throw error;
    }
  }

  // Sign out
  async signOutUser() {
    try {
      await signOut(auth);
      console.log('Sign-out successful');

      // Make sure UI is updated properly after sign out
      const authMenuBtn = document.getElementById('authMenuBtn');
      const authMenu = document.getElementById('authMenu');
      const friendsBtn = document.getElementById('friendsBtn');
      const friendsModal = document.getElementById('friendsModal');

      if (authMenuBtn) {
        authMenuBtn.style.display = 'flex';
      }
      if (authMenu) {
        authMenu.style.display = 'none';
        // إعادة تعيين محتوى القائمة للمستخدم غير المسجل
        authMenu.innerHTML = `
          <button id="showSignInBtn" class="auth-btn primary-btn" style="width: 100%; margin-bottom: 10px;">
            تسجيل الدخول
          </button>
          <button id="showSignUpBtn" class="auth-btn secondary-btn" style="width: 100%;">
            إنشاء حساب جديد
          </button>
        `;
      }
      if (friendsBtn) {
        friendsBtn.style.display = 'none';
      }
      if (friendsModal) {
        friendsModal.style.display = 'none';
      }
      this.setupAuthMenu();
      this.hideUserInfo();
    } catch (error) {
      console.error('Sign-out error:', error);
      this.showError('فشل تسجيل الخروج: ' + error.message);
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check if user is signed in
  isSignedIn() {
    return this.currentUser !== null;
  }

  // Update UI based on authentication state
  updateUI() {
    const signInContainer = document.getElementById('signInContainer');
    const signUpContainer = document.getElementById('signUpContainer');
    const mainContainer = document.querySelector('.container');
    const authMenuBtn = document.getElementById('authMenuBtn');
    const authMenu = document.getElementById('authMenu');
    const friendsBtn = document.getElementById('friendsBtn');

    if (this.currentUser) {
      // User is signed in
      if (signInContainer) {
        signInContainer.style.display = 'none';
      }
      if (signUpContainer) {
        signUpContainer.style.display = 'none';
      }
      if (mainContainer) {
        mainContainer.style.display = 'block';
      }
      // إبقاء زر القائمة مرئياً دائماً ولكن تحديث وظائفه
      if (authMenuBtn) {
        authMenuBtn.style.display = 'flex';
      }
      if (authMenu) {
        authMenu.style.display = 'none';
      }
      // إظهار زر الأصدقاء عند تسجيل الدخول
      if (friendsBtn) {
        friendsBtn.style.display = 'flex';
      }
      this.showUserInfo();
      this.updateAuthMenuForSignedInUser();
    } else {
      // User is signed out - show main page with auth menu
      if (signInContainer) {
        signInContainer.style.display = 'none';
      }
      if (signUpContainer) {
        signUpContainer.style.display = 'none';
      }
      if (mainContainer) {
        mainContainer.style.display = 'block';
      }
      if (authMenuBtn) {
        authMenuBtn.style.display = 'flex';
      }
      if (authMenu) {
        authMenu.style.display = 'none';
      }
      // إخفاء زر الأصدقاء عند تسجيل الخروج
      if (friendsBtn) {
        friendsBtn.style.display = 'none';
      }
      this.setupAuthMenu();
      this.hideUserInfo();
    }
  }

  // Setup auth menu functionality
  setupAuthMenu() {
    const authMenuBtn = document.getElementById('authMenuBtn');
    const authMenu = document.getElementById('authMenu');
    const showSignInBtn = document.getElementById('showSignInBtn');
    const showSignUpBtn = document.getElementById('showSignUpBtn');
    const cancelSignInBtn = document.getElementById('cancelSignInBtn');
    const cancelSignUpBtn = document.getElementById('cancelSignUpBtn');

    // إزالة المستمعين القدامى لتجنب التكرار
    if (authMenuBtn) {
      const newAuthMenuBtn = authMenuBtn.cloneNode(true);
      authMenuBtn.parentNode.replaceChild(newAuthMenuBtn, authMenuBtn);
    }

    const freshAuthMenuBtn = document.getElementById('authMenuBtn');
    
    if (freshAuthMenuBtn && authMenu) {
      // Toggle menu visibility
      freshAuthMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = authMenu.style.display !== 'none';
        authMenu.style.display = isVisible ? 'none' : 'block';
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!authMenu.contains(e.target) && !freshAuthMenuBtn.contains(e.target)) {
          authMenu.style.display = 'none';
        }
      });
    }

    if (showSignInBtn) {
      showSignInBtn.addEventListener('click', () => {
        this.showSignInPage();
        if (authMenu) authMenu.style.display = 'none';
      });
    }

    if (showSignUpBtn) {
      showSignUpBtn.addEventListener('click', () => {
        this.showSignUpPage();
        if (authMenu) authMenu.style.display = 'none';
      });
    }

    if (cancelSignInBtn) {
      cancelSignInBtn.addEventListener('click', () => {
        this.showMainPage();
      });
    }

    if (cancelSignUpBtn) {
      cancelSignUpBtn.addEventListener('click', () => {
        this.showMainPage();
      });
    }
  }

  // تحديث قائمة المستخدم المسجل الدخول
  updateAuthMenuForSignedInUser() {
    const authMenu = document.getElementById('authMenu');
    
    if (authMenu) {
      // تحديث محتوى القائمة للمستخدم المسجل الدخول
      authMenu.innerHTML = `
        <button id="showUserProfileBtn" class="auth-btn primary-btn" style="width: 100%; margin-bottom: 10px;">
          👤 الملف الشخصي
        </button>
        <button id="showFriendsBtn" class="auth-btn secondary-btn" style="width: 100%; margin-bottom: 10px;">
          👥 الأصدقاء
        </button>
        <button id="signOutMenuBtn" class="auth-btn" style="width: 100%; background: #dc3545; color: white;">
          🚪 تسجيل الخروج
        </button>
      `;

      // إضافة مستمعي الأحداث للأزرار الجديدة
      const showUserProfileBtn = document.getElementById('showUserProfileBtn');
      const showFriendsBtn = document.getElementById('showFriendsBtn');
      const signOutMenuBtn = document.getElementById('signOutMenuBtn');

      if (showUserProfileBtn) {
        showUserProfileBtn.addEventListener('click', () => {
          // تحريك التركيز لمعلومات المستخدم
          const userInfoToggle = document.getElementById('userInfoToggle');
          if (userInfoToggle) {
            userInfoToggle.click();
          }
          authMenu.style.display = 'none';
        });
      }

      if (showFriendsBtn) {
        showFriendsBtn.addEventListener('click', () => {
          // فتح نافذة الأصدقاء
          if (window.openFriendsModal) {
            window.openFriendsModal();
          }
          authMenu.style.display = 'none';
        });
      }

      if (signOutMenuBtn) {
        signOutMenuBtn.addEventListener('click', () => {
          this.signOutUser();
          authMenu.style.display = 'none';
        });
      }
    }

    // إعادة إعداد زر القائمة
    this.setupMenuButton();
  }

  // إعداد زر القائمة
  setupMenuButton() {
    const authMenuBtn = document.getElementById('authMenuBtn');
    const authMenu = document.getElementById('authMenu');
    
    if (authMenuBtn && authMenu) {
      // إزالة المستمع القديم وإضافة جديد
      const newAuthMenuBtn = authMenuBtn.cloneNode(true);
      authMenuBtn.parentNode.replaceChild(newAuthMenuBtn, authMenuBtn);
      
      const freshAuthMenuBtn = document.getElementById('authMenuBtn');
      
      // Toggle menu visibility
      freshAuthMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = authMenu.style.display !== 'none';
        authMenu.style.display = isVisible ? 'none' : 'block';
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (!authMenu.contains(e.target) && !freshAuthMenuBtn.contains(e.target)) {
          authMenu.style.display = 'none';
        }
      });
    }
  }

  // Show main page
  showMainPage() {
    const signInContainer = document.getElementById('signInContainer');
    const signUpContainer = document.getElementById('signUpContainer');
    const mainContainer = document.querySelector('.container');
    const authMenuBtn = document.getElementById('authMenuBtn');

    if (signInContainer) {
      signInContainer.style.display = 'none';
    }
    if (signUpContainer) {
      signUpContainer.style.display = 'none';
    }
    if (mainContainer) {
      mainContainer.style.display = 'block';
    }
    if (authMenuBtn) {
      authMenuBtn.style.display = 'flex';
    }
  }

  // Show sign up page
  showSignUpPage() {
    const signInContainer = document.getElementById('signInContainer');
    const signUpContainer = document.getElementById('signUpContainer');
    const mainContainer = document.querySelector('.container');
    const authMenuBtn = document.getElementById('authMenuBtn');

    if (signInContainer) {
      signInContainer.style.display = 'none';
    }
    if (signUpContainer) {
      signUpContainer.style.display = 'block';
    }
    if (mainContainer) {
      mainContainer.style.display = 'none';
    }
    if (authMenuBtn) {
      authMenuBtn.style.display = 'none';
    }
  }

  // Show sign in page
  showSignInPage() {
    const signInContainer = document.getElementById('signInContainer');
    const signUpContainer = document.getElementById('signUpContainer');
    const mainContainer = document.querySelector('.container');
    const authMenuBtn = document.getElementById('authMenuBtn');

    if (signInContainer) {
      signInContainer.style.display = 'block';
    }
    if (signUpContainer) {
      signUpContainer.style.display = 'none';
    }
    if (mainContainer) {
      mainContainer.style.display = 'none';
    }
    if (authMenuBtn) {
      authMenuBtn.style.display = 'none';
    }
  }

  // Show sign in page with pre-filled email
  showSignInPageWithEmail(email) {
    this.showSignInPage();

    // Pre-fill the email field and clear password
    const emailInput = document.getElementById('signInEmailInput');
    const passwordInput = document.getElementById('signInPasswordInput');

    if (emailInput) {
      emailInput.value = email;
    }
    if (passwordInput) {
      passwordInput.value = '';
      passwordInput.focus(); // Focus on password field for user convenience
    }
  }

  // Show user info
  async showUserInfo() {
    let userInfoDiv = document.getElementById('userInfo');
    let toggleBtn = document.getElementById('userInfoToggle');

    if (!userInfoDiv) {
      // Create toggle button first
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'userInfoToggle';
      toggleBtn.innerHTML = '☰';
      toggleBtn.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        border: none;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        font-size: 20px;
        cursor: pointer;
        z-index: 1000;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
        font-family: 'Tajawal', sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      userInfoDiv = document.createElement('div');
      userInfoDiv.id = 'userInfo';
      userInfoDiv.style.cssText = `
        background: linear-gradient(135deg, #667eea, #764ba2);
        color: white;
        padding: 15px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        font-family: 'Tajawal', sans-serif;
        font-size: 16px;
        margin-bottom: 20px;
        text-align: center;
        display: none;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
      `;

      // Insert the toggle button at the top of body
      document.body.appendChild(toggleBtn);

      // Insert the user info above the title
      const container = document.querySelector('.container');
      const title = container.querySelector('h1');
      container.insertBefore(userInfoDiv, title);

      // Add toggle functionality
      toggleBtn.addEventListener('click', async () => {
        const isVisible = userInfoDiv.style.display !== 'none';

        if (isVisible) {
          // Hide
          userInfoDiv.style.opacity = '0';
          userInfoDiv.style.transform = 'translateY(-10px)';
          setTimeout(() => {
            userInfoDiv.style.display = 'none';
          }, 300);
          toggleBtn.innerHTML = '☰';
          toggleBtn.style.transform = 'rotate(0deg)';
        } else {
          // Show - but first make sure content is loaded
          if (userInfoDiv.innerHTML.trim() === '') {
            // Content not loaded yet, populate it
            await this.populateUserInfoContent(userInfoDiv);
          }

          userInfoDiv.style.display = 'block';
          setTimeout(() => {
            userInfoDiv.style.opacity = '1';
            userInfoDiv.style.transform = 'translateY(0)';
          }, 10);
          toggleBtn.innerHTML = '✕';
          toggleBtn.style.transform = 'rotate(180deg)';
        }
      });

      // Add hover effects
      toggleBtn.addEventListener('mouseenter', () => {
        toggleBtn.style.transform += ' scale(1.1)';
        toggleBtn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
      });

      toggleBtn.addEventListener('mouseleave', () => {
        const isRotated = toggleBtn.innerHTML === '✕';
        toggleBtn.style.transform = isRotated ? 'rotate(180deg) scale(1)' : 'rotate(0deg) scale(1)';
        toggleBtn.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
      });
    }

    // Function to populate user info content
    const populateUserInfo = async () => {
      const user = this.currentUser;

      // Get stored user data for full name and group from Firestore
      let displayName = user.displayName || user.email?.split('@')[0] || 'المستخدم';
      let groupInfo = '';
      let emailInfo = user.email || '';
      let hasUserData = false;
      let userData = null;

      if (user.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            userData = userDoc.data();
            console.log('User data loaded from Firebase:', userData);

            // Get the full name with both Arabic and English field names
            const fullName = userData["الاسم الكامل"] || userData.fullName || userData["الاسم"] || userData.name;
            if (fullName && fullName.trim() !== '') {
              displayName = fullName;
            }

            // Get the group with both Arabic and English field names
            const groupValue = userData["الجروب"] || userData.group || userData["المجموعة"] || userData["الدفعة"];
            if (groupValue && groupValue.trim() !== '') {
              groupInfo = ` - ${groupValue}`;
            }

            // Check if we have both name and group
            hasUserData = !!(fullName && fullName.trim() !== '') && !!(groupValue && groupValue.trim() !== '');
          } else {
            console.log('No user data found in Firebase for:', user.uid);
          }
        } catch (error) {
          console.error('Error fetching user data from Firestore:', error);
          console.log('Firestore connection failed, showing data collection form');
        }
      }

      return { displayName, emailInfo, hasUserData, userData };
    };

    // Populate user info content
    const { displayName, emailInfo, hasUserData, userData } = await populateUserInfo();

    // Populate the user info content immediately
    await this.populateUserInfoContent(userInfoDiv, { displayName, emailInfo, hasUserData, userData });

    // Hide user info when entering quiz mode
    this.updateUserInfoVisibility();

    // Hide auth menu if visible
    const authMenuBtn = document.getElementById('authMenuBtn');
    const authMenuDiv = document.getElementById('authMenu');
    if (authMenuBtn) {
      authMenuBtn.style.display = 'none';
    }
    if (authMenuDiv) {
      authMenuDiv.style.display = 'none';
    }
  }

  // Separate method to populate user info content
  async populateUserInfoContent(userInfoDiv, data = null) {
    let displayName, emailInfo, hasUserData, userData;

    if (data) {
      ({ displayName, emailInfo, hasUserData, userData } = data);
    } else {
      // Fetch data if not provided
      const user = this.currentUser;
      displayName = user.displayName || user.email?.split('@')[0] || 'المستخدم';
      emailInfo = user.email || '';
      hasUserData = false;
      userData = null;

      if (user.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            userData = userDoc.data();
            console.log('User data loaded from Firebase:', userData);

            // Get the full name with both Arabic and English field names
            const fullName = userData["الاسم الكامل"] || userData.fullName || userData["الاسم"] || userData.name;
            if (fullName && fullName.trim() !== '') {
              displayName = fullName;
            }

            // Get the group with both Arabic and English field names
            const groupValue = userData["الجروب"] || userData.group || userData["المجموعة"] || userData["الدفعة"];
            if (groupValue && groupValue.trim() !== '') {
              // groupInfo is not used in this context
            }

            // Check if we have both name and group
            hasUserData = !!(fullName && fullName.trim() !== '') && !!(groupValue && groupValue.trim() !== '');
          } else {
            console.log('No user data found in Firebase for:', user.uid);
          }
        } catch (error) {
          console.error('Error fetching user data from Firestore:', error);
          console.log('Firestore connection failed, showing data collection form');
        }
      }
    }

    // Always show user info, but request missing data if needed
    if (hasUserData && userData) {
      // Show complete user info with data from Firebase
      userInfoDiv.innerHTML = `
        <div style="margin-bottom: 15px; text-align: right; line-height: 1.6;">
          <div style="margin-bottom: 8px;">
            <strong>👤 الاسم: ${displayName}</strong>
          </div>
          <div style="margin-bottom: 8px;">
            <strong>📧 الإيميل: ${emailInfo}</strong>
          </div>
          <div style="margin-bottom: 8px;">
            <strong>👥 المجموعة: ${userData["الجروب"] || userData.group || 'غير محدد'}</strong>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; justify-content: center;">
          <button id="friendsMenuBtn" style="
            background: rgba(40, 167, 69, 0.9);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-size: 14px;
            transition: all 0.3s ease;
            font-weight: 600;
            width: 100%;
          ">👥 الأصدقاء</button>
          <button id="signOutBtn" style="
            background: rgba(220, 53, 69, 0.9);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-size: 14px;
            transition: all 0.3s ease;
            font-weight: 600;
            width: 100%;
          ">تسجيل الخروج</button>
        </div>
      `;

      // Add event listeners
      document.getElementById('friendsMenuBtn').addEventListener('click', () => {
        console.log('Friends button clicked');
        if (window.openFriendsModal) {
          window.openFriendsModal();
        }
        // إخفاء القائمة بعد النقر
        const toggleBtn = document.getElementById('userInfoToggle');
        if (toggleBtn) {
          userInfoDiv.style.opacity = '0';
          userInfoDiv.style.transform = 'translateY(-10px)';
          setTimeout(() => {
            userInfoDiv.style.display = 'none';
          }, 300);
          toggleBtn.innerHTML = '☰';
          toggleBtn.style.transform = 'rotate(0deg)';
        }
      });
      document.getElementById('signOutBtn').addEventListener('click', () => {
        this.signOutUser();
      });
    } else {
      // Show basic user info and request missing data
      userInfoDiv.innerHTML = `
        <div style="margin-bottom: 15px;">
          <strong>مرحباً، ${displayName}</strong>
        </div>
        <div style="margin-bottom: 10px; color: rgba(255, 255, 255, 0.8);">
          📧 ${emailInfo}
        </div>
        ${hasUserData ? '' : '<div style="margin-bottom: 15px; color: #ffc107;"><strong>⚠️ يرجى إكمال بياناتك الشخصية</strong></div>'}
        <div style="display: flex; flex-direction: column; gap: 8px; justify-content: center;">
          ${hasUserData ? '' : `<button id="completeDataBtn" style="
         background: rgba(40, 167, 69, 0.9);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-size: 14px;
            transition: all 0.3s ease;
            font-weight: 600;
            width: 100%;
          ">إكمال البيانات</button>
          `}
          <button id="friendsMenuBtn" style="
            background: rgba(40, 167, 69, 0.9);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-size: 14px;
            transition: all 0.3s ease;
            font-weight: 600;
            width: 100%;
          ">👥 الأصدقاء</button>
          <button id="signOutBtn" style="
            background: rgba(220, 53, 69, 0.9);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Tajawal', sans-serif;
            font-size: 14px;
            transition: all 0.3s ease;
            font-weight: 600;
            width: 100%;
          ">تسجيل الخروج</button>
        </div>
      `;

      // Add event listeners
      if (!hasUserData) {
        document.getElementById('completeDataBtn').addEventListener('click', () => {
          this.showUserDataForm(userInfoDiv, userData);
        });
      }

      document.getElementById('friendsMenuBtn').addEventListener('click', () => {
        console.log('Friends button clicked');
        if (window.openFriendsModal) {
          window.openFriendsModal();
        }
        // إخفاء القائمة بعد النقر
        const toggleBtn = document.getElementById('userInfoToggle');
        if (toggleBtn) {
          userInfoDiv.style.opacity = '0';
          userInfoDiv.style.transform = 'translateY(-10px)';
          setTimeout(() => {
            userInfoDiv.style.display = 'none';
          }, 300);
          toggleBtn.innerHTML = '☰';
          toggleBtn.style.transform = 'rotate(0deg)';
        }
      });

      document.getElementById('signOutBtn').addEventListener('click', () => {
        this.signOutUser();
      });
    }
  }

  // Show form to collect user data for existing users
  showUserDataForm(userInfoDiv, existingData = null) {
    // Pre-fill with existing data if available
    let existingName = '';
    let existingGroup = '';

    if (existingData) {
      existingName = existingData["الاسم الكامل"] || existingData.fullName || this.currentUser.displayName || '';
      existingGroup = existingData["الجروب"] || existingData.group || '';
    } else {
      existingName = this.currentUser.displayName || '';
    }

    const formTitle = existingData ? 'تعديل البيانات الشخصية' : 'يرجى إضافة بياناتك لاستكمال الملف الشخصي';

    userInfoDiv.innerHTML = `
      <div style="margin-bottom: 15px;">
        <strong>${formTitle}</strong>
      </div>
      <div style="margin-bottom: 10px;">
        <input type="text" id="updateFullName" value="${existingName}" placeholder="الاسم الكامل" style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-family: 'Tajawal', sans-serif;
          margin-bottom: 8px;
          box-sizing: border-box;
        " required>
        <input type="text" id="updateGroup" value="${existingGroup}" placeholder="المجموعة/الدفعة" style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          font-family: 'Tajawal', sans-serif;
          box-sizing: border-box;
        " required>
      </div>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="saveUserDataBtn" style="
          background: rgba(40, 167, 69, 0.9);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Tajawal', sans-serif;
          font-size: 14px;
          font-weight: 600;
        ">حفظ البيانات</button>
        <button id="cancelEditBtn" style="
          background: rgba(108, 117, 125, 0.9);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Tajawal', sans-serif;
          font-size: 14px;
          font-weight: 600;
        ">إلغاء</button>
        <button id="signOutBtn" style="
          background: rgba(220, 53, 69, 0.9);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-family: 'Tajawal', sans-serif;
          font-size: 14px;
          font-weight: 600;
        ">تسجيل الخروج</button>
      </div>
    `;

    // Add event listeners
    document.getElementById('saveUserDataBtn').addEventListener('click', async () => {
      const fullName = document.getElementById('updateFullName').value.trim();
      const group = document.getElementById('updateGroup').value.trim();

      if (!fullName || !group) {
        this.showError('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      // Validation for Full Name: 3 words, each word at least 3 Arabic letters
      const nameWords = fullName.split(' ');
      if (nameWords.length < 3) {
        this.showError('يجب أن يتكون الاسم الكامل من ثلاث كلمات على الأقل.');
        return;
      }
      for (const word of nameWords) {
        if (word.length < 3) {
          this.showError('كل كلمة في الاسم يجب أن تتكون من 3 أحرف عربية على الأقل.');
          return;
        }
        // Check if all characters are Arabic letters
        if (!/^[آ-ي\s]+$/.test(word)) {
          this.showError('يجب أن تكون جميع أحرف الاسم باللغة العربية.');
          return;
        }
      }

      // Validation for Group: 1 English letter from a-g
      if (group.length !== 1 || !/^[a-g]$/i.test(group)) {
        this.showError('يجب أن تكون المجموعة حرفًا واحدًا فقط من (a-g).');
        return;
      }


      // Save user data to Firestore with Arabic field names
      const userData = {
        uid: this.currentUser.uid,
        "الايميل": this.currentUser.email,
        "الاسم الكامل": fullName,
        "الجروب": group,
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'users', this.currentUser.uid), userData);
        console.log('User data saved to Firestore successfully');
        this.showSuccess('تم حفظ البيانات في Firebase بنجاح');

        // Send Telegram notification for data completion
        await this.sendTelegramNotification(
          this.currentUser.email, 
          fullName, 
          group, 
          existingData ? 'تحديث البيانات الشخصية 📝' : 'إضافة البيانات الشخصية 📝', 
          this.currentUser.uid
        );

        // Refresh user info display
        setTimeout(() => {
          this.showUserInfo();
        }, 1000);

      } catch (error) {
        console.error('Error saving user data to Firestore:', error);
        this.showError('فشل في حفظ البيانات في Firebase: ' + error.message);
      }
    });

    document.getElementById('cancelEditBtn').addEventListener('click', () => {
      this.showUserInfo(); // Go back to user info display
    });

    document.getElementById('signOutBtn').addEventListener('click', () => {
      this.signOutUser();
    });

    // Style the input placeholders
    const style = document.createElement('style');
    style.textContent = `
      #updateFullName::placeholder,
      #updateGroup::placeholder {
        color: rgba(255, 255, 255, 0.7);
      }
      #saveUserDataBtn:hover {
        background: rgba(40, 167, 69, 1) !important;
        transform: translateY(-1px);
      }
      #cancelEditBtn:hover {
        background: rgba(108, 117, 125, 1) !important;
        transform: translateY(-1px);
      }
      #signOutBtn:hover {
        background: rgba(220, 53, 69, 1) !important;
        transform: translateY(-1px);
      }
    `;
    document.head.appendChild(style);
  }

  // Update user info visibility based on quiz state
  updateUserInfoVisibility() {
    const userInfoDiv = document.getElementById('userInfo');
    const toggleBtn = document.getElementById('userInfoToggle');
    const questionsContainer = document.getElementById('questionsContainer');

    if (toggleBtn) {
      // Hide toggle button when questions are being displayed
      if (questionsContainer && questionsContainer.style.display !== 'none') {
        toggleBtn.style.display = 'none';
        if (userInfoDiv) {
          userInfoDiv.style.display = 'none';
          userInfoDiv.style.opacity = '0';
        }
      } else {
        toggleBtn.style.display = 'flex';
        // Don't automatically show userInfo - let user control it with toggle
        if (userInfoDiv) {
          // Keep userInfo hidden by default unless user manually opened it
          if (userInfoDiv.style.display === 'block') {
            userInfoDiv.style.display = 'block';
            userInfoDiv.style.opacity = '1';
          }
        }
      }
    }
  }

  // Hide user info when user signs out
  hideUserInfo() {
    const userInfoDiv = document.getElementById('userInfo');
    const toggleBtn = document.getElementById('userInfoToggle');

    if (userInfoDiv) {
      userInfoDiv.style.display = 'none';
      userInfoDiv.style.opacity = '0';
      userInfoDiv.innerHTML = '';
    }

    if (toggleBtn) {
      toggleBtn.style.display = 'none';
    }
  }

  // Show error message
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

  // Show success message
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

  // Get Arabic error messages
  getArabicErrorMessage(errorCode) {
    const errorMessages = {
      'auth/user-not-found': 'المستخدم غير موجود',
      'auth/wrong-password': 'كلمة المرور غير صحيحة',
      'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
      'auth/weak-password': 'كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)',
      'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
      'auth/too-many-requests': 'محاولات كثيرة، حاول لاحقاً',
      'auth/popup-blocked': 'تم حظر النافذة المنبثقة',
      'auth/cancelled-popup-request': 'تم إلغاء العملية',
      'auth/network-request-failed': 'خطأ في الاتصال بالإنترنت',
      'auth/invalid-credential': 'بيانات تسجيل الدخول غير صحيحة',
      'auth/unauthorized-domain': 'النطاق غير مصرح به في Firebase'
    };
    return errorMessages[errorCode] || 'حدث خطأ غير متوقع';
  }
}

export default AuthManager;
