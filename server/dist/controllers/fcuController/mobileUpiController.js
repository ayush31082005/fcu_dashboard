"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupMobileUpi = void 0;
const crypto_1 = require("crypto");
const mobileUpiModel_1 = require("../../models/fcuModels/mobileUpiModel");
const lookupMobileUpi = async (req, res) => {
    try {
        const applicationId = Number(req.params.caseId);
        if (!Number.isInteger(applicationId) || applicationId <= 0) {
            res.status(400).json({ status: 'error', message: 'Invalid application ID' });
            return;
        }
        const application = await (0, mobileUpiModel_1.findMobileForUpiLookup)(applicationId);
        if (!application) {
            res.status(404).json({ status: 'error', message: 'Application not found' });
            return;
        }
        const mobileNumber = String(application.mobile_number || '').replace(/\D/g, '').slice(-10);
        if (mobileNumber.length !== 10) {
            res.status(400).json({ status: 'error', message: 'A valid 10-digit customer mobile number is required' });
            return;
        }
        const apiId = process.env.mobile_to_upi_api_id;
        const apiKey = process.env.mobile_to_upi_api_key;
        const token = process.env.mobile_to_upi_token_id;
        const apiUrl = process.env.mobile_to_upi_api_url
            || 'https://javabackend.idspay.in/api/v1/prod/srv2/mobile-upi-lookup/enhanced';
        if (!apiId || !apiKey || !token) {
            res.status(503).json({
                status: 'error',
                message: 'Mobile-to-UPI API credentials are not configured.',
            });
            return;
        }
        const clientRefNum = `fcu-${applicationId}-${(0, crypto_1.randomUUID)().slice(0, 8)}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                api_id: apiId,
                api_key: apiKey,
                token_id: token,
                mobile_number: mobileNumber,
            }),
            signal: AbortSignal.timeout(20_000),
        });
        const apiResponse = await response.json().catch(() => ({}));
        const providerData = apiResponse?.data || {};
        const result = providerData?.result || apiResponse?.result || providerData;
        const normalized = {
            http_response_code: providerData?.http_response_code ?? apiResponse?.http_response_code ?? apiResponse?.status?.code ?? apiResponse?.code ?? response.status,
            client_ref_num: providerData?.client_ref_num ?? apiResponse?.client_ref_num ?? clientRefNum,
            request_id: providerData?.request_id ?? apiResponse?.request_id ?? providerData?.transaction_id ?? apiResponse?.transaction_id ?? clientRefNum,
            result_code: providerData?.result_code ?? apiResponse?.result_code ?? apiResponse?.status?.code ?? null,
            result: {
                mobile_linked_name: result.mobile_linked_name ?? result.name_at_bank ?? result.upi_name ?? result.name ?? null,
                vpa: result.vpa ?? null,
            },
            message: providerData?.message ?? apiResponse?.message ?? apiResponse?.status?.message ?? null,
        };
        const providerSucceeded = response.ok
            && (!apiResponse?.status?.type || String(apiResponse.status.type).toLowerCase() === 'success');
        if (!providerSucceeded) {
            const providerStatus = response.ok ? 502 : response.status;
            res.status(providerStatus).json({
                status: 'error',
                message: apiResponse?.status?.message || apiResponse?.message || 'Mobile-to-UPI lookup failed',
                data: normalized,
            });
            return;
        }
        await (0, mobileUpiModel_1.saveMobileUpiDetails)({
            applicationId, userId: Number(application.user_id), mobileNumber,
            httpResponseCode: Number(normalized.http_response_code) || null,
            clientRefNum: normalized.client_ref_num, requestId: normalized.request_id,
            resultCode: normalized.result_code === null ? null : Number(normalized.result_code),
            mobileLinkedName: normalized.result.mobile_linked_name, vpa: normalized.result.vpa,
            apiResponse,
        });
        res.status(200).json({ status: 'success', data: normalized });
    }
    catch (error) {
        const causeCode = error?.cause?.code || error?.code;
        const causeMessage = error?.cause?.message || error?.message || 'Unknown provider error';
        console.error('FCU mobile-to-UPI lookup error:', { code: causeCode, message: causeMessage });
        const timedOut = error?.name === 'TimeoutError' || causeCode === 'UND_ERR_CONNECT_TIMEOUT';
        res.status(502).json({
            status: 'error',
            message: timedOut
                ? 'Mobile-to-UPI provider timed out. Please try again.'
                : 'Mobile-to-UPI provider is currently unreachable. Please try again.',
        });
    }
};
exports.lookupMobileUpi = lookupMobileUpi;
