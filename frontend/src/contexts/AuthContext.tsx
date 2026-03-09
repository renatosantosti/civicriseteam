import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const TOKEN_KEY = 'civicrise_token';
const USER_KEY = 'civicrise_user';

export interface User {
  id: string;
  name: string;
  email: string;
  zipCode?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, zipCode: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): { token: string | null; user: User | null } {
  if (typeof window === 'undefined') return { token: null, user: null };
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    const user = rawUser ? (JSON.parse(rawUser) as User) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

function saveStored(token: string | null, user: User | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signUpMutation = useMutation(api.auth.signUp);
  const signInMutation = useMutation(api.auth.signIn);

  useEffect(() => {
    const { token: t, user: u } = loadStored();
    setToken(t);
    setUser(u);
    setIsLoading(false);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const result = await signInMutation({ email, password });
        const u: User = {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          zipCode: result.user.zipCode,
        };
        setToken(result.token);
        setUser(u);
        saveStored(result.token, u);
      } finally {
        setIsLoading(false);
      }
    },
    [signInMutation]
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string, zipCode: string) => {
      setIsLoading(true);
      try {
        await signUpMutation({ name, email, password, zipCode });
        await signIn(email, password);
      } finally {
        setIsLoading(false);
      }
    },
    [signUpMutation, signIn]
  );

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    saveStored(null, null);
  }, []);

  const value: AuthContextValue = {
    user,
    token,
    isLoading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function useOptionalAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}
