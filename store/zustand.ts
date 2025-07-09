import { User } from "auth0";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserDrawerType extends User {
  sub: string;
  picture: string;
}

type UserStore = {
  user: UserDrawerType | undefined;
  setUser: (userData: UserDrawerType) => void;
  // remove: () => void,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: undefined,
      setUser: (userData) => set(() => ({ user: userData })),
      // add: () => set((state) => ({ cart: state.cart + 1 })),
    }),
    {
      name: "user-storage",
    }
  )
);
