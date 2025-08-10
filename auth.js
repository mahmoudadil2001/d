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
    this.isInitialized = false;
    this.init();
  }

  init() {
    // Show loading state immediately
    this.showLoadingState();

    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.isInitialized = true;

      // Hide loading state once we know the auth state
      this.hideLoadingState();

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
    // Make sure loading state is hidden when updating UI
    this.hideLoadingState();
    
    const signInContainer = document.getElementById('signInContainer');
    const signUpContainer = document.getElementById('signUpContainer');
    const mainContainer = document.querySelector('.container');
    const authMenuBtn = document.getElementById('authMenuBtn');
    const authMenu = document.getElementById('authMenu');
    const friendsBtn = document.getElementById('friendsBtn');
    const directAuthButtons = document.getElementById('directAuthButtons');
    const userButtons = document.getElementById('userButtons');

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
      
      // إخفاء أزرار التسجيل المباشرة وإظهار أزرار المستخدم
      if (directAuthButtons) {
        directAuthButtons.style.display = 'none';
      }
      if (userButtons) {
        userButtons.style.display = 'flex';
      }
      
      // إظهار زر القائمة للمستخدمين المسجلين
      if (authMenuBtn) {
        authMenuBtn.style.display = 'flex';
        authMenuBtn.innerHTML = '☰';
        authMenuBtn.style.transform = 'rotate(0deg)';
      }
      if (authMenu) {
        authMenu.style.display = 'none';
      }
      // إظهار زر الأصدقاء عند تسجيل الدخول (Event Delegation سيتولى معالجة النقر)
      if (friendsBtn) {
        friendsBtn.style.display = 'flex';
      }
      
      this.showUserInfo();
      this.updateAuthMenuForSignedInUser();
    } else {
      // User is signed out - show direct auth buttons
      if (signInContainer) {
        signInContainer.style.display = 'none';
      }
      if (signUpContainer) {
        signUpContainer.style.display = 'none';
      }
      if (mainContainer) {
        mainContainer.style.display = 'block';
      }
      
      // إظهار أزرار التسجيل المباشرة وإخفاء أزرار المستخدم
      if (directAuthButtons) {
        directAuthButtons.style.display = 'flex';
      }
      if (userButtons) {
        userButtons.style.display = 'none';
      }
      
      // إخفاء زر القائمة للمستخدمين غير المسجلين
      if (authMenuBtn) {
        authMenuBtn.style.display = 'none';
      }
      if (authMenu) {
        authMenu.style.display = 'none';
      }
      // إخفاء زر الأصدقاء عند تسجيل الخروج
      if (friendsBtn) {
        friendsBtn.style.display = 'none';
      }
      
      this.setupDirectAuthButtons();
      this.setupCancelButtons();
      this.hideUserInfo();
    }
  }

  // Setup direct auth buttons functionality
  setupDirectAuthButtons() {
    const directSignInBtn = document.getElementById('directSignInBtn');
    const directSignUpBtn = document.getElementById('directSignUpBtn');

    if (directSignInBtn) {
      directSignInBtn.addEventListener('click', () => {
        this.showSignInPage();
      });
    }

    if (directSignUpBtn) {
      directSignUpBtn.addEventListener('click', () => {
        this.showSignUpPage();
      });
    }
  }

  // Setup auth menu functionality
  setupAuthMenu() {
    const authMenuBtn = document.getElementById('authMenuBtn');
    const authMenu = document.getElementById('authMenu');
    const showSignInBtn = document.getElementById('showSignInBtn');
    const showSignUpBtn = document.getElementById('showSignUpBtn');
    
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

    // إعداد أزرار الإلغاء
    this.setupCancelButtons();
  }

  // إعداد أزرار الإلغاء بشكل منفصل
  setupCancelButtons() {
    const cancelSignInBtn = document.getElementById('cancelSignInBtn');
    const cancelSignUpBtn = document.getElementById('cancelSignUpBtn');

    if (cancelSignInBtn) {
      // إزالة المستمع القديم وإضافة جديد
      const newCancelSignInBtn = cancelSignInBtn.cloneNode(true);
      cancelSignInBtn.parentNode.replaceChild(newCancelSignInBtn, cancelSignInBtn);
      
      document.getElementById('cancelSignInBtn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showMainPage();
      });
    }

    if (cancelSignUpBtn) {
      // إزالة المستمع القديم وإضافة جديد
      const newCancelSignUpBtn = cancelSignUpBtn.cloneNode(true);
      cancelSignUpBtn.parentNode.replaceChild(newCancelSignUpBtn, cancelSignUpBtn);
      
      document.getElementById('cancelSignUpBtn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showMainPage();
      });
    }
  }

  // تحديث قائمة المستخدم المسجل الدخول
  updateAuthMenuForSignedInUser() {
    // لا نحتاج لتحديث القائمة بعد الآن لأننا سنفتح الملف الشخصي مباشرة
    // إعادة إعداد زر القائمة
    this.setupMenuButton();
  }

  // إعداد زر القائمة
  setupMenuButton() {
    const authMenuBtn = document.getElementById('authMenuBtn');
    const authMenu = document.getElementById('authMenu');
    const expandableDiv = document.getElementById('userInfoExpandable');

    if (authMenuBtn) {
      // إزالة المستمع القديم وإضافة جديد
      const newAuthMenuBtn = authMenuBtn.cloneNode(true);
      authMenuBtn.parentNode.replaceChild(newAuthMenuBtn, authMenuBtn);

      const freshAuthMenuBtn = document.getElementById('authMenuBtn');

      // Toggle functionality based on current state
      freshAuthMenuBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        // Check if expandable section is currently open
        const isExpanded = expandableDiv && expandableDiv.style.maxHeight !== '0px' && expandableDiv.style.maxHeight !== '';
        
        if (isExpanded) {
          // Collapse expandable section
          expandableDiv.style.maxHeight = '0px';
          expandableDiv.style.opacity = '0';
          expandableDiv.style.transform = 'translateY(-10px)';
          expandableDiv.style.marginTop = '0';
          freshAuthMenuBtn.innerHTML = '☰';
          freshAuthMenuBtn.style.transform = 'rotate(0deg)';
          
          // Also hide auth menu if it's open
          if (authMenu) {
            authMenu.style.display = 'none';
          }
        } else {
          // For signed-in users, expand user info section
          if (this.isSignedIn() && expandableDiv) {
            // Expand the section
            expandableDiv.style.maxHeight = '300px'; // Generous height
            expandableDiv.style.opacity = '1';
            expandableDiv.style.transform = 'translateY(0)';
            expandableDiv.style.marginTop = '15px';
            freshAuthMenuBtn.innerHTML = '✕';
            freshAuthMenuBtn.style.transform = 'rotate(180deg)';
            
            // إخفاء القائمة الانبثاقية إذا كانت مفتوحة
            if (authMenu) {
              authMenu.style.display = 'none';
            }
          }
          // For non-signed-in users, show auth menu
          else if (!this.isSignedIn() && authMenu) {
            const isMenuVisible = authMenu.style.display === 'block';
            if (isMenuVisible) {
              authMenu.style.display = 'none';
              freshAuthMenuBtn.innerHTML = '☰';
              freshAuthMenuBtn.style.transform = 'rotate(0deg)';
            } else {
              authMenu.style.display = 'block';
              freshAuthMenuBtn.innerHTML = '✕';
              freshAuthMenuBtn.style.transform = 'rotate(180deg)';
            }
          }
        }
      });

      // Close menu when clicking outside
      document.addEventListener('click', (e) => {
        if (authMenu && !authMenu.contains(e.target) && !freshAuthMenuBtn.contains(e.target)) {
          authMenu.style.display = 'none';
          if (!this.isSignedIn()) {
            freshAuthMenuBtn.innerHTML = '☰';
            freshAuthMenuBtn.style.transform = 'rotate(0deg)';
          }
        }
        
        // Also close expandable section when clicking outside
        if (expandableDiv && expandableDiv.style.maxHeight !== '0px' && expandableDiv.style.maxHeight !== '' && 
            !expandableDiv.contains(e.target) && !freshAuthMenuBtn.contains(e.target)) {
          expandableDiv.style.maxHeight = '0px';
          expandableDiv.style.opacity = '0';
          expandableDiv.style.transform = 'translateY(-10px)';
          expandableDiv.style.marginTop = '0';
          freshAuthMenuBtn.innerHTML = '☰';
          freshAuthMenuBtn.style.transform = 'rotate(0deg)';
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
    const topHeader = document.getElementById('topHeader');
    const footerLinks = document.getElementById('footerLinks');

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
    
    // إظهار الشريط العلوي والروابط
    if (topHeader) {
      topHeader.style.transform = 'translateY(0)';
      topHeader.style.opacity = '1';
    }
    if (footerLinks) {
      footerLinks.style.display = 'flex';
    }
  }

  // Show sign up page
  showSignUpPage() {
    const signInContainer = document.getElementById('signInContainer');
    const signUpContainer = document.getElementById('signUpContainer');
    const mainContainer = document.querySelector('.container');
    const authMenuBtn = document.getElementById('authMenuBtn');
    const topHeader = document.getElementById('topHeader');
    const footerLinks = document.getElementById('footerLinks');

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
    
    // إخفاء الشريط العلوي والروابط
    if (topHeader) {
      topHeader.style.transform = 'translateY(-100%)';
      topHeader.style.opacity = '0';
    }
    if (footerLinks) {
      footerLinks.style.display = 'none';
    }
    
    // إعداد أزرار الإلغاء عند عرض الصفحة
    setTimeout(() => {
      this.setupCancelButtons();
    }, 100);
  }

  // Show sign in page
  showSignInPage() {
    const signInContainer = document.getElementById('signInContainer');
    const signUpContainer = document.getElementById('signUpContainer');
    const mainContainer = document.querySelector('.container');
    const authMenuBtn = document.getElementById('authMenuBtn');
    const topHeader = document.getElementById('topHeader');
    const footerLinks = document.getElementById('footerLinks');

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
    
    // إخفاء الشريط العلوي والروابط
    if (topHeader) {
      topHeader.style.transform = 'translateY(-100%)';
      topHeader.style.opacity = '0';
    }
    if (footerLinks) {
      footerLinks.style.display = 'none';
    }
    
    // إعداد أزرار الإلغاء عند عرض الصفحة
    setTimeout(() => {
      this.setupCancelButtons();
    }, 100);
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
    const authMenuBtn = document.getElementById('authMenuBtn');
    const expandableDiv = document.getElementById('userInfoExpandable');
    const contentDiv = document.getElementById('userInfoContent');

    if (authMenuBtn && expandableDiv && contentDiv) {
      authMenuBtn.style.display = 'flex';

      // Setup menu button functionality
      this.setupMenuButton();

      // Populate user info content
      const user = this.currentUser;
      let displayName = user.displayName || user.email?.split('@')[0] || 'المستخدم';
      let emailInfo = user.email || '';
      let hasUserData = false;
      let userData = null;

      if (user.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            userData = userDoc.data();
            console.log('User data loaded from Firebase:', userData);

            const fullName = userData["الاسم الكامل"] || userData.fullName || userData["الاسم"] || userData.name;
            if (fullName && fullName.trim() !== '') {
              displayName = fullName;
            }

            const groupValue = userData["الجروب"] || userData.group || userData["المجموعة"] || userData["الدفعة"];
            hasUserData = !!(fullName && fullName.trim() !== '') && !!(groupValue && groupValue.trim() !== '');
          }
        } catch (error) {
          console.error('Error fetching user data from Firestore:', error);
        }
      }

      // Populate the expandable content
      await this.populateExpandableUserInfo(contentDiv, { displayName, emailInfo, hasUserData, userData });

      // Add hover effects to button
      authMenuBtn.addEventListener('mouseenter', () => {
        const currentTransform = authMenuBtn.style.transform || '';
        authMenuBtn.style.transform = currentTransform + ' scale(1.1)';
        authMenuBtn.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
      });

      authMenuBtn.addEventListener('mouseleave', () => {
        const isExpanded = expandableDiv.style.maxHeight !== '0px' && expandableDiv.style.maxHeight !== '';
        authMenuBtn.style.transform = isExpanded ? 'rotate(180deg) scale(1)' : 'rotate(0deg) scale(1)';
        authMenuBtn.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
      });
    }

    // Hide user info when entering quiz mode
    this.updateUserInfoVisibility();
  }

  // New method to populate expandable user info
  async populateExpandableUserInfo(contentDiv, data = null) {
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

            const fullName = userData["الاسم الكامل"] || userData.fullName || userData["الاسم"] || userData.name;
            if (fullName && fullName.trim() !== '') {
              displayName = fullName;
            }

            const groupValue = userData["الجروب"] || userData.group || userData["المجموعة"] || userData["الدفعة"];
            hasUserData = !!(fullName && fullName.trim() !== '') && !!(groupValue && groupValue.trim() !== '');
          }
        } catch (error) {
          console.error('Error fetching user data from Firestore:', error);
        }
      }
    }

    // Populate content based on user data availability
    if (hasUserData && userData) {
      contentDiv.innerHTML = `
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
    } else {
      contentDiv.innerHTML = `
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
          ">إكمال البيانات</button>`}
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
    }

    // Add event listeners
    const signOutBtn = contentDiv.querySelector('#signOutBtn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', () => {
        this.signOutUser();
      });
    }

    const completeDataBtn = contentDiv.querySelector('#completeDataBtn');
    if (completeDataBtn) {
      completeDataBtn.addEventListener('click', () => {
        this.showUserDataFormInExpandable(contentDiv, userData);
      });
    }
  }

  // Show form in expandable section
  showUserDataFormInExpandable(contentDiv, existingData = null) {
    let existingName = '';
    let existingGroup = '';

    if (existingData) {
      existingName = existingData["الاسم الكامل"] || existingData.fullName || this.currentUser.displayName || '';
      existingGroup = existingData["الجروب"] || existingData.group || '';
    } else {
      existingName = this.currentUser.displayName || '';
    }

    const formTitle = existingData ? 'تعديل البيانات الشخصية' : 'يرجى إضافة بياناتك لاستكمال الملف الشخصي';

    contentDiv.innerHTML = `
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
      <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
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
          flex: 1;
          min-width: 80px;
        ">حفظ</button>
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
          flex: 1;
          min-width: 80px;
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
          flex: 1;
          min-width: 80px;
        ">خروج</button>
      </div>
    `;

    // Add event listeners
    contentDiv.querySelector('#saveUserDataBtn').addEventListener('click', async () => {
      const fullName = contentDiv.querySelector('#updateFullName').value.trim();
      const group = contentDiv.querySelector('#updateGroup').value.trim();

      if (!fullName || !group) {
        this.showError('يرجى ملء جميع الحقول المطلوبة');
        return;
      }

      // Validation
      const nameWords = fullName.split(' ');
      if (nameWords.length < 3) {
        this.showError('يجب أن يتكون الاسم الكامل من ثلاث كلمات على الأقل.');
        return;
      }
      for (const word of nameWords) {
        if (word.length < 3 || !/^[آ-ي\s]+$/.test(word)) {
          this.showError('يجب أن تكون جميع أحرف الاسم باللغة العربية وكل كلمة 3 أحرف على الأقل.');
          return;
        }
      }

      if (group.length !== 1 || !/^[a-g]$/i.test(group)) {
        this.showError('يجب أن تكون المجموعة حرفًا واحدًا فقط من (a-g).');
        return;
      }

      // Save user data
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
        this.showSuccess('تم حفظ البيانات بنجاح');
        
        await this.sendTelegramNotification(
          this.currentUser.email, 
          fullName, 
          group, 
          existingData ? 'تحديث البيانات الشخصية 📝' : 'إضافة البيانات الشخصية 📝', 
          this.currentUser.uid
        );

        // Refresh content
        setTimeout(() => {
          this.populateExpandableUserInfo(contentDiv);
        }, 1000);

      } catch (error) {
        console.error('Error saving user data:', error);
        this.showError('فشل في حفظ البيانات: ' + error.message);
      }
    });

    contentDiv.querySelector('#cancelEditBtn').addEventListener('click', () => {
      this.populateExpandableUserInfo(contentDiv);
    });

    contentDiv.querySelector('#signOutBtn').addEventListener('click', () => {
      this.signOutUser();
    });
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
    const expandableDiv = document.getElementById('userInfoExpandable');
    const authMenuBtn = document.getElementById('authMenuBtn');
    const friendsBtn = document.getElementById('friendsBtn');
    const userButtons = document.getElementById('userButtons');
    const questionsContainer = document.getElementById('questionsContainer');

    if (userButtons) {
      // Only hide user buttons when questions are actively being displayed (not just hidden by default)
      const isInQuizMode = questionsContainer && 
                          questionsContainer.style.display === 'block' && 
                          questionsContainer.innerHTML.trim() !== '';
      
      if (isInQuizMode) {
        userButtons.style.display = 'none';
        if (expandableDiv) {
          expandableDiv.style.maxHeight = '0px';
          expandableDiv.style.opacity = '0';
          expandableDiv.style.transform = 'translateY(-10px)';
          expandableDiv.style.marginTop = '0';
        }
      } else {
        // Always show user buttons when not in active quiz mode and user is signed in
        if (this.isSignedIn()) {
          userButtons.style.display = 'flex';
          // Reset button state when returning to home
          if (authMenuBtn) {
            authMenuBtn.innerHTML = '☰';
            authMenuBtn.style.transform = 'rotate(0deg)';
          }
          // Reset expandable section when returning to home
          if (expandableDiv) {
            expandableDiv.style.maxHeight = '0px';
            expandableDiv.style.opacity = '0';
            expandableDiv.style.transform = 'translateY(-10px)';
            expandableDiv.style.marginTop = '0';
          }
        }
      }
    }
  }

  // Hide user info when user signs out
  hideUserInfo() {
    const expandableDiv = document.getElementById('userInfoExpandable');
    const contentDiv = document.getElementById('userInfoContent');
    const authMenuBtn = document.getElementById('authMenuBtn');

    if (expandableDiv) {
      expandableDiv.style.maxHeight = '0px';
      expandableDiv.style.opacity = '0';
      expandableDiv.style.transform = 'translateY(-10px)';
      expandableDiv.style.marginTop = '0';
    }

    if (contentDiv) {
      contentDiv.innerHTML = '';
    }

    // Reset the auth menu button to its original state (will be hidden for non-signed users)
    if (authMenuBtn) {
      authMenuBtn.innerHTML = '☰';
      authMenuBtn.style.transform = 'rotate(0deg)';
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

  // Show loading state
  showLoadingState() {
    // Create loading overlay if it doesn't exist
    let loadingOverlay = document.getElementById('authLoadingOverlay');
    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.id = 'authLoadingOverlay';
      loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #111;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        font-family: 'Tajawal', sans-serif;
      `;
      
      loadingOverlay.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        ">
          <!-- Animated Ring Background (smaller version) -->
          <div style="
            position: relative;
            width: 150px;
            height: 150px;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0.6;
          ">
            <i style="
              position: absolute;
              inset: 0;
              border: 2px solid #00ff0a;
              border-radius: 38% 62% 63% 37% / 41% 44% 56% 59%;
              animation: loadingRotate 6s linear infinite;
              filter: drop-shadow(0 0 15px #00ff0a);
            "></i>
            <i style="
              position: absolute;
              inset: 0;
              border: 2px solid #ff0057;
              border-radius: 41% 44% 56% 59%/38% 62% 63% 37%;
              animation: loadingRotate 4s linear infinite;
              filter: drop-shadow(0 0 15px #ff0057);
            "></i>
            <i style="
              position: absolute;
              inset: 0;
              border: 2px solid #fffd44;
              border-radius: 41% 44% 56% 59%/38% 62% 63% 37%;
              animation: loadingRotateReverse 10s linear infinite;
              filter: drop-shadow(0 0 15px #fffd44);
            "></i>
          </div>
          
          <div style="
            color: #ffffff;
            font-size: 24px;
            font-weight: 700;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
            text-align: center;
          ">جاري التحميل...</div>
        </div>
        
        <style>
          @keyframes loadingRotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes loadingRotateReverse {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
          }
          
          @keyframes loadingPulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
          }
        </style>
      `;
      
      document.body.appendChild(loadingOverlay);
    }
    
    loadingOverlay.style.display = 'flex';
    
    // Hide all main content during loading
    const signInContainer = document.getElementById('signInContainer');
    const signUpContainer = document.getElementById('signUpContainer');
    const mainContainer = document.querySelector('.container');
    
    if (signInContainer) signInContainer.style.display = 'none';
    if (signUpContainer) signUpContainer.style.display = 'none';
    if (mainContainer) mainContainer.style.display = 'none';
  }

  // Hide loading state
  hideLoadingState() {
    const loadingOverlay = document.getElementById('authLoadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
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