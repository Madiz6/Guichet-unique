import React, { useState } from 'react';

export function TooltipProvider({ children }) {
  return <>{children}</>;
}

export function Tooltip({ children }) {
  return <>{children}</>;
}

export function TooltipTrigger({ children, asChild, ...props }) {
  const [show, setShow] = useState(false);
  
  const child = React.Children.only(children);
  
  return React.cloneElement(child, {
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    'data-tooltip-trigger': true,
    ...props
  });
}

export function TooltipContent({ children, className = '' }) {
  return (
    <div 
      className={`absolute z-50 px-3 py-2 text-sm bg-gray-900 text-white rounded-md shadow-lg whitespace-normal max-w-xs ${className}`}
      style={{
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: '8px',
        pointerEvents: 'none'
      }}
    >
      {children}
      <div 
        className="absolute w-2 h-2 bg-gray-900 transform rotate-45"
        style={{
          bottom: '-4px',
          left: '50%',
          marginLeft: '-4px'
        }}
      />
    </div>
  );
}

// Simple custom tooltip component
export function SimpleTooltip({ children, content, className = '' }) {
  const [show, setShow] = useState(false);
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div 
          className={`absolute z-50 px-3 py-2 text-sm bg-gray-900 text-white rounded-md shadow-lg whitespace-normal max-w-xs pointer-events-none ${className}`}
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px'
          }}
        >
          {content}
          <div 
            className="absolute w-2 h-2 bg-gray-900 transform rotate-45"
            style={{
              bottom: '-4px',
              left: '50%',
              marginLeft: '-4px'
            }}
          />
        </div>
      )}
    </div>
  );
}