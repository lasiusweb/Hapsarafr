import React from 'react';

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={`font-medium text-gray-700 ${className}`}
    {...props}
  />
));
Label.displayName = 'Label';

export { Label };
