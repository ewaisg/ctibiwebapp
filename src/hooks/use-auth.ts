import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-client';
import { User, UserRole, ROLE_PERMISSIONS, RolePermissions } from '@/types';

interface FirebaseCustomClaims {
    role?: UserRole;
    [key: string]: unknown;
}

interface AuthState {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    isLoading: boolean;
    permissions: RolePermissions | null;
    csrfToken: string | null;
}

// Debug utilities (opt-in via localStorage DEBUG_AUTH = '1')
const getShouldDebug = () => {
    try {
        return typeof window !== 'undefined' && localStorage.getItem('DEBUG_AUTH') === '1';
    } catch {
        return false;
    }
};
const debug = (...args: any[]) => {
    if (getShouldDebug()) console.log('[auth]', ...args);
};

export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        firebaseUser: null,
        isLoading: true,
        permissions: null,
        csrfToken: null,
    });

    useEffect(() => {
        let mounted = true;

        // Only run on client side when Firebase is available
        if (typeof window === 'undefined' || !auth || !db) {
            if (mounted) {
                setAuthState({
                    user: null,
                    firebaseUser: null,
                    isLoading: false,
                    permissions: null,
                    csrfToken: null,
                });
            }
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            debug('onAuthStateChanged', { signedIn: !!firebaseUser, uid: firebaseUser?.uid, email: firebaseUser?.email });
            if (firebaseUser) {
                try {
                    // Log current token claims (role)
                    try {
                        const idTokenResult = await firebaseUser.getIdTokenResult();
                        const claims = idTokenResult?.claims as FirebaseCustomClaims;
                        debug('token.claims at auth change', { role: claims?.role, authTime: idTokenResult?.authTime });
                    } catch (e) {
                        debug('getIdTokenResult failed', e);
                    }

                    // Ensure db is available
                    if (!db) {
                        console.error('Database not available');
                        if (mounted) {
                            setAuthState({
                                user: null,
                                firebaseUser: null,
                                isLoading: false,
                                permissions: null,
                                csrfToken: null,
                            });
                        }
                        return;
                    }

                    // Get user data from Firestore
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

                    if (userDoc.exists()) {
                        const userData = userDoc.data() as User;
                        const permissions = ROLE_PERMISSIONS[userData.role];
                        debug('firestore user loaded', { role: userData.role, isActive: userData.isActive });

                        if (mounted) {
                            setAuthState({
                                user: userData,
                                firebaseUser,
                                isLoading: false,
                                permissions,
                                csrfToken: null, // Will be fetched lazily when needed
                            });
                        }
                    } else {
                        console.error('User document not found in Firestore');
                        if (mounted) {
                            setAuthState({
                                user: null,
                                firebaseUser: null,
                                isLoading: false,
                                permissions: null,
                                csrfToken: null,
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    if (mounted) {
                        setAuthState({
                            user: null,
                            firebaseUser: null,
                            isLoading: false,
                            permissions: null,
                            csrfToken: null,
                        });
                    }
                }
            } else {
                // Signed out
                if (mounted) {
                    setAuthState({
                        user: null,
                        firebaseUser: null,
                        isLoading: false,
                        permissions: null,
                        csrfToken: null,
                    });
                }
            }
        });

        return () => {
            mounted = false;
            unsubscribe?.();
        };
    }, []);

    const signInWithEmail = async (email: string, password: string, rememberMe: boolean = false) => {
        if (typeof window === 'undefined' || !auth || !db) {
            throw new Error('Authentication not available on server side');
        }

        try {
            // Set persistence before signing in
            const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistence);
            debug('signInWithEmail:persistence', { rememberMe, type: rememberMe ? 'local' : 'session' });

            debug('signInWithEmail:start', { email });
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const firebaseUser = userCredential.user;
            debug('signInWithEmail:success', { uid: firebaseUser.uid, email: firebaseUser.email });
            try {
                const idTokenResult = await firebaseUser.getIdTokenResult();
                const claims = idTokenResult?.claims as FirebaseCustomClaims;
                debug('signIn token.claims', { role: claims?.role });
            } catch (e) {
                debug('signIn getIdTokenResult failed', e);
            }

            // Ensure db is available
            if (!db) {
                throw new Error('Database not available');
            }

            // Get user data from Firestore
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

            if (!userDoc.exists()) {
                throw new Error('User profile not found. Please contact administrator.');
            }

            const userData = userDoc.data() as User;
            debug('signIn firestore role', { role: userData.role, isActive: userData.isActive });

            if (!userData.isActive) {
                throw new Error('Account is inactive. Please contact administrator.');
            }

            // Update lastLoginAt (best-effort)
            try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), { lastLoginAt: serverTimestamp() });
                debug('lastLoginAt updated');
            } catch (e) {
                debug('lastLoginAt update failed', e);
            }

            return userData;
        } catch (error: unknown) {
            const firebaseError = error as { code?: string; message?: string };
            // Handle specific Firebase Auth errors
            switch (firebaseError.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    throw new Error('Invalid email or password');
                case 'auth/user-disabled':
                    throw new Error('Account has been disabled');
                case 'auth/too-many-requests':
                    throw new Error('Too many failed attempts. Please try again later.');
                default:
                    throw new Error(firebaseError.message || 'Authentication failed');
            }
        }
    };

    const signOut = async () => {
        if (typeof window === 'undefined' || !auth) {
            throw new Error('Authentication not available on server side');
        }

        try {
            debug('signOut:start');
            await firebaseSignOut(auth);
            debug('signOut:success');
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    };

    const hasPermission = (permission: keyof RolePermissions): boolean => {
        return authState.permissions?.[permission] || false;
    };

    const isRole = (role: UserRole): boolean => {
        return authState.user?.role === role;
    };

    // Lazy CSRF token fetching with caching
    const getCSRFToken = async (): Promise<string | null> => {
        if (authState.csrfToken) {
            return authState.csrfToken;
        }

        try {
            debug('csrf:fetch');
            const response = await fetch('/api/auth/csrf');
            if (response.ok) {
                const data = await response.json();
                debug('csrf:fetched');
                setAuthState(prev => ({ ...prev, csrfToken: data.csrfToken }));
                return data.csrfToken;
            } else {
                debug('csrf:failed', { status: response.status });
            }
        } catch (error) {
            console.error('Failed to fetch CSRF token:', error);
        }
        return null;
    };

    // Enhanced API request with CSRF protection
    const secureRequest = async (url: string, options: RequestInit = {}) => {
        const isFormData = typeof window !== 'undefined' && options.body instanceof FormData;
        const headers: Record<string, string> = {
            // Only set JSON content-type when not sending FormData and not already provided
            ...(!isFormData && !((options.headers as Record<string, string>) || {})['Content-Type']
                ? { 'Content-Type': 'application/json' }
                : {}),
            ...((options.headers as Record<string, string>) || {}),
        };

        const method = (options.method || 'GET').toUpperCase();

        // Add CSRF token for state-changing requests
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            const csrfToken = await getCSRFToken();
            if (csrfToken) {
                headers['X-CSRF-Token'] = csrfToken;
            }
        }

        // Add Firebase auth token and log role claim
        let roleClaim: UserRole | undefined;
        if (authState.firebaseUser) {
            const token = await authState.firebaseUser.getIdToken();
            headers['Authorization'] = `Bearer ${token}`;
            try {
                const idTokenResult = await authState.firebaseUser.getIdTokenResult();
                const claims = idTokenResult?.claims as FirebaseCustomClaims;
                roleClaim = claims?.role;
            } catch {}
        }

        debug('secureRequest:request', { url, method, hasAuth: !!authState.firebaseUser, roleClaim, hasCsrf: !!headers['X-CSRF-Token'] });

        const response = await fetch(url, {
            ...options,
            headers,
        });

        debug('secureRequest:response', { url, method, status: response.status });
        return response;
    };

    const refreshIdToken = async () => {
        if (authState.firebaseUser) {
            try {
                debug('refreshIdToken:start');
                await authState.firebaseUser.getIdToken(true);
                try {
                    const idTokenResult = await authState.firebaseUser.getIdTokenResult();
                    const claims = idTokenResult?.claims as FirebaseCustomClaims;
                    debug('refreshIdToken:claims', { role: claims?.role });
                } catch {}
                return true;
            } catch (e) {
                console.error('Failed to refresh ID token:', e);
                return false;
            }
        }
        return false;
    };

    const resetPassword = async (email: string) => {
        if (typeof window === 'undefined' || !auth) {
            throw new Error('Authentication not available on server side');
        }

        try {
            debug('resetPassword:start', { email });
            await sendPasswordResetEmail(auth, email);
            debug('resetPassword:success');
        } catch (error: unknown) {
            const firebaseError = error as { code?: string; message?: string };
            // Handle specific Firebase Auth errors
            switch (firebaseError.code) {
                case 'auth/user-not-found':
                    // For security, don't reveal if email exists
                    debug('resetPassword:user-not-found', { email });
                    break;
                case 'auth/invalid-email':
                    throw new Error('Invalid email address');
                case 'auth/too-many-requests':
                    throw new Error('Too many requests. Please try again later.');
                default:
                    debug('resetPassword:error', firebaseError);
                    throw new Error('Failed to send password reset email. Please try again.');
            }
        }
    };

    return {
        ...authState,
        signInWithEmail,
        signOut,
        resetPassword,
        hasPermission,
        isRole,
        secureRequest,
        refreshIdToken,
    };
}