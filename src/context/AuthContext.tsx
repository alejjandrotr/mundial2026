import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import type { Usuario } from "../models/types";
import { toTitleCase } from "../utils/format";

interface AuthContextType {
  currentUser: Usuario | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  updatePassword: async () => {},
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
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.displayName) {
          parsed.displayName = toTitleCase(parsed.displayName);
        }
        setCurrentUser(parsed);
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
      displayName: toTitleCase(userData.displayName || ""),
      email: userData.email,
      totalPoints: userData.totalPoints || 0,
      role: userData.role || "user",
      mustChangePassword: userData.mustChangePassword || false,
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

    const titleCasedName = toTitleCase(name);
    const newUserRef = doc(collection(db, "usuarios"));
    const newUser = {
      uid: newUserRef.id,
      displayName: titleCasedName,
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

  const updatePassword = async (newPassword: string) => {
    if (!currentUser) throw new Error("No hay usuario autenticado");

    const userRef = doc(db, "usuarios", currentUser.uid);
    await updateDoc(userRef, {
      password: newPassword,
      mustChangePassword: false,
    });

    const updatedUser: Usuario = {
      ...currentUser,
      mustChangePassword: false,
    };

    localStorage.setItem("currentUser", JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
  };

  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
