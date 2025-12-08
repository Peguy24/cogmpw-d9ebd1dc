// Simple state management for payment loading
let loadingState = false;
const listeners = new Set<(loading: boolean) => void>();

export const setPaymentLoading = (loading: boolean) => {
  loadingState = loading;
  listeners.forEach(listener => listener(loading));
};

export const getPaymentLoading = () => loadingState;

export const subscribePaymentLoading = (listener: (loading: boolean) => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
