import React from 'react';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

interface ToastNotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

export const showToast = ({ type, title, message, duration = 5000 }: ToastNotificationProps) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  toast({
    duration,
    className: `${getStyles()} border-2 rounded-lg shadow-lg`,
    description: (
      <div className="flex items-start gap-3 p-2">
        {getIcon()}
        <div className="flex-1">
          {title && (
            <h3 className="font-medium text-sm mb-1 text-gray-800">{title}</h3>
          )}
          <p className="text-sm text-gray-700">{message}</p>
        </div>
      </div>
    ),
  });
};

// Helper functions for common toast types
export const showSuccessToast = (message: string, title?: string) => {
  showToast({ type: 'success', title, message });
};

export const showErrorToast = (message: string, title?: string) => {
  showToast({ type: 'error', title, message });
};

export const showWarningToast = (message: string, title?: string) => {
  showToast({ type: 'warning', title, message });
};

export const showInfoToast = (message: string, title?: string) => {
  showToast({ type: 'info', title, message });
};