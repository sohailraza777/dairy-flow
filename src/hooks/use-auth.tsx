import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  login?: (email: string, password: string) => Promise<void>;
  signup?: (email: string, password: string, name?: string) => Promise<void>;
  resetPassword?: (email: string) => Promise<void>;
  role?: string;
  lastLoginAt?: Date;
  authLoading?: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>("user"); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setRole(userDoc.data().role || "user");
          }
        } catch (e) {
          console.error("Error fetching user role:", e);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(friendlyAuthError(error));
    }
  };

  const signUp = async (email: string, password: string, name: string = "User") => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        email: newUser.email,
        name: name,
        role: "user",
        createdAt: serverTimestamp()
      });

    } catch (error: any) {
      throw new Error(friendlyAuthError(error));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error("Failed to sign out");
    }
  };

  const resetPassword = async (email: string) => {
    console.log("Reset password for:", email);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout,
    isAuthenticated: !!user,
    login: signIn,
    signup: signUp,
    resetPassword,
    authLoading: loading,
    role: user ? role : undefined,
    lastLoginAt: user ? new Date() : undefined,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Updated to catch the exact Firebase error message!
export function friendlyAuthError(error: any): string {
  const code = error?.code || "unknown";
  const map: Record<string, string> = {
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Try again.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/invalid-credential": "Invalid email or password.",
    "auth/invalid-login-credentials": "Invalid email or password.", 
  };
  
  // If we don't know the error, spit out the exact Firebase code so we can debug it!
  return map[code] ?? `Firebase Error: ${code} - ${error?.message || "Unknown error"}`;
}