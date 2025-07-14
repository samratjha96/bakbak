import * as React from 'react';
import { Link } from '@tanstack/react-router';

interface ActionButton {
  label: string;
  icon: React.ReactNode;
  to?: string;
  onClick?: () => void;
  primary?: boolean;
}

interface ActionBarProps {
  primaryAction: ActionButton;
  secondaryAction?: ActionButton;
  className?: string;
  orientation?: 'horizontal' | 'vertical'; // For desktop views
}

export const ActionBar: React.FC<ActionBarProps> = ({ 
  primaryAction, 
  secondaryAction,
  className = '',
  orientation = 'horizontal'
}) => {
  const renderMobileButton = (button: ActionButton, isPrimary = false) => {
    const baseClass = "flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium";
    const buttonClass = isPrimary 
      ? `${baseClass} bg-primary text-white` 
      : `${baseClass} text-gray-700 dark:text-gray-300`;
      
    if (button.to) {
      return (
        <Link to={button.to} className={buttonClass}>
          {button.icon}
          {button.label}
        </Link>
      );
    }
    
    return (
      <button className={buttonClass} onClick={button.onClick}>
        {button.icon}
        {button.label}
      </button>
    );
  };

  const renderDesktopButton = (button: ActionButton, isPrimary = false) => {
    const baseClass = `flex items-center gap-2 transition-colors ${orientation === 'vertical' ? 'w-full' : ''}`;
    const buttonClass = isPrimary 
      ? `${baseClass} py-2 px-4 rounded-lg text-sm font-medium bg-primary hover:bg-secondary text-white` 
      : `${baseClass} py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300`;
    
    if (button.to) {
      return (
        <Link to={button.to} className={buttonClass}>
          {button.icon}
          {button.label}
        </Link>
      );
    }
    
    return (
      <button className={buttonClass} onClick={button.onClick}>
        {button.icon}
        {button.label}
      </button>
    );
  };

  // Desktop version of the action bar
  const DesktopActionBar = () => {
    const containerClass = orientation === 'vertical'
      ? 'flex flex-col gap-2'
      : 'flex gap-4 justify-end';

    return (
      <div className={`hidden lg:flex ${containerClass} ${className}`}>
        {secondaryAction && renderDesktopButton(secondaryAction)}
        {renderDesktopButton(primaryAction, true)}
      </div>
    );
  };
  
  // Mobile version of the action bar (at bottom of screen)
  return (
    <>
      {/* Mobile action bar */}
      <div className="flex lg:hidden">
        {secondaryAction && renderMobileButton(secondaryAction)}
        {renderMobileButton(primaryAction, true)}
      </div>
      
      {/* Desktop action bar */}
      <DesktopActionBar />
    </>
  );
};