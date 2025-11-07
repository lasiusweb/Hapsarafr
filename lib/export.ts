import { Farmer } from '../types';
import { getGeoName } from './utils';

// For CDN xlsx library
declare const XLSX: any;

// Function to convert an array of Farmer objects to a format suitable for export
const prepareDataForExport = (farmers: Farmer[]) => {
    return farmers.map(f => ({
        'Hap ID': f.farmerId,
        'Application ID': f.applicationId,
        'Full Name': f.fullName,
        'Father/Husband Name': f.fatherHusbandName,
        'Aadhaar Number': `'${f.aadhaarNumber}`, // Prepend with ' to treat as text in Excel
        'Mobile Number': f.mobileNumber,
        'Gender': f.gender,
        'Address': f.address,
        'District': getGeoName('district', { district: f.district }),
        'Mandal': getGeoName('mandal', { district: f.district, mandal: f.mandal }),
        'Village': getGeoName('village', { district: f.district, mandal: f.mandal, village: f.village }),
        'Registration Date': new Date(f.registrationDate).toLocaleDateString(),
        'Status': f.status,
        'Applied Extent (Acres)': f.appliedExtent,
        'Approved Extent (Acres)': f.approvedExtent,
        'Number of Plants': f.numberOfPlants,
        'Plantation Date': f.plantationDate ? new Date(f.plantationDate).toLocaleDateString() : 'N/A',
        'Bank Account Number': `'${f.bankAccountNumber}`, // Prepend with ' to treat as text in Excel
        'IFSC Code': f.ifscCode,
        'Account Verified': f.accountVerified ? 'Yes' : 'No',
        'Latitude': f.latitude,
        'Longitude': f.longitude,
        'Sync Status': f.syncStatus,
        'Created At': new Date(f.createdAt).toLocaleString(),
        'Updated At': new Date(f.updatedAt).toLocaleString(),
    }));
};

// Function to export data to an Excel file
export const exportToExcel = (farmers: Farmer[], fileName: string = 'Hapsara_Farmers_Export') => {
    if (farmers.length === 0) {
        alert("No data to export.");
        return;
    }
    const dataToExport = prepareDataForExport(farmers);
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Farmers');
    
    // Auto-size columns for better readability
    const colWidths = Object.keys(dataToExport[0]).map(key => ({
        wch: Math.max(key.length, ...dataToExport.map(row => String(row[key as keyof typeof row] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;
    
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

// Function to export data to a CSV file
export const exportToCsv = (farmers: Farmer[], fileName: string = 'Hapsara_Farmers_Export') => {
     if (farmers.length === 0) {
        alert("No data to export.");
        return;
    }
    const dataToExport = prepareDataForExport(farmers);
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const csvString = XLSX.utils.sheet_to_csv(worksheet);

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${fileName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};