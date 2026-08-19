"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupMobileBank = void 0;
const mobileBankModel_1 = require("../../models/fcuModels/mobileBankModel");
const lookupMobileBank = async (req, res) => {
    try {
        const applicationId = Number(req.params.caseId);
        if (!Number.isInteger(applicationId) || applicationId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid application ID' });
            return;
        }
        const application = await (0, mobileBankModel_1.findMobileForBankLookup)(applicationId);
        if (!application) {
            res.status(404).json({ status: 'error', message: 'Application not found' });
            return;
        }
        const mobileNumber = String(application.mobile_number || '').replace(/\D/g, '').slice(-10);
        if (mobileNumber.length !== 10) {
            res.status(400).json({ status: 'error', message: 'A valid 10-digit customer mobile number is required' });
            return;
        }
        const apiId = process.env.mobile_to_bank_api_id;
        const apiKey = process.env.mobile_to_bank_api_key;
        const tokenId = process.env.mobile_to_bank_token_id;
        const apiUrl = process.env.mobile_to_bank_api_url
            || 'https://javabackend.idspay.in/api/v1/prod/srv3/mobile-to-bank/advance';
        const configuredTimeout = Number(process.env.mobile_to_bank_timeout_ms);
        const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 10_000
            ? configuredTimeout : 90_000;
        if (!apiId || !apiKey || !tokenId) {
            res.status(503).json({ status: 'error', message: 'Mobile-to-Bank API credentials are not configured.' });
            return;
        }
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_id: apiId, api_key: apiKey, token_id: tokenId,
                mobile_number: mobileNumber, consent: 'Y',
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });
        const apiResponse = await response.json().catch(() => ({}));
        const providerData = apiResponse?.data || {};
        const bankAccountData = providerData?.bank_account_data || apiResponse?.bank_account_data || {};
        const ifscDetails = providerData?._x?.ifsc || apiResponse?._x?.ifsc || {};
        const completeBankData = { ...bankAccountData, ifsc_details: ifscDetails };
        const normalized = {
            http_response_code: apiResponse?.http_response_code ?? apiResponse?.status?.code ?? response.status,
            request_id: apiResponse?.request_id ?? providerData?.request_id ?? apiResponse?.client_ref_num ?? null,
            result_code: providerData?.code ?? apiResponse?.result_code ?? apiResponse?.status?.code ?? null,
            message: providerData?.message ?? apiResponse?.message ?? apiResponse?.status?.message ?? null,
            mobile_number: mobileNumber,
            bank_account_data: completeBankData,
        };
        const succeeded = response.ok
            && (!apiResponse?.status?.type || String(apiResponse.status.type).toLowerCase() === 'success');
        if (!succeeded) {
            res.status(response.ok ? 502 : response.status).json({
                status: 'error', message: normalized.message || 'Mobile-to-Bank lookup failed', data: normalized,
            });
            return;
        }
        await (0, mobileBankModel_1.saveMobileBankDetails)({
            applicationId, userId: Number(application.user_id), mobileNumber,
            httpResponseCode: Number(normalized.http_response_code) || null,
            requestId: normalized.request_id ? String(normalized.request_id) : null,
            resultCode: normalized.result_code == null ? null : String(normalized.result_code),
            message: normalized.message ? String(normalized.message) : null,
            bankAccountData: completeBankData, apiResponse,
        });
        const verification = await (0, mobileBankModel_1.verifyCustomerBankMatch)(Number(application.user_id), {
            name: bankAccountData.name,
            account_number: bankAccountData.account_number,
            ifsc: bankAccountData.ifsc,
            bank_name: ifscDetails.BANK ?? ifscDetails.bank,
        });
        res.status(200).json({ status: 'success', data: { ...normalized, verification } });
    }
    catch (error) {
        const code = error?.cause?.code || error?.code;
        const message = error?.cause?.message || error?.message || 'Unknown provider error';
        console.error('FCU mobile-to-Bank lookup error:', { code, message });
        const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError'
            || code === 'UND_ERR_CONNECT_TIMEOUT' || code === 23 || code === 'ABORT_ERR';
        res.status(502).json({ status: 'error', message: timedOut
                ? 'Mobile-to-Bank provider timed out. Please try again.'
                : 'Mobile-to-Bank provider is currently unreachable. Please try again.' });
    }
};
exports.lookupMobileBank = lookupMobileBank;
