
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from './firebase-config.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.onAuthChange = null;
    this.init();
  }

  init() {
    // Listen for authentication state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      if (this.onAuthChange) {
        this.onAuthChange(user);
      }
      this.updateUI();
    });
  }

  // Set callback for auth state changes
  setAuthChangeCallback(callback) {
    this.onAuthChange = callback;
  }

  // Sign in with Google
  async signInWithGoogle() {
    try {
      // Configure popup settings to avoid blocking
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Google sign-in successful:', result.user);
      return result.user;
    } catch (error) {
      console.error('Google sign-in error:', error);
      if (error.code === 'auth/popup-blocked') {
        this.showError('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة وإعادة المحاولة');
      } else if (error.code === 'auth/cancelled-popup-request') {
        this.showError('تم إلغاء تسجيل الدخول');
      } else if (error.code === 'auth/unauthorized-domain') {
        this.showError('النطاق غير مصرح به. يجب إضافة النطاق في إعدادات Firebase');
      } else {
        this.showError('فشل تسجيل الدخول باستخدام Google: ' + this.getArabicErrorMessage(error.code));
      }
      throw error;
    }
  }

  // Sign in with email and password
  async signInWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Email sign-in successful:', result.user);
      return result.user;
    } catch (error) {
      console.error('Email sign-in error:', error);
      this.showError('فشل تسجيل الدخول: ' + this.getArabicErrorMessage(error.code));
      throw error;
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
    
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Account creation successful:', result.user);
      
      // Store additional user data in localStorage for later use
      const userData = {
        uid: result.user.uid,
        email: email,
        fullName: fullName,
        group: group,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(`user_${result.user.uid}`, JSON.stringify(userData));
      
      // Sign out the user immediately after account creation
      await this.signOutUser();
      
      this.showSuccess('تم إنشاء الحساب بنجاح!');
      
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
      
      return result.user;
    } catch (error) {
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
      this.showUserInfo();
    } else {
      // User is signed out - show sign in page
      if (signInContainer) {
        signInContainer.style.display = 'block';
      }
      if (signUpContainer) {
        signUpContainer.style.display = 'none';
      }
      if (mainContainer) {
        mainContainer.style.display = 'none';
      }
    }
  }

  // Show sign up page
  showSignUpPage() {
    const signInContainer = document.getElementById('signInContainer');
    const signUpContainer = document.getElementById('signUpContainer');
    
    if (signInContainer) {
      signInContainer.style.display = 'none';
    }
    if (signUpContainer) {
      signUpContainer.style.display = 'block';
    }
  }

  // Show sign in page
  showSignInPage() {
    const signInContainer = document.getElementById('signInContainer');
    const signUpContainer = document.getElementById('signUpContainer');
    
    if (signInContainer) {
      signInContainer.style.display = 'block';
    }
    if (signUpContainer) {
      signUpContainer.style.display = 'none';
    }
  }

  // Show user info
  showUserInfo() {
    let userInfoDiv = document.getElementById('userInfo');
    if (!userInfoDiv) {
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
      `;
      
      // Insert the user info above the title
      const container = document.querySelector('.container');
      const title = container.querySelector('h1');
      container.insertBefore(userInfoDiv, title);
    }

    const user = this.currentUser;
    
    // Get stored user data for full name and group
    let displayName = user.displayName || user.email || 'المستخدم';
    let groupInfo = '';
    
    if (user.uid) {
      const userData = localStorage.getItem(`user_${user.uid}`);
      if (userData) {
        const parsedData = JSON.parse(userData);
        displayName = parsedData.fullName || displayName;
        groupInfo = parsedData.group ? ` - ${parsedData.group}` : '';
      }
    }
    
    userInfoDiv.innerHTML = `
      <div style="margin-bottom: 10px;">
        <strong>مرحباً، ${displayName}${groupInfo}</strong>
      </div>
      <button id="signOutBtn" style="
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-family: 'Tajawal', sans-serif;
        font-size: 14px;
        transition: all 0.3s ease;
      ">تسجيل الخروج</button>
    `;

    document.getElementById('signOutBtn').addEventListener('click', () => {
      this.signOutUser();
    });
    
    // Hide user info when in quiz mode
    this.updateUserInfoVisibility();
  }
  
  // Update user info visibility based on quiz state
  updateUserInfoVisibility() {
    const userInfoDiv = document.getElementById('userInfo');
    const questionsContainer = document.getElementById('questionsContainer');
    
    if (userInfoDiv) {
      // Hide user info when questions are being displayed
      if (questionsContainer && questionsContainer.style.display !== 'none') {
        userInfoDiv.style.display = 'none';
      } else {
        userInfoDiv.style.display = 'block';
      }
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
