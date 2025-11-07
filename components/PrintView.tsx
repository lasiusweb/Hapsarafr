import React, { useEffect, useRef } from 'react';
import { Farmer, User, Plot } from '../types';

declare var JsBarcode: any;
declare var QRCode: any;

interface PrintViewProps {
  farmer: Farmer | null;
  plots: Plot[];
  users: User[];
  isForPdf?: boolean;
}

const PrintView: React.FC<PrintViewProps> = ({ farmer, plots, users, isForPdf = false }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrCodeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (farmer) {
      if (barcodeRef.current) {
        try {
          JsBarcode(barcodeRef.current, farmer.farmerId, {
            format: 'CODE128',
            displayValue: true,
            fontSize: 20,
            height: 70,
          });
        } catch (e) {
          console.error('Barcode generation failed', e);
        }
      }
      if (qrCodeRef.current) {
        try {
          QRCode.toCanvas(qrCodeRef.current, farmer.farmerId, { width: 128 }, (error: any) => {
            if (error) console.error('QR Code generation failed:', error);
          });
        } catch (e) {
          console.error('QR Code generation failed', e);
        }
      }
    }
  }, [farmer]);

  if (!farmer) return null;
  
  const registeredByName = users.find(u => u.id === farmer.createdBy)?.name || 'System';

  const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <tr className="border-b border-gray-300">
      <td className="py-2 pr-4 font-semibold text-gray-700 w-1/3">{label}</td>
      <td className="py-2 text-gray-900">{value}</td>
    </tr>
  );

  const containerClasses = isForPdf 
    ? 'p-4 bg-white text-black font-sans' 
    : 'print-only hidden p-4 bg-white text-black font-sans';

  return (
    <div className={containerClasses}>
      <header className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold">Hapsara Farmer Registration</h1>
        <h2 className="text-xl">Application Form</h2>
      </header>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-3">
          <h3 className="text-xl font-bold mb-3 border-b border-gray-400 pb-1">Farmer Details</h3>
          <table className="w-full text-left">
            <tbody>
              <DetailRow label="Application ID" value={farmer.applicationId} />
              <DetailRow label="Hap ID" value={farmer.farmerId} />
              <DetailRow label="Full Name" value={farmer.fullName} />
              <DetailRow label="Father/Husband Name" value={farmer.fatherHusbandName} />
              <DetailRow label="Gender" value={farmer.gender} />
              <DetailRow label="Mobile Number" value={farmer.mobileNumber} />
              <DetailRow label="Aadhaar Number" value={`**** **** ${farmer.aadhaarNumber.slice(-4)}`} />
              <DetailRow label="Address" value={farmer.address} />
              <DetailRow label="PPB/ROFR ID" value={farmer.ppbRofrId} />
              <DetailRow label="Registration Date" value={new Date(farmer.registrationDate).toLocaleDateString()} />
              <DetailRow label="Registered By" value={registeredByName} />
              <DetailRow label="Proposed Year" value={farmer.proposedYear} />
            </tbody>
          </table>
        </div>
        <div className="col-span-1 flex flex-col items-center">
            {farmer.photo ? (
                <img src={farmer.photo} alt="Farmer" className="w-32 h-40 object-cover border-2 border-gray-400 mb-4" />
            ) : (
                <div className="w-32 h-40 border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500 mb-4">No Photo</div>
            )}
            <div className="mt-4 text-center">
                 <p className="text-sm font-semibold tracking-wider text-gray-700 mb-1">HAP ID</p>
                 <svg ref={barcodeRef}></svg>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm font-semibold tracking-wider text-gray-700 mb-1">SCAN QR CODE</p>
              <canvas ref={qrCodeRef}></canvas>
            </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-xl font-bold mb-3 border-b border-gray-400 pb-1">Bank Details</h3>
        <table className="w-full text-left max-w-md">
          <tbody>
            <DetailRow label="Bank Account No." value={`...${farmer.bankAccountNumber.slice(-4)}`} />
            <DetailRow label="IFSC Code" value={farmer.ifscCode} />
            <DetailRow label="Account Verified" value={farmer.accountVerified ? 'Yes' : 'No'} />
          </tbody>
        </table>
      </div>

      <div className="mt-6">
          <h3 className="text-xl font-bold mb-3 border-b border-gray-400 pb-1">Plot & Plantation Details</h3>
          {plots.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-3 border border-gray-300">Acreage</th>
                  <th className="py-2 px-3 border border-gray-300">Soil Type</th>
                  <th className="py-2 px-3 border border-gray-300">No. of Plants</th>
                  <th className="py-2 px-3 border border-gray-300">Plantation Method</th>
                  <th className="py-2 px-3 border border-gray-300">Plantation Date</th>
                </tr>
              </thead>
              <tbody>
                {plots.map((plot) => (
                  <tr key={plot.id} className="border-b">
                    <td className="py-2 px-3 border border-gray-300">{plot.acreage}</td>
                    <td className="py-2 px-3 border border-gray-300">{plot.soilType || 'N/A'}</td>
                    <td className="py-2 px-3 border border-gray-300">{plot.numberOfPlants}</td>
                    <td className="py-2 px-3 border border-gray-300">{plot.methodOfPlantation}</td>
                    <td className="py-2 px-3 border border-gray-300">{plot.plantationDate ? new Date(plot.plantationDate).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-600">No plots have been registered for this farmer.</p>
          )}
      </div>

       <footer className="mt-12 text-sm text-gray-600">
        <div className="flex justify-between pt-16">
            <div className="text-center">
                <p>_________________________</p>
                <p>Farmer's Signature</p>
            </div>
            <div className="text-center">
                <p>_________________________</p>
                <p>Verifying Officer's Signature</p>
            </div>
        </div>
      </footer>
    </div>
  );
};

export default PrintView;