'use strict';

const { v4: uuidv4 } = require('uuid');
const BaseModel = require('./base.model');
const { select, insert, update } = require('../lib/supabase');

class ConversationModel extends BaseModel {
  constructor() {
    super('conversations');
  }

  /**
   * Find existing conversation for an order of a given type, or create it.
   */
  async findOrCreate({ orderId, type, participant1Id, participant2Id, projectRef }) {
    const existing = await this.findOne({
      order_id: orderId,
      type,
    });
    if (existing) return { conversation: existing, created: false };

    const conv = await super.create({
      id: uuidv4(),
      project_ref: projectRef,
      order_id: orderId,
      type,
      participant_1_id: participant1Id,
      participant_2_id: participant2Id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return { conversation: conv, created: true };
  }

  async findForUser(userId, projectRef) {
    const { supabaseFetch } = require('../lib/supabase');
    // Conversations where user is either participant, scoped to project
    return supabaseFetch(
      `/rest/v1/${this.table}?project_ref=eq.${encodeURIComponent(projectRef)}&or=(participant_1_id.eq.${userId},participant_2_id.eq.${userId})&order=updated_at.desc`
    );
  }

  isParticipant(conversation, userId) {
    return (
      conversation.participant_1_id === userId ||
      conversation.participant_2_id === userId
    );
  }

  async touch(conversationId) {
    return update(this.table, { updated_at: new Date().toISOString() }, { id: conversationId });
  }

  getOtherParticipant(conversation, myUserId) {
    return conversation.participant_1_id === myUserId
      ? conversation.participant_2_id
      : conversation.participant_1_id;
  }
}

module.exports = new ConversationModel();
