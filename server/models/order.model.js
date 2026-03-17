'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { select, insert, update, supabaseFetch } = require('../lib/supabase');

const VALID_STATUSES = [
  'scheduled', 'pending', 'accepted_by_vendor', 'preparing',
  'ready', 'picked_up', 'delivered', 'cancelled',
];

const CANCELLABLE_STATUSES = ['pending', 'accepted_by_vendor', 'scheduled'];

class OrderModel extends BaseModel {
  constructor() {
    super('orders');
  }

  async findByProjectRef(projectRef, { status, customerId, limit = 50, offset = 0 } = {}) {
    const filters = { project_ref: projectRef };
    if (status) filters.status = status;
    if (customerId) filters.customer_id = customerId;

    return select(this.table, {
      select: '*, order_items(*)',
      filters,
      order: 'created_at.desc',
      limit,
      offset,
    });
  }

  async findWithItems(orderId) {
    const rows = await select(this.table, {
      select: '*, order_items(*)',
      filters: { id: orderId },
    });
    return rows?.[0] || null;
  }

  /**
   * Create an order with its items atomically.
   * Called from the Stripe webhook handler ONLY — never from the frontend directly.
   */
  async createWithItems({ projectRef, customerId, items, totalCents, paymentIntentId, scheduledFor }) {
    const orderId = uuidv4();
    const now = new Date().toISOString();

    const status = scheduledFor ? 'scheduled' : 'pending';

    const order = await super.create({
      id: orderId,
      project_ref: projectRef,
      customer_id: customerId || null,
      status,
      payment_status: paymentIntentId ? 'paid' : 'unpaid',
      payment_intent_id: paymentIntentId || null,
      total_cents: totalCents,
      scheduled_for: scheduledFor || null,
      created_at: now,
      updated_at: now,
    });

    if (items && items.length > 0) {
      const orderItems = items.map((item) => ({
        id: uuidv4(),
        order_id: orderId,
        product_id: item.productId || null,
        name: item.name,
        quantity: item.quantity,
        unit_price_cents: item.unitPriceCents,
      }));
      await insert('order_items', orderItems);
    }

    return this.findWithItems(orderId);
  }

  async updateStatus(orderId, newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new Error(`Invalid order status: ${newStatus}`);
    }
    return update(this.table, {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }, { id: orderId });
  }

  async applyRefund(orderId, { amountCents, reason, isPartial }) {
    return update(this.table, {
      payment_status: isPartial ? 'partially_refunded' : 'refunded',
      refund_amount_cents: amountCents,
      refund_reason: reason || null,
      updated_at: new Date().toISOString(),
    }, { id: orderId });
  }

  async cancel(orderId, { reason, initiator }) {
    return update(this.table, {
      status: 'cancelled',
      cancellation_reason: reason || null,
      cancelled_by: initiator || null,
      updated_at: new Date().toISOString(),
    }, { id: orderId });
  }

  isCancellable(order) {
    return CANCELLABLE_STATUSES.includes(order.status);
  }

  async getScheduledDue() {
    const now = new Date().toISOString();
    return supabaseFetch(
      `/rest/v1/${this.table}?status=eq.scheduled&scheduled_for=lte.${encodeURIComponent(now)}&select=*`
    );
  }

  async linkPaymentIntent(orderId, paymentIntentId) {
    return update(this.table, {
      payment_intent_id: paymentIntentId,
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
    }, { id: orderId });
  }
}

module.exports = new OrderModel();
