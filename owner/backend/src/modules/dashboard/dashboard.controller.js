import { apiResponse } from '../../utils/apiResponse.js';
import { dashboardService } from './dashboard.service.js';

export const dashboardController = {
  async get(req, res, next) { try { return apiResponse(res, { data: await dashboardService.dashboard(req, req.query) }); } catch (error) { next(error); } },
  async revenue(req, res, next) { try { return apiResponse(res, { data: await dashboardService.revenue(req, req.query) }); } catch (error) { next(error); } },
  async subscriptions(req, res, next) { try { return apiResponse(res, { data: await dashboardService.subscriptions(req, req.query) }); } catch (error) { next(error); } },
};
