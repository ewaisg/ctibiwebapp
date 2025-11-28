import hotToast, { Toast } from 'react-hot-toast';

interface ToastProps {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success' | 'error' | 'info' | 'warning' | 'loading';
}

export interface ToastReturn {
    toast: (props: ToastProps) => string;
    success: (title: string, description?: string) => string;
    error: (title: string, description?: string) => string;
    info: (title: string, description?: string) => string;
    warning: (title: string, description?: string) => string;
    loading: (title: string, description?: string) => string;
    promise: <T>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: any) => string);
        }
    ) => Promise<T>;
    dismiss: (toastId?: string) => void;
}

export function toast({ title, description, variant = 'default' }: ToastProps): string {
    const message = description ? `${title}: ${description}` : title;

    switch (variant) {
        case 'destructive':
        case 'error':
            return hotToast.error(message);
        case 'success':
            return hotToast.success(message);
        case 'info':
            return hotToast(message, { icon: 'ℹ️' });
        case 'warning':
            return hotToast(message, { icon: '⚠️' });
        case 'loading':
            return hotToast.loading(message);
        case 'default':
        default:
            return hotToast.success(message);
    }
}

// Helper functions for common toast types
const toastHelpers = {
    success: (title: string, description?: string) =>
        toast({ title, description, variant: 'success' }),

    error: (title: string, description?: string) =>
        toast({ title, description, variant: 'error' }),

    info: (title: string, description?: string) =>
        toast({ title, description, variant: 'info' }),

    warning: (title: string, description?: string) =>
        toast({ title, description, variant: 'warning' }),

    loading: (title: string, description?: string) =>
        toast({ title, description, variant: 'loading' }),

    promise: <T>(
        promise: Promise<T>,
        messages: {
            loading: string;
            success: string | ((data: T) => string);
            error: string | ((error: any) => string);
        }
    ): Promise<T> => {
        return hotToast.promise(promise, messages);
    },

    dismiss: (toastId?: string) => {
        if (toastId) {
            hotToast.dismiss(toastId);
        } else {
            hotToast.dismiss();
        }
    },
};

// Hook-style export for compatibility with admin components
export function useToast(): ToastReturn {
    return {
        toast,
        ...toastHelpers
    };
}