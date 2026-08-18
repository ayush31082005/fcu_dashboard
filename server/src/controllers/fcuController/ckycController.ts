import { Request, Response } from 'express';
import { findCaseForCkycSearch, saveCkycSearch } from '../../models/fcuModels/ckycModel';

const pick = (...values: any[]) => values.find(v => v !== undefined && v !== null && v !== '');

export const searchCkyc = async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = Number(req.params.caseId);
    if (!Number.isInteger(applicationId) || applicationId <= 0) { res.status(400).json({status:'error',message:'Invalid application ID'}); return; }
    const customer = await findCaseForCkycSearch(applicationId);
    if (!customer) { res.status(404).json({status:'error',message:'Application not found'}); return; }
    const pan = String(customer.pan_number || '').trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) { res.status(400).json({status:'error',message:'A valid PAN is required for CKYC search'}); return; }

    const apiId=process.env.ckyc_search_api_id;
    const apiKey=process.env.ckyc_search_api_key;
    const tokenId=process.env.ckyc_search_token_id;
    const apiUrl=process.env.ckyc_search_api_url || 'https://javabackend.idspay.in/api/v1/prod/ckyc/search';
    if(!apiId||!apiKey||!tokenId){
      res.status(503).json({
        status:'error',
        message:'CKYC API credentials are not configured.'
      });return;
    }
    const dob = customer.dob ? new Date(customer.dob).toISOString().slice(0,10) : undefined;
    const publicV3Contract = /\/v3\/ckyc\/fetch\/?$/i.test(apiUrl);
    const response=await fetch(apiUrl,{method:'POST',headers:{
      Accept:'application/json','Content-Type':'application/json',
      ...(publicV3Contract ? { Authorization: apiKey.toLowerCase().startsWith('bearer ') ? apiKey : `Bearer ${apiKey}` } : {})
    },body:JSON.stringify(publicV3Contract ? {
      identifier_type:'PAN',id_number:pan,auth_factor:dob,consent:'Y'
    } : {
      api_id:apiId,api_key:apiKey,token_id:tokenId,identifier:pan,identifier_type:'Pan'
    }),signal:AbortSignal.timeout(25000)});
    const raw:any=await response.json().catch(()=>({}));
    const data=raw?.data?.result||raw?.data||raw?.result||{};
    const normalized={
      number:pick(data.ckyc_number,data.CKYC_NO,data.ckyc_no,data.kin),
      status:pick(data.ckyc_status,data.status,raw.status?.type,raw.status),
      registeredOn:pick(data.kyc_date,data.registered_on,data.CKYC_REGISTERED_ON,data.created_at),
      issuer:pick(data.issuer,data.issued_by,'CERSAI'),
      proofType:pick(data.proof_type,data.document_type,data.id_type,'PAN'),
      matchingStatus:pick(data.matching_status,data.match_status,data.name_match),
      requestId:pick(data.request_id,raw.request_id,data.client_ref_num),
      message:pick(data.message,raw.message,raw.status?.message),
    };
    const success=response.ok&&(!raw?.status?.type||String(raw.status.type).toLowerCase()==='success');
    if(!success){
      console.error('FCU CKYC provider rejected request:', {
        providerStatus: response.status,
        message: normalized.message || 'No provider message',
      });
      res.status(502).json({
        status:'error',
        message: response.status === 404
          ? 'Configured CKYC provider endpoint was not found. Check ckyc-search-api-url.'
          : (normalized.message || `CKYC provider returned HTTP ${response.status}`),
        providerStatus: response.status,
        data: normalized,
      });return;
    }
    await saveCkycSearch({applicationId,userId:Number(customer.user_id),panNumber:pan,ckycNumber:normalized.number||null,
      ckycStatus:normalized.status||null,registeredOn:normalized.registeredOn||null,issuer:normalized.issuer||null,
      proofType:normalized.proofType||null,matchingStatus:normalized.matchingStatus==null?null:String(normalized.matchingStatus),
      requestId:normalized.requestId||null,message:normalized.message||null,apiResponse:raw});
    res.json({status:'success',data:normalized});
  }catch(error:any){console.error('FCU CKYC search error:',{code:error?.cause?.code||error?.code,message:error?.cause?.message||error?.message});res.status(502).json({status:'error',message:error?.name==='TimeoutError'?'CKYC provider timed out':'CKYC provider is unreachable'});}
};
