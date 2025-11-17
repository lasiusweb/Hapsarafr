import React from 'react';

// Simplified cva (class-variance-authority) to generate button styles
const getButtonVariants = (
  { variant = 'default', size = 'default' }:
  { variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'; size?: 'default' | 'sm' | 'lg' | 'icon' }
) => {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    default: "bg-green-600 text-white hover:bg-green-700 font-semibold",
    destructive: "bg-red-600 text-white hover:bg-red-700 font-semibold",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-100 text-gray-800",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 font-semibold",
    ghost: "hover:bg-gray-100 hover:text-gray-900",
  };

  const sizes = {
    default: "h-10 py-2 px-6",
    sm: "h-9 px-3 rounded-md",
    lg: "h-11 px-8 rounded-md",
    icon: "h-10 w-10",
  };
  
  return `${base} ${variants[variant || 'default']} ${sizes[size || 'default']}`;
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={`${getButtonVariants({ variant, size })} ${className}`}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };