import type { DeliveryTimeReport, RevenueReport, StatusReport, TopProduct } from '../types/report'
import { api } from './api'

function periodQuery(startDate: string, endDate: string): string {
  return new URLSearchParams({ startDate, endDate }).toString()
}

export function getRevenue(startDate: string, endDate: string): Promise<RevenueReport> {
  return api<RevenueReport>(`/api/reports/revenue?${periodQuery(startDate, endDate)}`)
}

export function getOrdersByStatus(): Promise<StatusReport> {
  return api<StatusReport>('/api/reports/orders-by-status')
}

export function getTopProducts(startDate: string, endDate: string): Promise<{ data: TopProduct[] }> {
  return api<{ data: TopProduct[] }>(`/api/reports/top-products?${periodQuery(startDate, endDate)}&limit=10`)
}

export function getAverageDeliveryTime(startDate: string, endDate: string): Promise<DeliveryTimeReport> {
  return api<DeliveryTimeReport>(`/api/reports/average-delivery-time?${periodQuery(startDate, endDate)}`)
}
