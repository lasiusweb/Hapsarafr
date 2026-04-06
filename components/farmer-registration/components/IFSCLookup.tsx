import React from 'react';

interface IFSCLookupProps {
  ifscCode: string;
  onChange: (code: string) => void;
  onBankFound?: (bankName: string, branch: string) => void;
  error?: string;
}

import ifscData from '../../../data/ifscCodes.json';

export function IFSCLookup({ ifscCode, onChange, onBankFound, error }: IFSCLookupProps) {
  const [bankInfo, setBankInfo] = React.useState<{ bank: string; branch: string } | null>(null);

  React.useEffect(() => {
    if (ifscCode.length === 11) {
      const info = (ifscData as Record<string, { bank: string; branch: string }>)[ifscCode.toUpperCase()];
      if (info) {
        setBankInfo(info);
        onBankFound?.(info.bank, info.branch);
      } else {
        setBankInfo(null);
      }
    } else {
      setBankInfo(null);
    }
  }, [ifscCode, onBankFound]);

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          IFSC Code <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={ifscCode}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="e.g., SBIN0001234"
          maxLength={11}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      {bankInfo && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            <strong>Bank:</strong> {bankInfo.bank} | <strong>Branch:</strong> {bankInfo.branch}
          </p>
        </div>
      )}
    </div>
  );
}