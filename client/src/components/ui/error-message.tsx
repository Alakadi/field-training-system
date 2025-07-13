import React from 'react';
import { AlertTriangle, XCircle, AlertCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  type?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  className?: string;
  onClose?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  type = 'error',
  title,
  message,
  className,
  onClose
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <AlertCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      case 'success':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Alert className={cn(getStyles(), className)} variant={getVariant()}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          {title && (
            <h3 className="font-medium text-sm mb-1">{title}</h3>
          )}
          <AlertDescription className="text-sm">
            {message}
          </AlertDescription>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </Alert>
  );
};

export default ErrorMessage;