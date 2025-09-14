import hotToast from 'react-hot-toast';

interface ToastProps {
    title: string;
    description?: string;
    variant?: 'default' | 'destructive';
}

export function toast({ title, description, variant = 'default' }: ToastProps) {
    const message = description ? `${title}: ${description}` : title;

    if (variant === 'destructive') {
        hotToast.error(message);
    } else {
        hotToast.success(message);
    }
}

// Hook-style export for compatibility with admin components
export function useToast() {
    return { toast };
}