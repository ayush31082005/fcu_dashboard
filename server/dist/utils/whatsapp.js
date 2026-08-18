"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppDocumentRequest = exports.sendWhatsAppRejection = exports.sendWhatsAppOTP = void 0;
const axios_1 = __importDefault(require("axios"));
const normalizeIndianMobile = (mobile) => String(mobile || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '').slice(-10);
const normalizeTemplateId = (value) => {
    const raw = String(value || '').trim();
    if (!raw)
        return '';
    if (/^\d+$/.test(raw))
        return raw;
    try {
        const wid = new URL(raw).searchParams.get('wid') || '';
        if (/^\d+$/.test(wid))
            return wid;
    }
    catch { /* Invalid URLs are rejected below. */ }
    return '';
};
const sendWhatsAppOTP = async (mobile, otp, name) => {
    try {
        const authKey = process.env.WA_AUTHKEY;
        const wid = process.env.WA_TEMPLATE_ID;
        const countryCode = process.env.WA_COUNTRY_CODE || '91';
        if (!authKey || !wid) {
            throw new Error('WhatsApp API configuration missing (WA_AUTHKEY or WA_TEMPLATE_ID)');
        }
        // Using the POST request method as defined in the documentation
        // Building the exact GET URL as requested by the provided snippet
        const url = `https://console.messageinbox.io/restapi/request.php?authkey=${authKey}&mobile=${mobile}&country_code=${countryCode}&wid=${wid}&var1=${otp}`;
        const response = await axios_1.default.get(url);
        console.log('WhatsApp API Response:', response.data);
        return response.data;
    }
    catch (error) {
        console.error('Error sending WhatsApp OTP:', error?.message || error);
        throw error;
    }
};
exports.sendWhatsAppOTP = sendWhatsAppOTP;
const sendWhatsAppRejection = async (mobile, applicantName) => {
    const authKey = process.env.WA_AUTHKEY;
    const templateId = normalizeTemplateId(process.env.WA_REJECTION_TEMPLATE_ID);
    const countryCode = process.env.WA_COUNTRY_CODE || '91';
    const recipient = normalizeIndianMobile(mobile);
    if (!authKey || !templateId)
        throw new Error('WhatsApp rejection configuration missing (WA_AUTHKEY or WA_REJECTION_TEMPLATE_ID)');
    if (!/^\d{10}$/.test(recipient))
        throw new Error('Applicant WhatsApp mobile number is invalid');
    console.log('WhatsApp rejection message:', {
        mobile: `${countryCode}${recipient}`,
        templateId,
        templateVariables: {
            var1: applicantName,
        },
    });
    const response = await axios_1.default.get('https://console.messageinbox.io/restapi/request.php', {
        params: { authkey: authKey, mobile: recipient, country_code: countryCode, wid: templateId, 1: applicantName },
        timeout: 15000,
    });
    console.log('WhatsApp rejection submission response:', response.data);
    return response.data;
};
exports.sendWhatsAppRejection = sendWhatsAppRejection;
const sendWhatsAppDocumentRequest = async (mobile, applicationId, applicantName, uploadLink) => {
    const authKey = process.env.WA_AUTHKEY;
    const templateId = normalizeTemplateId(process.env.WA_DOCUMENT_REQUEST_TEMPLATE_ID || '45020');
    const countryCode = process.env.WA_COUNTRY_CODE || '91';
    const recipient = normalizeIndianMobile(mobile);
    if (!authKey || !templateId)
        throw new Error('Document request WhatsApp template is not configured');
    if (!/^\d{10}$/.test(recipient))
        throw new Error('Applicant WhatsApp mobile number is invalid');
    const parsedLink = new URL(uploadLink);
    if (!['http:', 'https:'].includes(parsedLink.protocol) || !parsedLink.pathname.startsWith('/customer-upload/'))
        throw new Error('Invalid customer upload link');
    console.log('WhatsApp document request:', {
        mobile: `${countryCode}${recipient}`,
        templateId,
        templateVariables: { 1: applicantName, 2: applicationId, 3: uploadLink },
    });
    const response = await axios_1.default.get('https://console.messageinbox.io/restapi/request.php', {
        params: { authkey: authKey, mobile: recipient, country_code: countryCode, wid: templateId, 1: applicantName, 2: applicationId, 3: uploadLink },
        timeout: 15000,
    });
    console.log('WhatsApp document request submission response:', response.data);
    return response.data;
};
exports.sendWhatsAppDocumentRequest = sendWhatsAppDocumentRequest;
