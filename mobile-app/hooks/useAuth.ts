import { useState, useEffect } from "react";

export default function useAuth() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [countdown, setCountdown] = useState(0);

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

    setIsLoading(true);
    setGeneralError("");

    // Simulate SMS sending (replace with actual implementation)
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // For testing: randomly succeed or fail SMS sending
      const shouldFail = Math.random() > 0.8; // 20% chance to fail

      if (shouldFail) {
        setGeneralError(
          "Verification code sending failed. Please check your phone number and try again."
        );
        setIsLoading(false);
        return;
      }

      setCodeSent(true);
      setCountdown(59);
      setIsLoading(false);
    } catch {
      setGeneralError(
        "Verification code sending failed. Please check your phone number and try again."
      );
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    if (!validateCode(smsCode)) {
      setCodeError("Enter the correct OTP");
      return;
    }

    setIsLoading(true);
    setGeneralError("");

    // For testing: always show invalid code error
    setTimeout(() => {
      setGeneralError("Invalid verification code. Please try again.");
      setIsLoading(false);
    }, 1000);
  };

  const handleResend = () => {
    setCountdown(59);
    setGeneralError("");
    // TODO: Implement resend logic
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