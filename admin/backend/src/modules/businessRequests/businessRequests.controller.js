import { z } from 'zod';
import BusinessRequest from '../../models/BusinessRequest.js';
import { requestsService } from './businessRequests.service.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { pageSpec, setPageHeaders, regex } from '../../utils/query.js';

const submission = z.object({ firstName:z.string().trim().min(1).max(100),lastName:z.string().max(100).optional(),ownerEmail:z.string().email().max(255),ownerPhone:z.string().max(50).optional(),organizationName:z.string().trim().min(1).max(255),organizationEmail:z.string().email().max(255),organizationPhone:z.string().max(50).optional(),organizationAddress:z.string().max(255).optional() });
const id = z.string().regex(/^[a-f\d]{24}$/i);
function filters(query) {
  const result={};
  if(query.status){if(!['PENDING','APPROVED','REJECTED'].includes(query.status))throw Object.assign(new Error('Invalid status'),{status:400});result.status=query.status;}
  if(query.search){if(query.search.length>200)throw Object.assign(new Error('Search must be at most 200 characters'),{status:400});const q=regex(query.search);result.$or=['firstName','lastName','ownerEmail','organizationName','organizationEmail'].map(k=>({[k]:q}));}
  if(Boolean(query.fromDate)!==Boolean(query.toDate))throw Object.assign(new Error('fromDate and toDate must be provided together'),{status:400});
  if(query.fromDate){if(!/^\d{4}-\d{2}-\d{2}$/.test(query.fromDate)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(query.toDate))throw Object.assign(new Error('Dates must use YYYY-MM-DD'),{status:400});const from=new Date(`${query.fromDate}T00:00:00.000Z`),to=new Date(`${query.toDate}T23:59:59.999Z`);if(Number.isNaN(+from)||Number.isNaN(+to)||from>to)throw Object.assign(new Error('Invalid date range'),{status:400});result.createdAt={$gte:from,$lte:to};}
  return result;
}
const csvCell=value=>`"${String(value??'').replace(/[\r\n\t]/g,' ').replace(/"/g,'""').replace(/^[\s\u0000-\u001f]*[=+@-]/,m=>`'${m}`)}"`;
const exportCsv=(res,rows)=>{const headers=['id','firstName','lastName','ownerEmail','organizationName','organizationEmail','status','createdAt','decidedAt'];res.set({'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="business-requests-report.csv"','Cache-Control':'no-store'});return res.send([headers.map(csvCell).join(','),...rows.map(r=>headers.map(k=>csvCell(k==='id'?String(r._id):r[k] instanceof Date?r[k].toISOString():r[k])).join(','))].join('\r\n'));};
export const requestsController={
  async intake(req,res,next){try{const r=await requestsService.intake(submission.parse(req.body));return apiResponse(res,{status:201,message:'Application received',data:{id:String(r._id),status:r.status,submittedAt:r.createdAt}});}catch(e){next(e);}},
  async list(req,res,next){try{const p=pageSpec(req.query,['id','createdAt','status'],{sortBy:'createdAt',sortDirection:'DESC'}),f=filters(req.query),[rows,total]=await Promise.all([BusinessRequest.find(f).sort(p.sort).skip(p.skip).limit(p.size),BusinessRequest.countDocuments(f)]);setPageHeaders(res,total,p.page,p.size);return apiResponse(res,{data:rows.map(r=>({id:String(r._id),firstName:r.firstName,lastName:r.lastName,ownerEmail:r.ownerEmail,ownerPhone:r.ownerPhone,organizationName:r.organizationName,organizationEmail:r.organizationEmail,status:r.status,createdAt:r.createdAt,decidedAt:r.decidedAt}))});}catch(e){next(e);}},
  async csv(req,res,next){try{const f=filters(req.query),count=await BusinessRequest.countDocuments(f);if(count>10000)throw Object.assign(new Error('CSV export exceeds 10,000 rows'),{status:413});const rows=await BusinessRequest.find(f).sort({createdAt:-1,_id:1});return exportCsv(res,rows);}catch(e){next(e);}},
  async get(req,res,next){try{if(!id.safeParse(req.params.id).success)throw Object.assign(new Error('Invalid id'),{status:400});const r=await BusinessRequest.findById(req.params.id);if(!r)throw Object.assign(new Error('Business request not found'),{status:404});return apiResponse(res,{data:r.toJSON()});}catch(e){next(e);}},
  async approve(req,res,next){try{const r=await requestsService.decide(req.params.id,'APPROVED',req.session.admin.id);return apiResponse(res,{message:'Application approved',data:r.toJSON()});}catch(e){next(e);}},
  async reject(req,res,next){try{const{reason}=z.object({reason:z.string().trim().min(1).max(1000)}).parse(req.body);const r=await requestsService.decide(req.params.id,'REJECTED',req.session.admin.id,reason);return apiResponse(res,{message:'Application rejected',data:r.toJSON()});}catch(e){next(e);}},
};
