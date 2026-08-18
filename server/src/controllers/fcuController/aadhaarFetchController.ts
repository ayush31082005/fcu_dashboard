import { Request, Response } from 'express';
import { findCaseForAadhaarFetch, saveAadhaarFetch, saveAadhaarRelation } from '../../models/fcuModels/aadhaarFetchModel';

const pick = (...values: any[]) => values.find(v => v !== undefined && v !== null && v !== '');

export const fetchAadhaarDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = Number(req.params.caseId);
    const aadhaar = String(req.body?.aadhaar || '').replace(/\D/g, '');
    if (!Number.isInteger(applicationId) || applicationId <= 0) { res.status(400).json({ status:'error', message:'Invalid application ID' }); return; }
    if (!/^\d{8,16}$/.test(aadhaar)) { res.status(400).json({ status:'error', message:'Enter a valid Aadhaar number' }); return; }
    const customer = await findCaseForAadhaarFetch(applicationId);
    if (!customer) { res.status(404).json({ status:'error', message:'Application not found' }); return; }

    const apiId = process.env['adhar-verification-api-id'];
    const apiKey = process.env['adhar-verification-api-key'];
    const tokenId = process.env['adhar-verification-token-id'];
    const apiUrl = process.env['adhar-verification-api-url'] || 'https://javabackend.idspay.in/api/v1/prod/srv3/verification/aadhar';
    if (!apiId || !apiKey || !tokenId) { res.status(503).json({ status:'error', message:'Aadhaar API credentials are not configured' }); return; }

    const response = await fetch(apiUrl, { method:'POST', headers:{ Accept:'application/json','Content-Type':'application/json' },
      body:JSON.stringify({ api_id:apiId, api_key:apiKey, token_id:tokenId, aadhaar }), signal:AbortSignal.timeout(30000) });
    const raw:any = await response.json().catch(() => ({}));
    const data:any = raw?.data?.result || raw?.data || raw?.result || {};
    const addressObj:any = data.address || data.address_details || {};
    const addressText = typeof data.address === 'string' ? data.address : pick(data.full_address,addressObj.full_address,addressObj.address);
    const normalized = {
      httpResponseCode: pick(raw?.status?.code,response.status), statusType: pick(raw?.status?.type),
      aadhaarNumber: pick(data.aadhaar,data.aadhaar_number,data.aadhar_number,aadhaar),
      pan: pick(data.pan,data.pan_number),
      fullName: pick(data.fullname,data.full_name,data.name,data.name_on_aadhaar),
      firstName: pick(data.first_name,data.firstname), middleName: pick(data.middle_name,data.middlename), lastName: pick(data.last_name,data.lastname),
      dob: pick(data.dob,data.date_of_birth), gender: pick(data.gender), linkedMobile: pick(data.mobile,data.mobile_number,data.linked_mobile),
      status: pick(data.status,data.verification_status,raw?.status?.type,'Verified'),
      address: addressText, addressLine2: pick(data.address_line_2,addressObj.address_line_2,addressObj.landmark),
      city: pick(data.city,addressObj.city,addressObj.district), state: pick(data.state,addressObj.state),
      pincode: pick(data.pincode,data.pin_code,addressObj.pincode,addressObj.pin_code), country: pick(data.country,addressObj.country,'India'),
      photo: pick(data.photo,data.profile_image,data.photo_base64), requestId: pick(raw?.request_id,data.request_id,raw?.client_ref_num),
      providerMessage: pick(raw?.message,raw?.status?.message,data.message), rawData: data,
    };
    const success = response.ok && (!raw?.status?.type || String(raw.status.type).toLowerCase() === 'success');
    if (!success) { res.status(502).json({ status:'error', message:normalized.providerMessage || `Aadhaar provider returned HTTP ${response.status}` }); return; }
    await saveAadhaarFetch({ applicationId,userId:Number(customer.user_id),aadhaarNumber:String(normalized.aadhaarNumber),
      panNumber:normalized.pan || null,fullName:normalized.fullName || null,firstName:normalized.firstName || null,
      middleName:normalized.middleName ?? null,lastName:normalized.lastName || null,dob:normalized.dob || null,
      gender:normalized.gender || null,address:normalized.address || null,
      addressLine2:normalized.addressLine2 || null,city:normalized.city || null,state:normalized.state || null,pincode:normalized.pincode || null,
      country:normalized.country || null,linkedMobile:normalized.linkedMobile || null,status:String(normalized.status || 'Verified'),
      requestId:normalized.requestId || null,photo:normalized.photo || null,apiResponse:raw });
    res.json({ status:'success', data:normalized });
  } catch (error:any) {
    console.error('FCU Aadhaar fetch error:', { code:error?.cause?.code || error?.code, message:error?.cause?.message || error?.message });
    res.status(502).json({ status:'error', message:error?.name === 'TimeoutError' ? 'Aadhaar provider timed out' : 'Aadhaar provider is unreachable' });
  }
};

const allowedRelations = new Set(['SELF','FATHER','MOTHER','SPOUSE','SON','DAUGHTER','BROTHER','SISTER','GUARDIAN','OTHER']);

export const updateAadhaarRelation = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = Number(req.params.caseId);
    const relation = String(req.body?.relation || '').trim().toUpperCase();
    if (!Number.isInteger(applicationId) || applicationId <= 0) { res.status(400).json({ status:'error', message:'Invalid application ID' }); return; }
    if (!allowedRelations.has(relation)) { res.status(400).json({ status:'error', message:'Select a valid relation' }); return; }
    const saved = await saveAadhaarRelation(applicationId, relation);
    if (!saved) { res.status(409).json({ status:'error', message:'Fetch Aadhaar details before saving relation' }); return; }
    res.json({ status:'success', message:'Relation saved successfully', data:{ relation } });
  } catch (error:any) {
    console.error('FCU Aadhaar relation error:', error?.message);
    res.status(500).json({ status:'error', message:'Unable to save Aadhaar relation' });
  }
};
