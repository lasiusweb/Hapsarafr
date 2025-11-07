import React, { useState, useEffect, useRef, useMemo } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: Option[];
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ options, value, onChange, placeholder = 'Select an option', disabled = false, className = '', error = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => options.find(option => option.value === value), [options, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option => option.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [options, searchTerm]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const baseButtonClasses = "w-full p-2.5 bg-white border rounded-lg text-sm focus:ring-2 transition text-left flex justify-between items-center";
  const errorClasses = "border-red-500 focus:ring-red-500 focus:border-red-500";
  const normalClasses = "border-gray-300 focus:ring-green-500 focus:border-green-500";
  const disabledClasses = "bg-gray-100 cursor-not-allowed text-gray-500";

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`${baseButtonClasses} ${error ? errorClasses : normalClasses} ${disabled ? disabledClasses : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption?.label || placeholder}
        </span>
        <svg className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 flex flex-col">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-green-500 focus:outline-none"
              autoFocus
            />
          </div>
          <ul role="listbox" className="overflow-y-auto">
            {filteredOptions.length > 0 ? filteredOptions.map(option => (
              <li
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`p-2 text-sm cursor-pointer hover:bg-green-50 ${value === option.value ? 'bg-green-100 font-semibold text-green-800' : 'text-gray-900'}`}
                role="option"
                aria-selected={value === option.value}
              >
                {option.label}
              </li>
            )) : (
                <li className="p-2 text-sm text-gray-500 text-center">No options found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
