"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCibilReport = exports.fetchUanDetails = exports.fetchPanDetails = void 0;
const axios_1 = __importDefault(require("axios"));
// Creating an axios instance for Bifrost APIs
// Adjust the headers as required when you get the actual API documentation.
const bifrostApi = axios_1.default.create({
    headers: {
        'Content-Type': 'application/json'
    }
});
/**
 * Fetch PAN card enrichment details
 * @param pan The 10-character PAN number
 * @param token The Authorization token
 */
const fetchPanDetails = async (pan, token) => {
    try {
        const payload = {
            PAN_Number: pan,
            Concent: "Y",
            Concent_Text: "We confirm and undertake that valid end-user consent has been obtained for fetching PAN DETAILS using PAN NUMBER, and that such consent remains active and unrevoked at the time of this request."
        };
        const response = await axios_1.default.post('https://bifrost.unifers.ai/enrich/pan/v5', payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Bifrost PAN API Error:', error?.response?.data || error.message);
        throw error;
    }
};
exports.fetchPanDetails = fetchPanDetails;
/**
 * Fetch UAN details
 * @param mobileNumber The Mobile number for UAN
 * @param token The Authorization token
 */
const fetchUanDetails = async (mobileNumber, token) => {
    try {
        const payload = {
            Mobile_Number: mobileNumber,
            Concent: "Y",
            Concent_Text: "We confirm and undertake that valid end-user consent has been obtained for fetching UAN DETAILS using MOBILE NUMBER, and that such consent remains active and unrevoked at the time of this request."
        };
        const response = await axios_1.default.post('https://bifrost.unifers.ai/enrich/get-uan', payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Bifrost UAN API Error:', error?.response?.data || error.message);
        throw error;
    }
};
exports.fetchUanDetails = fetchUanDetails;
/**
 * Fetch CIBIL / Credit Report
 * @param pan The PAN number
 * @param mobile The mobile number
 * @param fullName The Full Name
 * @param token The Authorization token
 */
const fetchCibilReport = async (pan, mobile, fullName, token) => {
    try {
        const payload = {
            Mobile_Number: mobile,
            PAN_Number: pan,
            Full_Name: fullName,
            Callback_Url: "https://www.waqtfinance.com/api/score-callback",
            Concent_Text: "We confirm and undertake that valid end-user consent has been obtained for fetching CIBIL REPORT using MOBILE NUMBER, and that such consent remains active and unrevoked at the time of this request.",
            Concent: "Y"
        };
        const response = await axios_1.default.post('https://bifrost.unifers.ai/enrich/get-cibil-report', payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Bifrost CIBIL API Error:', error?.response?.data || error.message);
        throw error;
    }
};
exports.fetchCibilReport = fetchCibilReport;
