import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import AuthService from "@/services/authService";
import { useAuthStore } from "@/stores/useAuthStore";

export default function useAuth() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Get auth session management from store
  const { setSession } = useAuthStore();
  const authService = AuthService.getInstance();

  // Countdown timer for resend
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Phone number validation
  const validatePhoneNumber = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length === 11;
  };

  // Code validation
  const validateCode = (code: string) => {
    const digitsOnly = code.replace(/\D/g, "");
    return digitsOnly.length === 6;
  };

  const handlePhoneChange = (text: string) => {
    // Only allow digits
    const digitsOnly = text.replace(/\D/g, "");
    setMobileNumber(digitsOnly);

    // Clear error when user starts typing
    if (phoneError) setPhoneError("");
    if (generalError) setGeneralError("");

    // Show error if not 11 digits and user has finished typing
    if (digitsOnly.length > 0 && digitsOnly.length !== 11) {
      setPhoneError("Enter the correct phone number");
    } else {
      setPhoneError("");
    }
  };

  const handleCodeChange = (text: string) => {
    // Only allow digits
    const digitsOnly = text.replace(/\D/g, "");
    setSmsCode(digitsOnly);

    // Clear error when user starts typing
    if (codeError) setCodeError("");
    if (generalError) setGeneralError("");

    // Show error if not 6 digits and user has finished typing
    if (digitsOnly.length > 0 && digitsOnly.length !== 6) {
      setCodeError("Enter the correct OTP");
    } else {
      setCodeError("");
    }
  };

  const handleNext = async () => {
    if (!agreedToTerms) {
      setGeneralError("Please agree to Terms of Service and Privacy Policy");
      return;
    }

    if (!validatePhoneNumber(mobileNumber)) {
      setPhoneError("Enter the correct phone number");
      return;
    }

    setIsLoading(true);
    setGeneralError("");

    try {
      // Clean phone number and add country code if needed
      const cleanPhone = mobileNumber.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("86") ? `+${cleanPhone}` : `+86${cleanPhone}`;

      await authService.sendOTP(formattedPhone);
      
      setCodeSent(true);
      setCountdown(59);
      setIsLoading(false);
    } catch (error) {
      const errorMessage = authService.getErrorMessage(error);
      setGeneralError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!validateCode(smsCode)) {
      setCodeError("Enter the correct OTP");
      return;
    }

    setIsLoading(true);
    setGeneralError("");

    try {
      // Clean phone number and add country code if needed
      const cleanPhone = mobileNumber.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("86") ? `+${cleanPhone}` : `+86${cleanPhone}`;

      const response = await authService.verifyOTP(formattedPhone, smsCode);
      
      // Set session in global state
      setSession(response.session);
      
      // Navigate to main app
      router.replace("/(tabs)");
      
      setIsLoading(false);
    } catch (error) {
      const errorMessage = authService.getErrorMessage(error);
      setGeneralError(errorMessage);
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) {
      return; // Prevent resend during countdown
    }

    setGeneralError("");
    
    try {
      // Clean phone number and add country code if needed
      const cleanPhone = mobileNumber.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("86") ? `+${cleanPhone}` : `+86${cleanPhone}`;

      await authService.sendOTP(formattedPhone);
      
      setCountdown(59);
    } catch (error) {
      const errorMessage = authService.getErrorMessage(error);
      setGeneralError(errorMessage);
    }
  };

  const handleChangePhoneNumber = () => {
    // Reset to initial state
    setCodeSent(false);
    setMobileNumber("");
    setSmsCode("");
    setPhoneError("");
    setCodeError("");
    setGeneralError("");
    setCountdown(0);
  };

  const isPhoneValid = validatePhoneNumber(mobileNumber);
  const isCodeValid = validateCode(smsCode);
  const nextButtonEnabled = isPhoneValid && !isLoading;
  const signInButtonEnabled = isCodeValid && !isLoading;

  return {
    // State
    mobileNumber,
    smsCode,
    codeSent,
    isLoading,
    agreedToTerms,
    phoneError,
    codeError,
    generalError,
    countdown,
    
    // Computed values
    nextButtonEnabled,
    signInButtonEnabled,
    
    // Actions
    handlePhoneChange,
    handleCodeChange,
    handleNext,
    handleSignIn,
    handleResend,
    handleChangePhoneNumber,
    setAgreedToTerms,
    setGeneralError,
  };
}