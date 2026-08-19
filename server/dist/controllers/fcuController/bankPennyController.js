"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBankPenny = void 0;
const bankPennyModel_1 = require("../../models/fcuModels/bankPennyModel");
const firstValue = (...values) => values.find(value => value !== undefined && value !== null && value !== '');
const findProviderValue = (value, keys) => {
    if (!value || typeof value !== 'object')
        return undefined;
    const wanted = new Set(keys.map(key => key.toLowerCase().replace(/[^a-z0-9]/g, '')));
    for (const [key, nestedValue] of Object.entries(value)) {
        if (wanted.has(key.toLowerCase().replace(/[^a-z0-9]/g, '')) && nestedValue !== null && nestedValue !== '') {
            return nestedValue;
        }
    }
    for (const nestedValue of Object.values(value)) {
        const found = findProviderValue(nestedValue, keys);
        if (found !== undefined)
            return found;
    }
    return undefined;
};
const verifyBankPenny = async (req, res) => {
    try {
        const applicationId = Number(req.params.caseId);
        if (!Number.isInteger(applicationId) || applicationId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid application ID' });
            return;
        }
        const bank = await (0, bankPennyModel_1.findBankForPennyVerification)(applicationId);
        if (!bank) {
            res.status(404).json({ status: 'error', message: 'Application not found' });
            return;
        }
        const accountNumber = String(bank.account_number || '').replace(/\s/g, '');
        const ifscCode = String(bank.ifsc_code || '').trim().toUpperCase();
        if (!accountNumber || !/^[A-Z]{4}[A-Z0-9]{7}$/.test(ifscCode)) {
            res.status(400).json({ status: 'error', message: 'Valid bank account number and IFSC code are required' });
            return;
        }
        const apiId = process.env.bank_verification_penny_api_id;
        const apiKey = process.env.bank_verification_penny_api_key;
        const tokenId = process.env.bank_verification_penny_token_id;
        const apiUrl = process.env.bank_verification_penny_api_url
            || 'https://javabackend.idspay.in/api/v1/prod/idfc/beneficiary';
        const configuredTimeout = Number(process.env.bank_verification_penny_timeout_ms);
        const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout >= 10_000
            ? configuredTimeout : 60_000;
        if (!apiId || !apiKey || !tokenId) {
            res.status(503).json({ status: 'error', message: 'Bank Penny API credentials are not configured' });
            return;
        }
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_id: apiId, api_key: apiKey, token_id: tokenId,
                creditorAccountId: accountNumber,
                ifscCode,
            }),
            signal: AbortSignal.timeout(timeoutMs),
        });
        const apiResponse = await response.json().catch(() => ({}));
        const providerData = apiResponse?.data || {};
        const result = providerData?.beneValidationResp?.metaData
            || providerData?.beneValidationResp
            || providerData?.result || apiResponse?.result || providerData;
        const normalized = {
            http_response_code: Number(firstValue(providerData.http_response_code, apiResponse.http_response_code, apiResponse?.status?.code, apiResponse.code, response.status)) || response.status,
            request_id: firstValue(providerData.request_id, apiResponse.request_id, providerData.transaction_id, apiResponse.transaction_id, providerData.client_ref_num),
            result_code: firstValue(providerData.result_code, apiResponse.result_code, apiResponse?.status?.code),
            result: {
                account_exists: firstValue(result.account_exists, result.bankTxnStatus, result.account_status, result.status),
                name_at_bank: firstValue(result.name_at_bank, result.account_holder_name, result.accountName, result.beneficiary_name, result.beneficiaryName),
                utr: firstValue(result.utr, result.utr_number, result.bank_reference_number, result.transaction_id, result.requestId, result.referenceId),
                amount_deposited: firstValue(result.amount_deposited, result.amount, result.penny_amount),
                account_number: firstValue(result.account_number, result.accountNumber, accountNumber),
                // Display only the IFSC returned by the provider. Never substitute the
                // IFSC sent from our database when it is absent from the response.
                ifsc_code: findProviderValue(apiResponse, ['ifsc_code', 'ifscCode', 'ifsc']),
            },
            message: firstValue(providerData.message, result.message, apiResponse.message, apiResponse?.status?.message),
            provider_data: providerData,
        };
        const providerSucceeded = response.ok && (!apiResponse?.status?.type || String(apiResponse.status.type).toLowerCase() === 'success');
        if (!providerSucceeded) {
            res.status(response.ok ? 502 : response.status).json({ status: 'error', message: normalized.message || 'Bank verification failed', data: normalized });
            return;
        }
        const accountExists = normalized.result.account_exists === undefined
            ? null : ['true', '1', 'yes', 'verified', 'success'].includes(String(normalized.result.account_exists).toLowerCase());
        await (0, bankPennyModel_1.saveBankPennyVerification)({
            applicationId, userId: Number(bank.user_id), accountNumber,
            ifscCode: String(normalized.result.ifsc_code || 'N/A'),
            httpResponseCode: normalized.http_response_code, requestId: normalized.request_id || null,
            resultCode: normalized.result_code == null ? null : Number(normalized.result_code), accountExists,
            nameAtBank: normalized.result.name_at_bank || null, utr: normalized.result.utr || null,
            amountDeposited: normalized.result.amount_deposited == null ? null : Number(normalized.result.amount_deposited),
            message: normalized.message || null, apiResponse,
        });
        res.status(200).json({ status: 'success', data: normalized });
    }
    catch (error) {
        const code = error?.cause?.code || error?.code;
        console.error('FCU bank penny verification error:', { code, message: error?.cause?.message || error?.message });
        const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError'
            || code === 'UND_ERR_CONNECT_TIMEOUT' || code === 23 || code === 'ABORT_ERR';
        res.status(502).json({ status: 'error', message: timedOut ? 'Bank verification provider timed out. Please try again.' : 'Bank verification provider is unreachable' });
    }
};
exports.verifyBankPenny = verifyBankPenny;
