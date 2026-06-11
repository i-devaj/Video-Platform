import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";
import OTPModal from "../components/OTPModal";
import PhoneModal from "../components/PhoneModal";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // OTP & Phone flow state
  const [pendingUser, setPendingUser] = useState(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otpType, setOtpType] = useState(null); // 'email' | 'sms'
  const [otpIdentifier, setOtpIdentifier] = useState("");
  const [initialTestOtp, setInitialTestOtp] = useState("");

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  // Fetch populated plan and merge into user object
  const fetchAndMergePlan = async (userData) => {
    try {
      const planRes = await axiosInstance.get(`/plan/user/${userData._id}`);
      return { ...userData, plan: planRes.data.plan || null };
    } catch {
      return { ...userData, plan: null };
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const triggerOTP = async (userData) => {
    try {
      if (userData.phone) {
        // Send SMS OTP
        const res = await axiosInstance.post("/otp/send", {
          phone: userData.phone,
          type: "phone",
        });
        setOtpType("sms");
        setOtpIdentifier(userData.phone);
        if (res.data.testOtp) {
          setInitialTestOtp(res.data.testOtp);
        }
      } else {
        // Send Email OTP
        const res = await axiosInstance.post("/otp/send", {
          email: userData.email,
          type: "email",
        });
        setOtpType("email");
        setOtpIdentifier(userData.email);
        if (res.data.testOtp) {
          setInitialTestOtp(res.data.testOtp);
        } else {
          setInitialTestOtp("");
        }
      }
      setShowOTPModal(true);
    } catch (err) {
      console.error("Failed to send OTP", err);
      // Fallback: just login if OTP fails
      login(userData);
    }
  };

  const processLoginResult = async (userData) => {
    // We check if OTP is required. The requirement was to add back the OTP feature.
    setPendingUser(userData);
    if (!userData.phone) {
      setShowPhoneModal(true);
    } else {
      await triggerOTP(userData);
    }
  };

  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      const response = await axiosInstance.post("/user/login", payload);
      const userWithPlan = await fetchAndMergePlan(response.data.result);
      await processLoginResult(userWithPlan);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      // Check if user is already in state/localStorage to avoid infinite OTP prompts on refresh
      const localUser = localStorage.getItem("user");
      if (localUser) {
        setUser(JSON.parse(localUser));
        return;
      }

      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          const response = await axiosInstance.post("/user/login", payload);
          const userWithPlan = await fetchAndMergePlan(response.data.result);
          await processLoginResult(userWithPlan);
        } catch (error) {
          console.error(error);
          logout();
        }
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, handlegooglesignin }}>
      {children}
      {pendingUser && (
        <>
          <PhoneModal
            isOpen={showPhoneModal}
            onClose={() => {
              setShowPhoneModal(false);
              // Fallback to email OTP if they skip phone
              triggerOTP(pendingUser);
            }}
            onSuccess={(phone) => {
              setShowPhoneModal(false);
              const updatedUser = { ...pendingUser, phone };
              setPendingUser(updatedUser);
              triggerOTP(updatedUser);
            }}
          />
          <OTPModal
            isOpen={showOTPModal}
            identifier={otpIdentifier}
            type={otpType}
            initialTestOtp={initialTestOtp}
            onVerified={() => {
              setShowOTPModal(false);
              login(pendingUser);
              setPendingUser(null);
            }}
            onClose={() => {
              setShowOTPModal(false);
              setPendingUser(null);
              logout(); // Cancel login
            }}
          />
        </>
      )}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
