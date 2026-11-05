import { z } from 'zod';
import bcrypt from 'bcrypt';
import AdminAccount from '../../models/AdminAccount.js';
import { apiResponse } from '../../utils/apiResponse.js';
import { pageSpec, setPageHeaders } from '../../utils/query.js';
import { safeAccount } from '../auth/auth.service.js';
const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const createSchema = z.object({ email: z.string().email().max(255), password: z.string().min(8).max(72), role: z.enum(['ADMIN', 'SUPER_ADMIN']) });
function validateId(id) { const result = idSchema.safeParse(id); if (!result.success) { const e = new Error('Invalid id'); e.status = 400; throw e; } }
async function lastAdminGuard(account) { if (account.role === 'SUPER_ADMIN' && account.enabled && await AdminAccount.countDocuments({ role: 'SUPER_ADMIN', enabled: true }) <= 1) { const e = new Error('Cannot remove or disable the last active Super Admin'); e.status = 400; throw e; } }
export const accountsController = {
  async list(req, res, next) { try { const p = pageSpec(req.query, ['id','email','role','enabled','createdAt','updatedAt']); const [items,total] = await Promise.all([AdminAccount.find().sort(p.sort).skip(p.skip).limit(p.size),AdminAccount.countDocuments()]); setPageHeaders(res,total,p.page,p.size); return apiResponse(res,{data:items.map(safeAccount)}); } catch(e){next(e);} },
  async create(req,res,next){try{const i=createSchema.parse(req.body); const a=await AdminAccount.create({email:i.email.toLowerCase(),passwordHash:await bcrypt.hash(i.password,12),role:i.role});return apiResponse(res,{status:201,data:safeAccount(a)});}catch(e){next(e);}},
  async get(req,res,next){try{validateId(req.params.id);const a=await AdminAccount.findById(req.params.id);if(!a){const e=new Error('Admin account not found');e.status=404;throw e;}return apiResponse(res,{data:safeAccount(a)});}catch(e){next(e);}},
  async update(req,res,next){try{validateId(req.params.id);const schema=z.object({email:z.string().email().max(255).optional(),role:z.enum(['ADMIN','SUPER_ADMIN']).optional(),enabled:z.boolean().optional(),password:z.string().min(8).max(72).optional()});const i=schema.parse(req.body),a=await AdminAccount.findById(req.params.id).select('+passwordHash');if(!a){const e=new Error('Admin account not found');e.status=404;throw e;}if(a.role==='SUPER_ADMIN'&&a.enabled&&(i.role==='ADMIN'||i.enabled===false))await lastAdminGuard(a);if(i.email)a.email=i.email.toLowerCase();if(i.role)a.role=i.role;if(i.enabled!==undefined)a.enabled=i.enabled;if(i.password)a.passwordHash=await bcrypt.hash(i.password,12);await a.save();return apiResponse(res,{data:safeAccount(a)});}catch(e){next(e);}},
  async status(req,res,next){try{validateId(req.params.id);const {enabled}=z.object({enabled:z.boolean()}).parse(req.body),a=await AdminAccount.findById(req.params.id);if(!a){const e=new Error('Admin account not found');e.status=404;throw e;}if(!enabled)await lastAdminGuard(a);a.enabled=enabled;await a.save();return apiResponse(res,{data:safeAccount(a)});}catch(e){next(e);}},
  async activate(req,res,next){req.body={enabled:true};return accountsController.status(req,res,next);}, async deactivate(req,res,next){req.body={enabled:false};return accountsController.status(req,res,next);},
  async remove(req,res,next){try{validateId(req.params.id);const a=await AdminAccount.findById(req.params.id);if(!a){const e=new Error('Admin account not found');e.status=404;throw e;}await lastAdminGuard(a);await a.deleteOne();return apiResponse(res,{message:'Admin account deleted'});}catch(e){next(e);}},
};
