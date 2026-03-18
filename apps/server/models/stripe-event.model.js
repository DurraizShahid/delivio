'use strict';

const { insert, SupabaseError } = require('../lib/supabase');

class StripeEventModel {
  /**
   * Returns true if this event was newly recorded; false if already processed.
   */
  async recordOnce({ eventId, type }) {
    try {
      await insert('stripe_events', [{ event_id: eventId, type }]);
      return true;
    } catch (err) {
      // Unique constraint / duplicate insert => already processed
      if (err instanceof SupabaseError && (err.statusCode === 409 || err.statusCode === 406)) {
        return false;
      }
      throw err;
    }
  }
}

module.exports = new StripeEventModel();

