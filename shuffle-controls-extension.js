

// Shuffle Controls Extension - Lecture-based restrictions
(function() {
    'use strict';

    // Initially hide the Subscribe button to prevent flash
    function hideSubscribeButtonInitially() {
        const vipSubscribeBtn = document.getElementById('vipSubscribeBtn');
        if (vipSubscribeBtn) {
            vipSubscribeBtn.style.display = 'none';
            vipSubscribeBtn.style.visibility = 'hidden';
        }
    }

    // Wait for DOM and main script to load
    function initializeShuffleExtension() {
        // Hide Subscribe button immediately
        hideSubscribeButtonInitially();

        // Get references to the shuffle controls
        const shuffleToggle = document.getElementById('shuffleToggle');
        const shuffleAnswersToggle = document.getElementById('shuffleAnswersToggle');
        const shuffleLoginHint = document.getElementById('shuffleLoginHint');
        const shuffleAnswersLoginHint = document.getElementById('shuffleAnswersLoginHint');

        if (!shuffleToggle || !shuffleAnswersToggle) {
            console.log('Shuffle controls not found, retrying...');
            setTimeout(initializeShuffleExtension, 500);
            return;
        }

        console.log('Shuffle controls extension initialized');

        // Make getLectureNumber globally available
        window.getLectureNumber = function() {
            const lectureSelect = document.getElementById('lectureSelect');
            if (!lectureSelect || !lectureSelect.value) return null;

            const lectureValue = lectureSelect.value;

            // Try to extract number from various formats
            if (typeof lectureValue === 'number') {
                return lectureValue;
            }

            if (typeof lectureValue === 'string') {
                // Try to parse as direct number
                const directNum = parseInt(lectureValue, 10);
                if (!isNaN(directNum)) {
                    return directNum;
                }

                // Try to extract from text like "Lecture 3", "lec3", etc.
                const match = lectureValue.match(/(\d+)/);
                if (match) {
                    return parseInt(match[1], 10);
                }
            }

            return null;
        };

        // Function to check if user is logged in
        function isUserLoggedIn() {
            try {
                // Check if authManager exists and user is signed in
                if (window.authManager && typeof window.authManager.isSignedIn === 'function') {
                    const signedIn = window.authManager.isSignedIn();
                    const currentUser = window.authManager.getCurrentUser();
                    // Make sure it's not a guest user
                    const isGuest = currentUser && currentUser.isGuest;
                    return signedIn && !isGuest;
                }

                // Fallback: check Firebase auth directly
                if (window.auth && window.auth.currentUser) {
                    return true;
                }

                return false;
            } catch (error) {
                console.log('Login check failed, assuming not logged in:', error);
                return false;
            }
        }

        // Function to check VIP status with comprehensive detection
        async function hasVipAccess() {
            try {
                // Check global vipMode variable first
                if (typeof window.vipMode === 'boolean' && window.vipMode === true) {
                    return true;
                }

                // Check localStorage for VIP status
                const localVip = localStorage.getItem('vipMode');
                if (localVip === 'true') {
                    return true;
                }

                // Check if user is logged in before checking Firebase
                if (!isUserLoggedIn()) {
                    return false;
                }

                // Check Firebase Auth custom claims
                if (window.auth && window.auth.currentUser) {
                    try {
                        // Force token refresh to get latest custom claims
                        const idTokenResult = await window.auth.currentUser.getIdTokenResult(true);
                        if (idTokenResult.claims && idTokenResult.claims.vip === true) {
                            return true;
                        }
                    } catch (error) {
                        console.log('Error checking Firebase custom claims:', error);
                    }
                }

                // Check authManager currentUser for VIP
                if (window.authManager && window.authManager.currentUser) {
                    const user = window.authManager.currentUser;
                    if (user.customClaims && user.customClaims.vip === true) {
                        return true;
                    }
                }

                // Check Firestore user document for VIP status
                if (window.authManager && window.authManager.currentUser && window.authManager.currentUser.uid) {
                    try {
                        // Import Firebase functions dynamically
                        const { getDoc, doc, db } = await import('./firebase-config.js');
                        const userDoc = await getDoc(doc(db, 'users', window.authManager.currentUser.uid));

                        if (userDoc.exists()) {
                            const userData = userDoc.data();
                            if (userData.vipStatus === true || userData.vip === true) {
                                return true;
                            }
                        }
                    } catch (error) {
                        console.log('Error checking Firestore VIP status:', error);
                    }
                }

                return false;
            } catch (error) {
                console.log('VIP check failed, assuming no VIP:', error);
                return false;
            }
        }

        // Function to check if free trial is active
        function hasFreeTrialAccess() {
            try {
                // Check if free trial is active (another form of VIP access)
                if (typeof window.freeTrialActive === 'boolean' && window.freeTrialActive === true) {
                    return true;
                }

                // Check localStorage for free trial status
                const localFreeTrial = localStorage.getItem('freeTrialActive');
                if (localFreeTrial === 'true') {
                    return true;
                }

                return false;
            } catch (error) {
                console.log('Free trial check failed, assuming no free trial:', error);
                return false;
            }
        }

        // Function to update VIP Subscribe button visibility
        async function updateVipButtonVisibility() {
            const vipSubscribeBtn = document.getElementById('vipSubscribeBtn');
            if (!vipSubscribeBtn) return;

            const lectureNum = window.getLectureNumber();
            const isLoggedIn = isUserLoggedIn();
            const hasVip = await hasVipAccess();
            const hasFreeTrial = hasFreeTrialAccess();

            console.log('VIP Subscribe button check:', {
                lectureNum,
                isLoggedIn,
                hasVip,
                hasFreeTrial
            });

            // If user has VIP or free trial, never show the button
            if (hasVip || hasFreeTrial) {
                vipSubscribeBtn.style.display = 'none';
                vipSubscribeBtn.style.visibility = 'hidden';
                console.log('VIP Subscribe button hidden: user has VIP or free trial');
                return;
            }

            // Only update if we have a valid lecture number
            if (lectureNum !== null) {
                if (lectureNum <= 2) {
                    // Hide button for lectures 1 and 2 (free content)
                    vipSubscribeBtn.style.display = 'none';
                    vipSubscribeBtn.style.visibility = 'hidden';
                    console.log('VIP Subscribe button hidden: lecture', lectureNum, 'is free');
                } else {
                    // Show button for lecture 3 and above for non-VIP users
                    vipSubscribeBtn.style.visibility = 'visible';
                    vipSubscribeBtn.style.display = 'flex';
                    console.log('VIP Subscribe button shown: lecture', lectureNum, 'requires subscription');
                }
            } else {
                // If we can't determine lecture number, hide the button as a safe default
                vipSubscribeBtn.style.display = 'none';
                vipSubscribeBtn.style.visibility = 'hidden';
                console.log('VIP Subscribe button hidden: could not determine lecture number');
            }
        }

        // Function to check if shuffle should be available
        async function shouldAllowShuffle() {
            const lectureNum = window.getLectureNumber();

            // If we can't determine lecture number, be restrictive
            if (lectureNum === null) {
                return false;
            }

            // Lectures 1 and 2 are always allowed
            if (lectureNum <= 2) {
                return true;
            }

            // Lecture 3+ requires login and VIP or free trial
            const loggedIn = isUserLoggedIn();
            const hasVip = await hasVipAccess();
            const hasFreeTrial = hasFreeTrialAccess();

            return loggedIn && (hasVip || hasFreeTrial);
        }

        // Function to update shuffle controls
        async function updateShuffleControlsExtension() {
            const shouldAllow = await shouldAllowShuffle();
            const lectureNum = window.getLectureNumber();
            const isLoggedIn = isUserLoggedIn();
            const hasVip = await hasVipAccess();
            const hasFreeTrial = hasFreeTrialAccess();

            console.log('Shuffle extension check:', {
                lectureNum,
                isLoggedIn,
                hasVip,
                hasFreeTrial,
                shouldAllow
            });

            if (shouldAllow) {
                // Enable controls
                shuffleToggle.disabled = false;
                shuffleAnswersToggle.disabled = false;

                // Hide hint messages
                if (shuffleLoginHint) shuffleLoginHint.style.display = 'none';
                if (shuffleAnswersLoginHint) shuffleAnswersLoginHint.style.display = 'none';

                // Reset styling
                shuffleToggle.style.opacity = '1';
                shuffleAnswersToggle.style.opacity = '1';
                shuffleToggle.style.cursor = 'pointer';
                shuffleAnswersToggle.style.cursor = 'pointer';

            } else {
                // Disable controls
                shuffleToggle.disabled = true;
                shuffleAnswersToggle.disabled = true;
                shuffleToggle.checked = false;
                shuffleAnswersToggle.checked = false;

                // Style as disabled
                shuffleToggle.style.opacity = '0.5';
                shuffleAnswersToggle.style.opacity = '0.5';
                shuffleToggle.style.cursor = 'not-allowed';
                shuffleAnswersToggle.style.cursor = 'not-allowed';

                // Show appropriate hint messages
                let hintText = '';
                if (lectureNum > 2) {
                    if (!isLoggedIn) {
                        hintText = '(سجل دخولك لتفعيل الميزة)';
                    } else if (!hasVip && !hasFreeTrial) {
                        hintText = '(يتطلب VIP للمحاضرات 3+)';
                    }
                }

                if (shuffleLoginHint && hintText) {
                    shuffleLoginHint.textContent = hintText;
                    shuffleLoginHint.style.display = 'inline';
                }

                if (shuffleAnswersLoginHint && hintText) {
                    shuffleAnswersLoginHint.textContent = hintText;
                    shuffleAnswersLoginHint.style.display = 'inline';
                }
            }
        }

        // Initial update with delay to prevent flash and allow Firebase to load
        setTimeout(() => {
            updateShuffleControlsExtension();
            setTimeout(() => {
                updateVipButtonVisibility();
            }, 100);
        }, 1000);

        // Listen for lecture changes
        const lectureSelect = document.getElementById('lectureSelect');
        if (lectureSelect) {
            lectureSelect.addEventListener('change', function() {
                setTimeout(() => {
                    updateShuffleControlsExtension();
                    updateVipButtonVisibility();
                }, 100);
            });
        }

        // Listen for subject changes (which trigger lecture changes)
        const subjectSelect = document.getElementById('subjectSelect');
        if (subjectSelect) {
            subjectSelect.addEventListener('change', function() {
                setTimeout(() => {
                    updateShuffleControlsExtension();
                    updateVipButtonVisibility();
                }, 200);
            });
        }

        // Listen for auth state changes
        if (window.auth) {
            try {
                window.auth.onAuthStateChanged(function(user) {
                    console.log('Auth state changed in shuffle extension:', user ? 'logged in' : 'logged out');
                    setTimeout(() => {
                        updateShuffleControlsExtension();
                        updateVipButtonVisibility();
                    }, 500);
                });
            } catch (error) {
                console.log('Error setting up auth state listener:', error);
            }
        }

        // Listen for authManager auth changes
        if (window.authManager && typeof window.authManager.setAuthChangeCallback === 'function') {
            try {
                const originalCallback = window.authManager.onAuthChange;
                const wrappedCallback = function(user) {
                    if (typeof originalCallback === 'function') {
                        originalCallback(user);
                    }
                    setTimeout(() => {
                        updateShuffleControlsExtension();
                        updateVipButtonVisibility();
                    }, 500);
                };
                window.authManager.onAuthChange = wrappedCallback;
            } catch (error) {
                console.log('Error setting up authManager listener:', error);
            }
        }

        // Listen for VIP status changes
        let lastVipMode = window.vipMode;
        let lastFreeTrialActive = window.freeTrialActive;
        const statusCheckInterval = setInterval(function() {
            if (window.vipMode !== lastVipMode || window.freeTrialActive !== lastFreeTrialActive) {
                lastVipMode = window.vipMode;
                lastFreeTrialActive = window.freeTrialActive;
                updateShuffleControlsExtension();
                updateVipButtonVisibility();
            }
        }, 2000);

        // Observe DOM changes for dynamic content
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    const addedNodes = Array.from(mutation.addedNodes);
                    const hasShuffleControls = addedNodes.some(node => 
                        node.nodeType === 1 && (
                            node.id === 'shuffleToggle' || 
                            node.id === 'shuffleAnswersToggle' ||
                            node.id === 'vipSubscribeBtn' ||
                            node.querySelector && (
                                node.querySelector('#shuffleToggle') || 
                                node.querySelector('#shuffleAnswersToggle') ||
                                node.querySelector('#vipSubscribeBtn')
                            )
                        )
                    );

                    if (hasShuffleControls) {
                        // Hide Subscribe button immediately if it was just added
                        const newVipBtn = mutation.target.querySelector('#vipSubscribeBtn') || 
                                        (mutation.target.id === 'vipSubscribeBtn' ? mutation.target : null);
                        if (newVipBtn) {
                            newVipBtn.style.display = 'none';
                            newVipBtn.style.visibility = 'hidden';
                        }

                        setTimeout(() => {
                            updateShuffleControlsExtension();
                            updateVipButtonVisibility();
                        }, 100);
                    }
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Cleanup function
        window.cleanupShuffleExtension = function() {
            if (statusCheckInterval) {
                clearInterval(statusCheckInterval);
            }
            if (observer) {
                observer.disconnect();
            }
        };

        // Update on window focus (in case user status changed in another tab)
        window.addEventListener('focus', function() {
            setTimeout(() => {
                updateShuffleControlsExtension();
                updateVipButtonVisibility();
            }, 500);
        });

        // Update when page becomes visible
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                setTimeout(() => {
                    updateShuffleControlsExtension();
                    updateVipButtonVisibility();
                }, 500);
            }
        });

        // Periodic check for status updates every 10 seconds
        setInterval(() => {
            updateShuffleControlsExtension();
            updateVipButtonVisibility();
        }, 10000);

        console.log('Shuffle controls extension setup complete');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeShuffleExtension);
    } else {
        initializeShuffleExtension();
    }

    // Also try to hide the button immediately on script load
    hideSubscribeButtonInitially();

})();

