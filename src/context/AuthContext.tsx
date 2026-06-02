import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Usuario } from "../models/types";

interface AuthContextType {
  currentUser: Usuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("currentUser");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const q = query(collection(db, "usuarios"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Usuario no registrado");
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    if (userData.password !== password) {
      throw new Error("Contraseña incorrecta");
    }

    const loggedUser: Usuario = {
      uid: userData.uid,
      displayName: userData.displayName,
      email: userData.email,
      totalPoints: userData.totalPoints || 0,
      role: userData.role || "user",
    };

    localStorage.setItem("currentUser", JSON.stringify(loggedUser));
    setCurrentUser(loggedUser);
  };

  const register = async (name: string, email: string, password: string) => {
    // Verificar si el correo ya existe
    const q = query(collection(db, "usuarios"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      throw new Error("El correo electrónico ya está registrado");
    }

    const newUserRef = doc(collection(db, "usuarios"));
    const newUser = {
      uid: newUserRef.id,
      displayName: name,
      email: email,
      password: password,
      totalPoints: 0,
      role: "user",
    };

    await setDoc(newUserRef, newUser);

    const loggedUser: Usuario = {
      uid: newUser.uid,
      displayName: newUser.displayName,
      email: newUser.email,
      totalPoints: newUser.totalPoints,
      role: newUser.role as "user",
    };

    localStorage.setItem("currentUser", JSON.stringify(loggedUser));
    setCurrentUser(loggedUser);
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
