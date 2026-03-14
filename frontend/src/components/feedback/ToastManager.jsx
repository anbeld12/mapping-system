import { useToast } from "../../hooks/use-toast";

// Simple helper to expose toast function to services via callbacks
export const ToastManager = ({ children }) => {
  useToast();
  return children;
};